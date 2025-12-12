import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const loc = useLocation();

  const style = (p) => ({
    padding: "10px 15px",
    marginRight: "10px",
    textDecoration: "none",
    borderRadius: "6px",
    background: loc.pathname === p ? "#3B82F6" : "#E5E7EB",
    color: loc.pathname === p ? "white" : "black"
  });

  return (
    <nav style={{ padding: 10, borderBottom: "1px solid #ddd" }}>
      <Link to="/dashboard" style={style("/dashboard")}>Dashboard</Link>
      <Link to="/kanban" style={style("/kanban")}>Kanban</Link>
      <Link to="/tasks" style={style("/tasks")}>Tasks</Link>
    </nav>
  );
}