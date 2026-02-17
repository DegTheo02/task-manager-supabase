import React from "react";
import { useAuth } from "./context/AuthContext";

export default function Admin() {
  const { user, role } = useAuth();

  return (
    <div style={{ padding: 30 }}>
      <h1>🛠 Admin Panel</h1>

      <p><strong>User:</strong> {user?.email}</p>
      <p><strong>Role:</strong> {role}</p>

      <hr />

      <h3>Admin Tools</h3>

      <ul>
        <li>Manage users</li>
        <li>View system logs</li>
        <li>Force task recalculation</li>
        <li>Manage SLA rules</li>
      </ul>
    </div>
  );
}
