import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { signOut } from "./auth";
import { supabase } from "./supabaseClient";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, role, fullName } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  /* Close menu when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    await signOut();
    navigate("/login");
  };

  return (
    <nav style={nav}>
      
      {/* LEFT */}
      <Link to="/dashboard" style={brand}>
        <img src="/favicon.ico" alt="Task Manager Logo" style={logo} />
        <span>BI & CVM Task Manager</span>
      </Link>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", alignItems: "center" }}>

        {/* Navigation Links */}
        <NavLink to="/dashboard" style={link}>Dashboard</NavLink>
        <NavLink to="/tasks" style={link}>Tasks</NavLink>
        <NavLink to="/daily-volume" style={link}>Daily Volume</NavLink>
        <NavLink to="/kanban" style={link}>Kanban</NavLink>

        {role === "admin" && (
          <NavLink to="/admin" style={link}>Admin</NavLink>
        )}

        {/* USER DROPDOWN */}
        <div style={{ position: "relative", marginLeft: 20 }} ref={menuRef}>
          
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            👤 {fullName || user?.email}
          </div>

          {menuOpen && (
            <div style={dropdown}>
              <div style={dropdownItem}>
                Role: {role?.toUpperCase()}
              </div>

              <div
                style={{ ...dropdownItem, color: "#DC2626" }}
                onClick={handleLogout}
              >
                🔴 Logout
              </div>
            </div>
          )}

        </div>

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

const dropdown = {
  position: "absolute",
  right: 0,
  top: 35,
  background: "white",
  color: "black",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  minWidth: 160,
  padding: 6,
  zIndex: 3000
};

const dropdownItem = {
  padding: "8px 12px",
  cursor: "pointer",
  borderRadius: 4
};
