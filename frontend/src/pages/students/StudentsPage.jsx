import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { studentsAPI, coursesAPI, feeStructuresAPI } from '../../api';

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', course: '', year: '' });
  const [showGraduated, setShowGraduated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [usnStudent, setUsnStudent] = useState(null);
  const [showPromote, setShowPromote] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', page, filters, showGraduated],
    queryFn: () => studentsAPI.getAll({ page, limit: 20, ...filters, ...(showGraduated ? { isGraduated: 'true', isActive: 'false' } : {}) }),
    staleTime: 30000,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll(),
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: studentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.success('Student created — credentials sent to email');
      setShowModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.success('Student updated successfully');
      setEditStudent(null);
      setUsnStudent(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: studentsAPI.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.success('Student deactivated');
    },
    onError: (err) => toast.error(err.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: studentsAPI.permanentDelete,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.success('Student permanently deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const promoteMutation = useMutation({
    mutationFn: studentsAPI.promote,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['students']);
      toast.success(res.message);
      setShowPromote(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBulkUpload = async (file, courseId, currentYear, academicYear) => {
    try {
      const res = await studentsAPI.bulkUpload(file, courseId, currentYear, academicYear);
      toast.success(res.message);
      if (res.data?.errors?.length > 0) {
        res.data.errors.forEach((e) => toast.error(`Row ${e.row}: ${e.error}`, { duration: 5000 }));
      }
      queryClient.invalidateQueries(['students']);
      setShowBulkModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const students = data?.data?.students || [];
  const pagination = data?.pagination;
  const courses = coursesData?.data?.courses || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-subtitle">{pagination?.total || 0} total students enrolled</div>
        </div>
        <div className="header-actions">
          <button className="btn" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
            onClick={() => setShowPromote(true)}>🎓 Promote Year</button>
          <button className="btn btn-outline" onClick={() => setShowBulkModal(true)}>↑ Bulk Upload CSV</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Student</button>
        </div>
      </div>

      <div className="filters-bar">
        <input
          className="form-control flex-1"
          placeholder="🔍  Search by name, ID, USN or mobile..."
          value={filters.search}
          onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
        />
        <select
          className="form-control"
          value={filters.course}
          onChange={(e) => { setFilters((f) => ({ ...f, course: e.target.value })); setPage(1); }}
        >
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select
          className="form-control"
          value={filters.year}
          onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(1); }}
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showGraduated} onChange={(e) => { setShowGraduated(e.target.checked); setPage(1); }} />
          🎓 Show Graduated
        </label>
      </div>

      <div className="table-wrapper">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Temp ID</th>
                <th>USN</th>
                <th>Name</th>
                <th>Course</th>
                <th>Year</th>
                <th>Academic Year</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="table-empty">Loading students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={10} className="table-empty">No students found</td></tr>
              ) : students.map((s) => (
                <tr key={s._id}>
                  <td className="text-mono" style={{ fontSize: 12 }}>{s.studentId}</td>
                  <td>
                    {s.usn
                      ? <span className="badge badge-success">{s.usn}</span>
                      : <span className="text-xs text-muted">Not assigned</span>
                    }
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.rollNumber && <div className="text-xs text-muted">Roll: {s.rollNumber}</div>}
                  </td>
                  <td>
                    <div>{s.course?.name}</div>
                    <div className="text-xs text-muted">{s.course?.code}</div>
                  </td>
                  <td><span className="badge badge-primary">Year {s.currentYear}</span></td>
                  <td className="text-secondary text-sm">{s.academicYear}</td>
                  <td className="text-secondary">{s.mobile}</td>
                  <td className="text-secondary text-sm">{s.email}</td>
                  <td>
                    <span className={`badge ${s.isGraduated ? 'badge-purple' : s.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {s.isGraduated ? '🎓 Graduated' : s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.academicHistory?.length > 0 && (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                          onClick={() => setHistoryStudent(s)}>📚 History</button>
                      )}
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 13 }}
                        onClick={() => setEditStudent(s)}>Edit</button>
                      {!s.usn && s.isActive && (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                          onClick={() => setUsnStudent(s)}>Assign USN</button>
                      )}
                      {s.isActive ? (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                          disabled={deleteMutation.isPending}
                          onClick={() => { if (window.confirm(`Deactivate ${s.name}?`)) deleteMutation.mutate(s._id); }}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 13, background: '#dc2626', color: '#fff', border: 'none' }}
                          disabled={permanentDeleteMutation.isPending}
                          onClick={() => { if (window.confirm(`Permanently delete ${s.name}? This cannot be undone.`)) permanentDeleteMutation.mutate(s._id); }}>
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
        {pagination && (
          <div className="pagination">
            <span>Showing <strong>{students.length}</strong> of <strong>{pagination.total}</strong> students</span>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span className="page-current">Page {page} of {pagination.pages}</span>
              <button className="page-btn" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <StudentModal
          courses={courses}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {editStudent && (
        <StudentModal
          courses={courses}
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editStudent._id, data })}
          isLoading={updateMutation.isPending}
          onViewHistory={() => { setHistoryStudent(editStudent); setEditStudent(null); }}
        />
      )}

      {usnStudent && (
        <UsnModal
          student={usnStudent}
          onClose={() => setUsnStudent(null)}
          onSubmit={(usn) => updateMutation.mutate({ id: usnStudent._id, data: { usn } })}
          isLoading={updateMutation.isPending}
        />
      )}

      {showPromote && (
        <PromoteModal
          courses={courses}
          onClose={() => setShowPromote(false)}
          onSubmit={(data) => promoteMutation.mutate(data)}
          isLoading={promoteMutation.isPending}
        />
      )}

      {showBulkModal && (
        <BulkUploadModal
          courses={courses}
          onClose={() => setShowBulkModal(false)}
          onSubmit={handleBulkUpload}
        />
      )}

      {historyStudent && (
        <AcademicHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
}

function StudentModal({ courses, student, onClose, onSubmit, isLoading, onViewHistory }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: student ? {
      studentId: student.studentId,
      usn: student.usn || '',
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      course: student.course?._id,
      currentYear: student.currentYear,
      academicYear: student.academicYear,
      rollNumber: student.rollNumber,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      guardianName: student.guardianName,
      guardianMobile: student.guardianMobile,
    } : {},
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{student ? 'Edit Student' : 'Add New Student'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!student && (
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
              Student ID is auto-generated. USN can be assigned later after university allotment.
            </p>
          )}
          {student?.academicHistory?.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📚 Academic History</span>
                {onViewHistory && (
                  <button type="button" className="btn" style={{ padding: '2px 8px', fontSize: 11, background: '#fff', color: '#16a34a', border: '1px solid #86efac' }}
                    onClick={onViewHistory}>View Details</button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...student.academicHistory].sort((a, b) => new Date(b.promotedAt) - new Date(a.promotedAt)).slice(0, 3).map((h, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #86efac', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#15803d' }}>Year {h.year}</span>
                      <span style={{ color: '#6b7280', margin: '0 4px' }}>·</span>
                      <span style={{ color: '#6b7280' }}>{h.academicYear}</span>
                      {h.status === 'graduated' && <span style={{ marginLeft: 4 }}>🎓</span>}
                    </div>
                    {h.feeSnapshot && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                        💰 ₹{h.feeSnapshot.paidAmount?.toLocaleString() || 0} / ₹{h.feeSnapshot.totalFee?.toLocaleString() || 0}
                      </div>
                    )}
                  </div>
                ))}
                {student.academicHistory.length > 3 && (
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#6b7280' }}>
                    +{student.academicHistory.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
          <form id="student-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Temp Student ID</label>
                <input className="form-control w-full" placeholder="Auto-generated if empty"
                  {...register('studentId')} />
              </div>
              <div className="form-group">
                <label className="form-label">USN (University Seat Number)</label>
                <input className="form-control w-full" placeholder="Assigned after fee payment"
                  {...register('usn')} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control w-full" placeholder="Rahul Sharma"
                  {...register('name', { required: 'Required' })} />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control w-full" placeholder="rahul@example.com"
                  {...register('email', { required: 'Required' })} />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input type="tel" className="form-control w-full" placeholder="9876543210" maxLength={10}
                  {...register('mobile', { required: 'Required', pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid mobile' } })} />
                {errors.mobile && <p className="form-error">{errors.mobile.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <input className="form-control w-full" placeholder="BCA001" {...register('rollNumber')} />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-control w-full" {...register('course', { required: 'Required' })}>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
                {errors.course && <p className="form-error">{errors.course.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Current Year *</label>
                <select className="form-control w-full" {...register('currentYear', { required: 'Required' })}>
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                {errors.currentYear && <p className="form-error">{errors.currentYear.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <input className="form-control w-full" placeholder="2024-2025"
                  {...register('academicYear', { required: 'Required', pattern: { value: /^\d{4}-\d{4}$/, message: '2024-2025' } })} />
                {errors.academicYear && <p className="form-error">{errors.academicYear.message}</p>}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-control w-full" {...register('dateOfBirth')} />
              </div>
              <div className="form-group">
                <label className="form-label">Guardian Name</label>
                <input className="form-control w-full" placeholder="Parent / Guardian" {...register('guardianName')} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Guardian Mobile</label>
                <input type="tel" className="form-control w-full" placeholder="9876543200" maxLength={10}
                  {...register('guardianMobile', { pattern: { value: /^[6-9]\d{9}$/, message: 'Invalid mobile' } })} />
                {errors.guardianMobile && <p className="form-error">{errors.guardianMobile.message}</p>}
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="student-form" type="submit" disabled={isLoading}>
            {isLoading ? (student ? 'Saving...' : 'Creating...') : (student ? '✓ Save Changes' : '✓ Create Student')}
          </button>
        </div>
      </div>
    </div>
  );
}

function UsnModal({ student, onClose, onSubmit, isLoading }) {
  const [usn, setUsn] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!usn.trim()) return;
    onSubmit(usn.trim().toUpperCase());
  };
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Assign USN — {student.name}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
            Enter the University Seat Number assigned by the university after fee payment.
          </p>
          <form id="usn-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">USN *</label>
              <input className="form-control w-full" placeholder="e.g. 1SI21MC031"
                value={usn} onChange={(e) => setUsn(e.target.value)} autoFocus required />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="usn-form" type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : '✓ Assign USN'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkUploadModal({ courses, onClose, onSubmit }) {
  const [courseId, setCourseId] = useState('');
  const [currentYear, setCurrentYear] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedCourse = courses.find((c) => c._id === courseId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !courseId || !currentYear || !academicYear) return;
    setLoading(true);
    await onSubmit(file, courseId, currentYear, academicYear);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">↑ Bulk Upload Students</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
            📋 CSV must have headers: <strong>name, email, mobile</strong> (required) · <strong>rollNumber, guardianName, guardianMobile, studentId</strong> (optional)
          </div>
          <form id="bulk-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Course *</label>
              <select className="form-control w-full" value={courseId} onChange={(e) => { setCourseId(e.target.value); setCurrentYear(''); }} required>
                <option value="">Select course</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Year *</label>
                <select className="form-control w-full" value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} required disabled={!courseId}>
                  <option value="">Select year</option>
                  {selectedCourse && Array.from({ length: parseInt(selectedCourse.duration) }, (_, i) => i + 1).map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <input className="form-control w-full" placeholder="e.g. 2026-2027"
                  value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                  pattern="^\d{4}-\d{4}$" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">CSV File *</label>
              <input type="file" accept=".csv" className="form-control w-full"
                onChange={(e) => setFile(e.target.files[0])} required />
              {file && <p className="form-hint">✅ {file.name} selected</p>}
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="bulk-form" type="submit" disabled={loading || !file || !courseId || !currentYear || !academicYear}>
            {loading ? 'Uploading...' : '↑ Upload & Add Students'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoteModal({ courses, onClose, onSubmit, isLoading }) {
  const [courseId, setCourseId] = useState('');
  const [fromYear, setFromYear] = useState('');
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [feeStructureStatus, setFeeStructureStatus] = useState(null);
  const [pendingWarning, setPendingWarning] = useState(null);

  const selectedCourse = courses.find((c) => c._id === courseId);
  const toYear = fromYear ? parseInt(fromYear) + 1 : null;
  const isFinalYear = selectedCourse && fromYear && parseInt(fromYear) === parseInt(selectedCourse.duration);

  const calcNextAcademicYear = (current) => {
    if (!current || !/^\d{4}-\d{4}$/.test(current)) return '';
    const [start, end] = current.split('-').map(Number);
    return `${start + 1}-${end + 1}`;
  };

  const handleFromYearChange = async (year) => {
    setFromYear(year);
    setPreview(null);
    setCurrentAcademicYear('');
    setNewAcademicYear('');
    setFeeStructureStatus(null);
    if (!courseId || !year) return;
    try {
      const res = await studentsAPI.getAll({ course: courseId, year, isActive: 'true', limit: 1 });
      const student = res?.data?.students?.[0];
      if (student?.academicYear) {
        setCurrentAcademicYear(student.academicYear);
        setNewAcademicYear(calcNextAcademicYear(student.academicYear));
      }
    } catch { }
  };

  const checkFeeStructure = async (nextYear, nextAcademicYear) => {
    if (isFinalYear) return; // graduation doesn't need fee structure
    if (!nextYear || !nextAcademicYear || !/^\d{4}-\d{4}$/.test(nextAcademicYear)) return;
    setFeeStructureStatus('checking');
    try {
      const res = await feeStructuresAPI.getAll({ course: courseId, year: nextYear, academicYear: nextAcademicYear });
      const found = res?.data?.feeStructures?.length > 0;
      setFeeStructureStatus(found ? 'found' : 'missing');
    } catch {
      setFeeStructureStatus('missing');
    }
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!courseId || !fromYear || !newAcademicYear) return;
    // Check fee structure first
    await checkFeeStructure(toYear, newAcademicYear);
    setPreviewing(true);
    try {
      const res = await studentsAPI.getAll({ course: courseId, year: fromYear, isActive: 'true', limit: 200 });
      setPreview(res?.data?.students || []);
    } catch {
      setPreview([]);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    setPendingWarning(null);
    try {
      const res = await studentsAPI.promote({
        courseId,
        fromYear: parseInt(fromYear),
        toYear: isFinalYear ? parseInt(fromYear) : toYear,
        newAcademicYear,
      });
      if (res.status === 'pending_warning') {
        setPendingWarning(res.data);
        return;
      }
      onSubmit({ courseId, fromYear: parseInt(fromYear), toYear: isFinalYear ? parseInt(fromYear) : toYear, newAcademicYear });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleForcePromote = () => {
    if (!window.confirm(`Force promote ${preview.length} students despite pending fees?`)) return;
    onSubmit({
      courseId,
      fromYear: parseInt(fromYear),
      toYear: isFinalYear ? parseInt(fromYear) : toYear,
      newAcademicYear,
      forcePromote: true,
    });
  };

  const canConfirm = preview !== null && preview.length > 0 && !isLoading && (isFinalYear || feeStructureStatus === 'found');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">🎓 {isFinalYear ? 'Graduate Students' : 'Promote Students to Next Year'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {isFinalYear ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
              🎓 Year {fromYear} is the <strong>final year</strong> of {selectedCourse?.name}. These students will be <strong>graduated</strong> and moved to alumni history. Payment history is preserved.
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              ⚠ This will update <strong>currentYear</strong> and <strong>academicYear</strong> for all matching active students. Payment history is preserved.
            </div>
          )}

          <form id="promote-form" onSubmit={handlePreview}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-control w-full" value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setFromYear(''); setPreview(null); setCurrentAcademicYear(''); setNewAcademicYear(''); setFeeStructureStatus(null); }} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">From Year *</label>
                <select className="form-control w-full" value={fromYear}
                  onChange={(e) => handleFromYearChange(e.target.value)} required disabled={!courseId}>
                  <option value="">Select year</option>
                  {selectedCourse && Array.from({ length: parseInt(selectedCourse.duration) }, (_, i) => i + 1).map((y) => (
                    <option key={y} value={y}>Year {y}{y === parseInt(selectedCourse.duration) ? ' (Final)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Year</label>
                <input className="form-control w-full" disabled
                  style={{ background: '#f9fafb', color: isFinalYear ? '#16a34a' : '#6b7280', fontWeight: isFinalYear ? 700 : 400 }}
                  value={isFinalYear ? '🎓 Graduated' : (toYear ? `Year ${toYear}` : '—')} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Academic Year</label>
                <input className="form-control w-full" disabled
                  style={{ background: '#f9fafb', color: '#6b7280' }}
                  value={currentAcademicYear || (fromYear ? 'No students found' : '—')} />
              </div>
              <div className="form-group">
                <label className="form-label">{isFinalYear ? 'Graduation Year *' : 'New Academic Year *'}</label>
                <input className="form-control w-full" placeholder="e.g. 2027-2028"
                  value={newAcademicYear}
                  onChange={(e) => { setNewAcademicYear(e.target.value); setPreview(null); setFeeStructureStatus(null); }}
                  pattern="^\d{4}-\d{4}$" required />
                {currentAcademicYear && newAcademicYear && (
                  <p className="form-hint">{currentAcademicYear} → {newAcademicYear}</p>
                )}
              </div>
            </div>
          </form>

          {/* Fee structure status banner */}
          {!isFinalYear && feeStructureStatus === 'checking' && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
              ⏳ Checking fee structure for Year {toYear} ({newAcademicYear})...
            </div>
          )}
          {!isFinalYear && feeStructureStatus === 'found' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
              ✅ Fee structure found for Year {toYear} ({newAcademicYear}) — students will see their new fee balance after promotion.
            </div>
          )}
          {!isFinalYear && feeStructureStatus === 'missing' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>❌ No fee structure for Year {toYear} ({newAcademicYear})</div>
              <div>Please go to <strong>Courses → {selectedCourse?.name} → Manage Fee Structures</strong> and add a fee structure for <strong>Year {toYear} · {newAcademicYear}</strong> before promoting students.</div>
            </div>
          )}

          {pendingWarning && (
            <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 8, padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', marginBottom: 8 }}>
                ⚠️ {pendingWarning.pendingCount} Student{pendingWarning.pendingCount > 1 ? 's Have' : ' Has'} Pending Fees
              </div>
              <div style={{ fontSize: 13, color: '#991b1b', marginBottom: 10 }}>
                The following students have not paid their full fees for the current year:
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto', background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: 10 }}>
                <table style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fee2e2', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWarning.pendingStudents.map((s, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #fecaca' }}>
                        <td style={{ padding: '6px 10px' }}>{s.name}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{s.usn || s.studentId}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>₹{s.pending.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 13, color: '#991b1b' }}>
                Do you still want to promote these students?
              </div>
            </div>
          )}

          {preview !== null && !pendingWarning && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                Preview — {preview.length} student{preview.length !== 1 ? 's' : ''} will be {isFinalYear ? 'graduated' : 'promoted'}
                {selectedCourse && ` from ${selectedCourse.name} Year ${fromYear}`}
              </div>
              {preview.length === 0 ? (
                <div style={{ color: '#ef4444', fontSize: 13 }}>No active students found for this course and year.</div>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>USN / Temp ID</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((s) => (
                        <tr key={s._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '7px 12px' }}>{s.name}</td>
                          <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 12 }}>{s.usn || s.studentId}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <span className="badge badge-primary">Year {s.currentYear} · {s.academicYear}</span>
                            <span style={{ margin: '0 6px', color: '#6b7280' }}>→</span>
                            {isFinalYear
                              ? <span className="badge badge-purple">🎓 Graduated</span>
                              : <span className="badge badge-success">Year {toYear} · {newAcademicYear}</span>
                            }
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
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          {preview === null ? (
            <button className="btn btn-primary" form="promote-form" type="submit" disabled={previewing}>
              {previewing ? 'Loading...' : 'Preview Students →'}
            </button>
          ) : pendingWarning ? (
            <>
              <button className="btn" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}
                onClick={() => setPendingWarning(null)}>← Back to Preview</button>
              <button className="btn" style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleForcePromote} disabled={isLoading}>
                {isLoading ? 'Processing...' : '⚠️ Force Promote Anyway'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleConfirm}
              disabled={!canConfirm}
              style={{ background: isFinalYear ? '#16a34a' : '#4f46e5', borderColor: isFinalYear ? '#16a34a' : '#4f46e5',
                opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
              {isLoading ? 'Processing...' : isFinalYear
                ? `🎓 Graduate ${preview.length} Students`
                : feeStructureStatus === 'missing'
                  ? '❌ Create Fee Structure First'
                  : `✓ Promote ${preview?.length || 0} Students`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AcademicHistoryModal({ student, onClose }) {
  // Sort history: Latest → Oldest
  const sortedHistory = [...(student.academicHistory || [])].sort(
    (a, b) => new Date(b.promotedAt) - new Date(a.promotedAt)
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">📚 Academic History — {student.name}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Current Status</div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e40af' }}>
                {student.isGraduated ? '🎓 Graduated' : `Year ${student.currentYear} · ${student.academicYear}`}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {student.course?.name} ({student.course?.code})
              </div>
            </div>
          </div>

          {sortedHistory.length > 0 ? (
            <div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>Academic Timeline (Latest → Oldest)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedHistory.map((h, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                          Year {h.year} · {h.academicYear}
                          {h.status === 'graduated' && <span style={{ marginLeft: 6, fontSize: 12, background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>🎓 Graduated</span>}
                          {h.status === 'corrected' && <span style={{ marginLeft: 6, fontSize: 12, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>⚠️ Corrected</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {h.courseName} {h.courseCode && `(${h.courseCode})`}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {h.status === 'promoted' ? 'Promoted' : h.status === 'graduated' ? 'Graduated' : 'Corrected'} on {new Date(h.promotedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {h.promotionBatchId && <span style={{ marginLeft: 6, fontFamily: 'monospace', fontSize: 10 }}>· {h.promotionBatchId}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 24 }}>{h.status === 'graduated' ? '🎓' : h.status === 'corrected' ? '⚠️' : '✅'}</div>
                    </div>
                    
                    {h.feeSnapshot && (
                      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>💰 Fee Snapshot</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                          <div>
                            <span style={{ color: '#6b7280' }}>Total Fee:</span>
                            <span style={{ fontWeight: 600, marginLeft: 4 }}>₹{h.feeSnapshot.totalFee?.toLocaleString() || 0}</span>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280' }}>Paid:</span>
                            <span style={{ fontWeight: 600, marginLeft: 4, color: '#16a34a' }}>₹{h.feeSnapshot.paidAmount?.toLocaleString() || 0}</span>
                          </div>
                          {h.feeSnapshot.waiver > 0 && (
                            <div>
                              <span style={{ color: '#6b7280' }}>Waiver:</span>
                              <span style={{ fontWeight: 600, marginLeft: 4, color: '#2563eb' }}>₹{h.feeSnapshot.waiver?.toLocaleString()}</span>
                            </div>
                          )}
                          {h.feeSnapshot.pendingAmount > 0 && (
                            <div>
                              <span style={{ color: '#6b7280' }}>Pending:</span>
                              <span style={{ fontWeight: 600, marginLeft: 4, color: '#dc2626' }}>₹{h.feeSnapshot.pendingAmount?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
              No academic history available. History is recorded when students are promoted.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
