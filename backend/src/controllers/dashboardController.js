const Payment = require('../models/Payment');
const Student = require('../models/Student');
const FeeStructure = require('../models/FeeStructure');
const FeeWaiver = require('../models/FeeWaiver');
const catchAsync = require('../utils/catchAsync');
const { generateCSVReport } = require('../services/reportService');

exports.getDashboardStats = catchAsync(async (req, res) => {
  const { academicYear, course, year } = req.query;

  // ── Build student filter (DON'T filter by academicYear for totals) ──────
  const studentFilter = { isActive: true };
  if (course) studentFilter.course = course;
  if (year) studentFilter.currentYear = parseInt(year);
  // Note: We don't filter by academicYear here to show ALL years data

  // ── Build fee structure filter (get ALL active fee structures) ───────────
  const fsFilter = { isActive: true };
  if (course) fsFilter.course = course;
  if (year) fsFilter.year = parseInt(year);
  // Note: We get ALL academic years' fee structures

  // ── Build payment filter (ALL paid payments) ─────────────────────────────
  const paymentMatch = { status: 'paid' };

  const [
    totalStudents,
    totalCollection,
    recentPayments,
    collectionByCourse,
    feeStructures,
    allActiveStudents,
    allWaivers,
    paidPayments,
    failedCount,
    academicYears,
  ] = await Promise.all([
    Student.countDocuments(studentFilter),

    Payment.aggregate([
      { $match: paymentMatch },
      { $group: { _id: null, total: { $sum: '$amountInRupees' } } },
    ]),

    Payment.find(paymentMatch)
      .sort({ paidAt: -1 })
      .limit(10)
      .populate('student', 'name studentId')
      .select('receiptNumber amountInRupees paidAt student feeSnapshot'),

    Payment.aggregate([
      { $match: paymentMatch },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' } },
      { $unwind: '$studentData' },
      { $lookup: { from: 'courses', localField: 'studentData.course', foreignField: '_id', as: 'courseData' } },
      { $unwind: '$courseData' },
      { $group: { _id: '$courseData._id', courseName: { $first: '$courseData.name' }, totalCollection: { $sum: '$amountInRupees' }, paymentCount: { $sum: 1 } } },
      { $sort: { totalCollection: -1 } },
    ]),

    FeeStructure.find(fsFilter).populate('course', 'name code').lean(),

    // lean() + only needed fields — no mongoose overhead
    Student.find(studentFilter)
      .select('_id course currentYear academicYear name studentId usn email mobile academicHistory')
      .lean(),

    FeeWaiver.find({ isActive: true }).select('student feeStructure discountAmount').lean(),

    // Single query for all paid payments — no N+1
    Payment.find({ status: 'paid' }).select('student feeStructure amountInRupees').lean(),

    Payment.countDocuments({ status: 'failed' }),

    // Get all distinct academic years for filter dropdown
    Student.distinct('academicYear'),
  ]);

  // ── Build lookup maps ─────────────────────────────────────────────────────
  const fsMap = {};
  feeStructures.forEach((fs) => {
    fsMap[`${fs.course._id}_${fs.year}_${fs.academicYear}`] = { id: fs._id.toString(), total: fs.totalAmount, courseName: fs.course.name };
  });

  const waiverMap = {};
  allWaivers.forEach((w) => {
    waiverMap[`${w.student}_${w.feeStructure}`] = w.discountAmount;
  });

  const paidMap = {};
  paidPayments.forEach((p) => {
    const key = `${p.student}_${p.feeStructure}`;
    paidMap[key] = (paidMap[key] || 0) + p.amountInRupees;
  });

  // ── Per-student calculation (ALL academic years) ─────────────────────────
  let totalExpected = 0;
  let totalWaivers = 0;
  let totalPending = 0;
  let studentsPaid = 0;
  let studentsPending = 0;
  const defaulters = [];

  allActiveStudents.forEach((student) => {
    const fsKey = `${student.course}_${student.currentYear}_${student.academicYear}`;
    const fs = fsMap[fsKey];
    if (!fs) return;

    const waiver = waiverMap[`${student._id}_${fs.id}`] || 0;
    const paid = paidMap[`${student._id}_${fs.id}`] || 0;
    const effective = fs.total - waiver;
    const pending = Math.max(0, effective - paid);

    totalExpected += fs.total;
    totalWaivers += waiver;
    totalPending += pending;

    if (pending === 0) {
      studentsPaid++;
    } else {
      studentsPending++;
      defaulters.push({
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        usn: student.usn,
        email: student.email,
        mobile: student.mobile,
        academicYear: student.academicYear,
        currentYear: student.currentYear,
        courseName: fs.courseName,
        totalFee: fs.total,
        waiver,
        paid,
        pending,
      });
    }
  });

  // ── Academic year breakdown table (ALL years including history) ──────────
  const yearBreakdown = {};
  const yearDetailedBreakdown = {}; // New: Detailed breakdown by year, course, and year level
  
  // Current year data
  allActiveStudents.forEach((student) => {
    const ay = student.academicYear;
    const fsKey = `${student.course}_${student.currentYear}_${ay}`;
    const fs = fsMap[fsKey];
    if (!fs) return;
    
    // Summary breakdown
    if (!yearBreakdown[ay]) {
      yearBreakdown[ay] = {
        academicYear: ay,
        totalFee: 0,
        collected: 0,
        pending: 0,
        students: 0,
        waiver: 0,
      };
    }
    const waiver = waiverMap[`${student._id}_${fs.id}`] || 0;
    const paid = paidMap[`${student._id}_${fs.id}`] || 0;
    const effective = fs.total - waiver;
    yearBreakdown[ay].totalFee += effective;
    yearBreakdown[ay].collected += paid;
    yearBreakdown[ay].pending += Math.max(0, effective - paid);
    yearBreakdown[ay].waiver += waiver;
    yearBreakdown[ay].students++;

    // Detailed breakdown by course and year
    const detailKey = `${ay}_${fs.courseName}_${student.currentYear}`;
    if (!yearDetailedBreakdown[detailKey]) {
      yearDetailedBreakdown[detailKey] = {
        academicYear: ay,
        courseName: fs.courseName,
        year: student.currentYear,
        totalFee: 0,
        collected: 0,
        pending: 0,
        waiver: 0,
        students: [],
      };
    }
    yearDetailedBreakdown[detailKey].totalFee += effective;
    yearDetailedBreakdown[detailKey].collected += paid;
    yearDetailedBreakdown[detailKey].pending += Math.max(0, effective - paid);
    yearDetailedBreakdown[detailKey].waiver += waiver;
    yearDetailedBreakdown[detailKey].students.push({
      name: student.name,
      studentId: student.studentId,
      usn: student.usn,
      totalFee: fs.total,
      waiver,
      paid,
      pending: Math.max(0, effective - paid),
    });
  });

  // Historical data from academicHistory
  allActiveStudents.forEach((student) => {
    if (!student.academicHistory || student.academicHistory.length === 0) return;
    
    student.academicHistory.forEach((history) => {
      const ay = history.academicYear;
      
      // Summary breakdown
      if (!yearBreakdown[ay]) {
        yearBreakdown[ay] = {
          academicYear: ay,
          totalFee: 0,
          collected: 0,
          pending: 0,
          students: 0,
          waiver: 0,
          isHistorical: true,
        };
      }
      
      if (history.feeSnapshot) {
        yearBreakdown[ay].totalFee += history.feeSnapshot.totalFee || 0;
        yearBreakdown[ay].collected += history.feeSnapshot.paidAmount || 0;
        yearBreakdown[ay].pending += history.feeSnapshot.pendingAmount || 0;
        yearBreakdown[ay].waiver += history.feeSnapshot.waiver || 0;
      }

      // Detailed breakdown
      const detailKey = `${ay}_${history.courseName}_${history.year}`;
      if (!yearDetailedBreakdown[detailKey]) {
        yearDetailedBreakdown[detailKey] = {
          academicYear: ay,
          courseName: history.courseName,
          courseCode: history.courseCode,
          year: history.year,
          totalFee: 0,
          collected: 0,
          pending: 0,
          waiver: 0,
          students: [],
          isHistorical: true,
        };
      }
      if (history.feeSnapshot) {
        yearDetailedBreakdown[detailKey].totalFee += history.feeSnapshot.totalFee || 0;
        yearDetailedBreakdown[detailKey].collected += history.feeSnapshot.paidAmount || 0;
        yearDetailedBreakdown[detailKey].pending += history.feeSnapshot.pendingAmount || 0;
        yearDetailedBreakdown[detailKey].waiver += history.feeSnapshot.waiver || 0;
        yearDetailedBreakdown[detailKey].students.push({
          name: student.name,
          studentId: student.studentId,
          usn: student.usn,
          totalFee: history.feeSnapshot.totalFee || 0,
          waiver: history.feeSnapshot.waiver || 0,
          paid: history.feeSnapshot.paidAmount || 0,
          pending: history.feeSnapshot.pendingAmount || 0,
        });
      }
    });
  });

  // Convert detailed breakdown to array and group by academic year
  const yearDetailedArray = Object.values(yearDetailedBreakdown);
  const groupedByYear = {};
  yearDetailedArray.forEach((item) => {
    if (!groupedByYear[item.academicYear]) {
      groupedByYear[item.academicYear] = [];
    }
    groupedByYear[item.academicYear].push(item);
  });

  // Sort each group by course and year
  Object.keys(groupedByYear).forEach((ay) => {
    groupedByYear[ay].sort((a, b) => {
      if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
      return a.year - b.year;
    });
  });

  const totalPaid = totalCollection[0]?.total || 0;

  res.json({
    status: 'success',
    data: {
      totalStudents,
      totalCollection: totalPaid,
      totalExpected,
      totalWaivers,
      pendingCollection: totalPending,
      paymentsByStatus: {
        paid: { count: studentsPaid },
        pending: { count: studentsPending },
        failed: { count: failedCount },
      },
      defaulters: defaulters.sort((a, b) => b.pending - a.pending),
      yearBreakdown: Object.values(yearBreakdown).sort((a, b) => b.academicYear.localeCompare(a.academicYear)),
      yearDetailedBreakdown: groupedByYear,
      academicYears: academicYears.sort((a, b) => b.localeCompare(a)),
      recentPayments,
      collectionByCourse,
    },
  });
});

exports.exportPaymentsCSV = catchAsync(async (req, res) => {
  const filter = { status: 'paid' };
  if (req.query.course) {
    const students = await Student.find({ course: req.query.course }).select('_id');
    filter.student = { $in: students.map((s) => s._id) };
  }
  if (req.query.from) filter.paidAt = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.paidAt = { ...filter.paidAt, $lte: new Date(req.query.to) };

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="payments-${Date.now()}.csv"`,
    'Transfer-Encoding': 'chunked',
  });

  // Stream header row immediately
  const headers = ['Receipt No','Student ID','Student Name','Mobile','Email','Course','Year','Academic Year','Amount (\u20b9)','Payment Method','Transaction ID','Paid At','Status'];
  const escape = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
  };
  res.write(headers.map(escape).join(',') + '\n');

  // Stream rows using mongoose cursor — never loads all into memory
  const cursor = Payment.find(filter)
    .populate({ path: 'student', select: 'name studentId mobile email', populate: { path: 'course', select: 'name code' } })
    .sort({ paidAt: -1 })
    .select('-razorpaySignature')
    .cursor();

  for await (const p of cursor) {
    const row = [
      p.receiptNumber,
      p.student?.studentId || '',
      p.student?.name || '',
      p.student?.mobile || '',
      p.student?.email || '',
      p.student?.course?.name || p.feeSnapshot?.courseName || '',
      p.feeSnapshot?.year || '',
      p.feeSnapshot?.academicYear || '',
      p.amountInRupees,
      p.paymentMethod || '',
      p.razorpayPaymentId || '',
      p.paidAt ? new Date(p.paidAt).toISOString() : '',
      p.status,
    ];
    res.write(row.map(escape).join(',') + '\n');
  }

  res.end();
});

exports.getDefaulters = catchAsync(async (req, res) => {
  const { academicYear, course, year } = req.query;

  const studentFilter = { isActive: true };
  if (course) studentFilter.course = course;
  if (year) studentFilter.currentYear = parseInt(year);
  if (academicYear) studentFilter.academicYear = academicYear;

  const fsFilter = { isActive: true };
  if (academicYear) fsFilter.academicYear = academicYear;
  if (course) fsFilter.course = course;
  if (year) fsFilter.year = parseInt(year);

  const [feeStructures, allStudents, allWaivers, paidPayments] = await Promise.all([
    FeeStructure.find(fsFilter).populate('course', 'name code').lean(),
    Student.find(studentFilter).select('_id course currentYear academicYear name studentId usn email mobile').lean(),
    FeeWaiver.find({ isActive: true }).select('student feeStructure discountAmount').lean(),
    Payment.find({ status: 'paid' }).select('student feeStructure amountInRupees').lean(),
  ]);

  const fsMap = {};
  feeStructures.forEach((fs) => {
    fsMap[`${fs.course._id}_${fs.year}_${fs.academicYear}`] = { id: fs._id.toString(), total: fs.totalAmount, courseName: fs.course.name };
  });

  const waiverMap = {};
  allWaivers.forEach((w) => {
    waiverMap[`${w.student}_${w.feeStructure}`] = w.discountAmount;
  });

  const paidMap = {};
  paidPayments.forEach((p) => {
    const key = `${p.student}_${p.feeStructure}`;
    paidMap[key] = (paidMap[key] || 0) + p.amountInRupees;
  });

  const defaulters = [];
  allStudents.forEach((student) => {
    const fsKey = `${student.course}_${student.currentYear}_${student.academicYear}`;
    const fs = fsMap[fsKey];
    if (!fs) return;

    const waiver = waiverMap[`${student._id}_${fs.id}`] || 0;
    const paid = paidMap[`${student._id}_${fs.id}`] || 0;
    const effective = fs.total - waiver;
    const pending = Math.max(0, effective - paid);

    if (pending > 0) {
      defaulters.push({
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        usn: student.usn,
        email: student.email,
        mobile: student.mobile,
        academicYear: student.academicYear,
        currentYear: student.currentYear,
        courseName: fs.courseName,
        totalFee: fs.total,
        waiver,
        paid,
        pending,
      });
    }
  });

  res.json({
    status: 'success',
    results: defaulters.length,
    data: { defaulters: defaulters.sort((a, b) => b.pending - a.pending) },
  });
});
