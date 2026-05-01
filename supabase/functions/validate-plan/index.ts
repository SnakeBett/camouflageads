import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  "teste grátis": { photo: 2, video: 2, text: 2, clone: 0, audio: 2, audio_pure: 2 },
  iniciante: { photo: 10, video: 10, text: 5, clone: 0, audio: 10, audio_pure: 10 },
  "intermediário": { photo: 20, video: 20, text: 20, clone: 20, audio: 20, audio_pure: 20 },
  infinito: { photo: Infinity, video: Infinity, text: Infinity, clone: Infinity, audio: Infinity, audio_pure: Infinity },
};

// E-mails owner — sempre liberados, sem necessidade de plano nem role admin
// no banco. Mantenha em sincronia com src/lib/owners.ts.
const OWNER_EMAILS: string[] = [
  "juliocesar5049@icloud.com",
  "julicesar5049@icloud.com",
];

function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ allowed: false, reason: "no_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ allowed: false, reason: "invalid_user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count = 1, type = "photo" } = await req.json();

    if (isOwnerEmail(user.email)) {
      await supabaseAdmin
        .from("camouflage_logs")
        .insert({ user_id: user.id, count, type });

      return new Response(JSON.stringify({ allowed: true, reason: "owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ allowed: false, reason: "no_profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await checkAdmin(supabaseAdmin, user.id);
    if (isAdmin) {
      return new Response(JSON.stringify({ allowed: true, reason: "admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planName = (profile.plan || "").toLowerCase();
    const limits = PLAN_LIMITS[planName];

    if (!limits) {
      const bonusCredits = profile.bonus_credits || 0;
      if (bonusCredits <= 0) {
        // Free tier: allow limited access for new users
        const { data: logs } = await supabaseAdmin
          .from("camouflage_logs")
          .select("count")
          .eq("user_id", user.id)
          .eq("type", type);

        const used = (logs || []).reduce((sum: number, l: any) => sum + (l.count || 0), 0);

        if (used === 0 && !profile.free_trial_used_at) {
          await supabaseAdmin
            .from("camouflage_logs")
            .insert({ user_id: user.id, count, type });

          return new Response(JSON.stringify({ allowed: true, reason: "free_tier" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ allowed: false, reason: "no_plan", remaining: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: logs } = await supabaseAdmin
        .from("camouflage_logs")
        .select("count")
        .eq("user_id", user.id)
        .eq("type", type);

      const used = (logs || []).reduce((sum: number, l: any) => sum + (l.count || 0), 0);
      const remaining = Math.max(0, bonusCredits - used);

      if (remaining < count) {
        return new Response(JSON.stringify({ allowed: false, reason: "insufficient_credits", remaining }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("camouflage_logs")
        .insert({ user_id: user.id, count, type });

      return new Response(JSON.stringify({ allowed: true, reason: "bonus_credits", remaining: remaining - count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.plan_expiry && new Date(profile.plan_expiry) < new Date()) {
      return new Response(JSON.stringify({ allowed: false, reason: "plan_expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxForType = limits[type] ?? 0;
    if (maxForType === Infinity) {
      await supabaseAdmin
        .from("camouflage_logs")
        .insert({ user_id: user.id, count, type });

      return new Response(JSON.stringify({ allowed: true, reason: "unlimited" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: logs } = await supabaseAdmin
      .from("camouflage_logs")
      .select("count")
      .eq("user_id", user.id)
      .eq("type", type);

    const used = (logs || []).reduce((sum: number, l: any) => sum + (l.count || 0), 0);
    const remaining = Math.max(0, maxForType - used);

    if (remaining < count) {
      return new Response(JSON.stringify({ allowed: false, reason: "limit_reached", remaining }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("camouflage_logs")
      .insert({ user_id: user.id, count, type });

    return new Response(JSON.stringify({ allowed: true, reason: "plan", remaining: remaining - count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ allowed: false, reason: "error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
