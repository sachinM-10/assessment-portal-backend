/**
 * reports.js — Admin report generation (PDF + Excel)
 * Routes:
 *   GET /api/reports/results?format=pdf|excel
 *   GET /api/reports/attendance?format=pdf|excel
 *   GET /api/reports/email-logs?format=pdf|excel
 */
const express     = require('express');
const router      = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');

const SubjectAttempt = require('../models/SubjectAttempt');
const Certificate    = require('../models/Certificate');
const EmailLog       = require('../models/EmailLog');
const User           = require('../models/User');
const { auth, admin } = require('../middleware/auth');

const PORTAL = 'Knowledge Hub — Digital Knowledge Assessment Portal';

/* ─── helpers ───────────────────────────────────────────── */

function pdfHeader(doc, title) {
  const W = doc.page.width;
  doc.rect(0, 0, W, 70).fill('#0f172a');
  doc.fillColor('#a5b4fc').font('Helvetica').fontSize(10)
    .text(PORTAL, 40, 14);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
    .text(title, 40, 32);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
    .text(`Generated: ${dateStr}`, W - 180, 46, { width: 140, align: 'right' });
  doc.y = 90;
}

function pdfTable(doc, headers, rows) {
  const W   = doc.page.width - 80;
  const col = W / headers.length;
  const rh  = 22;

  // Header row
  doc.rect(40, doc.y, W, rh).fill('#1e1b4b');
  headers.forEach((h, i) => {
    doc.fillColor('#c7d2fe').font('Helvetica-Bold').fontSize(9)
      .text(h, 40 + i * col + 4, doc.y - rh + 6, { width: col - 8, ellipsis: true });
  });
  doc.y += 2;

  // Data rows
  rows.forEach((row, ri) => {
    if (doc.y + rh > doc.page.height - 60) doc.addPage();
    const fill = ri % 2 === 0 ? '#f8fafc' : '#f1f5f9';
    doc.rect(40, doc.y, W, rh).fill(fill);
    row.forEach((cell, ci) => {
      doc.fillColor('#1e293b').font('Helvetica').fontSize(8)
        .text(String(cell ?? '—'), 40 + ci * col + 4, doc.y - rh + 6, { width: col - 8, ellipsis: true });
    });
    doc.y += 2;
  });
}

function excelStyle(ws) {
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;
}

/* ─── Results Report ────────────────────────────────────── */
router.get('/results', [auth, admin], async (req, res) => {
  try {
    const { format = 'pdf', subject } = req.query;
    const filter = { status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } };
    if (subject) filter.subject = subject;

    const attempts = await SubjectAttempt.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const rows = attempts.map(a => [
      a.userId?.name || a.userId?.email || 'Unknown',
      a.subject,
      `${a.score}/${a.total}`,
      `${Math.round((a.score / (a.total || 1)) * 100)}%`,
      a.status,
      new Date(a.createdAt).toLocaleDateString('en-IN'),
    ]);

    const headers = ['Student', 'Subject', 'Score', 'Percentage', 'Status', 'Date'];

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Results Report');
      ws.columns = headers.map(h => ({ header: h, key: h.toLowerCase(), width: 20 }));
      rows.forEach(r => ws.addRow(r));
      excelStyle(ws);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Results_Report.xlsx"');
      await wb.xlsx.write(res);
      return res.end();
    }

    // PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Results_Report.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    pdfHeader(doc, 'Student Results Report');
    pdfTable(doc, headers, rows);
    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Attendance Report ─────────────────────────────────── */
router.get('/attendance', [auth, admin], async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    const users    = await User.find({ role: 'student' }).lean();
    const subjects = ['C', 'Python', 'Java'];

    const rows = [];
    for (const u of users) {
      for (const subj of subjects) {
        const count = await SubjectAttempt.countDocuments({
          userId: u._id, subject: subj,
          status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        });
        rows.push([u.name || u.email, subj, count > 0 ? 'Attempted' : 'Not Attempted', count]);
      }
    }

    const headers = ['Student', 'Subject', 'Status', 'Attempts'];

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Attendance');
      ws.columns = headers.map(h => ({ header: h, key: h.toLowerCase(), width: 22 }));
      rows.forEach(r => ws.addRow(r));
      excelStyle(ws);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Report.xlsx"');
      await wb.xlsx.write(res);
      return res.end();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Report.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    pdfHeader(doc, 'Student Attendance Report');
    pdfTable(doc, headers, rows);
    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Email Logs ────────────────────────────────────────── */
router.get('/email-logs', [auth, admin], async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    const logs = await EmailLog.find().sort({ sentAt: -1 }).limit(200).lean();

    const headers = ['Recipient', 'Type', 'Subject', 'Status', 'Date'];
    const rows = logs.map(l => [
      l.recipientEmail, l.emailType, l.subject, l.status,
      new Date(l.sentAt).toLocaleDateString('en-IN'),
    ]);

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Email Logs');
      ws.columns = headers.map(h => ({ header: h, key: h.toLowerCase(), width: 28 }));
      rows.forEach(r => ws.addRow(r));
      excelStyle(ws);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Email_Logs.xlsx"');
      await wb.xlsx.write(res);
      return res.end();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Email_Logs.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    pdfHeader(doc, 'Email Notification Log');
    pdfTable(doc, headers, rows);
    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
