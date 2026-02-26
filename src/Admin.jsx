import React, { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./supabaseClient";
import { useRef } from "react";



export default function Admin() {
const {user,fullName, permissions } = useAuth();

  
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
        <TeamActivityStats />
      </div>
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
  const dropdownRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({
  key: "CREATE",
  direction: "desc"
});

  useEffect(() => {
    loadUsers();      // load profiles + email counts
  }, []);
  
  useEffect(() => {
    loadActivity();   // load activity logs only
  }, [startDate, endDate, selectedUsers]);

    useEffect(() => {
  function handleClickOutside(event) {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target)
    ) {
      setShowDropdown(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  
  async function loadActivity() {
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

  setStats(activity);
}

  async function loadUsers() {
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, last_login_at, last_active_at");

  const { data: emailLogs } = await supabase
    .from("email_logs")
    .select("recipient, status");

  const emailCountMap = {};

  emailLogs?.forEach(log => {
    if (log.status !== "sent") return;

    emailCountMap[log.recipient] =
      (emailCountMap[log.recipient] || 0) + 1;
  });

  const enrichedUsers = (users || []).map(user => ({
    ...user,
    email_received: emailCountMap[user.email] || 0
  }));

  setProfiles(enrichedUsers);
}
  


  const totals = profiles.reduce(
    (acc, user) => {
      acc.CREATE += stats[user.id]?.CREATE || 0;
      acc.UPDATE += stats[user.id]?.UPDATE || 0;
      acc.DELETE += stats[user.id]?.DELETE || 0;
      acc.CLOSE += stats[user.id]?.CLOSE || 0;
      acc.EMAILS += user.email_received || 0;
      return acc;
    },
   { CREATE: 0, UPDATE: 0, DELETE: 0, CLOSE: 0, EMAILS: 0 }
  );

  const sortedProfiles = [...profiles]
  .filter(user =>
    selectedUsers.length > 0
      ? selectedUsers.includes(user.id)
      : true
  )
  .sort((a, b) => {
    const aValue =
      sortConfig.key === "USER"
        ? (a.full_name || a.email).toLowerCase()
        : stats[a.id]?.[sortConfig.key] || 0;
  
    const bValue =
      sortConfig.key === "USER"
        ? (b.full_name || b.email).toLowerCase()
        : stats[b.id]?.[sortConfig.key] || 0;
  
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

function handleSort(column) {
  setSortConfig(prev => ({
    key: column,
    direction:
      prev.key === column && prev.direction === "asc"
        ? "desc"
        : "asc"
  }));
}

  function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return Math.floor(diff / 86400) + " day(s) ago";
}

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
        <div
          ref={dropdownRef}
          style={{ ...filterItem, position: "relative" }}
        >
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

        <button
        style={todayButton}
        onClick={() => {
          const today = new Date().toISOString().slice(0, 10);
          setStartDate(today);
          setEndDate(today);
        }}
      >
        Today
      </button>
      </div>

      {/* TABLE */}
 <table style={enterpriseTable}>
   
<thead>
  <tr>
    <th style={leftHeader} onClick={() => handleSort("USER")}>
      User {sortConfig.key === "USER" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
    </th>

    <th style={centerHeader} onClick={() => handleSort("CREATE")}>
      Create {sortConfig.key === "CREATE" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
    </th>

    <th style={centerHeader} onClick={() => handleSort("UPDATE")}>
      Update {sortConfig.key === "UPDATE" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
    </th>

    <th style={centerHeader} onClick={() => handleSort("DELETE")}>
      Delete {sortConfig.key === "DELETE" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
    </th>

    <th style={centerHeader} onClick={() => handleSort("CLOSE")}>
      Close {sortConfig.key === "CLOSE" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
    </th>

    <th style={centerHeader}>Emails</th>
    <th style={centerHeader}>Last Login</th>
    <th style={centerHeader}>Last Active</th>
  </tr>
</thead>

  <tbody>
    
{sortedProfiles.map(user => (
  <tr key={user.id}
  style={tableRow}
  onMouseEnter={e => e.currentTarget.style.background = "#eef2ff"}
  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
  >
    <td style={leftCell}>
      {user.full_name || user.email}
    </td>
    <td style={centerCell}>{stats[user.id]?.CREATE || 0}</td>
    <td style={centerCell}>{stats[user.id]?.UPDATE || 0}</td>
    <td style={centerCell}>{stats[user.id]?.DELETE || 0}</td>
    <td style={centerCell}>{stats[user.id]?.CLOSE || 0}</td>
    <td style={centerCell}>{user.email_received || 0}</td>

    <td style={centerCell}>
    {user.last_login_at
    ? formatRelativeTime(user.last_login_at)
    : "-"}
    </td>
    
    <td style={centerCell}>
      {user.last_active_at
        ? formatRelativeTime(user.last_active_at)
        : "-"}
    </td>
    
  </tr>
))}

    <tr style={totalRow}>
      <td style={leftCell}><strong>Total</strong></td>
      <td style={centerCell}>{totals.CREATE}</td>
      <td style={centerCell}>{totals.UPDATE}</td>
      <td style={centerCell}>{totals.DELETE}</td>
      <td style={centerCell}>{totals.CLOSE}</td>
      <td style={centerCell}>{totals.EMAILS}</td>
      <td></td>
      <td></td>
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
  gap: 12,
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

const todayButton = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 500
};

const enterpriseTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  background: "#fff",
  tableLayout: "fixed"  // 👈 VERY IMPORTANT
};

const leftHeader = {
  textAlign: "left",
  padding: "12px",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
  width: "70px"  // 👈 narrower
};

const centerHeader = {
  textAlign: "center",
  padding: "12px",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
  width: "40px"   // 👈 reduced width
};

const leftCell = {
  textAlign: "left",
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  width: "70px",
  maxWidth: "100px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const centerCell = {
  textAlign: "center",
  padding: "10px 12px",
  border: "1px solid #e5e7eb"
};

const totalRow = {
  background: "#f3f4f6",
  fontWeight: 600
};

const tableRow = {
  transition: "background 0.2s ease"
};
