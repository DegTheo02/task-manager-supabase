import { NavLink } from "react-router-dom";
import { Link } from "react-router-dom";


export default function Navbar() {
  return (
    <nav style={nav}>
      <h3>BI&CVM - Task Manager</h3>
      <div>
        <NavLink to="/dashboard" style={link}>Dashboard</NavLink>
        <NavLink to="/tasks" style={link}>Tasks</NavLink>
        <NavLink to="/kanban" style={link}>Kanban</NavLink>
        <Link to="/daily-volume">📊 Daily Volume</Link>

      </div>
    </nav>
  );
}

const nav = {
  display: "flex",
  justifyContent: "space-between",
  padding: 5,
  background: "#111827",
  color: "white"
};

const link = {
  marginLeft: 15,
  color: "white",
  textDecoration: "none"
};
