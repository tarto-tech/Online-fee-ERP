import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { feeStructuresAPI, coursesAPI } from '../../api';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

export default function FeesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editFee, setEditFee] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [filters, setFilters] = useState({ course: '', year: '', academicYear: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fee-structures', filters, showInactive],
    queryFn: () => feeStructuresAPI.getAll({ ...filters, showInactive }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: feeStructuresAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-structures']);
      toast.success('Fee structure created');
      setShowModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => feeStructuresAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-structures']);
      toast.success('Fee structure updated');
      setEditFee(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: feeStructuresAPI.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-structures']);
      toast.success('Fee structure deactivated');
    },
    onError: (err) => toast.error(err.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: feeStructuresAPI.permanentDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(['fee-structures']);
      toast.success('Fee structure permanently deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const feeStructures = data?.data?.feeStructures || [];
  const courses = coursesData?.data?.courses || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fee Structures</div>
          <div className="page-subtitle">{feeStructures.length} structures configured</div>
        </div>
        <div className="header-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Fee Structure</button>
        </div>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={filters.course}
          onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="form-control" value={filters.year}
          onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}>
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <input className="form-control" placeholder="Academic Year e.g. 2024-2025"
          value={filters.academicYear}
          onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))} />
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Year</th>
                <th>Academic Year</th>
                <th>Fee Components</th>
                <th>Total Amount</th>
                <th>Late Fee</th>
                <th>Due Dates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="table-empty">Loading fee structures...</td></tr>
              ) : feeStructures.length === 0 ? (
                <tr><td colSpan={9} className="table-empty">No fee structures found</td></tr>
              ) : feeStructures.map((fs) => (
                <tr key={fs._id} style={{ opacity: fs.isActive ? 1 : 0.6 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{fs.course?.name}</div>
                    <div className="text-xs text-muted">{fs.course?.code}</div>
                  </td>
                  <td><span className="badge badge-primary">Year {fs.year}</span></td>
                  <td>{fs.academicYear}</td>
                  <td>
                    <div className="fee-components">
                      {fs.components?.map((comp, i) => (
                        <div key={i} className="fee-component-row">
                          <span>{comp.name}</span>
                          <span>{fmt(comp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>{fmt(fs.totalAmount)}</td>
                  <td className="text-secondary">{fs.lateFeePerDay ? `₹${fs.lateFeePerDay}/day` : '—'}</td>
                  <td>
                    {fs.dueDateFirstInstallment && (
                      <div className="text-xs" style={{ marginBottom: 2 }}>
                        <span className="text-muted">1st: </span>
                        {new Date(fs.dueDateFirstInstallment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    {fs.dueDateSecondInstallment && (
                      <div className="text-xs">
                        <span className="text-muted">2nd: </span>
                        {new Date(fs.dueDateSecondInstallment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    {!fs.dueDateFirstInstallment && !fs.dueDateSecondInstallment && '—'}
                  </td>
                  <td>
                    <span className={`badge ${fs.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {fs.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 13 }}
                        onClick={() => setEditFee(fs)}>Edit</button>
                      {fs.isActive ? (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                          disabled={deactivateMutation.isPending}
                          onClick={() => { if (window.confirm(`Deactivate fee structure for ${fs.course?.name} Year ${fs.year}?`)) deactivateMutation.mutate(fs._id); }}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#dc2626', color: '#fff', border: 'none' }}
                          disabled={permanentDeleteMutation.isPending}
                          onClick={() => { if (window.confirm(`Permanently delete this fee structure? This cannot be undone.`)) permanentDeleteMutation.mutate(fs._id); }}>
                          Delete
                        </button>
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
        <FeeStructureModal
          courses={courses}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {editFee && (
        <FeeStructureModal
          courses={courses}
          feeStructure={editFee}
          onClose={() => setEditFee(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editFee._id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function FeeStructureModal({ courses, feeStructure, onClose, onSubmit, isLoading }) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: feeStructure ? {
      course: feeStructure.course?._id,
      year: feeStructure.year,
      academicYear: feeStructure.academicYear,
      lateFeePerDay: feeStructure.lateFeePerDay || '',
      dueDateFirstInstallment: feeStructure.dueDateFirstInstallment ? feeStructure.dueDateFirstInstallment.slice(0, 10) : '',
      dueDateSecondInstallment: feeStructure.dueDateSecondInstallment ? feeStructure.dueDateSecondInstallment.slice(0, 10) : '',
      components: feeStructure.components?.length ? feeStructure.components : [{ name: '', amount: '' }],
    } : {
      components: [{ name: '', amount: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'components' });
  const components = watch('components');
  const total = components.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      year: parseInt(data.year),
      lateFeePerDay: parseFloat(data.lateFeePerDay) || 0,
      components: data.components.map((c) => ({ name: c.name, amount: parseFloat(c.amount) })),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{feeStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form id="fee-form" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-control w-full" {...register('course', { required: 'Required' })}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
                {errors.course && <p className="form-error">{errors.course.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Year *</label>
                <select className="form-control w-full" {...register('year', { required: 'Required' })}>
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                {errors.year && <p className="form-error">{errors.year.message}</p>}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <input className="form-control w-full" placeholder="2024-2025"
                  {...register('academicYear', { required: 'Required', pattern: { value: /^\d{4}-\d{4}$/, message: 'Format: 2024-2025' } })} />
                {errors.academicYear && <p className="form-error">{errors.academicYear.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Late Fee / Day (₹)</label>
                <input type="number" className="form-control w-full" placeholder="50" min="0"
                  {...register('lateFeePerDay')} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Due Date — 1st Installment</label>
                <input type="date" className="form-control w-full" {...register('dueDateFirstInstallment')} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date — 2nd Installment</label>
                <input type="date" className="form-control w-full" {...register('dueDateSecondInstallment')} />
              </div>
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Fee Components *</label>
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => append({ name: '', amount: '' })}>
                + Add Component
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="component-row">
                <input className="form-control" placeholder="e.g. Tuition Fee"
                  {...register(`components.${index}.name`, { required: true })} />
                <input type="number" className="form-control" placeholder="Amount ₹" min="0"
                  {...register(`components.${index}.amount`, { required: true, min: 0 })} />
                {fields.length > 1 && (
                  <button type="button" className="remove-btn" onClick={() => remove(index)}>×</button>
                )}
              </div>
            ))}

            <div className="total-row">
              <span>Total Fee Amount</span>
              <span>{fmt(total)}</span>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="fee-form" type="submit" disabled={isLoading}>
            {isLoading ? (feeStructure ? 'Saving...' : 'Creating...') : (feeStructure ? '✓ Save Changes' : '✓ Create Fee Structure')}
          </button>
        </div>
      </div>
    </div>
  );
}
