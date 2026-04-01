import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { paymentsAPI } from '../../api';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

const statusBadge = (status) => {
  if (status === 'paid') return <span className="badge badge-success">Paid</span>;
  if (status === 'failed') return <span className="badge badge-danger">Failed</span>;
  return <span className="badge badge-warning">Pending</span>;
};

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'paid', from: '', to: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, filters],
    queryFn: () => paymentsAPI.getAll({ page, limit: 20, ...filters }),
  });

  const handleExport = async () => {
    try {
      const blob = await paymentsAPI.exportCSV(filters);
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const payments = data?.data?.payments || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Payments</div>
          <div className="page-subtitle">{pagination?.total || 0} total transactions</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-success" onClick={handleExport}>↓ Export CSV</button>
        </div>
      </div>

      <div className="filters-bar">
        <select
          className="form-control"
          value={filters.status}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="created">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          From
          <input
            type="date" className="form-control"
            value={filters.from}
            onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          To
          <input
            type="date" className="form-control"
            value={filters.to}
            onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }}
          />
        </div>
        {(filters.from || filters.to || filters.status !== 'paid') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: 'paid', from: '', to: '' }); setPage(1); }}>
            ✕ Clear
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Student</th>
                <th>Course</th>
                <th>Installment</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="table-empty">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="table-empty">No payments found</td></tr>
              ) : payments.map((p) => (
                <tr key={p._id}>
                  <td className="text-mono">{p.receiptNumber || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.student?.name}</div>
                    <div className="text-xs text-muted">{p.student?.studentId}</div>
                  </td>
                  <td>
                    <div>{p.feeSnapshot?.courseName}</div>
                    <div className="text-xs text-muted">Year {p.feeSnapshot?.year} · {p.feeSnapshot?.academicYear}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {p.isPartialPayment ? `Installment ${p.installmentNumber}` : 'Full'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(p.amountInRupees)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.paymentMethod || '—'}</td>
                  <td className="text-secondary">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>{statusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="pagination">
            <span>Showing <strong>{payments.length}</strong> of <strong>{pagination.total}</strong> payments</span>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span className="page-current">Page {page} of {pagination.pages}</span>
              <button className="page-btn" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
