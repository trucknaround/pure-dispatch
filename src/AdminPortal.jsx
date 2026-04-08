// ============================================================
// PURE DISPATCH — ADMIN PORTAL
// src/AdminPortal.jsx
// ============================================================
// Completely separate from the driver-facing app.
// Has its own login that checks role = 'admin' in Supabase.
// Add to main.jsx:
//   import AdminPortal from './AdminPortal';
//   const isAdminRoute = window.location.pathname.startsWith('/admin');
//   if (isAdminRoute) {
//     root.render(<AdminPortal />);
//   } else {
//     root.render(<PureDispatcher />);
//   }
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import AdminDashboard from './admindashboard';

const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

const C = {
  bg: '#0a0a0a',
  surface: '#111111',
  card: '#1a1a1a',
  border: '#2a2a2a',
  green: '#00FF88',
  red: '#FF4444',
  text: '#ffffff',
  muted: '#888888',
};

// ── Admin Login Page ─────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid credentials or insufficient permissions.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 40,
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            background: C.green,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            <img 
  src="https://i.postimg.cc/g0VG0rdv/1765292235-removebg-preview.png"
  alt="Pure Dispatch"
  style={{ width: 36, height: 36, objectFit: 'contain' }}
/>
          <div style={{ color: C.green, fontWeight: 'bold', fontSize: 20, marginBottom: 4 }}>
            PURE DISPATCH
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>ADMIN PORTAL</div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>EMAIL</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="admin@puredispatch.co"
              style={{
                width: '100%',
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.text,
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>PASSWORD</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.text,
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,68,68,0.1)',
              border: `1px solid ${C.red}`,
              borderRadius: 8,
              padding: '10px 14px',
              color: C.red,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: loading ? '#333' : C.green,
              border: 'none',
              color: loading ? C.muted : '#000',
              padding: '14px',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              marginTop: 8,
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS ADMIN PORTAL'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, color: C.muted, fontSize: 11 }}>
          Admin access only. Unauthorized access is prohibited.
        </div>
      </div>
    </div>
  );
}

// ── Admin Portal Main ────────────────────────────────────────
export default function AdminPortal() {
  const [adminToken, setAdminToken] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('adminToken');
    if (stored) {
      // Verify token is still valid
      verifyToken(stored);
    } else {
      setChecking(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.valid) {
        setAdminToken(token);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (err) {
      localStorage.removeItem('adminToken');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.green, fontFamily: 'monospace' }}>Verifying admin access...</div>
      </div>
    );
  }

  if (!adminToken) {
    return <AdminLogin onLogin={setAdminToken} />;
  }

  return (
    <div>
      {/* Admin logout bar */}
      <div style={{
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>
          ADMIN SESSION ACTIVE
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: '#888',
            padding: '4px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          LOGOUT
        </button>
      </div>
      <AdminDashboard adminToken={adminToken} />
    </div>
  );
}
