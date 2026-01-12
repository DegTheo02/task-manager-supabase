import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Navbar from "./Navbar";
import Dashboard from "./Dashboard";
import Tasks from "./Tasks";
import Kanban from "./Kanban";
import Login from "./Login";

/* ===============================
   PROTECTED ROUTE
================================ */
function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/* ===============================
   APP
================================ */
export default function App() {
  const [session, setSession] = useState(null);

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


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {/* Sticky Navbar only when logged in */}
      {session && (
        <div style={stickyBar}>
          <Navbar />
        </div>
      )}

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <Kanban />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/daily-volume" element={<DailyTaskVolume />} />

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
