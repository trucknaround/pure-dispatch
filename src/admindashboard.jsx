// ============================================================
// PURE DISPATCH — ADMIN DASHBOARD
// AdminDashboard.jsx
// ============================================================
// This is a complete single-file React component.
// Deploy it as a protected route at /admin in your web app.
// Only users with role = 'admin' in Supabase profiles can see it.
//
// Add to your router:
//   <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
// ============================================================

import { useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

// ── Color system matching Pure Dispatch brand ──
const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#1a1a1a",
  border: "#2a2a2a",
  green: "#00FF88",
  greenDim: "#00cc6a",
  red: "#FF4444",
  yellow: "#FFB800",
  blue: "#3B82F6",
  text: "#ffffff",
  muted: "#888888",
  dim: "#555555",
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState({ history: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [broadcastForm, setBroadcastForm] = useState({ title: "", body: "", segment: "all" });
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  const authToken = localStorage.getItem("supabase_token") || "";

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          ...(options.headers || {}),
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    [authToken]
  );

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsData, usersData, incidentsData, alertsData] = await Promise.allSettled([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/incidents"),
        apiFetch("/api/admin/disruption-alerts"),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (usersData.status === "fulfilled") setUsers(usersData.value.users || []);
      if (incidentsData.status === "fulfilled") setIncidents(incidentsData.value.incidents || []);
      if (alertsData.status === "fulfilled") setAlerts(alertsData.value.alerts || []);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendBroadcast() {
    if (!broadcastForm.title || !broadcastForm.body) return;
    setBroadcastStatus("sending");
    try {
      const result = await apiFetch("/api/push/broadcast", {
        method: "POST",
        body: JSON.stringify(broadcastForm),
      });
      setBroadcastStatus(`✅ Sent to ${result.sent} drivers`);
      setBroadcastForm({ title: "", body: "", segment: "all" });
    } catch (err) {
      setBroadcastStatus("❌ Failed to send");
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchTerm ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mc_number?.includes(searchTerm) ||
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      userFilter === "all" ||
      (userFilter === "active" && u.subscription_status === "active") ||
      (userFilter === "inactive" && u.subscription_status !== "active") ||
      (userFilter === "trial" && u.plan_type === "trial");
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.green, fontSize: 18 }}>Loading Pure Dispatch Admin...</div>
      </div>
    );
  }

  const tabs = ["overview", "users", "incidents", "alerts", "broadcast"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "monospace", color: C.text }}>
      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: C.green, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ color: C.green, fontWeight: "bold", fontSize: 18 }}>PURE DISPATCH</div>
            <div style={{ color: C.muted, fontSize: 11 }}>ADMIN CONTROL CENTER</div>
          </div>
        </div>
        <button
          onClick={loadDashboard}
          style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Tab Nav ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? C.card : "transparent",
              border: "none",
              borderBottom: activeTab === tab ? `2px solid ${C.green}` : "2px solid transparent",
              color: activeTab === tab ? C.green : C.muted,
              padding: "14px 24px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: 1,
              whiteSpace: "nowrap",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ══ OVERVIEW TAB ══ */}
        {activeTab === "overview" && (
          <div>
            <div style={{ marginBottom: 24, color: C.muted, fontSize: 13 }}>
              {new Date().toLocaleString()} — Live platform status
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Users", value: stats?.totalUsers ?? "—", color: C.green, icon: "👤" },
                { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? "—", color: C.green, icon: "✅" },
                { label: "MRR", value: stats?.mrr ? `$${stats.mrr.toLocaleString()}` : "—", color: C.green, icon: "💰" },
                { label: "Active Loads", value: stats?.activeLoads ?? "—", color: C.blue, icon: "🚛" },
                { label: "Open Incidents", value: stats?.openIncidents ?? "—", color: stats?.openIncidents > 0 ? C.red : C.muted, icon: "🚨" },
                { label: "Disruption Alerts", value: stats?.openAlerts ?? "—", color: stats?.openAlerts > 0 ? C.yellow : C.muted, icon: "⚠️" },
                { label: "Loads Today", value: stats?.loadsToday ?? "—", color: C.text, icon: "📦" },
                { label: "Notifications Sent", value: stats?.notificationsSent ?? "—", color: C.text, icon: "🔔" },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 16px" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ color, fontSize: 28, fontWeight: "bold", marginBottom: 4 }}>{value}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Recent Incidents Preview */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: C.green, fontWeight: "bold", marginBottom: 16, fontSize: 14 }}>RECENT INCIDENTS</div>
              {incidents.slice(0, 5).length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>No open incidents. All clear ✅</div>
              ) : (
                incidents.slice(0, 5).map((inc) => (
                  <IncidentRow key={inc.id} incident={inc} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ USERS TAB ══ */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search by email, MC#, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: 200, background: C.card, border: `1px solid ${C.border}`, color: C.text, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: "monospace" }}
              />
              {["all", "active", "inactive", "trial"].map((f) => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  style={{
                    background: userFilter === f ? C.green : C.card,
                    border: `1px solid ${userFilter === f ? C.green : C.border}`,
                    color: userFilter === f ? "#000" : C.muted,
                    padding: "10px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "monospace",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              {filteredUsers.length} users shown
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUsers.length === 0 ? (
                <div style={{ color: C.muted, padding: 20, textAlign: "center" }}>No users match your filter</div>
              ) : (
                filteredUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ INCIDENTS TAB ══ */}
        {activeTab === "incidents" && (
          <div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              {incidents.length} total incidents logged
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {incidents.length === 0 ? (
                <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>No incidents logged yet</div>
              ) : (
                incidents.map((inc) => (
                  <div key={inc.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <SeverityBadge severity={inc.severity} />
                      <div style={{ color: C.muted, fontSize: 11 }}>{new Date(inc.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ color: C.text, fontSize: 14, marginBottom: 6 }}>{inc.description}</div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.muted }}>
                      <span>Driver: {inc.driver_email || inc.user_id?.slice(0, 8)}</span>
                      {inc.mc_number && <span>MC# {inc.mc_number}</span>}
                      {inc.location && <span>📍 {inc.location}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ ALERTS TAB ══ */}
        {activeTab === "alerts" && (
          <div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              {alerts.filter((a) => !a.resolved).length} open disruption alerts
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.length === 0 ? (
                <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>No disruption alerts</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      background: C.card,
                      border: `1px solid ${alert.resolved ? C.border : getAlertColor(alert.severity)}`,
                      borderRadius: 10,
                      padding: 16,
                      opacity: alert.resolved ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <AlertTypeBadge type={alert.alert_type} />
                        <SeverityBadge severity={alert.severity} />
                        {alert.resolved && <span style={{ color: C.muted, fontSize: 11 }}>RESOLVED</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 11 }}>{new Date(alert.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ color: C.text, fontSize: 13 }}>{alert.message}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>Load #{alert.load_id}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ BROADCAST TAB ══ */}
        {activeTab === "broadcast" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
              Send a push notification to all drivers or a specific segment.
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>SEGMENT</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["all", "active"].map((seg) => (
                    <button
                      key={seg}
                      onClick={() => setBroadcastForm((f) => ({ ...f, segment: seg }))}
                      style={{
                        background: broadcastForm.segment === seg ? C.green : C.surface,
                        border: `1px solid ${broadcastForm.segment === seg ? C.green : C.border}`,
                        color: broadcastForm.segment === seg ? "#000" : C.muted,
                        padding: "8px 20px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: "monospace",
                      }}
                    >
                      {seg === "all" ? "All Users" : "Active Subscribers Only"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>TITLE</div>
                <input
                  type="text"
                  placeholder="e.g. New Feature Available"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={60}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontFamily: "monospace", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>MESSAGE</div>
                <textarea
                  placeholder="What do you want drivers to know?"
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))}
                  rows={4}
                  maxLength={200}
                  style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "12px 14px", borderRadius: 8, fontSize: 14, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ color: C.dim, fontSize: 11, textAlign: "right" }}>{broadcastForm.body.length}/200</div>
              </div>

              <button
                onClick={sendBroadcast}
                disabled={!broadcastForm.title || !broadcastForm.body || broadcastStatus === "sending"}
                style={{
                  background: broadcastForm.title && broadcastForm.body ? C.green : C.dim,
                  border: "none",
                  color: "#000",
                  padding: "14px",
                  borderRadius: 8,
                  cursor: broadcastForm.title && broadcastForm.body ? "pointer" : "not-allowed",
                  fontSize: 14,
                  fontWeight: "bold",
                  fontFamily: "monospace",
                }}
              >
                {broadcastStatus === "sending" ? "SENDING..." : "📢 SEND BROADCAST"}
              </button>

              {broadcastStatus && broadcastStatus !== "sending" && (
                <div style={{ color: broadcastStatus.includes("✅") ? C.green : C.red, fontSize: 14, textAlign: "center" }}>
                  {broadcastStatus}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function UserRow({ user }) {
  const statusColor =
    user.subscription_status === "active" ? "#00FF88" :
    user.subscription_status === "past_due" ? "#FFB800" : "#888888";

  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>{user.company_name || user.email}</div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
          {user.email} {user.mc_number && `• MC# ${user.mc_number}`} {user.dot_number && `• DOT# ${user.dot_number}`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ background: "transparent", border: `1px solid ${statusColor}`, color: statusColor, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontFamily: "monospace" }}>
          {user.subscription_status || "NO SUB"}
        </div>
        {user.plan_type && (
          <div style={{ background: "#2a2a2a", color: "#888", padding: "4px 10px", borderRadius: 20, fontSize: 11 }}>
            {user.plan_type}
          </div>
        )}
        <div style={{ color: "#555", fontSize: 11 }}>
          Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #2a2a2a", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <div>
        <SeverityBadge severity={incident.severity} />
        <span style={{ color: "#ccc", fontSize: 13, marginLeft: 10 }}>{incident.description?.slice(0, 80)}</span>
      </div>
      <div style={{ color: "#555", fontSize: 11 }}>{new Date(incident.created_at).toLocaleString()}</div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const colors = { low: "#888", moderate: "#FFB800", severe: "#FF6B35", extreme: "#FF4444", high: "#FF6B35" };
  return (
    <span style={{ background: "transparent", border: `1px solid ${colors[severity] || "#888"}`, color: colors[severity] || "#888", padding: "3px 8px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", textTransform: "uppercase" }}>
      {severity}
    </span>
  );
}

function AlertTypeBadge({ type }) {
  const icons = { LATE_RISK: "⏰", WEATHER: "🌩️", BREAKDOWN: "🔧", TRAFFIC: "🚗" };
  return (
    <span style={{ color: "#ccc", fontSize: 12 }}>{icons[type] || "⚠️"} {type?.replace("_", " ")}</span>
  );
}

function getAlertColor(severity) {
  return { moderate: "#FFB800", severe: "#FF6B35", extreme: "#FF4444" }[severity] || "#2a2a2a";
}
