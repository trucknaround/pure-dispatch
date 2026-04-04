// ============================================================
// PURE DISPATCH — LOADBOARD CONNECTION COMPONENT
// src/LoadboardConnect.jsx
// ============================================================
// Add to Settings view in PureDispatcher.jsx:
//   import LoadboardConnect from './LoadboardConnect';
//   <LoadboardConnect />
// ============================================================

import { useState, useEffect } from 'react';

const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

export default function LoadboardConnect() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/loadboard/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConnection(data);
    } catch (err) {
      console.error('Connection check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!username || !password) {
      setError('Please enter your 123Loadboard username and password.');
      return;
    }

    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/loadboard/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(data.message);
        setShowForm(false);
        setUsername('');
        setPassword('');
        await checkConnection();
      } else {
        setError(data.error || 'Connection failed. Please try again.');
      }
    } catch (err) {
      setError('Connection failed. Please check your internet and try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your 123Loadboard account? You will lose access to 123 loads.')) return;

    try {
      await fetch(`${BACKEND_URL}/api/loadboard/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      setConnection({ connected: false });
      setSuccess('123Loadboard account disconnected.');
    } catch (err) {
      setError('Disconnect failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#555', fontSize: 13 }}>Checking 123Loadboard connection...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#1a1a1a', border: `1px solid ${connection?.connected ? '#00FF88' : '#2a2a2a'}`, borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🚛</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>123Loadboard</div>
            <div style={{ color: '#555', fontSize: 12 }}>Connect your personal account</div>
          </div>
        </div>
        <div style={{
          background: connection?.connected ? 'rgba(0,255,136,0.1)' : 'rgba(136,136,136,0.1)',
          border: `1px solid ${connection?.connected ? '#00FF88' : '#555'}`,
          color: connection?.connected ? '#00FF88' : '#888',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 'bold',
        }}>
          {connection?.connected ? '● CONNECTED' : '○ NOT CONNECTED'}
        </div>
      </div>

      {/* Connected state */}
      {connection?.connected && (
        <div>
          <div style={{ background: '#111', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Connected Account</div>
            <div style={{ color: '#fff', fontSize: 14 }}>{connection.account?.email}</div>
            {connection.account?.subscriptionType && (
              <div style={{ color: '#00FF88', fontSize: 12, marginTop: 4 }}>
                Plan: {connection.account.subscriptionType}
              </div>
            )}
            {connection.account?.connectedAt && (
              <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
                Connected {new Date(connection.account.connectedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            style={{
              background: 'transparent',
              border: '1px solid #FF4444',
              color: '#FF4444',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              width: '100%',
            }}
          >
            Disconnect Account
          </button>
        </div>
      )}

      {/* Expired state */}
      {connection?.expired && (
        <div style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid #FFB800', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ color: '#FFB800', fontSize: 13 }}>⚠️ Session expired. Please reconnect your account.</div>
        </div>
      )}

      {/* Not connected state */}
      {!connection?.connected && (
        <div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Connect your personal 123Loadboard account to search and view loads directly in Pure Dispatch.
            Each driver must use their own 123 credentials.
          </div>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: '#00FF88',
                border: 'none',
                color: '#000',
                padding: '12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                width: '100%',
              }}
            >
              Connect 123Loadboard Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>123LOADBOARD USERNAME</div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your 123Loadboard username"
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>PASSWORD</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your 123Loadboard password"
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, padding: 10 }}>
                <div style={{ color: '#00FF88', fontSize: 11 }}>
                  🔒 Your credentials are used only to authenticate with 123Loadboard on your behalf. Pure Dispatch does not store your password.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowForm(false); setError(''); }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid #2a2a2a',
                    color: '#888',
                    padding: '10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  style={{
                    flex: 2,
                    background: connecting ? '#333' : '#00FF88',
                    border: 'none',
                    color: connecting ? '#888' : '#000',
                    padding: '10px',
                    borderRadius: 8,
                    cursor: connecting ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 'bold',
                  }}
                >
                  {connecting ? 'Connecting...' : 'Connect Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #FF4444', borderRadius: 8, padding: 10, marginTop: 12, color: '#FF4444', fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid #00FF88', borderRadius: 8, padding: 10, marginTop: 12, color: '#00FF88', fontSize: 13 }}>
          {success}
        </div>
      )}
    </div>
  );
}
