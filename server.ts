import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Test SMTP Connection
  app.post("/api/test-smtp", async (req, res) => {
    try {
      const { smtp } = req.body;
      if (!smtp || !smtp.host || !smtp.senderEmail) {
        return res.status(400).json({ success: false, error: "Missing SMTP host or sender email" });
      }
      if (!smtp.password) {
        return res.status(400).json({ success: false, error: "Missing SMTP Password. For Gmail, you must enter your 16-character Google App Password." });
      }

      const secure = smtp.encryption === 'SSL' || smtp.port === 465;
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port) || 587,
        secure: secure,
        auth: {
          user: smtp.username || smtp.senderEmail,
          pass: smtp.password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      await transporter.verify();
      res.json({
        success: true,
        message: `Successfully connected and authenticated with ${smtp.host}:${smtp.port}`
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

      // Default SMTP parameters if none provided
      const host = smtp?.host || "smtp.gmail.com";
      const port = Number(smtp?.port) || 587;
      const senderEmail = smtp?.senderEmail || "whitelineborder@gmail.com";
      const senderName = smtp?.senderName || "Portal Security Team";
      const username = smtp?.username || senderEmail;
      const password = smtp?.password || "";
      const encryption = smtp?.encryption || "TLS";

      if (!password) {
        return res.status(400).json({ success: false, error: "SMTP Password not configured. Master Admin must set an App Password in Admin Settings -> SMTP Configuration." });
      }

      const secure = encryption === 'SSL' || port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
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
        message: `Email delivered to ${to} via ${host}`
      });
    } catch (err: any) {
      console.error("SMTP Send Error:", err);
      res.status(400).json({
        success: false,
        error: formatSmtpError(err)
      });
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
