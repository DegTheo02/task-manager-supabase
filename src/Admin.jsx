import React from "react";
import { useAuth } from "./context/AuthContext";

export default function Admin() {
  const { user, permissions } = useAuth();

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

      <p><strong>User:</strong> {user?.email}</p>

      <hr />

      <div style={gridStyle}>
        {permissions?.manage_users && (
          <AdminCard title="Manage Users" description="Create, edit and manage system users." />
        )}

        {permissions?.view_logs && (
          <AdminCard title="System Logs" description="View system activity and audit logs." />
        )}

        {permissions?.recalculate_tasks && (
          <AdminCard title="Task Recalculation" description="Force recalculation of recurring tasks." />
        )}

        {permissions?.manage_sla && (
          <AdminCard title="SLA Management" description="Configure SLA and deadline rules." />
        )}
      </div>
    </div>
  );
}

function AdminCard({ title, description }) {
  return (
    <div style={cardStyle}>
      <h3>{title}</h3>
      <p>{description}</p>
      <button style={buttonStyle}>Open</button>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 20,
  marginTop: 20
};

const cardStyle = {
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#f9f9f9"
};

const buttonStyle = {
  marginTop: 10,
  padding: "6px 12px",
  cursor: "pointer"
};
