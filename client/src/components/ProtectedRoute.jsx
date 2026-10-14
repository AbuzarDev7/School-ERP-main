// client/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Forbidden from "@/screens/error/Forbidden";

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-700">Loading user session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Show the dedicated 403 page instead of bouncing the user silently back to
  // "/". The Forbidden screen tells them which role they're on and offers a
  // sign-out shortcut so they can switch accounts without hunting for it.
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Forbidden />;
  }

  return <Outlet />;
};

export default ProtectedRoute;