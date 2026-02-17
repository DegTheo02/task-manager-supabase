import { NavLink, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

export default function Navbar() {
  const { user, role } = useAuth();   // ✅ MOVE INSIDE COMPONENT

  return (
    <nav style={nav}>
      
      {/* LEFT: Logo + App name */}
      <Link to="/dashboard" style={brand}>
        <img
          src="/favicon.ico"
          alt="Task Manager Logo"
          style={logo}
        />
        <span>BI & CVM Task Manager</span>
      </Link>

      {/* RIGHT: Navigation */}
      <div>

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

        {/* 🔐 ADMIN LINKS */}
        {role === "admin" && (
          <>
            <NavLink to="/admin" style={link}>
              Admin
            </NavLink>
          </>
        )}

      </div>
    </nav>
  );
}
