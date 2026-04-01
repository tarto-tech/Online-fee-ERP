exports.generateCSVReport = (payments) => {
  const headers = [
    'Receipt No',
    'Student ID',
    'Student Name',
    'Mobile',
    'Email',
    'Course',
    'Year',
    'Academic Year',
    'Amount (₹)',
    'Payment Method',
    'Transaction ID',
    'Paid At',
    'Status',
  ];

  const rows = payments.map((p) => [
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
  ]);

  const escape = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
};
