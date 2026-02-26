// ============================================================
// PURE DISPATCH — DISRUPTION MONITOR
// DisruptionMonitor.jsx
// ============================================================
// Real-time display of active disruption alerts for drivers.
// Add to PureDispatcher.jsx:
//   import DisruptionMonitor from './DisruptionMonitor';
//   {currentView === 'disruptions' && <DisruptionMonitor />}
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

const SEVERITY_CONFIG = {
  extreme: { color: '#FF4444', bg: 'rgba(255,68,68,0.1)', label: 'EXTREME', icon: '🚨' },
  severe:  { color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', label: 'SEVERE',  icon: '⚠️' },
  moderate:{ color: '#FFB800', bg: 'rgba(255,184,0,0.1)',  label: 'MODERATE',icon: '⚡' },
  low:     { color: '#888888', bg: 'rgba(136,136,136,0.1)',label: 'LOW',     icon: 'ℹ️' },
};

const TYPE_CONFIG = {
  LATE_RISK:  { icon: '⏰', label: 'Late Risk' },
  WEATHER:    { icon: '🌩️', label: 'Weather' },
  BREAKDOWN:  { icon: '🔧', label: 'Breakdown' },
  TRAFFIC:    { icon: '🚗', label: 'Traffic' },
  BROKER:     { icon: '📋', label: 'Broker Issue' },
  SYSTEM:     { icon: '📢', label: 'System' },
};

export default function DisruptionMonitor({ onBack }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const authToken = localStorage.getItem('authToken');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/disruption/alerts?status=${filter}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.status}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[DisruptionMonitor]', err);
      setError('Could not load alerts. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [filter, authToken]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const resolveAlert = async (alertId) => {
    try {
      await fetch(`${BACKEND_URL}/api/disruption/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ alertId }),
      });
      fetchAlerts();
    } catch (err) {
      console.error('[DisruptionMonitor] resolve error:', err);
    }
  };

  const activeCount = alerts.filter(a => !a.resolved).length;
  const extremeCount = alerts.filter(a => a.severity === 'extreme' && !a.resolved).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #2a2a2a', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >
                ← Back
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <span style={{ color: '#00FF88', fontWeight: 'bold', fontSize: 18 }}>DISRUPTION MONITOR</span>
                {extremeCount > 0 && (
                  <span style={{ background: '#FF4444', color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 8px', borderRadius: 20 }}>
                    {extremeCount} CRITICAL
                  </span>
                )}
              </div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </div>
            </div>
          </div>
          <button
            onClick={fetchAlerts}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
            const count = alerts.filter(a => a.severity === key && !a.resolved).length;
            return (
              <div key={key} style={{ background: '#1a1a1a', border: `1px solid ${count > 0 ? cfg.color : '#2a2a2a'}`, borderRadius: 10, padding: '16px 14px' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{cfg.icon}</div>
                <div style={{ color: count > 0 ? cfg.color : '#555', fontSize: 26, fontWeight: 'bold' }}>{count}</div>
                <div style={{ color: '#666', fontSize: 11 }}>{cfg.label}</div>
              </div>
            );
          })}
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px 14px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
            <div style={{ color: '#00FF88', fontSize: 26, fontWeight: 'bold' }}>{alerts.filter(a => a.resolved).length}</div>
            <div style={{ color: '#666', fontSize: 11 }}>RESOLVED</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['active', 'all', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#00FF88' : '#1a1a1a',
                border: `1px solid ${filter === f ? '#00FF88' : '#2a2a2a'}`,
                color: filter === f ? '#000' : '#888',
                padding: '8px 18px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Alert List */}
        {error && (
          <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #FF4444', borderRadius: 10, padding: 16, marginBottom: 16, color: '#FF4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16 }}>No disruption alerts</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>All loads running smoothly</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(alert => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
              const type = TYPE_CONFIG[alert.alert_type] || { icon: '⚠️', label: alert.alert_type };
              return (
                <div
                  key={alert.id}
                  style={{
                    background: alert.resolved ? '#111' : sev.bg,
                    border: `1px solid ${alert.resolved ? '#2a2a2a' : sev.color}`,
                    borderRadius: 12,
                    padding: 18,
                    opacity: alert.resolved ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16 }}>{type.icon}</span>
                      <span style={{ color: '#ccc', fontSize: 13, fontWeight: 'bold' }}>{type.label}</span>
                      <span style={{
                        background: 'transparent',
                        border: `1px solid ${sev.color}`,
                        color: sev.color,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 'bold',
                        letterSpacing: 1,
                      }}>
                        {sev.label}
                      </span>
                      {alert.resolved && (
                        <span style={{ color: '#00FF88', fontSize: 11, border: '1px solid #00FF88', padding: '2px 8px', borderRadius: 4 }}>RESOLVED</span>
                      )}
                    </div>
                    <div style={{ color: '#555', fontSize: 11 }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ color: '#ddd', fontSize: 14, margin: '10px 0 6px' }}>{alert.message}</div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                    {alert.load_id && <span>📦 Load #{alert.load_id}</span>}
                    {alert.driver_email && <span>👤 {alert.driver_email}</span>}
                    {alert.location && <span>📍 {alert.location}</span>}
                  </div>

                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      style={{
                        marginTop: 12,
                        background: 'transparent',
                        border: '1px solid #00FF88',
                        color: '#00FF88',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      ✓ Mark Resolved
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
