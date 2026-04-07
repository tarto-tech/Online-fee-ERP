import React, { useEffect, useState } from 'react';
import api from '../api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function FeeStatusPage({ user }) {
  const [feeStatus, setFeeStatus] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('breakdown');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feeRes, fsRes, payRes] = await Promise.all([
        api.get('/payments/my-fee-status'),
        api.get('/fee-structures/my-fee-structure'),
        api.get('/payments/my-payments'),
      ]);
      setFeeStatus(feeRes.data);
      setFeeStructure(fsRes.data.feeStructure);
      setPayments(payRes.data.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (installmentNumber = 1, isPartial = false) => {
    if (!feeStructure) return;
    setPayLoading(true);
    try {
      const split = feeStatus?.installmentSplit;
      const pct1 = split?.first ?? 50;
      const pct2 = split?.second ?? 50;
      // Always calculate from full effective fees — not pendingAmount
      const base = (feeStatus?.effectiveFees || 0) + (feeStatus?.lateFeeApplicable || 0);

      // Calculate amount to send for installments
      let amount;
      if (isPartial) {
        const pct = installmentNumber === 1 ? pct1 : pct2;
        amount = Math.ceil((base * pct) / 100);
      }

      const orderRes = await api.post('/payments/create-order', {
        feeStructureId: feeStructure._id,
        installmentNumber,
        isPartialPayment: isPartial,
        ...(isPartial && amount > 0 && { amount }),
      });
      const { orderId, amount, keyId, studentName, studentEmail, studentMobile } = orderRes.data;
      const options = {
        key: keyId, amount, currency: 'INR', order_id: orderId,
        name: 'Kalpataru First Grade Science College',
        description: `Fee Payment — ${feeStructure.course?.name} Year ${feeStructure.year}`,
        prefill: { name: studentName, email: studentEmail, contact: `+91${studentMobile}` },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            alert('✅ Payment successful! Receipt generated.');
            loadData();
          } catch (err) {
            alert('❌ Verification failed: ' + err.message);
          }
        },
        modal: { ondismiss: () => setPayLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => { alert('❌ Payment failed: ' + r.error.description); setPayLoading(false); });
      rzp.open();
    } catch (err) {
      alert('Error: ' + err.message);
      setPayLoading(false);
    }
  };

  const handleDownload = async (paymentId, receiptNumber) => {
    try {
      const res = await fetch(`/api/payments/receipt/${paymentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('studentToken')}` },
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `receipt-${receiptNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading receipt: ' + err.message);
    }
  };

  if (loading) return <div style={S.centered}><div style={S.spinner} /><p style={{ color: '#6b7280', marginTop: 12 }}>Loading fee details...</p></div>;
  if (error) return <div style={S.centered}><p style={{ color: '#ef4444' }}>⚠️ {error}</p><button onClick={loadData} style={S.retryBtn}>Retry</button></div>;

  // Graduated student
  if (feeStatus?.graduated) return (
    <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Congratulations, Graduate!</div>
      <div style={{ color: '#6b7280', fontSize: 14 }}>{feeStatus.message}</div>
    </div>
  );

  // No fee structure configured yet
  if (feeStatus?.noStructure) return (
    <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Fee Structure Not Configured</div>
      <div style={{ color: '#6b7280', fontSize: 14 }}>{feeStatus.message}</div>
    </div>
  );

  const { totalFees = 0, discountAmount = 0, discountReason = null, effectiveFees = 0, paidAmount = 0, pendingAmount = 0, lateFeeApplicable = 0 } = feeStatus || {};
  const progress = effectiveFees > 0 ? Math.min((paidAmount / effectiveFees) * 100, 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary Cards */}
      <div style={S.statsRow} className="stats-row">
        {[
          { label: 'Total Fees', value: fmt(totalFees), color: '#4f46e5', bg: '#eef2ff', icon: '📋' },
          { label: discountAmount > 0 ? `Waiver (${discountReason || 'Discount'})` : 'Payable Fees', value: discountAmount > 0 ? `- ${fmt(discountAmount)}` : fmt(pendingAmount), color: discountAmount > 0 ? '#16a34a' : pendingAmount > 0 ? '#f59e0b' : '#10b981', bg: discountAmount > 0 ? '#f0fdf4' : pendingAmount > 0 ? '#fef3c7' : '#d1fae5', icon: discountAmount > 0 ? '🏷' : '💰' },
          { label: 'Paid', value: fmt(paidAmount), color: '#10b981', bg: '#d1fae5', icon: '✅' },
          { label: 'Pending', value: fmt(pendingAmount), color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
        ].map((s) => (
          <div key={s.label} style={{ ...S.statCard, background: s.bg }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: '#6b7280', fontWeight: 500 }}>Payment Progress</span>
          <span style={{ fontWeight: 700, color: '#4f46e5' }}>{progress.toFixed(1)}%</span>
        </div>
        <div style={S.progressBg}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
          <span>Paid: {fmt(paidAmount)}</span>
          <span>Remaining: {fmt(pendingAmount)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {[['breakdown', '📋 Fee Breakdown'], ['history', `🧾 Payment History (${payments.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ ...S.tabBtn, ...(tab === id ? S.tabActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {/* Fee Breakdown Tab */}
      {tab === 'breakdown' && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {feeStructure?.course?.name}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            {feeStructure?.course?.code} · Year {feeStructure?.year} · {feeStructure?.academicYear}
          </div>

          <table style={S.table}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={S.th}>Fee Component</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody style={{ display: 'table-row-group' }}>
              {feeStatus?.feeComponents?.map((comp, i) => (
                <tr key={i} style={S.tr}>
                  <td style={S.td}>{comp.name}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{fmt(comp.amount)}</td>
                </tr>
              ))}
              {discountAmount > 0 && (
                <tr style={{ background: '#f0fdf4' }}>
                  <td style={{ ...S.td, color: '#16a34a', fontWeight: 600 }}>🏷 Fee Waiver {discountReason ? `(${discountReason})` : ''}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>- {fmt(discountAmount)}</td>
                </tr>
              )}
              {lateFeeApplicable > 0 && (
                <tr style={{ background: '#fff7ed' }}>
                  <td style={{ ...S.td, color: '#d97706' }}>⚠️ Late Fee</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: '#d97706' }}>{fmt(lateFeeApplicable)}</td>
                </tr>
              )}
              <tr style={{ background: '#f0f9ff' }}>
                <td style={{ ...S.td, fontWeight: 800, fontSize: 15 }}>Payable Total</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#1e1b4b' }}>{fmt(effectiveFees + lateFeeApplicable)}</td>
              </tr>
            </tbody>
          </table>

          {/* Due Dates */}
          {(feeStructure?.dueDateFirstInstallment || feeStructure?.dueDateSecondInstallment) && (
            <div style={S.dueDates}>
              {feeStructure?.dueDateFirstInstallment && (
                <div style={S.dueItem}>
                  <span style={S.dueLabel}>1st Installment Due</span>
                  <span style={S.dueValue}>{new Date(feeStructure.dueDateFirstInstallment).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
              {feeStructure?.dueDateSecondInstallment && (
                <div style={S.dueItem}>
                  <span style={S.dueLabel}>2nd Installment Due</span>
                  <span style={S.dueValue}>{new Date(feeStructure.dueDateSecondInstallment).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}

          {/* Pay Buttons */}
          {pendingAmount > 0 ? (
            <div style={S.paySection}>
              <button onClick={() => handlePay(1, false)} disabled={payLoading} style={S.payBtn}>
                {payLoading ? '⏳ Processing...' : `💳 Pay Full Amount — ${fmt(pendingAmount + lateFeeApplicable)}`}
              </button>

              {/* Installment buttons — track which installments already paid */}
              {(() => {
                const inst1Paid = payments.some((p) => p.isPartialPayment && p.installmentNumber === 1);
                const inst2Paid = payments.some((p) => p.isPartialPayment && p.installmentNumber === 2);

                // Fixed installment amounts based on TOTAL effective fees (not pendingAmount)
                const split = feeStatus?.installmentSplit;
                const pct1 = split?.first ?? 50;
                const pct2 = split?.second ?? 50;
                const base = effectiveFees + lateFeeApplicable;
                const amt1 = Math.ceil((base * pct1) / 100);
                const amt2 = Math.ceil((base * pct2) / 100);

                // Both paid via installments — nothing to show
                if (inst1Paid && inst2Paid) return null;

                return (
                  <div style={S.installRow}>
                    {/* 1st installment — show only if not yet paid */}
                    {!inst1Paid && (
                      <button onClick={() => handlePay(1, true)} disabled={payLoading} style={S.installBtn}>
                        Pay 1st Installment ({pct1}%) — {fmt(amt1)}
                      </button>
                    )}
                    {inst1Paid && (
                      <div style={S.installPaid}>✅ 1st Installment Paid — {fmt(amt1)}</div>
                    )}

                    {/* 2nd installment — show only if 1st is paid and 2nd not yet paid */}
                    {inst1Paid && !inst2Paid && (
                      <button onClick={() => handlePay(2, true)} disabled={payLoading} style={S.installBtn}>
                        Pay 2nd Installment ({pct2}%) — {fmt(amt2)}
                      </button>
                    )}
                    {!inst1Paid && (
                      <div style={{ ...S.installPaid, background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb' }}>
                        🔒 2nd Installment — {fmt(amt2)}
                        <div style={{ fontSize: 10, marginTop: 2 }}>Pay 1st installment first</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <p style={S.secureNote}>🔒 Secured by Razorpay · UPI · Cards · Net Banking · Wallets</p>
            </div>
          ) : (
            <div style={S.paidBadge}>🎉 All fees paid for {feeStructure?.academicYear}!</div>
          )}
        </div>
      )}

      {/* Payment History Tab */}
      {tab === 'history' && (
        <div style={S.card}>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🧾</div>
              <p>No payments made yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ ...S.table, display: 'table', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={S.th}>Receipt No</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Method</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} style={S.tr}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{p.receiptNumber}</td>
                    <td style={S.td}>
                      <span style={{ ...S.chip, background: '#eef2ff', color: '#4f46e5' }}>
                        {p.isPartialPayment ? `Installment ${p.installmentNumber}` : 'Full Payment'}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontWeight: 700, color: '#10b981' }}>{fmt(p.amountInRupees)}</td>
                    <td style={{ ...S.td, textTransform: 'capitalize' }}>{p.paymentMethod || '—'}</td>
                    <td style={{ ...S.td, color: '#6b7280', fontSize: 13 }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={S.td}>
                      <button onClick={() => handleDownload(p._id, p.receiptNumber)} style={S.downloadBtn}>
                        ⬇ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: '20px' },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  retryBtn: { marginTop: 12, padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  statCard: { borderRadius: 12, padding: '14px', textAlign: 'center', minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  card: { background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' },
  progressBg: { background: '#e5e7eb', borderRadius: 8, height: 10, overflow: 'hidden' },
  progressFill: { background: 'linear-gradient(90deg, #4f46e5, #10b981)', height: '100%', borderRadius: 8, transition: 'width 0.6s ease' },
  tabBar: { display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  tabBtn: { flex: 1, minWidth: 'fit-content', padding: '9px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: 'transparent', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' },
  tabActive: { background: '#fff', color: '#4f46e5', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, overflowX: 'auto', display: 'block' },
  th: { padding: '10px 8px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #e5e7eb', letterSpacing: '0.4px', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f3f4f6', display: 'table-row' },
  td: { padding: '10px 8px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' },
  chip: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  dueDates: { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  dueItem: { flex: '1 1 160px', minWidth: 140, background: '#f9fafb', borderRadius: 10, padding: '10px 12px', border: '1px solid #e5e7eb' },
  dueLabel: { display: 'block', fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
  dueValue: { fontSize: 13, fontWeight: 700, color: '#374151' },
  paySection: { marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 },
  payBtn: { padding: '14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' },
  installRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 },
  installBtn: { padding: '11px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  installPaid: { padding: '11px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: 'center' },
  secureNote: { textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 4 },
  paidBadge: { marginTop: 16, padding: 14, background: '#d1fae5', borderRadius: 12, textAlign: 'center', color: '#065f46', fontWeight: 700, fontSize: 14 },
  downloadBtn: { padding: '5px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' },
};
