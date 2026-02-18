import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PermissionRoute({ children, permission }) {
  const { user, permissions, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!permissions?.[permission]) {
    return <Navigate to="/tasks" replace />;
  }

  return children;
}
