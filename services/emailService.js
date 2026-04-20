/**
 * emailService.js — Reusable Nodemailer email sender
 * Reads SMTP credentials from .env:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 */
const nodemailer = require('nodemailer');
const EmailLog   = require('../models/EmailLog');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email and log the result to the database.
 * @param {object} opts
 * @param {string} opts.to           - recipient email
 * @param {string} opts.subject      - email subject line
 * @param {string} opts.html         - HTML body
 * @param {string} opts.emailType    - one of RESULT | CERTIFICATE | WELCOME | REMINDER
 * @param {string} [opts.userId]     - linked user ObjectId (optional)
 */
async function sendEmail({ to, subject, html, emailType, userId }) {
  let status = 'SUCCESS';
  let errorMessage;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Knowledge Hub" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
    console.error(`[Email] Failed to send ${emailType} to ${to}:`, err.message);
  }

  // Always log, even on failure
  await EmailLog.create({ userId, recipientEmail: to, emailType, subject, status, errorMessage });
  return status;
}

/* ─── Template helpers ─────────────────────────────────── */

function wrapHtml(title, bodyHtml) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;">🎓 Knowledge Hub</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Digital Knowledge Assessment Portal</p>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:18px;color:#1e293b;margin-top:0;">${title}</h2>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#94a3b8;text-align:center;">
        © ${new Date().getFullYear()} Knowledge Hub · Digital Knowledge Assessment Portal
      </p>
    </div>
  </div>`;
}

function resultEmail({ studentName, subject, score, total, percentage }) {
  const grade = percentage >= 80 ? '🏆 Excellent' : percentage >= 60 ? '✅ Good' : '📘 Keep Practicing';
  return {
    subject: `Your ${subject} Exam Result — Knowledge Hub`,
    html: wrapHtml('Your Exam Result is Ready!', `
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your <strong>${subject}</strong> exam has been evaluated. Here are your results:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f1f5f9;">
          <td style="padding:10px 14px;font-weight:600;">Subject</td>
          <td style="padding:10px 14px;">${subject}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600;">Score</td>
          <td style="padding:10px 14px;">${score} / ${total}</td>
        </tr>
        <tr style="background:#f1f5f9;">
          <td style="padding:10px 14px;font-weight:600;">Percentage</td>
          <td style="padding:10px 14px;"><strong style="color:#6366f1;">${percentage}%</strong></td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:600;">Grade</td>
          <td style="padding:10px 14px;">${grade}</td>
        </tr>
      </table>
      <p>Log in to your portal to view the detailed review and download your certificate.</p>
      <p>Best regards,<br/><strong>Knowledge Hub Team</strong></p>
    `),
  };
}

function certificateEmail({ studentName, subject, certId, percentage }) {
  return {
    subject: `🎓 Your Certificate is Ready — ${subject} | Knowledge Hub`,
    html: wrapHtml('Your Certificate is Ready!', `
      <p>Congratulations <strong>${studentName}</strong>! 🎉</p>
      <p>You have successfully completed the <strong>${subject}</strong> exam with 
         <strong style="color:#6366f1;">${percentage}%</strong>.</p>
      <p>Your completion certificate has been generated:</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="font-size:13px;color:#64748b;margin:0 0 6px;">Certificate ID</p>
        <p style="font-size:18px;font-weight:800;color:#1e293b;letter-spacing:2px;margin:0;">${certId}</p>
      </div>
      <p style="font-size:13px;color:#64748b;">
        You can download your certificate from the portal result page or verify it at:<br/>
        <a href="${process.env.FRONTEND_URL || 'https://assessment-portal-be.vercel.app'}/verify/${certId}" style="color:#6366f1;">
          ${process.env.FRONTEND_URL || 'https://assessment-portal-be.vercel.app'}/verify/${certId}
        </a>
      </p>
      <p>Keep up the great work!<br/><strong>Knowledge Hub Team</strong></p>
    `),
  };
}

module.exports = { sendEmail, resultEmail, certificateEmail };
