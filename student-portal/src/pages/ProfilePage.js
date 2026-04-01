import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ProfilePage({ user, onUpdate }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState('');
  const [editMobile, setEditMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/student/me').then((res) => {
      const s = res.data.student;
      setStudent(s);
      setMobile(s.mobile || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleMobileUpdate = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit mobile number'); return; }
    setSaving(true); setError(''); setMsg('');
    try {
      const res = await api.patch('/auth/student/update-profile', { mobile });
      setStudent(res.data.student);
      onUpdate(res.data.student);
      setEditMobile(false);
      setMsg('Mobile number updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={S.centered}><div style={S.spinner} /></div>;

  const s = student;
  const semester = s?.currentYear ? (s.currentYear * 2 - 1) + ' & ' + (s.currentYear * 2) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Profile Header Card */}
      <div style={S.profileCard}>
        <div style={S.profileAvatar}>{s?.name?.[0]?.toUpperCase()}</div>
        <div style={S.profileInfo}>
          <div style={S.profileName}>{s?.name}</div>
          <div style={S.profileMeta}>{s?.studentId} · {s?.course?.name} ({s?.course?.code})</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={S.chip}>Year {s?.currentYear}</span>
            <span style={S.chip}>Sem {semester}</span>
            <span style={S.chip}>{s?.academicYear}</span>
            <span style={{ ...S.chip, background: s?.isActive ? '#d1fae5' : '#fee2e2', color: s?.isActive ? '#065f46' : '#991b1b' }}>
              {s?.isActive ? '✓ Active' : '✗ Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Academic Details */}
      <div style={S.card}>
        <div style={S.cardTitle}>🎓 Academic Information</div>
        <div style={S.grid}>
          <InfoRow label="Student ID" value={s?.studentId} mono />
          <InfoRow label="Roll Number" value={s?.rollNumber || '—'} />
          <InfoRow label="Course" value={`${s?.course?.name} (${s?.course?.code})`} />
          <InfoRow label="Course Duration" value={`${s?.course?.duration} Years`} />
          <InfoRow label="Current Year" value={`Year ${s?.currentYear}`} />
          <InfoRow label="Current Semester" value={semester} />
          <InfoRow label="Academic Year" value={s?.academicYear} />
        </div>
      </div>

      {/* Personal Details */}
      <div style={S.card}>
        <div style={S.cardTitle}>👤 Personal Information</div>
        <div style={S.grid}>
          <InfoRow label="Full Name" value={s?.name} />
          <InfoRow label="Email Address" value={s?.email} />
          <InfoRow label="Date of Birth" value={s?.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
          {s?.address?.city && <InfoRow label="City" value={s.address.city} />}
          {s?.address?.state && <InfoRow label="State" value={s.address.state} />}
          {s?.address?.pincode && <InfoRow label="Pincode" value={s.address.pincode} />}
        </div>
      </div>

      {/* Mobile Number — Editable */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={S.cardTitle}>📱 Mobile Number</div>
          {!editMobile && (
            <button style={S.editBtn} onClick={() => { setEditMobile(true); setMsg(''); setError(''); }}>
              ✏️ Update
            </button>
          )}
        </div>

        {editMobile ? (
          <form onSubmit={handleMobileUpdate}>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>New Mobile Number</label>
              <div style={S.inputRow}>
                <span style={S.prefix}>+91</span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  style={S.input}
                  autoFocus
                />
              </div>
              {error && <p style={S.errorText}>{error}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={S.saveBtn}>
                {saving ? 'Saving...' : '✓ Save'}
              </button>
              <button type="button" style={S.cancelBtn}
                onClick={() => { setEditMobile(false); setMobile(s?.mobile || ''); setError(''); }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={S.mobileDisplay}>+91 {s?.mobile}</div>
            {msg && <span style={{ fontSize: 13, color: '#10b981' }}>✓ {msg}</span>}
          </div>
        )}
      </div>

      {/* Guardian Details */}
      {(s?.guardianName || s?.guardianMobile) && (
        <div style={S.card}>
          <div style={S.cardTitle}>👨‍👩‍👦 Guardian Information</div>
          <div style={S.grid}>
            {s?.guardianName && <InfoRow label="Guardian Name" value={s.guardianName} />}
            {s?.guardianMobile && <InfoRow label="Guardian Mobile" value={`+91 ${s.guardianMobile}`} />}
          </div>
        </div>
      )}

    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

const S = {
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  spinner: { width: 36, height: 36, border: '3px solid #e5e7eb', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  profileCard: {
    background: 'linear-gradient(135deg, #1e1b4b, #4f46e5)',
    borderRadius: 16, padding: 24,
    display: 'flex', alignItems: 'center', gap: 20, color: '#fff',
  },
  profileAvatar: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 30, fontWeight: 800, flexShrink: 0,
    border: '3px solid rgba(255,255,255,0.3)',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: 800, marginBottom: 4 },
  profileMeta: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  chip: { display: 'inline-block', padding: '3px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  inputRow: { display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  prefix: { padding: '10px 12px', background: '#f9fafb', color: '#6b7280', fontSize: 14, borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  input: { flex: 1, border: 'none', padding: '10px 12px', fontSize: 15, outline: 'none', width: '100%' },
  saveBtn: { padding: '9px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 },
  cancelBtn: { padding: '9px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14 },
  editBtn: { padding: '6px 14px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  mobileDisplay: { fontSize: 18, fontWeight: 700, color: '#111827' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 6 },
};
