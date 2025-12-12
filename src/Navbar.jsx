import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav 
      style={{
        display: "flex",
        gap: "20px",
        padding: "15px",
        background: "#1F2937",
        color: "white"
      }}
    >
      <Link style={{ color: "white" }} to="/dashboard">Dashboard</Link>
      <Link style={{ color: "white" }} to="/kanban">Kanban</Link>
      <Link style={{ color: "white" }} to="/tasks">Tasks</Link>
    </nav>
  );
}
