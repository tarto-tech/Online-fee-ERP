import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/students', label: 'Students', icon: '👤' },
  { to: '/courses', label: 'Courses', icon: '🎓' },
  { to: '/waivers', label: 'Fee Waivers', icon: '🏷' },
  { to: '/payments', label: 'Payments', icon: '💳' },
];

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/courses': 'Courses',
  '/waivers': 'Fee Waivers',
  '/payments': 'Payments',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const title = pageTitles[location.pathname] || 'Kalpataru College';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/tartotech-5b175.firebasestorage.app/o/LOGO%20ENGLISH.jpg?alt=media&token=dce7935a-1c4e-4e58-9c0b-202f8a1cba78" 
            alt="Kalpataru College Logo" 
            style={{ width: '100%', maxWidth: '180px', marginBottom: '10px', borderRadius: '8px' }}
          />
          <h1 style={{ fontSize: '18px', marginTop: '8px' }}>Kalpataru College</h1>
          <p>Tiptur · Admin Portal</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{(user?.name?.[0] || 'A').toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Admin'}</div>
              <div className="sidebar-user-role">{user?.role || 'admin'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>⬡ Sign Out</button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
