import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }, [dark]);

  return (
    <nav 
      className={dark ? "nav-dark" : ""}
      style={{
        display: "flex",
        gap: "20px",
        padding: "15px",
        background: "#1F2937",
        color: "white",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", gap: "20px" }}>
        <Link style={{ color: "white" }} to="/dashboard">Dashboard</Link>
        <Link style={{ color: "white" }} to="/kanban">Kanban</Link>
        <Link style={{ color: "white" }} to="/tasks">Tasks</Link>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setDark(!dark)}
        style={{
          padding: "6px 12px",
          background: dark ? "#4B5563" : "white",
          color: dark ? "white" : "#111",
          border: "none",
          borderRadius: "6px"
        }}
      >
        {dark ? "Light Mode" : "Dark Mode"}
      </button>
    </nav>
  );
}
