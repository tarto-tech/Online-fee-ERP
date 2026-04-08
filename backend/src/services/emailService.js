const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

exports.sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(`Email skipped — SMTP not configured (to: ${to})`);
    return;
  }
  const transporter = createTransporter();
  const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  logger.info(`Email sent to ${to} — messageId: ${info.messageId}`);
  return info;
};

exports.verifyConnection = async () => {
  const transporter = createTransporter();
  await transporter.verify();
  logger.info('SMTP connection verified successfully');
};
