import React from 'react';

export default function Navbar({ user, onLogout }) {
  return (
    <div style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/tartotech-5b175.firebasestorage.app/o/LOGO%20ENGLISH.jpg?alt=media&token=dce7935a-1c4e-4e58-9c0b-202f8a1cba78" 
            alt="Kalpataru College Logo" 
            style={{ height: '48px', borderRadius: '6px' }}
          />
          <div>
            <div style={styles.brandName}>Kalpataru College</div>
            <div style={styles.brandSub}>Student Portal</div>
          </div>
        </div>
        <div style={styles.userSection}>
          <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase() || 'S'}</div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userId}>{user?.studentId}</div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  nav: { background: '#1e3a8a', color: 'white', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  inner: { maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 28 },
  brandName: { fontWeight: 700, fontSize: 18 },
  brandSub: { fontSize: 11, color: '#93c5fd' },
  userSection: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 },
  userInfo: { display: 'flex', flexDirection: 'column' },
  userName: { fontSize: 14, fontWeight: 600 },
  userId: { fontSize: 11, color: '#93c5fd' },
  logoutBtn: { padding: '6px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
};
