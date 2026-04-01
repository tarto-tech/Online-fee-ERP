import React, { useState } from 'react';
import api from './api';
import LoginPage from './pages/LoginPage';
import FeeStatusPage from './pages/FeeStatusPage';
import ProfilePage from './pages/ProfilePage';

const TABS = [
  { id: 'fees', label: '💳 Fees' },
  { id: 'profile', label: '👤 My Profile' },
];

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('studentUser')); } catch { return null; }
  });
  const [activeTab, setActiveTab] = useState('fees');

  const handleLogin = (userData) => setUser(userData);
  const handleUserUpdate = (updated) => {
    setUser(updated);
    localStorage.setItem('studentUser', JSON.stringify(updated));
  };
  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentRefreshToken');
    localStorage.removeItem('studentUser');
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }
        
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .stats-row { 
            grid-template-columns: 1fr 1fr !important; 
            gap: 8px !important;
          }
          .tab-bar { 
            overflow-x: auto; 
            -webkit-overflow-scrolling: touch;
          }
          .tab-bar::-webkit-scrollbar { display: none; }
        }
        
        @media (max-width: 480px) {
          .stats-row { 
            grid-template-columns: 1fr !important; 
          }
        }
      `}</style>

      {/* Navbar */}
      <div style={S.nav}>
        <div style={S.navInner}>
          <div style={S.brand}>
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/tartotech-5b175.firebasestorage.app/o/LOGO%20ENGLISH.jpg?alt=media&token=dce7935a-1c4e-4e58-9c0b-202f8a1cba78" 
              alt="Kalpataru College Logo" 
              style={{ height: '48px', borderRadius: '6px' }}
            />
            <div>
              <div style={S.brandName}>Kalpataru First Grade Science College</div>
              <div style={S.brandSub}>Tiptur · Fee Portal</div>
            </div>
          </div>
          <div style={S.navRight}>
            <div style={S.avatar}>{user?.name?.[0]?.toUpperCase() || 'S'}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={S.navName}>{user?.name}</span>
              <span style={S.navId}>{user?.studentId}</span>
            </div>
            <button style={S.logoutBtn} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={S.tabBarWrap} className="tab-bar">
        <div style={S.tabBarInner}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{ ...S.tabBtn, ...(activeTab === t.id ? S.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div style={S.content}>
        {activeTab === 'fees' && <FeeStatusPage user={user} />}
        {activeTab === 'profile' && <ProfilePage user={user} onUpdate={handleUserUpdate} />}
      </div>
    </div>
  );
}

const S = {
  nav: { background: '#1e1b4b', padding: '0 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  navInner: { maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, flexWrap: 'wrap', gap: 8, padding: '8px 0' },
  brand: { display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 0 },
  brandName: { fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.2 },
  brandSub: { fontSize: 10, color: '#a5b4fc', marginTop: 2 },
  navRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 },
  navName: { fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 },
  navId: { fontSize: 10, color: '#a5b4fc' },
  logoutBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap' },
  tabBarWrap: { background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 },
  tabBarInner: { maxWidth: 960, margin: '0 auto', display: 'flex', padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  tabBtn: { padding: '14px 20px', background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#6b7280', borderBottom: '2px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 },
  tabActive: { color: '#4f46e5', borderBottomColor: '#4f46e5', fontWeight: 700 },
  content: { maxWidth: 960, margin: '0 auto', padding: '16px 12px' },
};
