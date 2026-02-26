import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";

export default function Admin() {
  const { user,fullName, permissions } = useAuth();

  if (!permissions?.manage_users) {
    return (
      <div style={{ padding: 30 }}>
        <h2>⛔ Access Denied</h2>
        <p>You do not have permission to access the Admin Panel.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>🛠 Admin Panel</h1>

      <p><strong>User:</strong> {fullName || user?.email}</p>

      <hr />

      <div style={gridStyle}>
        <SystemHealth />
        <EmailStats />
        <AdminLogs />
        <TeamActivityStats />
      </div>
    </div>
  );
}

/* ===============================
   SYSTEM HEALTH
================================ */

function SystemHealth() {
  const [stats, setStats] = useState({
    users: 0,
    tasks: 0,
    openTasks: 0
  });

  useEffect(() => {
    async function loadStats() {
      const users = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const tasks = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      const openTasks = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "Closed");

      setStats({
        users: users.count || 0,
        tasks: tasks.count || 0,
        openTasks: openTasks.count || 0
      });
    }

    loadStats();
  }, []);

  return (
    <div style={cardStyle}>
      <h3>🩺 System Health</h3>
      <p>Total Users: {stats.users}</p>
      <p>Total Tasks: {stats.tasks}</p>
      <p>Open Tasks: {stats.openTasks}</p>
    </div>
  );
}

/* ===============================
   EMAIL USAGE
================================ */

function EmailStats() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function loadEmailStats() {
      const today = new Date().toISOString().slice(0, 10);

      const { count } = await supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      setCount(count || 0);
    }

    loadEmailStats();
  }, []);

  return (
    <div style={cardStyle}>
      <h3>📧 Email Usage</h3>
      <p>Today: {count} / 100 emails</p>
    </div>
  );
}

/* ===============================
   ADMIN ACTIVITY LOGS
================================ */

function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function loadLogs() {
      const { data } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setLogs(data || []);
    }

    loadLogs();
  }, []);

  return (
    <div style={cardStyle}>
      <h3>📜 Admin Activity</h3>

      {logs.length === 0 && (
        <p style={{ opacity: 0.6 }}>No recent activity.</p>
      )}

      {logs.map(log => (
        <div key={log.id} style={{ fontSize: 13, marginBottom: 10 }}>
          <strong>{log.action}</strong>
          <div style={{ opacity: 0.6 }}>
            {new Date(log.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===============================
   TEAM ACTIVITY STATS
================================ */

function TeamActivityStats() {
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedUsers]);

  async function loadData() {
    // Get users
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    // Build query for activity logs
    let query = supabase
      .from("activity_logs")
      .select("user_id, action, created_at");

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate + "T23:59:59");
    }

    if (selectedUsers.length > 0) {
      query = query.in("user_id", selectedUsers);
    }

    const { data: logs } = await query;

    const activity = {};

    logs?.forEach(log => {
      if (!activity[log.user_id]) {
        activity[log.user_id] = {
          CREATE: 0,
          UPDATE: 0,
          DELETE: 0,
          CLOSE: 0
        };
      }

      if (activity[log.user_id][log.action] !== undefined) {
        activity[log.user_id][log.action]++;
      }
    });

    setProfiles(users || []);
    setStats(activity);
  }

  return (
    <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
      <h3>📊 Team Activity</h3>

      {/* ===== FILTERS ===== */}
      <div style={{ display: "flex", gap: 15, marginBottom: 15 }}>
        <div>
          <label>From</label><br />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>To</label><br />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label>Users</label><br />
          <select
            multiple
            value={selectedUsers}
            onChange={e =>
              setSelectedUsers(
                Array.from(e.target.selectedOptions, option => option.value)
              )
            }
          >
            {profiles.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thtdStyle}>User</th>
            <th style={thtdStyle}>Create</th>
            <th style={thtdStyle}>Update</th>
            <th style={thtdStyle}>Delete</th>
            <th style={thtdStyle}>Close</th>
          </tr>
        </thead>
        <tbody>
          {profiles
            .filter(user =>
              selectedUsers.length > 0
                ? selectedUsers.includes(user.id)
                : true
            )
            .map(user => (
              <tr key={user.id}>
                <td style={thtdStyle}>
                  {user.full_name || user.email}
                </td>
                <td style={thtdStyle}>{stats[user.id]?.CREATE || 0}</td>
                <td style={thtdStyle}>{stats[user.id]?.UPDATE || 0}</td>
                <td style={thtdStyle}>{stats[user.id]?.DELETE || 0}</td>
                <td style={thtdStyle}>{stats[user.id]?.CLOSE || 0}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===============================
   STYLES
================================ */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 20,
  marginTop: 20
};

const cardStyle = {
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#f9f9f9"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 10
};

const thtdStyle = {
  border: "1px solid #ccc",
  padding: 8,
  textAlign: "center"
};
