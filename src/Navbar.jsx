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
       
        <div
          ref={menuRef}
          style={{ position: "relative", marginLeft: 20 }}
        >
          {/* Trigger */}
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              padding: "6px 10px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            👤 {fullName || user?.email}
          </div>
        
          {/* Dropdown Panel */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "#1F2937",
                color: "white",
                borderRadius: 8,
                padding: "8px 0",
                minWidth: 180,
                boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                zIndex: 9999,
              }}
            >
              {/* Role */}
              <div
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  opacity: 0.8,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Role: {role?.toUpperCase()}
              </div>
        
              {/* Logout */}
              <div
                onClick={handleLogout}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  color: "#F87171",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#374151")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
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
