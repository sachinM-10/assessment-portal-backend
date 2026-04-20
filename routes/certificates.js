/**
 * certificates.js — Certificate generation, download, and verification
 * Routes:
 *   POST /api/certificates/generate       → Create + return certId
 *   GET  /api/certificates/:certId/pdf    → Download PDF
 *   GET  /api/certificates/verify/:certId → Public verification (no auth needed)
 *   GET  /api/certificates/my             → List student's own certificates
 *   GET  /api/certificates/admin/all      → Admin: list all
 */
const express     = require('express');
const router      = express.Router();
const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const Certificate = require('../models/Certificate');
const User        = require('../models/User');
const { auth, admin, student } = require('../middleware/auth');
const { sendEmail, certificateEmail } = require('../services/emailService');

const PORTAL_NAME = 'Knowledge Hub — Digital Knowledge Assessment Portal';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessment-portal-be.vercel.app';

/* ─── Generate certificate ─────────────────────────────── */
router.post('/generate', [auth, student], async (req, res) => {
  try {
    const { subject, score, total, attemptId } = req.body;
    const userId = req.user._id;

    // Fetch student name from DB
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const studentName = user.name || user.username || user.email;
    const percentage  = Math.round((score / total) * 100);

    // Don't generate duplicate certs for the same attempt
    if (attemptId) {
      const existing = await Certificate.findOne({ attemptId });
      if (existing) return res.json({ certId: existing.certId });
    }

    // Short human-readable cert ID: KH-YYYY-XXXXXXXX
    const certId = `KH-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const cert = await Certificate.create({
      certId, userId, attemptId, studentName, subject,
      score, total, percentage, issuedAt: new Date(),
    });

    // Send certificate email (non-blocking)
    const { subject: emailSubj, html } = certificateEmail({ studentName, subject, certId, percentage });
    sendEmail({ to: user.email, subject: emailSubj, html, emailType: 'CERTIFICATE', userId }).catch(() => {});

    res.json({ certId: cert.certId, message: 'Certificate generated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Download PDF ────────────────────────────────────────── */
router.get('/:certId/pdf', [auth], async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    const verifyUrl = `${FRONTEND_URL}/verify/${cert.certId}`;

    // Build QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    const qrBuffer  = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Stream PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${cert.certId}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.pipe(res);

    const W = doc.page.width;   // 841.89
    const H = doc.page.height;  // 595.28

    /* ── Background ── */
    doc.rect(0, 0, W, H).fill('#0f172a');

    /* ── Decorative corner borders ── */
    const bw = 3, bs = 40;
    [
      [30, 30], [W - 30 - bs, 30],
      [30, H - 30 - bs], [W - 30 - bs, H - 30 - bs],
    ].forEach(([x, y]) => {
      const isRight = x > W / 2;
      const isBottom = y > H / 2;
      doc.save()
        .strokeColor('#6366f1').lineWidth(bw)
        .moveTo(x, y + bs).lineTo(x, y).lineTo(x + bs, y)
        .stroke()
        .restore();
    });

    /* ── Gradient header bar ── */
    doc.rect(0, 0, W, 100).fill('#1e1b4b');
    doc.rect(0, 95, W, 4).fill('#6366f1');

    /* ── Portal name (header) ── */
    doc.fillColor('#a5b4fc').font('Helvetica').fontSize(11)
      .text(PORTAL_NAME, 0, 18, { align: 'center', width: W });

    /* ── Shield / Star icon placeholder ── */
    doc.circle(W / 2, 155, 38).fill('#1e1b4b').stroke();
    doc.fillColor('#818cf8').fontSize(36)
      .text('🏆', W / 2 - 20, 136);

    /* ── Title ── */
    doc.fillColor('#f8fafc').font('Helvetica-Bold').fontSize(36)
      .text('Certificate of Completion', 0, 210, { align: 'center', width: W });

    /* ── Sub heading ── */
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(13)
      .text('This is to certify that', 0, 260, { align: 'center', width: W });

    /* ── Student name ── */
    doc.fillColor('#c7d2fe').font('Helvetica-Bold').fontSize(28)
      .text(cert.studentName, 0, 282, { align: 'center', width: W });

    /* ── Body line ── */
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(13)
      .text(`has successfully completed the examination in`, 0, 322, { align: 'center', width: W });

    /* ── Subject pill ── */
    const pillW = 200, pillH = 36, pillX = (W - pillW) / 2, pillY = 342;
    doc.roundedRect(pillX, pillY, pillW, pillH, 18).fill('#6366f1');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
      .text(cert.subject, pillX, pillY + 9, { align: 'center', width: pillW });

    /* ── Score & Percentage ── */
    const scoreText = `Score: ${cert.score} / ${cert.total}   |   Percentage: ${cert.percentage}%`;
    doc.fillColor('#e2e8f0').font('Helvetica').fontSize(13)
      .text(scoreText, 0, 392, { align: 'center', width: W });

    /* ── Separator line ── */
    doc.moveTo(120, 420).lineTo(W - 120, 420)
      .strokeColor('#334155').lineWidth(1).stroke();

    /* ── Issue date ── */
    const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.fillColor('#64748b').font('Helvetica').fontSize(11)
      .text(`Issued: ${dateStr}`, 100, 428);

    /* ── Cert ID ── */
    doc.fillColor('#475569').font('Helvetica').fontSize(10)
      .text(`Certificate ID: ${cert.certId}`, 0, 430, { align: 'center', width: W });

    /* ── Signature ── */
    doc.fillColor('#94a3b8').font('Helvetica-Oblique').fontSize(11)
      .text('Authorised by — Knowledge Hub Administration', W - 300, 428, { width: 200, align: 'right' });

    /* ── QR Code ── */
    doc.image(qrBuffer, W - 160, 400, { width: 90 });
    doc.fillColor('#475569').font('Helvetica').fontSize(8)
      .text('Scan to verify', W - 160, 493, { width: 90, align: 'center' });

    /* ── Bottom accent ── */
    doc.rect(0, H - 8, W, 8).fill('#6366f1');

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Public verification (no auth) ───────────────────────── */
router.get('/verify/:certId', async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certId: req.params.certId })
      .lean();
    if (!cert) return res.status(404).json({ error: 'Certificate not found or invalid ID.' });
    res.json({
      valid:       true,
      certId:      cert.certId,
      studentName: cert.studentName,
      subject:     cert.subject,
      score:       `${cert.score}/${cert.total}`,
      percentage:  cert.percentage,
      issuedAt:    cert.issuedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Student: my certificates ────────────────────────────── */
router.get('/my', [auth, student], async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user._id })
      .sort({ issuedAt: -1 }).lean();
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Admin: all certificates ──────────────────────────────── */
router.get('/admin/all', [auth, admin], async (req, res) => {
  try {
    const certs = await Certificate.find()
      .sort({ issuedAt: -1 }).lean();
    res.json(certs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
