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
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedUsers]);

  async function loadData() {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    let query = supabase
      .from("activity_logs")
      .select("user_id, action, created_at");

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59");
    if (selectedUsers.length > 0)
      query = query.in("user_id", selectedUsers);

    const { data: logs } = await query;

    const activity = {};
    logs?.forEach(log => {
      if (!activity[log.user_id]) {
        activity[log.user_id] = { CREATE: 0, UPDATE: 0, DELETE: 0, CLOSE: 0 };
      }
      if (activity[log.user_id][log.action] !== undefined) {
        activity[log.user_id][log.action]++;
      }
    });

    setProfiles(users || []);
    setStats(activity);
  }

  const totals = profiles.reduce(
    (acc, user) => {
      acc.CREATE += stats[user.id]?.CREATE || 0;
      acc.UPDATE += stats[user.id]?.UPDATE || 0;
      acc.DELETE += stats[user.id]?.DELETE || 0;
      acc.CLOSE += stats[user.id]?.CLOSE || 0;
      return acc;
    },
    { CREATE: 0, UPDATE: 0, DELETE: 0, CLOSE: 0 }
  );

  return (
    <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
      <div style={sectionHeader}>
        <h3 style={{ margin: 0 }}>Team Activity</h3>
      </div>

      {/* FILTERS */}
      <div style={filterContainer}>
        <div style={filterItem}>
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div style={filterItem}>
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        {/* USER DROPDOWN */}
        <div style={{ ...filterItem, position: "relative" }}>
          <label>Users</label>
          <div
            style={dropdownButton}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {selectedUsers.length === 0
              ? "All Users"
              : `${selectedUsers.length} selected`}
          </div>

          {showDropdown && (
            <div style={dropdownMenu}>
              <div style={{ marginBottom: 8 }}>
                <strong>Select Users</strong>
              </div>

              {profiles.map(user => (
                <label key={user.id} style={checkboxItem}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => {
                      if (selectedUsers.includes(user.id)) {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      } else {
                        setSelectedUsers([...selectedUsers, user.id]);
                      }
                    }}
                  />
                  {user.full_name || user.email}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          style={resetButton}
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setSelectedUsers([]);
          }}
        >
          Reset
        </button>
      </div>

      {/* TABLE */}
      <table style={enterpriseTable}>
        <thead>
          <tr>
            <th>User</th>
            <th>Create</th>
            <th>Update</th>
            <th>Delete</th>
            <th>Close</th>
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
                <td>{user.full_name || user.email}</td>
                <td>{stats[user.id]?.CREATE || 0}</td>
                <td>{stats[user.id]?.UPDATE || 0}</td>
                <td>{stats[user.id]?.DELETE || 0}</td>
                <td>{stats[user.id]?.CLOSE || 0}</td>
              </tr>
            ))}

          <tr style={totalRow}>
            <td><strong>Total</strong></td>
            <td>{totals.CREATE}</td>
            <td>{totals.UPDATE}</td>
            <td>{totals.DELETE}</td>
            <td>{totals.CLOSE}</td>
          </tr>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 24,
  marginTop: 30
};

const cardStyle = {
  padding: 24,
  borderRadius: 12,
  background: "#ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const sectionHeader = {
  marginBottom: 20,
  paddingBottom: 10,
  borderBottom: "1px solid #eee"
};

const filterContainer = {
  display: "flex",
  gap: 20,
  alignItems: "flex-end",
  marginBottom: 25,
  flexWrap: "wrap"
};

const filterItem = {
  display: "flex",
  flexDirection: "column",
  gap: 5
};

const dropdownButton = {
  border: "1px solid #ccc",
  padding: "8px 12px",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  minWidth: 180
};

const dropdownMenu = {
  position: "absolute",
  top: 60,
  left: 0,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  width: 220,
  maxHeight: 250,
  overflowY: "auto",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  zIndex: 10
};

const checkboxItem = {
  display: "flex",
  gap: 8,
  marginBottom: 6,
  fontSize: 14
};

const resetButton = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#f3f4f6",
  cursor: "pointer",
  fontWeight: 500
};

const enterpriseTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14
};

const totalRow = {
  background: "#f9fafb",
  fontWeight: "600"
};
