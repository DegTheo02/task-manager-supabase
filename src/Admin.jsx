import React from "react";
import { useAuth } from "./context/AuthContext";

export default function Admin() {
  const { user, permissions } = useAuth();

  return (
    <div style={{ padding: 30 }}>
      <h1>🛠 Admin Panel</h1>

      <p><strong>User:</strong> {user?.email}</p>

      <hr />

      <h3>Admin Tools</h3>

      <ul>
        {permissions?.manage_users && (
          <li>Manage users</li>
        )}

        {permissions?.view_logs && (
          <li>View system logs</li>
        )}

        {permissions?.recalculate_tasks && (
          <li>Force task recalculation</li>
        )}

        {permissions?.manage_sla && (
          <li>Manage SLA rules</li>
        )}
      </ul>
    </div>
  );
}
