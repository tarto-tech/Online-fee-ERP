import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onSubmit = async (data) => {
    try {
      const res = await authAPI.login(data);
      setAuth(res.data.user, res.accessToken, res.refreshToken);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/tartotech-5b175.firebasestorage.app/o/LOGO%20ENGLISH.jpg?alt=media&token=dce7935a-1c4e-4e58-9c0b-202f8a1cba78" 
            alt="Kalpataru College Logo" 
            style={{ width: '200px', marginBottom: '20px', borderRadius: '12px' }}
          />
          <div className="login-brand">Kalpataru College</div>
          <div className="login-tagline">Complete Fee Management System</div>
          <div className="login-features">
            {[
              ['📊', 'Real-time fee collection analytics'],
              ['👥', 'Manage students & courses easily'],
              ['💳', 'Razorpay integrated payments'],
              ['📄', 'Auto-generated PDF receipts'],
            ].map(([icon, text]) => (
              <div className="login-feature" key={text}>
                <div className="login-feature-icon">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-box">
          <div className="login-form-title">Welcome back 👋</div>
          <div className="login-form-sub">Sign in to your admin account</div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control w-full"
                placeholder="admin@college.edu"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control w-full"
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
              style={{ padding: '11px', fontSize: 15, marginTop: 8, justifyContent: 'center' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Kalpataru First Grade Science College, Tiptur · Admin Portal
          </p>
        </div>
      </div>
    </div>
  );
}
