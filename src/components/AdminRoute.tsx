import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthProvider";
import { Loader2 } from "lucide-react";
import Layout from "./Layout";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
}
