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

      <p><strong>User:</strong> {user?.fullName}</p>

      <hr />

      <div style={gridStyle}>
        <SystemHealth />
        <EmailStats />
        <AdminLogs />
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
