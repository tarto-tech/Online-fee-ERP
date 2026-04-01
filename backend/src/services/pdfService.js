const PDFDocument = require('pdfkit');

exports.generateReceiptPDF = (payment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { student, feeSnapshot, receiptNumber, amountInRupees, paidAt, paymentMethod, razorpayPaymentId, lateFeeApplied } = payment;

    // Header
    doc
      .fontSize(22).font('Helvetica-Bold')
      .text('KALPATARU FIRST GRADE SCIENCE COLLEGE, TIPTUR', { align: 'center' })
      .fontSize(14).font('Helvetica')
      .text('Fee Payment Receipt', { align: 'center' })
      .moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    // Receipt Info
    const addRow = (label, value) => {
      doc.fontSize(10).font('Helvetica-Bold').text(label, 50, doc.y, { continued: true });
      doc.font('Helvetica').text(` ${value}`);
    };

    addRow('Receipt No:', receiptNumber);
    addRow('Payment Date:', new Date(paidAt).toLocaleDateString('en-IN', { dateStyle: 'long' }));
    addRow('Payment Method:', paymentMethod?.toUpperCase() || 'ONLINE');
    addRow('Transaction ID:', razorpayPaymentId || 'N/A');

    doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    // Student Info
    doc.fontSize(12).font('Helvetica-Bold').text('Student Details').moveDown(0.3);
    addRow('Name:', student.name);
    addRow('Student ID:', student.studentId);
    addRow('Course:', `${feeSnapshot.courseName} - Year ${feeSnapshot.year}`);
    addRow('Academic Year:', feeSnapshot.academicYear);

    doc.moveDown(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    // Fee Breakdown
    doc.fontSize(12).font('Helvetica-Bold').text('Fee Breakdown').moveDown(0.3);

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Component', 50, doc.y, { width: 350 });
    doc.text('Amount (Rs)', 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
    doc.moveDown(0.2).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.2);

    // Fee components
    doc.font('Helvetica');
    feeSnapshot.components.forEach((comp) => {
      doc.text(comp.name, 50, doc.y, { width: 350 });
      doc.text(`Rs ${comp.amount.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
      doc.moveDown(0.2);
    });

    // Waiver discount row
    if (feeSnapshot.discountAmount > 0) {
      doc.fillColor('#16a34a').font('Helvetica-Bold');
      doc.text(`Fee Waiver (${feeSnapshot.discountReason || 'Discount'})`, 50, doc.y, { width: 350 });
      doc.text(`- Rs ${feeSnapshot.discountAmount.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
      doc.fillColor('black').font('Helvetica').moveDown(0.2);
    }

    // Late fee row
    if (lateFeeApplied > 0) {
      doc.fillColor('#d97706').font('Helvetica');
      doc.text('Late Fee', 50, doc.y, { width: 350 });
      doc.text(`Rs ${lateFeeApplied.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });
      doc.fillColor('black').moveDown(0.2);
    }

    doc.moveDown(0.2).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.3);

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Amount Paid:', 50, doc.y, { width: 350 });
    doc.text(`Rs ${amountInRupees.toLocaleString('en-IN')}`, 400, doc.y - doc.currentLineHeight(), { width: 145, align: 'right' });

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('gray')
      .text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });

    doc.end();
  });
};
