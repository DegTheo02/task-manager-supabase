import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const DEFAULT_PERMISSIONS = {
  view_own_tasks: true,
  view_team_tasks: false,
  view_all_tasks: false,
  manage_users: false
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, permissions, team");

    setUsers(data || []);
  }

  async function updateUser(id, updatedFields) {
    await supabase
      .from("profiles")
      .update(updatedFields)
      .eq("id", id);

    loadUsers();
  }

  function togglePermission(user, key) {
    const current = user.permissions || DEFAULT_PERMISSIONS;

    const updatedPermissions = {
      ...current,
      [key]: !current[key]
    };

    updateUser(user.id, { permissions: updatedPermissions });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>User Management</h2>

      {users.map(u => (
        <div
          key={u.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 10,
            borderRadius: 6
          }}
        >
          <div><strong>{u.id}</strong></div>

          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={u.permissions?.view_own_tasks || false}
                onChange={() => togglePermission(u, "view_own_tasks")}
              />
              View Own Tasks
            </label>

            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={u.permissions?.view_team_tasks || false}
                onChange={() => togglePermission(u, "view_team_tasks")}
              />
              View Team Tasks
            </label>

            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={u.permissions?.view_all_tasks || false}
                onChange={() => togglePermission(u, "view_all_tasks")}
              />
              View All Tasks
            </label>

            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={u.permissions?.manage_users || false}
                onChange={() => togglePermission(u, "manage_users")}
              />
              Manage Users
            </label>
          </div>

          <div style={{ marginTop: 8 }}>
            <input
              value={u.team || ""}
              onChange={e =>
                updateUser(u.id, { team: e.target.value })
              }
              placeholder="Team"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
