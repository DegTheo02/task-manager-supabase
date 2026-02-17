import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, team");
    setUsers(data || []);
  }

  async function updateUser(id, role, team) {
    await supabase
      .from("profiles")
      .update({ role, team })
      .eq("id", id);

    loadUsers();
  }

  return (
    <div>
      <h2>User Management</h2>

      {users.map(u => (
        <div key={u.id}>
          {u.id}

          <select
            value={u.role}
            onChange={e =>
              updateUser(u.id, e.target.value, u.team)
            }
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <input
            value={u.team || ""}
            onChange={e =>
              updateUser(u.id, u.role, e.target.value)
            }
            placeholder="Team"
          />
        </div>
      ))}
    </div>
  );
}
