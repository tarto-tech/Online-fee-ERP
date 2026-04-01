import React, { useState } from 'react';
import api from '../api';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) { setError('New passwords do not match'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.patch('/auth/student/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={S.card}>
        <div style={S.cardTitle}>🔒 Change Password</div>
        <p style={S.hint}>Use a strong password with at least 8 characters.</p>

        {success && (
          <div style={S.successBox}>
            ✅ Password changed successfully!
            <button style={S.linkBtn} onClick={() => setSuccess(false)}>Change again</button>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <Field label="Current Password" value={form.currentPassword} onChange={set('currentPassword')} show={showPass} onToggle={() => setShowPass(!showPass)} />
            <Field label="New Password" value={form.newPassword} onChange={set('newPassword')} show={showPass} onToggle={() => setShowPass(!showPass)} />
            <Field label="Confirm New Password" value={form.confirmPassword} onChange={set('confirmPassword')} show={showPass} onToggle={() => setShowPass(!showPass)} />

            {error && <p style={S.error}>{error}</p>}

            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? 'Updating...' : '✓ Update Password'}
            </button>
          </form>
        )}
      </div>

      <div style={S.tipsCard}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>💡 Password Tips</div>
        {['At least 8 characters long', 'Mix uppercase and lowercase letters', 'Include numbers and special characters', 'Avoid using your name or student ID'].map((tip) => (
          <div key={tip} style={S.tip}>✓ {tip}</div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, show, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
          placeholder="••••••••" required
          style={{ ...S.input, paddingRight: 44 }} />
        <button type="button" onClick={onToggle} style={S.eyeBtn}>{show ? '🙈' : '👁'}</button>
      </div>
    </div>
  );
}

const S = {
  card: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 6 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  btn: { width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 6 },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 10 },
  successBox: { background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: 16, color: '#065f46', fontWeight: 600, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  linkBtn: { background: 'none', border: 'none', color: '#4f46e5', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  tipsCard: { background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 20 },
  tip: { fontSize: 13, color: '#5b21b6', marginBottom: 6 },
};
