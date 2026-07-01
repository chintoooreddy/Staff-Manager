import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dns from "dns";
import cron from "node-cron";
import { generateAndSendDailyReport, serverDb } from "./server/dailyReport";
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from "firebase/firestore";

function formatSmtpError(err: any): string {
  const msg = err?.message || "SMTP transmission failure";
  if (msg.includes("534") || msg.includes("Application-specific password")) {
    return "Gmail Security Error (534): Google requires a 16-character 'App Password' instead of your normal account password. Go to Google Account -> Security -> 2-Step Verification -> App Passwords to generate one.";
  }
  if (msg.includes("535") || msg.includes("Username and Password not accepted")) {
    return "SMTP Authentication Error (535): Username or App Password rejected by mail server.";
  }
  return msg;
}

function isMaskedPassword(pwd: string): boolean {
  if (!pwd) return true;
  const trimmed = pwd.trim();
  if (trimmed === "") return true;
  return trimmed === "••••••••••••" || trimmed === "•••••••••••••••••" || /^[•*●]+$/.test(trimmed);
}

async function resolveSmtpConfig(clientSmtp?: any) {
  // 1. Defaults
  let host = "smtp.gmail.com";
  let port = 587;
  let senderEmail = "whitelineborder@gmail.com";
  let senderName = "Portal Security Team";
  let username = "whitelineborder@gmail.com";
  let password = "";
  let encryption = "TLS";

  // 2. Load from Firestore settings
  try {
    const smtpSnap = await getDoc(doc(serverDb, 'settings', 'smtp_config')).catch(() => null);
    if (smtpSnap && smtpSnap.exists()) {
      const dbSmtp = smtpSnap.data();
      host = dbSmtp.host || host;
      port = Number(dbSmtp.port) || port;
      senderEmail = dbSmtp.senderEmail || senderEmail;
      senderName = dbSmtp.senderName || senderName;
      username = dbSmtp.username || username;
      if (dbSmtp.password && !isMaskedPassword(dbSmtp.password)) {
        password = dbSmtp.password;
      }
      encryption = dbSmtp.encryption || encryption;
    }
  } catch (dbErr) {
    console.warn("Could not load SMTP config from DB:", dbErr);
  }

  // 3. Environment variable/Secrets overrides (if present and non-empty)
  if (process.env.SMTP_HOST) host = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) port = Number(process.env.SMTP_PORT);
  if (process.env.SMTP_SENDER_EMAIL) senderEmail = process.env.SMTP_SENDER_EMAIL;
  if (process.env.SMTP_SENDER_NAME) senderName = process.env.SMTP_SENDER_NAME;
  if (process.env.SMTP_USERNAME) username = process.env.SMTP_USERNAME;
  if (process.env.SMTP_PASSWORD && !isMaskedPassword(process.env.SMTP_PASSWORD)) {
    password = process.env.SMTP_PASSWORD;
  }
  if (process.env.SMTP_ENCRYPTION) encryption = process.env.SMTP_ENCRYPTION;

  // 4. Client-supplied overrides
  if (clientSmtp) {
    if (clientSmtp.host) host = clientSmtp.host;
    if (clientSmtp.port) port = Number(clientSmtp.port);
    if (clientSmtp.senderEmail) senderEmail = clientSmtp.senderEmail;
    if (clientSmtp.senderName) senderName = clientSmtp.senderName;
    if (clientSmtp.username) username = clientSmtp.username;
    if (clientSmtp.password && !isMaskedPassword(clientSmtp.password)) {
      password = clientSmtp.password;
    }
    if (clientSmtp.encryption) encryption = clientSmtp.encryption;
  }

  return { host, port, senderEmail, senderName, username, password, encryption };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable CORS for custom domain frontend requests
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Publish APP_URL to Firestore so custom domains can resolve backend endpoints
  if (process.env.APP_URL) {
    try {
      await setDoc(doc(serverDb, 'settings', 'app_config'), {
        backendUrl: process.env.APP_URL,
        updatedAt: Date.now()
      }, { merge: true });
      console.log(`Backend published APP_URL to Firestore: ${process.env.APP_URL}`);
    } catch (err) {
      console.error("Failed to publish APP_URL to Firestore:", err);
    }
  }

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Test SMTP Connection
  app.post("/api/test-smtp", async (req, res) => {
    try {
      const { smtp } = req.body;
      const config = await resolveSmtpConfig(smtp);

      if (!config.host || !config.senderEmail) {
        return res.status(400).json({ success: false, error: "Missing SMTP host or sender email configuration." });
      }

      if (!config.password || isMaskedPassword(config.password)) {
        return res.status(400).json({ success: false, error: "Missing SMTP Password. Please enter your password or App Password." });
      }

      // For implicit SSL/TLS, secure must be true only for port 465. Other ports use STARTTLS (secure: false).
      const secure = config.port === 465;
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: "TLSv1.2"
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        lookup: (hostname: string, options: any, callback: any) => {
          dns.lookup(hostname, { family: 4 }, callback);
        },
        debug: true,
        logger: true
      } as any);

      await transporter.verify();
      res.json({
        success: true,
        message: `Successfully connected and authenticated with ${config.host}:${config.port}`
      });
    } catch (err: any) {
      console.error("SMTP Verify Error:", err);
      res.status(400).json({
        success: false,
        error: formatSmtpError(err)
      });
    }
  });

  // Send Email via SMTP
  app.post("/api/send-email", async (req, res) => {
    try {
      const { smtp, to, subject, body, html } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, error: "Missing recipient, subject, or email body" });
      }

      const config = await resolveSmtpConfig(smtp);

      if (!config.password || isMaskedPassword(config.password)) {
        return res.status(400).json({
          success: false,
          error: "SMTP Password not configured. Please set SMTP_PASSWORD in your environment variables or configure it in Admin Settings -> SMTP Configuration."
        });
      }

      // For implicit SSL/TLS, secure must be true only for port 465. Other ports use STARTTLS (secure: false).
      const secure = config.port === 465;
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: secure,
        auth: {
          user: config.username,
          pass: config.password,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: "TLSv1.2"
        },
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        lookup: (hostname: string, options: any, callback: any) => {
          dns.lookup(hostname, { family: 4 }, callback);
        },
        debug: true,
        logger: true
      } as any);

      const mailOptions = {
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to,
        subject,
        text: body,
        html: html || body.replace(/\n/g, '<br/>'),
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email dispatched successfully: ${info.messageId}`);

      res.json({
        success: true,
        messageId: info.messageId,
        message: `Email delivered to ${to} via ${config.host}`
      });
    } catch (err: any) {
      console.error("SMTP Send Error:", err);
      res.status(400).json({
        success: false,
        error: formatSmtpError(err)
      });
    }
  });

  // Trigger Daily Telecalling Report (Manual or Test send)
  app.post("/api/send-daily-report", async (req, res) => {
    try {
      const { testEmail, force } = req.body;
      const result = await generateAndSendDailyReport({
        force: force !== undefined ? force : false,
        testRecipientEmail: testEmail
      });
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error("Manual report trigger error:", err);
      res.status(500).json({ success: false, message: err.message || "Server Error", error: err.message });
    }
  });

  // Cron Scheduler for Daily Telecalling Reports (runs every minute)
  cron.schedule("* * * * *", async () => {
    try {
      const nowIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const currentHhMm = `${String(nowIst.getHours()).padStart(2, '0')}:${String(nowIst.getMinutes()).padStart(2, '0')}`;
      
      const configSnap = await getDoc(doc(serverDb, "settings", "daily_email_config")).catch(() => null);
      if (configSnap && configSnap.exists()) {
        const config = configSnap.data();
        if (config.enabled && config.scheduledTime) {
          // If current IST time matches or is past scheduledTime
          if (currentHhMm >= config.scheduledTime) {
            await generateAndSendDailyReport({ force: false });
          }
        }
      }
    } catch (err) {
      console.error("Error in daily report cron check:", err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server booted on port ${PORT}`);
  });
}

startServer();
