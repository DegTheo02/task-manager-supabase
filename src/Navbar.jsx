import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={nav}>
      <h3>BI&CVM - Task Manager</h3>

      <div>
        <NavLink to="/dashboard" style={link}>
          Dashboard
        </NavLink>

        <NavLink to="/tasks" style={link}>
          Tasks
        </NavLink>

        <NavLink to="/kanban" style={link}>
          Kanban
        </NavLink>

        <NavLink to="/daily-volume" style={link}>
          Daily Volume
        </NavLink>
      </div>
    </nav>
  );
}

const nav = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "6px 12px",
  background: "#111827",
  color: "white"
};

const link = {
  marginLeft: 15,
  color: "white",
  textDecoration: "none",
  fontWeight: 500
};
