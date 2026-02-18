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

import RoleRoute from "./routes/RoleRoute";

import PermissionRoute from "./routes/PermissionRoute";
import Admin from "./Admin";


/* ===============================
   PROTECTED ROUTE
================================ */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}



function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

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
  const { user,role, loading } = useAuth();
  console.log("Auth state:", { user, role, loading });
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
  if (loading) return <div>Loading...</div>;

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


         <Route
           path="/admin"
           element={
             <PermissionRoute permission="manage_users">
               <Admin />
              </PermissionRoute>
        }
      />

        {/* Protected */}
         <Route
           path="/dashboard"
           element={
             <PermissionRoute permission="manage_users">
               <Dashboard />
              </PermissionRoute>
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
             <PermissionRoute permission="manage_users">
               <Kanban />
              </PermissionRoute>
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
         <Route
           path="/"
           element={
             user
               ? <Navigate to="/tasks" replace />
               : <Navigate to="/login" replace />
           }
         />


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
