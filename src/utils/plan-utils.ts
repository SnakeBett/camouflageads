import { supabase } from "@/lib/supabase";

export interface Profile {
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

export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  "teste grátis": { photo: 2, video: 2, text: 2, clone: 0, audio: 2, audio_pure: 2 },
  iniciante: { photo: 10, video: 10, text: 5, clone: 0, audio: 10, audio_pure: 10 },
  "intermediário": { photo: 20, video: 20, text: 20, clone: 20, audio: 20, audio_pure: 20 },
  infinito: { photo: Infinity, video: Infinity, text: Infinity, clone: Infinity, audio: Infinity, audio_pure: Infinity },
};

export const PLANS_DISPLAY = [
  {
    name: "Iniciante",
    desc: "Plano inicial",
    price: "R$ 97,90",
    period: "mês",
    features: [
      "Camuflar Imagem (10)",
      "Camuflar Vídeo (10)",
      "Camuflagem de Texto com (Chat Bot.ia) (5)",
      "Páginas e Clonagem",
      "1 Domínio próprio",
      "Garantia de 14 dias",
    ],
    popular: false,
    checkoutUrl: "https://pay.kirvano.com/0ee680b3-d62b-447d-856a-d558d3308bb0",
  },
  {
    name: "Intermediário",
    desc: "Plano para durar a semana",
    price: "R$ 147,90",
    period: "mês",
    features: [
      "Camuflar Imagem (20)",
      "Camuflar Vídeo (20)",
      "Camuflagem TikTok (20)",
      "Camuflagem de Texto com (Chat Bot.ia) (20)",
      "Clonagem de Página com (Chat Bot.ia) (20)",
      "Páginas e Clonagem",
      "3 Domínios próprios",
      "Remover Metadados de Imagem",
      "Remover Metadados de Vídeo",
      "Garantia de 14 dias",
    ],
    popular: true,
    checkoutUrl: "https://pay.kirvano.com/8ab61487-8e84-4df0-9241-dd1a734cc480",
  },
  {
    name: "Infinito",
    desc: "Créditos infinitos promocional",
    price: "R$ 197,90",
    period: "mês",
    features: [
      "Camuflar Imagem (∞)",
      "Camuflar Vídeo (∞)",
      "Camuflagem TikTok (∞)",
      "Camuflagem de Áudio (∞)",
      "Camuflagem de Texto com (Chat Bot.ia) (∞)",
      "Clonagem de Página com (Chat Bot.ia) (∞)",
      "Páginas e Clonagem",
      "20 Domínios próprios",
      "Remover Metadados de Imagem",
      "Remover Metadados de Vídeo",
      "Garantia de 14 dias",
    ],
    popular: false,
    checkoutUrl: "https://pay.kirvano.com/bcde6459-6c1e-4fb1-ac84-e1b8b8265e0a",
  },
];

export async function logCamouflageUsage(userId: string, count: number, type = "photo") {
  await supabase.from("camouflage_logs").insert({ user_id: userId, count, type });
}

export async function getTotalUsed(userId: string, type: string): Promise<number> {
  const { data } = await supabase
    .from("camouflage_logs")
    .select("count, type")
    .eq("user_id", userId);
  return (data || [])
    .filter((l) => l.type === type)
    .reduce((sum, l) => sum + (l.count || 0), 0);
}

export async function getRemainingCredits(
  userId: string,
  plan: string | null,
  type: string,
  profile: Profile | null,
): Promise<number> {
  const planName = (plan || "").toLowerCase();
  const limits = PLAN_LIMITS[planName];

  if (!limits) {
    const bonusCredits = profile?.bonus_credits || 0;
    if (bonusCredits <= 0) return 0;
    const used = await getTotalUsed(userId, type);
    return Math.max(0, bonusCredits - used);
  }

  if (limits[type] === Infinity) return Infinity;
  if (limits[type] === 0) return 0;

  const used = await getTotalUsed(userId, type);
  return Math.max(0, limits[type] - used);
}

export function getDaysRemaining(profile: Profile | null): number {
  if (!profile?.plan_expiry) return 0;
  return Math.max(0, Math.ceil((new Date(profile.plan_expiry).getTime() - Date.now()) / 86400000));
}

