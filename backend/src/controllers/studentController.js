const fs = require('fs');
const csv = require('csv-parser');
const Student = require('../models/Student');
const Course = require('../models/Course');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const STUDENT_PORTAL_URL = 'https://student-portal-flame-seven.vercel.app';

const sendWelcomeEmail = (student) => {
  return sendEmail({
    to: student.email,
    subject: 'Welcome to Kalpataru First Grade Science College — Your Account Details',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#4f46e5;padding:24px;text-align:center">
          <h2 style="color:#fff;margin:0">Welcome, ${student.name}!</h2>
          <p style="color:#c7d2fe;margin:6px 0 0">Kalpataru First Grade Science College, Tiptur</p>
        </div>
        <div style="padding:24px">
          <h3 style="margin-top:0">Your Account Details</h3>
          <table style="border-collapse:collapse;width:100%">
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Student ID</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${student.studentId}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Registered Mobile</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${student.mobile}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Course</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${student.course.name} (${student.course.code})</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:bold;border:1px solid #e5e7eb">Year</td>
              <td style="padding:10px 14px;border:1px solid #e5e7eb">${student.currentYear}</td>
            </tr>
          </table>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin-top:20px">
            <h4 style="margin:0 0 8px;color:#1d4ed8">📱 How to Login &amp; Pay Fees</h4>
            <p style="margin:0 0 10px;color:#1e40af">Use the link below to access your fee portal:</p>
            <a href="${STUDENT_PORTAL_URL}" 
               style="display:block;background:#4f46e5;color:#fff;text-align:center;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:12px">
              🎓 Open Fee Portal
            </a>
            <ol style="margin:0;padding-left:20px;color:#1e40af;font-size:13px">
              <li>Click the link above</li>
              <li>Enter your mobile number: <strong>${student.mobile}</strong></li>
              <li>Enter the OTP received on your phone</li>
              <li>View and pay your fees instantly</li>
            </ol>
          </div>

          <p style="color:#6b7280;font-size:12px;margin-top:20px;text-align:center">
            If you need help, contact Kalpataru First Grade Science College, Tiptur.
          </p>
        </div>
      </div>
    `,
  }).catch((err) => logger.error(`Welcome email failed for ${student.email}: ${err.message}`));
};

const buildFilter = (query) => {
  const filter = {};
  if (query.course) filter.course = query.course;
  if (query.year) filter.currentYear = query.year;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.isGraduated !== undefined) {
    filter.isGraduated = query.isGraduated === 'true';
  } else {
    filter.isGraduated = { $ne: true }; // default: hide graduated
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  }
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { studentId: { $regex: query.search, $options: 'i' } },
      { mobile: { $regex: query.search, $options: 'i' } },
      { usn: { $regex: query.search, $options: 'i' } },
    ];
  }
  return filter;
};

exports.createStudent = catchAsync(async (req, res) => {
  if (!req.body.studentId) {
    req.body.studentId = 'TEMP-' + Date.now().toString().slice(-6);
  }
  const student = await Student.create(req.body);
  await Course.findByIdAndUpdate(student.course, { $inc: { totalStudents: 1 } });
  await student.populate('course', 'name code');

  sendWelcomeEmail(student);

  res.status(201).json({ status: 'success', data: { student } });
});

exports.getAllStudents = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = buildFilter(req.query);
  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-otp -otpExpiry'),
    Student.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    results: students.length,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data: { students },
  });
});

exports.getStudent = catchAsync(async (req, res, next) => {
  const student = await Student.findById(req.params.id)
    .populate('course', 'name code duration')
    .select('-otp -otpExpiry');
  if (!student) return next(new AppError('Student not found', 404));
  res.json({ status: 'success', data: { student } });
});

exports.updateStudent = catchAsync(async (req, res, next) => {
  const { otp, otpExpiry, ...updateData } = req.body;
  const student = await Student.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('course', 'name code');
  if (!student) return next(new AppError('Student not found', 404));
  res.json({ status: 'success', data: { student } });
});

exports.deactivateStudent = catchAsync(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!student) return next(new AppError('Student not found', 404));
  await Course.findByIdAndUpdate(student.course, { $inc: { totalStudents: -1 } });
  res.json({ status: 'success', message: 'Student deactivated' });
});

exports.deleteStudent = catchAsync(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new AppError('Student not found', 404));
  if (student.isActive) return next(new AppError('Only inactive students can be deleted', 400));
  await Student.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Student permanently deleted' });
});

exports.promoteStudents = catchAsync(async (req, res, next) => {
  const { courseId, fromYear, toYear, newAcademicYear, forcePromote } = req.body;

  if (!courseId || !fromYear || !newAcademicYear)
    return next(new AppError('courseId, fromYear and newAcademicYear are required', 400));

  if (!/^\d{4}-\d{4}$/.test(newAcademicYear))
    return next(new AppError('newAcademicYear format must be YYYY-YYYY', 400));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError('Course not found', 404));

  const isFinalYear = parseInt(fromYear) === parseInt(course.duration);

  // Check for pending fees unless forcePromote is true
  if (!forcePromote) {
    const students = await Student.find({ course: courseId, currentYear: parseInt(fromYear), isActive: true });
    const FeeStructure = require('../models/FeeStructure');
    const FeeWaiver = require('../models/FeeWaiver');
    const Payment = require('../models/Payment');

    const feeStructure = await FeeStructure.findOne({
      course: courseId, year: parseInt(fromYear), isActive: true,
    });

    if (feeStructure) {
      const waivers = await FeeWaiver.find({ feeStructure: feeStructure._id, isActive: true }).select('student discountAmount');
      const payments = await Payment.find({ feeStructure: feeStructure._id, status: 'paid' }).select('student amountInRupees');

      const waiverMap = {};
      waivers.forEach((w) => { waiverMap[w.student.toString()] = w.discountAmount; });
      const paidMap = {};
      payments.forEach((p) => { paidMap[p.student.toString()] = (paidMap[p.student.toString()] || 0) + p.amountInRupees; });

      const pendingStudents = students.filter((s) => {
        const waiver = waiverMap[s._id.toString()] || 0;
        const paid = paidMap[s._id.toString()] || 0;
        return Math.max(0, feeStructure.totalAmount - waiver - paid) > 0;
      });

      if (pendingStudents.length > 0) {
        return res.status(200).json({
          status: 'pending_warning',
          message: `${pendingStudents.length} student${pendingStudents.length > 1 ? 's have' : ' has'} pending fees. Do you still want to promote?`,
          data: {
            pendingCount: pendingStudents.length,
            pendingStudents: pendingStudents.map((s) => ({
              name: s.name,
              studentId: s.studentId,
              usn: s.usn,
              pending: Math.max(0, feeStructure.totalAmount - (waiverMap[s._id.toString()] || 0) - (paidMap[s._id.toString()] || 0)),
            })),
          },
        });
      }
    }
  }

  if (isFinalYear) {
    // Graduate students - save history before graduating
    const students = await Student.find({
      course: courseId,
      currentYear: parseInt(fromYear),
      isActive: true,
      isGraduated: { $ne: true },
    }).populate('course', 'name code');

    const FeeStructure = require('../models/FeeStructure');
    const FeeWaiver = require('../models/FeeWaiver');
    const Payment = require('../models/Payment');
    const promotionBatchId = `GRAD-${Date.now()}`;

    // Get fee structure for current year
    const feeStructure = await FeeStructure.findOne({
      course: courseId,
      year: parseInt(fromYear),
      isActive: true,
    });

    // Get waivers and payments
    const waivers = feeStructure ? await FeeWaiver.find({ feeStructure: feeStructure._id, isActive: true }).select('student discountAmount') : [];
    const payments = feeStructure ? await Payment.find({ feeStructure: feeStructure._id, status: 'paid' }).select('student amountInRupees') : [];

    const waiverMap = {};
    waivers.forEach((w) => { waiverMap[w.student.toString()] = w.discountAmount; });
    const paidMap = {};
    payments.forEach((p) => { paidMap[p.student.toString()] = (paidMap[p.student.toString()] || 0) + p.amountInRupees; });

    for (const student of students) {
      // Check for duplicate history entry
      const isDuplicate = student.academicHistory.some(
        (h) => h.year === student.currentYear && h.academicYear === student.academicYear
      );
      
      if (!isDuplicate) {
        const totalFee = feeStructure?.totalAmount || 0;
        const waiver = waiverMap[student._id.toString()] || 0;
        const paidAmount = paidMap[student._id.toString()] || 0;
        const pendingAmount = Math.max(0, totalFee - waiver - paidAmount);

        student.academicHistory.push({
          year: student.currentYear,
          academicYear: student.academicYear,
          courseName: student.course.name,
          courseCode: student.course.code,
          courseId: student.course._id,
          feeSnapshot: {
            totalFee,
            paidAmount,
            waiver,
            pendingAmount,
          },
          status: 'graduated',
          promotedAt: new Date(),
          promotionBatchId,
        });
      }
      
      student.isActive = false;
      student.isGraduated = true;
      student.graduatedAt = new Date();
      await student.save();
    }

    await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: -students.length } });
    return res.json({
      status: 'success',
      message: `${students.length} students graduated from ${course.name} (${newAcademicYear})`,
      data: { graduated: students.length, promoted: 0, promotionBatchId },
    });
  }

  if (toYear !== fromYear + 1)
    return next(new AppError('toYear must be exactly one year ahead of fromYear', 400));

  // Promote students - save history before promoting
  const students = await Student.find({
    course: courseId,
    currentYear: parseInt(fromYear),
    isActive: true,
  }).populate('course', 'name code');

  const FeeStructure = require('../models/FeeStructure');
  const FeeWaiver = require('../models/FeeWaiver');
  const Payment = require('../models/Payment');
  const promotionBatchId = `PROMO-${Date.now()}`;

  // Get fee structure for current year
  const feeStructure = await FeeStructure.findOne({
    course: courseId,
    year: parseInt(fromYear),
    isActive: true,
  });

  // Get waivers and payments
  const waivers = feeStructure ? await FeeWaiver.find({ feeStructure: feeStructure._id, isActive: true }).select('student discountAmount') : [];
  const payments = feeStructure ? await Payment.find({ feeStructure: feeStructure._id, status: 'paid' }).select('student amountInRupees') : [];

  const waiverMap = {};
  waivers.forEach((w) => { waiverMap[w.student.toString()] = w.discountAmount; });
  const paidMap = {};
  payments.forEach((p) => { paidMap[p.student.toString()] = (paidMap[p.student.toString()] || 0) + p.amountInRupees; });

  for (const student of students) {
    // Check for duplicate history entry
    const isDuplicate = student.academicHistory.some(
      (h) => h.year === student.currentYear && h.academicYear === student.academicYear
    );
    
    if (!isDuplicate) {
      const totalFee = feeStructure?.totalAmount || 0;
      const waiver = waiverMap[student._id.toString()] || 0;
      const paidAmount = paidMap[student._id.toString()] || 0;
      const pendingAmount = Math.max(0, totalFee - waiver - paidAmount);

      student.academicHistory.push({
        year: student.currentYear,
        academicYear: student.academicYear,
        courseName: student.course.name,
        courseCode: student.course.code,
        courseId: student.course._id,
        feeSnapshot: {
          totalFee,
          paidAmount,
          waiver,
          pendingAmount,
        },
        status: 'promoted',
        promotedAt: new Date(),
        promotionBatchId,
      });
    }
    
    student.currentYear = parseInt(toYear);
    student.academicYear = newAcademicYear;
    await student.save();
  }

  res.json({
    status: 'success',
    message: `${students.length} students promoted from Year ${fromYear} to Year ${toYear} (${newAcademicYear})`,
    data: { promoted: students.length, graduated: 0, promotionBatchId },
  });
});

exports.bulkUpload = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a CSV file', 400));

  const { courseId, currentYear, academicYear } = req.body;
  if (!courseId) return next(new AppError('Please select a course', 400));
  if (!currentYear) return next(new AppError('Please select a year', 400));
  if (!academicYear) return next(new AppError('Please enter academic year', 400));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError('Course not found', 404));

  const ROW_LIMIT = 100;
  const results = [];
  const errors = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        if (results.length < ROW_LIMIT) results.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  fs.unlinkSync(req.file.path);

  if (results.length === 0)
    return next(new AppError('CSV file is empty', 400));

  const created = [];

  for (const [index, row] of results.entries()) {
    // Validate required fields per row before hitting DB
    if (!row.name || !row.email || !row.mobile) {
      errors.push({ row: index + 2, studentId: row.studentId, error: 'name, email and mobile are required' });
      continue;
    }
    try {
      const student = await Student.create({
        studentId: row.studentId || ('TEMP-' + Date.now().toString().slice(-6) + index),
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        course: courseId,
        currentYear: parseInt(currentYear),
        academicYear,
        rollNumber: row.rollNumber,
        guardianName: row.guardianName,
        guardianMobile: row.guardianMobile,
      });
      await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });
      await student.populate('course', 'name code');
      sendWelcomeEmail(student);
      created.push(student.studentId);
    } catch (err) {
      errors.push({ row: index + 2, studentId: row.studentId, error: err.message });
    }
  }

  res.status(207).json({
    status: 'success',
    message: `${created.length} students created, ${errors.length} failed${
      results.length === ROW_LIMIT ? ` (capped at ${ROW_LIMIT} rows — split into multiple uploads for larger batches)` : ''
    }`,
    data: { created: created.length, errors },
  });
});
