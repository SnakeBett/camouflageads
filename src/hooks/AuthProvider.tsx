import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  plan: string | null;
  plan_expiry: string | null;
  bonus_credits: number;
  free_trial_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, isAdmin: false, loading: true,
  refreshProfile: async () => {}, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (pErr) console.error("profiles:", pErr.message);
    setProfile(p ?? null);
    const { data: r, error: rErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (rErr) console.error("user_roles:", rErr.message);
    setIsAdmin(!!r);
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  useEffect(() => {
    // Só onAuthStateChange: emite INITIAL_SESSION com a sessão atual (evita corrida com getSession).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        try {
          if (s?.user) await fetchProfile(s.user.id);
          else {
            setProfile(null);
            setIsAdmin(false);
          }
        } catch (e) {
          console.error("AuthProvider: fetchProfile", e);
        } finally {
          setLoading(false);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
