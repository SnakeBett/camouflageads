import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthProvider";
import { Loader2 } from "lucide-react";
import Layout from "./Layout";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}
