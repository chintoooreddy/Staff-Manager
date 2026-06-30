import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize standalone Firebase instance for Server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const serverDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface DailyReportResult {
  success: boolean;
  message: string;
  metrics?: any;
  error?: string;
}

export async function generateAndSendDailyReport(options: {
  force?: boolean;
  testRecipientEmail?: string;
}): Promise<DailyReportResult> {
  const { force = false, testRecipientEmail } = options;

  try {
    // 1. Get current IST time details
    const nowIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const formatMonthMap: { [key: number]: string } = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
      6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };
    const monthStr = formatMonthMap[nowIst.getMonth()];
    const dayStr = String(nowIst.getDate()).padStart(2, '0');
    const yearStr = nowIst.getFullYear();
    const todayDateString = `${monthStr} ${dayStr}, ${yearStr}`; // e.g. "Jun 29, 2026"

    // 2. Fetch Daily Email Config
    const configRef = doc(serverDb, 'settings', 'daily_email_config');
    const configSnap = await getDoc(configRef);
    const configData = configSnap.exists() ? configSnap.data() : {
      enabled: false,
      scheduledTime: "18:30",
      attachExcel: true,
      recipients: []
    };

    if (!force && !testRecipientEmail && !configData.enabled) {
      return { success: true, message: "Daily report is disabled in Admin settings. Skipping." };
    }

    // Check if already sent today (unless forced or test)
    if (!force && !testRecipientEmail && configData.lastSentTimestamp && configData.lastSentStatus === 'Success') {
      const lastSent = new Date(configData.lastSentTimestamp);
      const lastSentIst = new Date(lastSent.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (lastSentIst.toDateString() === nowIst.toDateString()) {
        return { success: true, message: "Daily report already dispatched today. Skipping duplicate send." };
      }
    }

    // 3. Determine Recipients
    let targetEmails: string[] = [];
    if (testRecipientEmail) {
      targetEmails = [testRecipientEmail];
    } else {
      const activeRecipients = (configData.recipients || []).filter((r: any) => r.active && r.email);
      targetEmails = activeRecipients.map((r: any) => r.email);
    }

    if (targetEmails.length === 0) {
      return { success: false, message: "No active recipient email addresses configured." };
    }

    // 4. Fetch Calls & Staff Data
    const callsCol = collection(serverDb, 'call_records');
    const callsSnap = await getDocs(callsCol);
    const allCalls: any[] = [];
    callsSnap.forEach(d => allCalls.push(d.data()));

    // Filter calls logged today
    const todayCalls = allCalls.filter(c => c && c.createdDate === todayDateString);

    // Calculate Summary Metrics
    const totalCalls = todayCalls.length;
    const connectedCalls = todayCalls.filter(c => ['Interested', 'Call Back', 'Closed', 'Rejected', 'Not Interested'].includes(c.callStatus)).length;
    const notConnectedCalls = todayCalls.filter(c => ['Not Answered', 'Busy', 'Not Reachable'].includes(c.callStatus)).length;
    const interestedCalls = todayCalls.filter(c => c.callStatus === 'Interested').length;
    const followupsCalls = todayCalls.filter(c => c.callStatus === 'Call Back').length;
    const convertedCalls = todayCalls.filter(c => c.callStatus === 'Closed').length;
    const notInterestedCalls = todayCalls.filter(c => c.callStatus === 'Not Interested').length;
    const rejectedCalls = todayCalls.filter(c => c.callStatus === 'Rejected').length;
    const uniqueStaff = new Set(todayCalls.map(c => c.loggedBy).filter(Boolean));
    const totalStaffWorked = uniqueStaff.size;

    const summaryMetrics = {
      totalCalls,
      connectedCalls,
      notConnectedCalls,
      interestedCalls,
      followupsCalls,
      convertedCalls,
      notInterestedCalls,
      rejectedCalls,
      totalStaffWorked
    };

    // 5. Generate Excel Buffer
    let attachments: any[] = [];
    const reportFilename = `Daily_Call_Report_${dayStr}_${monthStr}_${yearStr}.xlsx`;
    
    if (configData.attachExcel !== false || testRecipientEmail) {
      const excelRows = todayCalls.length > 0 ? todayCalls.map((c, idx) => ({
        "S.No": idx + 1,
        "Client Name": c.clientName || "-",
        "Contact Number": c.clientNumber || "-",
        "Call Status": c.callStatus || "-",
        "Interested Service": c.interestedService || "-",
        "Follow-up Date": c.followupDate || "-",
        "Logged By Staff": c.loggedBy || "-",
        "Logged Date": c.createdDate || "-",
        "Conversation Notes": c.notes || "-"
      })) : [{ "Notice": "No outbound telecalling conversations logged on this date." }];

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Telecalling");
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      attachments.push({
        filename: reportFilename,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // 6. Configure SMTP Transporter
    // Prioritize Environment Variables as requested in Req #10
    let smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    let smtpPort = Number(process.env.SMTP_PORT) || 587;
    let smtpSenderEmail = process.env.SMTP_SENDER_EMAIL || "whitelineborder@gmail.com";
    let smtpSenderName = process.env.SMTP_SENDER_NAME || "CRM Daily Reports";
    let smtpUsername = process.env.SMTP_USERNAME || smtpSenderEmail;
    let smtpPassword = process.env.SMTP_PASSWORD || "";
    let smtpSecure = process.env.SMTP_ENCRYPTION === "SSL" || smtpPort === 465;

    // Fallback to Firestore Admin SMTP Config if env password is not set
    if (!smtpPassword) {
      const smtpSnap = await getDoc(doc(serverDb, 'settings', 'smtp_config')).catch(() => null);
      if (smtpSnap && smtpSnap.exists()) {
        const dbSmtp = smtpSnap.data();
        if (dbSmtp.password && dbSmtp.password !== "••••••••••••") {
          smtpHost = dbSmtp.host || smtpHost;
          smtpPort = Number(dbSmtp.port) || smtpPort;
          smtpSenderEmail = dbSmtp.senderEmail || smtpSenderEmail;
          smtpSenderName = dbSmtp.senderName || smtpSenderName;
          smtpUsername = dbSmtp.username || smtpUsername;
          smtpPassword = dbSmtp.password;
          smtpSecure = dbSmtp.encryption === 'SSL' || smtpPort === 465;
        }
      }
    }

    if (!smtpPassword) {
      const err = "SMTP Password not configured in Environment Variables (SMTP_PASSWORD) or Admin Settings -> SMTP Configuration.";
      await logEmailAttempt(targetEmails, reportFilename, 'Failed', err, testRecipientEmail ? true : false, summaryMetrics);
      return { success: false, message: err, error: err };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUsername,
        pass: smtpPassword
      },
      tls: { rejectUnauthorized: false }
    });

    // 7. Prepare Email Contents
    const emailSubject = `Daily Call Report - ${dayStr} ${monthStr} ${yearStr}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; border-radius: 12px 12px 0 0; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">Daily Telecalling Operational Summary</h2>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Report Date: ${todayDateString} (IST)</p>
        </div>
        
        <div style="padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin-top: 0;">Here is the automated telecalling performance summary for today. ${attachments.length > 0 ? "The detailed Excel report is attached to this email." : ""}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #475569;">Performance Metric</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 13px; color: #475569;">Count</th>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">Total Outbound Calls</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; font-size: 16px; color: #0f172a;">${totalCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #16a34a;">Connected Calls</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #16a34a;">${connectedCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #dc2626;">Not Connected</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #dc2626;">${notConnectedCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #0284c7;">Interested</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0284c7;">${interestedCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #d97706;">Follow-ups Scheduled</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #d97706;">${followupsCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #9333ea; font-weight: bold;">Converted / Sales</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: #9333ea;">${convertedCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Not Interested</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #64748b;">${notInterestedCalls}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b;">Rejected</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #64748b;">${rejectedCalls}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 12px 16px; font-weight: 600; color: #334155;">Total Staff Worked Today</td>
              <td style="padding: 12px 16px; text-align: right; font-weight: bold; color: #334155;">${totalStaffWorked} Staff</td>
            </tr>
          </table>
          
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This report was automatically generated by CRM Portal Automation.</p>
        </div>
      </div>
    `;

    const textBody = `Daily Call Report - ${todayDateString}\nTotal Calls: ${totalCalls}\nConnected: ${connectedCalls}\nNot Connected: ${notConnectedCalls}\nInterested: ${interestedCalls}\nFollow-ups: ${followupsCalls}\nConverted/Sales: ${convertedCalls}\nNot Interested: ${notInterestedCalls}\nRejected: ${rejectedCalls}\nTotal Staff Worked: ${totalStaffWorked}`;

    const mailOptions = {
      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
      to: targetEmails.join(", "),
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      attachments
    };

    // 8. Retry Logic (Up to 3 attempts - Req #9)
    let attempt = 0;
    let sendError: any = null;
    let delivered = false;

    while (attempt < 3 && !delivered) {
      attempt++;
      try {
        await transporter.sendMail(mailOptions);
        delivered = true;
        sendError = null;
        console.log(`Daily report email successfully delivered on attempt #${attempt} to:`, targetEmails.join(", "));
      } catch (err: any) {
        sendError = err;
        console.error(`Attempt #${attempt} failed to deliver daily report:`, err.message);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000)); // 2s backoff
        }
      }
    }

    if (!delivered && sendError) {
      const errMsg = sendError.message || "All 3 retry attempts failed.";
      await logEmailAttempt(targetEmails, reportFilename, 'Failed', errMsg, !!testRecipientEmail, summaryMetrics);
      
      if (!testRecipientEmail) {
        await setDoc(configRef, {
          lastSentTimestamp: new Date().toISOString(),
          lastSentStatus: 'Failed',
          lastSentError: errMsg
        }, { merge: true });
      }

      return { success: false, message: `Failed after 3 retries: ${errMsg}`, error: errMsg };
    }

    // 9. Log Success
    await logEmailAttempt(targetEmails, reportFilename, 'Success', '', !!testRecipientEmail, summaryMetrics);
    
    if (!testRecipientEmail) {
      await setDoc(configRef, {
        lastSentTimestamp: new Date().toISOString(),
        lastSentStatus: 'Success',
        lastSentError: ''
      }, { merge: true });
    }

    return {
      success: true,
      message: `Daily Report successfully delivered to ${targetEmails.length} recipient(s).`,
      metrics: summaryMetrics
    };

  } catch (err: any) {
    console.error("Fatal error in daily report generation:", err);
    return { success: false, message: err.message || "Fatal error", error: err.message };
  }
}

async function logEmailAttempt(
  recipients: string[],
  reportName: string,
  status: 'Success' | 'Failed',
  errorMessage: string,
  isTest: boolean,
  summary: any
) {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    
    const logDoc = {
      id: logId,
      dateTime: new Date().toISOString(),
      dateTimeReadable: nowIst.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      recipients,
      reportName,
      status,
      errorMessage: errorMessage || null,
      isTest,
      summary
    };

    await setDoc(doc(serverDb, 'daily_email_logs', logId), logDoc);
  } catch (e) {
    console.error("Failed to write daily email log to Firestore:", e);
  }
}
