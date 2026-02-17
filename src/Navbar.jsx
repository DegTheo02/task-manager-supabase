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
