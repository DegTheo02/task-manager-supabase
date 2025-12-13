import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import Dashboard from "./Dashboard";
import Tasks from "./Tasks";
import Kanban from "./Kanban";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/kanban" element={<Kanban />} />
      </Routes>
    </>
  );
}
