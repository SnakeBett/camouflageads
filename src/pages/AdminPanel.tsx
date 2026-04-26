import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Loader2, Users, ChevronDown } from "lucide-react";

interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  plan: string | null;
  plan_expiry: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const PLANS = [null, "teste grátis", "iniciante", "intermediário", "infinito"] as const;
const ROLES = ["user", "admin"] as const;

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);
    if (rolesRes.data) {
      const map: Record<string, string> = {};
      rolesRes.data.forEach((r: RoleRow) => { map[r.user_id] = r.role; });
      setRoles(map);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function updatePlan(userId: string, plan: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ plan, plan_expiry: "2027-12-31T23:59:59Z" })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao atualizar plano: " + error.message);
      return;
    }
    toast.success("Plano atualizado com sucesso");
    setEditingPlan(null);
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, plan } : u))
    );
  }

  async function updateRole(userId: string, newRole: string) {
    const { error: delError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (delError) {
      toast.error("Erro ao remover role: " + delError.message);
      return;
    }

    const { error: insError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insError) {
      toast.error("Erro ao inserir role: " + insError.message);
      return;
    }

    toast.success("Role atualizada com sucesso");
    setEditingRole(null);
    setRoles((prev) => ({ ...prev, [userId]: newRole }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários, planos e permissões
          </p>
        </div>
      </div>

      <Card className="border-border/40">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">
            Usuários ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">User ID</th>
                  <th className="px-6 py-3 font-medium">Plano</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">
                      {u.name || "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                      {u.user_id.slice(0, 8)}…
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setEditingPlan(editingPlan === u.user_id ? null : u.user_id)}
                          className="inline-flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-md transition-colors"
                        >
                          {u.plan || "Sem plano"}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {editingPlan === u.user_id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]">
                            {PLANS.map((plan) => (
                              <button
                                key={plan ?? "__null"}
                                onClick={() => updatePlan(u.user_id, plan)}
                                className="block w-full text-left text-xs px-3 py-2 hover:bg-muted transition-colors text-foreground"
                              >
                                {plan || "Sem plano"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setEditingRole(editingRole === u.user_id ? null : u.user_id)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                            roles[u.user_id] === "admin"
                              ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          {roles[u.user_id] || "user"}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {editingRole === u.user_id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[100px]">
                            {ROLES.map((role) => (
                              <button
                                key={role}
                                onClick={() => updateRole(u.user_id, role)}
                                className="block w-full text-left text-xs px-3 py-2 hover:bg-muted transition-colors text-foreground"
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {users.map((u) => (
              <div key={u.user_id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {u.name || "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {u.user_id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setEditingPlan(editingPlan === u.user_id ? null : u.user_id)}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {u.plan || "Sem plano"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {editingPlan === u.user_id && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[160px]">
                        {PLANS.map((plan) => (
                          <button
                            key={plan ?? "__null"}
                            onClick={() => updatePlan(u.user_id, plan)}
                            className="block w-full text-left text-xs px-3 py-2 hover:bg-muted transition-colors text-foreground"
                          >
                            {plan || "Sem plano"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setEditingRole(editingRole === u.user_id ? null : u.user_id)}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                        roles[u.user_id] === "admin"
                          ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {roles[u.user_id] || "user"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {editingRole === u.user_id && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[100px]">
                        {ROLES.map((role) => (
                          <button
                            key={role}
                            onClick={() => updateRole(u.user_id, role)}
                            className="block w-full text-left text-xs px-3 py-2 hover:bg-muted transition-colors text-foreground"
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Criado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
