import { supabase } from "@/lib/supabase";
import type { Profile } from "./plan-utils";

export interface UserWithRoles extends Profile {
  email: string;
  user_roles: { user_id: string; role: string }[];
}

export async function fetchAllUsers(): Promise<UserWithRoles[]> {
  const [{ data: profiles }, { data: roles }, response] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.functions.invoke("admin-list-emails"),
  ]);

  const emails: Record<string, string> = response?.data?.emails || {};

  return (profiles || []).map((p: Profile) => ({
    ...p,
    email: emails[p.user_id] || "",
    user_roles: (roles || []).filter((r: any) => r.user_id === p.user_id),
  }));
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
  return { error };
}

export async function setUserRole(userId: string, role: string) {
  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  return { error };
}

export async function loginAsUser(targetUserId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    sessionStorage.setItem("admin_session", JSON.stringify({
      access_token: session.access_token,
    }));
  }

  const { data, error } = await supabase.functions.invoke("admin-login-as", {
    body: { target_user_id: targetUserId },
  });

  if (error || !data?.token_hash) {
    throw new Error("Erro ao gerar link de acesso.");
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.token_hash,
  });

  if (otpError) {
    throw new Error("Erro ao entrar na conta: " + otpError.message);
  }
}

export async function restoreAdminSession() {
  const saved = sessionStorage.getItem("admin_session");
  if (!saved) return;
  sessionStorage.removeItem("admin_session");
}

