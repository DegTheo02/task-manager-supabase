import { NavLink, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";   // ✅ THIS LINE WAS MISSING


export default function Navbar() {
  const { user, role, fullName } = useAuth();

  return (
    <nav style={nav}>
      
      {/* LEFT */}
      <Link to="/dashboard" style={brand}>
        <img src="/favicon.ico" alt="Task Manager Logo" style={logo} />
        <span>BI & CVM Task Manager</span>
      </Link>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", alignItems: "center" }}>

        {/* User Info */}
        <div style={{ marginRight: 20, fontSize: 13 }}>
          {fullName || user?.email} ({role?.toUpperCase()})
        </div>

        {/* Navigation Links */}
        <NavLink to="/dashboard" style={link}>
          Dashboard
        </NavLink>

        <NavLink to="/tasks" style={link}>
          Tasks
        </NavLink>

        <NavLink to="/daily-volume" style={link}>
          Daily Volume
        </NavLink>

        <NavLink to="/kanban" style={link}>
          Kanban
        </NavLink>

        {role === "admin" && (
          <NavLink to="/admin" style={link}>
            Admin
          </NavLink>
        )}

      </div>
    </nav>
  );
}




/* =====================
   STYLES
===================== */

const nav = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 16px",
  background: "#111827",
  color: "white",
  position: "sticky",
  top: 0,
  zIndex: 2000
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
  color: "white",
  fontWeight: 700,
  fontSize: 16
};

const logo = {
  height: 34,
  width: "auto"
};

const link = {
  marginLeft: 18,
  color: "white",
  textDecoration: "none",
  fontWeight: 500
};
