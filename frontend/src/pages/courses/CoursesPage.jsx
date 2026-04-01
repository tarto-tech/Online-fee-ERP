import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coursesAPI, feeStructuresAPI } from '../../api';

const courseColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

export default function CoursesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [feesCourse, setFeesCourse] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', showInactive],
    queryFn: () => coursesAPI.getAll({ showInactive }),
  });

  const createMutation = useMutation({
    mutationFn: coursesAPI.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['courses']);
      toast.success('Course created — now add fee structures');
      setShowModal(false);
      setFeesCourse(res.data.course);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => coursesAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['courses']); toast.success('Course updated'); setEditCourse(null); },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: coursesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(['courses']); toast.success('Course deactivated'); },
    onError: (err) => toast.error(err.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: coursesAPI.permanentDelete,
    onSuccess: () => { queryClient.invalidateQueries(['courses']); toast.success('Course permanently deleted'); },
    onError: (err) => toast.error(err.message),
  });

  const allCourses = data?.data?.courses || [];

  const courses = useMemo(() => {
    return allCourses.filter((c) => {
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      const matchDuration = !filterDuration || String(c.duration) === filterDuration;
      return matchSearch && matchDuration;
    });
  }, [allCourses, search, filterDuration]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Courses</div>
          <div className="page-subtitle">{courses.length} of {allCourses.length} courses</div>
        </div>
        <div className="header-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Course</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input className="form-control flex-1" placeholder="🔍 Search by name or code..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-control" value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)}>
          <option value="">All Durations</option>
          {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>)}
        </select>
        {(search || filterDuration) && (
          <button className="btn btn-outline" onClick={() => { setSearch(''); setFilterDuration(''); }}>✕ Clear</button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{allCourses.length === 0 ? 'No courses yet' : 'No courses match your filters'}</div>
          {allCourses.length === 0 && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Course</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {courses.map((c, i) => (
            <CourseCard
              key={c._id}
              course={c}
              color={courseColors[i % courseColors.length]}
              onEdit={() => setEditCourse(c)}
              onManageFees={() => setFeesCourse(c)}
              onDeactivate={() => { if (window.confirm(`Deactivate "${c.name}"?`)) deactivateMutation.mutate(c._id); }}
              onDelete={() => { if (window.confirm(`Permanently delete "${c.name}"?`)) permanentDeleteMutation.mutate(c._id); }}
              deactivating={deactivateMutation.isPending}
              deleting={permanentDeleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {showModal && <CourseModal onClose={() => setShowModal(false)} onSubmit={(d) => createMutation.mutate(d)} isLoading={createMutation.isPending} />}
      {editCourse && <CourseModal course={editCourse} onClose={() => setEditCourse(null)} onSubmit={(d) => updateMutation.mutate({ id: editCourse._id, data: d })} isLoading={updateMutation.isPending} />}
      {feesCourse && <FeeStructuresModal course={feesCourse} onClose={() => setFeesCourse(null)} />}
    </div>
  );
}

// ── Course Card with inline fee structures ────────────────────────────────────
function CourseCard({ course: c, color, onEdit, onManageFees, onDeactivate, onDelete, deactivating, deleting }) {
  const { data, isLoading } = useQuery({
    queryKey: ['fee-structures', c._id],
    queryFn: () => feeStructuresAPI.getAll({ course: c._id, showInactive: false }),
    staleTime: 60000,
  });

  const feeStructures = data?.data?.feeStructures || [];

  return (
    <div className="card" style={{ overflow: 'hidden', opacity: c.isActive ? 1 : 0.6 }}>
      <div style={{ height: 6, background: color }} />
      <div className="card-body">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description || 'No description'}</div>
            </div>
          </div>
          <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: 'var(--bg-page)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>CODE</div>
            <div style={{ fontWeight: 700, fontSize: 13, color }}>{c.code}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-page)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>DURATION</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.duration}yr</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-page)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>STUDENTS</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{c.totalStudents || 0}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg-page)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>FEE STRUCTS</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: feeStructures.length > 0 ? 'var(--success)' : 'var(--danger)' }}>{feeStructures.length}</div>
          </div>
        </div>

        {/* Fee Structures inline */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Fee Structures
          </div>
          {isLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
          ) : feeStructures.length === 0 ? (
            <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px' }}>
              ⚠ No fee structure — students can't pay fees
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {feeStructures.map((fs) => (
                <div key={fs._id} style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>Year {fs.year}</span>
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>{fs.academicYear}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>{fmt(fs.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                    {fs.components?.map((comp, i) => (
                      <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {comp.name}: <strong>{fmt(comp.amount)}</strong>
                      </span>
                    ))}
                    {fs.lateFeePerDay > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Late: ₹{fs.lateFeePerDay}/day</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <button className="btn" style={{ width: '100%', marginBottom: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 13 }}
          onClick={onManageFees}>
          📋 Manage Fee Structures
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" style={{ flex: 1, fontSize: 13 }} onClick={onEdit}>✏ Edit</button>
          {c.isActive ? (
            <button className="btn" style={{ flex: 1, fontSize: 13, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
              disabled={deactivating} onClick={onDeactivate}>Deactivate</button>
          ) : (
            <button className="btn" style={{ flex: 1, fontSize: 13, background: '#dc2626', color: '#fff', border: 'none' }}
              disabled={deleting} onClick={onDelete}>🗑 Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Course Modal ──────────────────────────────────────────────────────────────
function CourseModal({ course, onClose, onSubmit, isLoading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: course ? { name: course.name, code: course.code, duration: String(course.duration), description: course.description || '' } : {},
  });
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{course ? 'Edit Course' : 'Add New Course'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form id="course-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Course Name *</label>
              <input className="form-control w-full" placeholder="Bachelor of Computer Applications"
                {...register('name', { required: 'Required' })} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Course Code *</label>
                <input className="form-control w-full" placeholder="BCA" {...register('code', { required: 'Required' })} />
                {errors.code && <p className="form-error">{errors.code.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Years) *</label>
                <select className="form-control w-full" {...register('duration', { required: 'Required' })}>
                  <option value="">Select</option>
                  {[1,2,3,4,5,6].map((y) => <option key={y} value={String(y)}>{y} Year{y > 1 ? 's' : ''}</option>)}
                </select>
                {errors.duration && <p className="form-error">{errors.duration.message}</p>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control w-full" rows={3} style={{ resize: 'vertical' }} {...register('description')} />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="course-form" type="submit" disabled={isLoading}>
            {isLoading ? (course ? 'Saving...' : 'Creating...') : (course ? '✓ Save Changes' : '✓ Create Course')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fee Structures Modal ──────────────────────────────────────────────────────
function FeeStructuresModal({ course, onClose }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editFee, setEditFee] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fee-structures', course._id],
    queryFn: () => feeStructuresAPI.getAll({ course: course._id, showInactive: true }),
  });

  const deactivateMutation = useMutation({
    mutationFn: feeStructuresAPI.deactivate,
    onSuccess: () => { queryClient.invalidateQueries(['fee-structures', course._id]); toast.success('Fee structure deactivated'); },
    onError: (err) => toast.error(err.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: feeStructuresAPI.permanentDelete,
    onSuccess: () => { queryClient.invalidateQueries(['fee-structures', course._id]); toast.success('Fee structure deleted'); },
    onError: (err) => toast.error(err.message),
  });

  const feeStructures = data?.data?.feeStructures || [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">📋 Fee Structures — {course.name} ({course.code})</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading...</div>
          ) : feeStructures.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>No fee structures yet. Add one below.</div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {feeStructures.map((fs) => (
                <div key={fs._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10, opacity: fs.isActive ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className="badge badge-primary">Year {fs.year}</span>
                        <span className="badge badge-warning">{fs.academicYear}</span>
                        <span className={`badge ${fs.isActive ? 'badge-success' : 'badge-danger'}`}>{fs.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {fs.components?.map((comp, i) => (
                          <span key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {comp.name}: <strong>{fmt(comp.amount)}</strong>
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 700, color: 'var(--success)' }}>
                        Total: {fmt(fs.totalAmount)}
                        {fs.lateFeePerDay > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 12, fontSize: 12 }}>Late fee: ₹{fs.lateFeePerDay}/day</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => { setEditFee(fs); setShowAddForm(false); }}>Edit</button>
                      {fs.isActive ? (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 12, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                          disabled={deactivateMutation.isPending}
                          onClick={() => { if (window.confirm('Deactivate this fee structure?')) deactivateMutation.mutate(fs._id); }}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none' }}
                          disabled={permanentDeleteMutation.isPending}
                          onClick={() => { if (window.confirm('Permanently delete?')) permanentDeleteMutation.mutate(fs._id); }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(showAddForm || editFee) && (
            <FeeStructureForm
              course={course}
              feeStructure={editFee}
              onSuccess={() => { queryClient.invalidateQueries(['fee-structures', course._id]); setShowAddForm(false); setEditFee(null); }}
              onCancel={() => { setShowAddForm(false); setEditFee(null); }}
            />
          )}

          {!showAddForm && !editFee && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddForm(true)}>
              + Add Fee Structure
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fee Structure Form ────────────────────────────────────────────────────────
function FeeStructureForm({ course, feeStructure, onSuccess, onCancel }) {
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: feeStructure ? {
      year: feeStructure.year,
      academicYear: feeStructure.academicYear,
      lateFeePerDay: feeStructure.lateFeePerDay || '',
      dueDateFirstInstallment: feeStructure.dueDateFirstInstallment ? feeStructure.dueDateFirstInstallment.slice(0, 10) : '',
      dueDateSecondInstallment: feeStructure.dueDateSecondInstallment ? feeStructure.dueDateSecondInstallment.slice(0, 10) : '',
      components: feeStructure.components?.length ? feeStructure.components : [{ name: '', amount: '' }],
    } : { components: [{ name: '', amount: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'components' });
  const components = watch('components');
  const total = components.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  const onSubmit = async (data) => {
    const payload = {
      course: course._id,
      year: parseInt(data.year),
      academicYear: data.academicYear,
      lateFeePerDay: parseFloat(data.lateFeePerDay) || 0,
      dueDateFirstInstallment: data.dueDateFirstInstallment || undefined,
      dueDateSecondInstallment: data.dueDateSecondInstallment || undefined,
      components: data.components.map((c) => ({ name: c.name, amount: parseFloat(c.amount) })),
    };
    try {
      if (feeStructure) {
        await feeStructuresAPI.update(feeStructure._id, payload);
        toast.success('Fee structure updated');
      } else {
        await feeStructuresAPI.create(payload);
        toast.success('Fee structure added');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{ border: '1.5px solid var(--primary)', borderRadius: 10, padding: 16, marginBottom: 12, background: '#fafbff' }}>
      <div style={{ fontWeight: 700, marginBottom: 14, color: 'var(--primary)' }}>
        {feeStructure ? '✏ Edit Fee Structure' : '+ New Fee Structure'}
      </div>
      <form id="fs-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Year *</label>
            <select className="form-control w-full" {...register('year', { required: 'Required' })}>
              <option value="">Select year</option>
              {Array.from({ length: parseInt(course.duration) }, (_, i) => i + 1).map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
            {errors.year && <p className="form-error">{errors.year.message}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Academic Year *</label>
            <input className="form-control w-full" placeholder="2026-2027"
              {...register('academicYear', { required: 'Required', pattern: { value: /^\d{4}-\d{4}$/, message: 'Format: 2026-2027' } })} />
            {errors.academicYear && <p className="form-error">{errors.academicYear.message}</p>}
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Late Fee / Day (₹)</label>
            <input type="number" className="form-control w-full" placeholder="50" min="0" {...register('lateFeePerDay')} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date — 1st Installment</label>
            <input type="date" className="form-control w-full" {...register('dueDateFirstInstallment')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Due Date — 2nd Installment</label>
          <input type="date" className="form-control w-full" {...register('dueDateSecondInstallment')} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label" style={{ margin: 0 }}>Fee Components *</label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => append({ name: '', amount: '' })}>+ Add</button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="component-row">
            <input className="form-control" placeholder="e.g. Tuition Fee"
              {...register(`components.${index}.name`, { required: true })} />
            <input type="number" className="form-control" placeholder="Amount ₹" min="0"
              {...register(`components.${index}.amount`, { required: true, min: 0 })} />
            {fields.length > 1 && <button type="button" className="remove-btn" onClick={() => remove(index)}>×</button>}
          </div>
        ))}
        <div className="total-row">
          <span>Total Fee Amount</span>
          <span>{fmt(total)}</span>
        </div>
      </form>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} form="fs-form" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (feeStructure ? '✓ Update' : '✓ Add Fee Structure')}
        </button>
      </div>
    </div>
  );
}
