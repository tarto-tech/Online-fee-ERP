import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { feeWaiversAPI, studentsAPI, feeStructuresAPI } from '../../api';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

export default function WaiversPage() {
  const [showModal, setShowModal] = useState(false);
  const [editWaiver, setEditWaiver] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['waivers'],
    queryFn: () => feeWaiversAPI.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: feeWaiversAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(['waivers']); toast.success('Waiver removed'); },
    onError: (err) => toast.error(err.message),
  });

  const waivers = data?.data?.waivers || [];
  const activeWaivers = waivers.filter((w) => w.isActive);
  const totalDiscount = activeWaivers.reduce((sum, w) => sum + w.discountAmount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fee Waivers</div>
          <div className="page-subtitle">{activeWaivers.length} active waivers · Total discount {fmt(totalDiscount)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Grant Waiver</button>
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Course / Year</th>
                <th>Academic Year</th>
                <th>Original Fee</th>
                <th>Discount</th>
                <th>Payable Fee</th>
                <th>Reason</th>
                <th>Granted By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="table-empty">Loading waivers...</td></tr>
              ) : waivers.length === 0 ? (
                <tr><td colSpan={10} className="table-empty">No waivers granted yet</td></tr>
              ) : waivers.map((w) => (
                <tr key={w._id} style={{ opacity: w.isActive ? 1 : 0.5 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.student?.name}</div>
                    <div className="text-xs text-muted">{w.student?.usn || w.student?.studentId}</div>
                    <div className="text-xs text-muted">{w.student?.email}</div>
                  </td>
                  <td>
                    <div>{w.student?.course?.name}</div>
                    <div className="text-xs text-muted">Year {w.student?.currentYear}</div>
                  </td>
                  <td>{w.feeStructure?.academicYear}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt(w.feeStructure?.totalAmount)}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>- {fmt(w.discountAmount)}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {fmt((w.feeStructure?.totalAmount || 0) - w.discountAmount)}
                  </td>
                  <td>
                    <div style={{ maxWidth: 180, fontSize: 13 }}>{w.reason}</div>
                    {w.installmentSplit && (
                      <div style={{ fontSize: 11, marginTop: 4, color: '#4f46e5', fontWeight: 600 }}>
                        Split: {w.installmentSplit.first}% / {w.installmentSplit.second}%
                      </div>
                    )}
                  </td>
                  <td className="text-secondary text-sm">{w.grantedBy?.name || w.grantedBy?.email}</td>
                  <td>
                    <span className={`badge ${w.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {w.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {w.isPaid ? (
                        <span className="badge badge-success" style={{ padding: '5px 10px' }}>🔒 Paid — Locked</span>
                      ) : (
                        <>
                          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 13 }}
                            onClick={() => setEditWaiver(w)}>Edit</button>
                          <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                            disabled={deleteMutation.isPending}
                            onClick={() => { if (window.confirm('Remove this waiver?')) deleteMutation.mutate(w._id); }}>
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <WaiverModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { queryClient.invalidateQueries(['waivers']); setShowModal(false); }}
        />
      )}

      {editWaiver && (
        <EditWaiverModal
          waiver={editWaiver}
          onClose={() => setEditWaiver(null)}
          onSuccess={() => { queryClient.invalidateQueries(['waivers']); setEditWaiver(null); }}
        />
      )}
    </div>
  );
}

function WaiverModal({ onClose, onSuccess }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [fsLoading, setFsLoading] = useState(false);
  const [fsError, setFsError] = useState(null);

  const { data: studentsData } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => studentsAPI.getAll({ search: studentSearch, limit: 10, isActive: 'true' }),
    enabled: studentSearch.length > 1,
  });

  const students = studentsData?.data?.students || [];
  const discountAmount = parseFloat(watch('discountAmount')) || 0;

  const handleSelectStudent = async (s) => {
    setSelectedStudent(s);
    setStudentSearch(s.name);
    setFeeStructure(null);
    setFsError(null);
    setFsLoading(true);
    try {
      const res = await feeStructuresAPI.getAll({
        course: s.course._id,
        year: s.currentYear,
        academicYear: s.academicYear,
      });
      const fs = res?.data?.feeStructures?.[0];
      if (fs) setFeeStructure(fs);
      else setFsError(`No fee structure found for ${s.course?.name} Year ${s.currentYear} (${s.academicYear})`);
    } catch {
      setFsError('Failed to load fee structure');
    } finally {
      setFsLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    try {
      const first = parseInt(formData.splitFirst);
      const second = parseInt(formData.splitSecond);
      const hasSplit = formData.enableSplit && first && second;
      if (hasSplit && first + second !== 100) {
        toast.error('Installment split must add up to 100%'); return;
      }
      await feeWaiversAPI.create({
        studentId: selectedStudent._id,
        feeStructureId: feeStructure._id,
        discountAmount: parseFloat(formData.discountAmount),
        reason: formData.reason,
        ...(hasSplit && { installmentSplit: { first, second } }),
      });
      toast.success('Fee waiver granted successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Grant Fee Waiver</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form id="waiver-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Search Student *</label>
              <input className="form-control w-full" placeholder="Type name, USN or mobile..."
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setFeeStructure(null); setFsError(null); }} />
              {students.length > 0 && !selectedStudent && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, background: '#fff', boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto' }}>
                  {students.map((s) => (
                    <div key={s._id}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      onClick={() => handleSelectStudent(s)}>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span className="text-muted" style={{ marginLeft: 8 }}>{s.usn || s.studentId}</span>
                      <span className="text-muted" style={{ marginLeft: 8 }}>{s.course?.name} · Year {s.currentYear} · {s.academicYear}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-resolved fee structure */}
            {fsLoading && (
              <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                Loading fee structure...
              </div>
            )}
            {fsError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                ⚠ {fsError}
              </div>
            )}
            {feeStructure && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Fee Structure Auto-Selected</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span><strong>Course:</strong> {selectedStudent?.course?.name}</span>
                  <span><strong>Year:</strong> {feeStructure.year}</span>
                  <span><strong>Academic Year:</strong> {feeStructure.academicYear}</span>
                  <span><strong>Total Fee:</strong> {fmt(feeStructure.totalAmount)}</span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {feeStructure.components?.map((c, i) => (
                    <span key={i} style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.name}: <strong>{fmt(c.amount)}</strong></span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Discount Amount (₹) *</label>
                <input type="number" className="form-control w-full" placeholder="e.g. 5000" min="1"
                  disabled={!feeStructure}
                  {...register('discountAmount', { required: 'Required', min: { value: 1, message: 'Min ₹1' } })} />
                {errors.discountAmount && <p className="form-error">{errors.discountAmount.message}</p>}
                {feeStructure && discountAmount > 0 && (
                  <p className="form-hint">Payable: <strong>{fmt(feeStructure.totalAmount - discountAmount)}</strong> (original: {fmt(feeStructure.totalAmount)})</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <input className="form-control w-full" placeholder="e.g. Merit scholarship, Financial hardship..."
                  disabled={!feeStructure}
                  {...register('reason', { required: 'Required' })} />
                {errors.reason && <p className="form-error">{errors.reason.message}</p>}
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" {...register('enableSplit')} disabled={!feeStructure} />
                Set custom installment split (default is 50% / 50%)
              </label>
            </div>
            {watch('enableSplit') && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">1st Installment %</label>
                  <input type="number" className="form-control w-full" placeholder="e.g. 60" min="1" max="99"
                    {...register('splitFirst', { required: 'Required', min: 1, max: 99 })} />
                  {errors.splitFirst && <p className="form-error">{errors.splitFirst.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">2nd Installment %</label>
                  <input type="number" className="form-control w-full" placeholder="e.g. 40" min="1" max="99"
                    {...register('splitSecond', { required: 'Required', min: 1, max: 99 })} />
                  {errors.splitSecond && <p className="form-error">{errors.splitSecond.message}</p>}
                </div>
                {(() => {
                  const f = parseInt(watch('splitFirst')) || 0;
                  const s = parseInt(watch('splitSecond')) || 0;
                  const total = f + s;
                  return (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className={`form-hint`} style={{ color: total === 100 ? '#16a34a' : '#dc2626' }}>
                        {total === 100 ? `✅ Split: ${f}% + ${s}% = 100%` : `⚠️ Total is ${total}% — must equal 100%`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="waiver-form" type="submit"
            disabled={isSubmitting || !selectedStudent || !feeStructure}>
            {isSubmitting ? 'Granting...' : '✓ Grant Waiver'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWaiverModal({ waiver, onClose, onSuccess }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      discountAmount: waiver.discountAmount,
      reason: waiver.reason,
      isActive: waiver.isActive,
      enableSplit: !!waiver.installmentSplit,
      splitFirst: waiver.installmentSplit?.first ?? 50,
      splitSecond: waiver.installmentSplit?.second ?? 50,
    },
  });

  const onSubmit = async (data) => {
    try {
      const first = parseInt(data.splitFirst);
      const second = parseInt(data.splitSecond);
      const hasSplit = data.enableSplit && first && second;
      if (hasSplit && first + second !== 100) {
        toast.error('Installment split must add up to 100%'); return;
      }
      await feeWaiversAPI.update(waiver._id, {
        discountAmount: parseFloat(data.discountAmount),
        reason: data.reason,
        isActive: data.isActive === 'true' || data.isActive === true,
        installmentSplit: hasSplit ? { first, second } : null,
      });
      toast.success('Waiver updated');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Edit Waiver — {waiver.student?.name}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form id="edit-waiver-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Discount Amount (₹) *</label>
              <input type="number" className="form-control w-full" min="1"
                {...register('discountAmount', { required: 'Required', min: 1 })} />
              {errors.discountAmount && <p className="form-error">{errors.discountAmount.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <input className="form-control w-full"
                {...register('reason', { required: 'Required' })} />
              {errors.reason && <p className="form-error">{errors.reason.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control w-full" {...register('isActive')}>
                <option value="true">Active</option>
                <option value="false">Revoked</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" {...register('enableSplit')} />
                Set custom installment split (default is 50% / 50%)
              </label>
            </div>
            {watch('enableSplit') && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">1st Installment %</label>
                  <input type="number" className="form-control w-full" min="1" max="99"
                    {...register('splitFirst', { required: 'Required', min: 1, max: 99 })} />
                  {errors.splitFirst && <p className="form-error">{errors.splitFirst.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">2nd Installment %</label>
                  <input type="number" className="form-control w-full" min="1" max="99"
                    {...register('splitSecond', { required: 'Required', min: 1, max: 99 })} />
                  {errors.splitSecond && <p className="form-error">{errors.splitSecond.message}</p>}
                </div>
                {(() => {
                  const f = parseInt(watch('splitFirst')) || 0;
                  const s = parseInt(watch('splitSecond')) || 0;
                  const total = f + s;
                  return (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p className="form-hint" style={{ color: total === 100 ? '#16a34a' : '#dc2626' }}>
                        {total === 100 ? `✅ Split: ${f}% + ${s}% = 100%` : `⚠️ Total is ${total}% — must equal 100%`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="edit-waiver-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
