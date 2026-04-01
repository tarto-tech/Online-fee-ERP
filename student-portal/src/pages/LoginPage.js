import React, { useState } from 'react';
import api from '../api';

export default function LoginPage({ onLogin }) {
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/tartotech-5b175.firebasestorage.app/o/LOGO%20ENGLISH.jpg?alt=media&token=dce7935a-1c4e-4e58-9c0b-202f8a1cba78" 
            alt="Kalpataru College Logo" 
            style={{ width: '140px', maxWidth: '100%', marginBottom: '14px', borderRadius: '10px' }}
          />
          <h1 style={S.title}>Kalpataru College</h1>
          <p style={S.subtitle}>Kalpataru First Grade Science College, Tiptur</p>
        </div>
        <OtpLogin onLogin={onLogin} />
      </div>
    </div>
  );
}

function OtpLogin({ onLogin }) {
  const [step, setStep] = useState('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/student/send-otp', { mobile });
      if (res.otp) setDevOtp(res.otp);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/student/verify-otp', { mobile, otp });
      localStorage.setItem('studentToken', res.accessToken);
      localStorage.setItem('studentRefreshToken', res.refreshToken);
      localStorage.setItem('studentUser', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'mobile') return (
    <form onSubmit={handleSend}>
      <div style={S.field}>
        <label style={S.label}>Mobile Number</label>
        <div style={S.inputGroup}>
          <span style={S.prefix}>+91</span>
          <input
            type="tel" value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210" style={S.input} maxLength={10} autoFocus
          />
        </div>
      </div>
      {error && <p style={S.error}>{error}</p>}
      <button type="submit" disabled={loading} style={S.btn}>
        {loading ? 'Sending OTP...' : 'Send OTP →'}
      </button>
    </form>
  );

  return (
    <form onSubmit={handleVerify}>
      <p style={S.otpInfo}>OTP sent to <strong>+91 {mobile}</strong></p>
      {devOtp && (
        <div style={S.devBadge}>🔧 Dev OTP: <strong>{devOtp}</strong></div>
      )}
      <div style={S.field}>
        <label style={S.label}>Enter 6-digit OTP</label>
        <input
          type="tel" value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          style={{ ...S.input, textAlign: 'center', fontSize: 22, letterSpacing: 10, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
          maxLength={6} autoFocus
        />
      </div>
      {error && <p style={S.error}>{error}</p>}
      <button type="submit" disabled={loading} style={S.btn}>
        {loading ? 'Verifying...' : 'Verify OTP →'}
      </button>
      <button type="button" style={S.linkBtn}
        onClick={() => { setStep('mobile'); setOtp(''); setError(''); setDevOtp(''); }}>
        ← Change mobile number
      </button>
    </form>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '28px 20px',
    width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
  },
  header: { textAlign: 'center', marginBottom: 20 },
  logo: { fontSize: 42, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: 800, color: '#1e1b4b', margin: 0, lineHeight: 1.3 },
  subtitle: { color: '#6b7280', marginTop: 6, fontSize: 13, lineHeight: 1.4, padding: '0 10px' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  inputGroup: { display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  prefix: { padding: '10px 12px', background: '#f9fafb', color: '#6b7280', fontSize: 14, borderRight: '1px solid #e5e7eb', flexShrink: 0 },
  input: { flex: 1, border: 'none', padding: '10px 12px', fontSize: 15, outline: 'none', width: '100%', fontFamily: 'inherit', minWidth: 0 },
  btn: { width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 6, fontFamily: 'inherit' },
  linkBtn: { width: '100%', padding: '8px', background: 'none', color: '#6b7280', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 6, fontFamily: 'inherit' },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 8, marginTop: 4 },
  otpInfo: { color: '#6b7280', fontSize: 13, marginBottom: 10, lineHeight: 1.4 },
  devBadge: { background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 12, color: '#92400e', wordBreak: 'break-all' },
};
