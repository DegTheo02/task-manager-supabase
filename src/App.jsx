import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Navbar from "./Navbar";
import Dashboard from "./Dashboard";
import Tasks from "./Tasks";
import Kanban from "./Kanban";
import Login from "./Login";
import DailyTaskVolume from "./DailyTaskVolume";

import { useAuth } from "./context/AuthContext";



/* ===============================
   PROTECTED ROUTE
================================ */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* ===============================
   APP
================================ */
export default function App() {
  const { user, loading } = useAuth();

  const [filters, setFilters] = useState({
    owners: [],
    teams: [],
    statuses: [],
    recurrence_types: [],
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: "",
    closing_from: "",
    closing_to: "",
    today: false
  });

  // Prevent UI flash before auth loads
  if (loading) return null;

  return (
    <>
      {/* Navbar only when logged in */}
      {user && (
        <div style={stickyBar}>
          <Navbar />
        </div>
      )}

      <Routes>
        {/* Public */}
        <Route 
           path="/login" 
           element={<Login />} 
         />

         
        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kanban"
          element={
            <AdminRoute>
              <Kanban />
            </AdminRoute>
          }
        />

        <Route
          path="/daily-volume"
          element={
            <ProtectedRoute>
              <DailyTaskVolume />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}


/* ===============================
   STYLES
================================ */
const stickyBar = {
  position: "sticky",
  top: 0,
  zIndex: 1000
};
