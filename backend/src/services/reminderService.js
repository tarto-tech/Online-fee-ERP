const Student = require('../models/Student');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN')}`;

const sendDueReminder = async (student, feeStructure, installment, dueDate, pendingAmount) => {
  const daysLeft = Math.ceil((new Date(dueDate) - Date.now()) / (1000 * 60 * 60 * 24));
  await sendEmail({
    to: student.email,
    subject: `Fee Due Reminder — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#f59e0b;padding:20px 24px;text-align:center">
          <h2 style="color:#fff;margin:0">⏳ Fee Due Reminder</h2>
          <p style="color:#fef3c7;margin:6px 0 0">Kalpataru First Grade Science College, Tiptur</p>
        </div>
        <div style="padding:24px">
          <p>Hi <strong>${student.name}</strong>,</p>
          <p>Your <strong>Installment ${installment}</strong> fee is due on <strong>${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Course</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${feeStructure.course?.name || ''} — Year ${feeStructure.year}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Academic Year</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${feeStructure.academicYear}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Pending Amount</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#d97706;font-weight:bold">${fmt(pendingAmount)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Due Date</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#ef4444;font-weight:bold">${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Please login to the student portal and pay before the due date to avoid late fees. — Kalpataru First Grade Science College, Tiptur</p>
        </div>
      </div>
    `,
  });
};

exports.sendDueDateReminders = async () => {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toDateString();

    // Find fee structures with due dates in next 3 days
    const feeStructures = await FeeStructure.find({
      isActive: true,
      $or: [
        { dueDateFirstInstallment: { $gte: now, $lte: in3Days } },
        { dueDateSecondInstallment: { $gte: now, $lte: in3Days } },
      ],
    }).populate('course', 'name code');

    let sent = 0;

    for (const fs of feeStructures) {
      const students = await Student.find({
        course: fs.course._id,
        currentYear: fs.year,
        academicYear: fs.academicYear,
        isActive: true,
        isGraduated: { $ne: true },
      });

      for (const student of students) {
        const payments = await Payment.find({ student: student._id, feeStructure: fs._id, status: 'paid' });
        const paidAmount = payments.reduce((sum, p) => sum + p.amountInRupees, 0);
        const pendingAmount = Math.max(0, fs.totalAmount - paidAmount);
        if (pendingAmount <= 0) continue;

        // Check installment 1
        if (fs.dueDateFirstInstallment && new Date(fs.dueDateFirstInstallment).toDateString() !== todayStr) {
          const d1 = new Date(fs.dueDateFirstInstallment);
          if (d1 >= now && d1 <= in3Days) {
            await sendDueReminder(student, fs, 1, d1, pendingAmount).catch((e) =>
              logger.error(`Reminder failed for ${student.email}: ${e.message}`)
            );
            sent++;
          }
        }

        // Check installment 2
        if (fs.dueDateSecondInstallment) {
          const d2 = new Date(fs.dueDateSecondInstallment);
          if (d2 >= now && d2 <= in3Days) {
            await sendDueReminder(student, fs, 2, d2, pendingAmount).catch((e) =>
              logger.error(`Reminder failed for ${student.email}: ${e.message}`)
            );
            sent++;
          }
        }
      }
    }

    logger.info(`Due date reminders sent: ${sent}`);
  } catch (err) {
    logger.error('Due date reminder job failed:', err.message);
  }
};
