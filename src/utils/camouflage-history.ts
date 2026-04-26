import { supabase } from "@/lib/supabase";

export interface CamouflageHistoryItem {
  id: string;
  user_id: string;
  type: "photo" | "video";
  name: string;
  storage_path: string;
  blob_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export async function saveCamouflageToHistory(
  file: Blob,
  type: "photo" | "video",
  name: string,
  userId: string,
): Promise<string | null> {
  const path = `${userId}/${Date.now()}_${name}`;

  const { error: uploadError } = await supabase.storage
    .from("camouflage-results")
    .upload(path, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return null;
  }

  const { data } = await supabase
    .from("camouflage_history")
    .insert({
      user_id: userId,
      type,
      name,
      storage_path: path,
    })
    .select()
    .single();

  return data?.id || null;
}

export async function fetchCamouflageHistory(type: "photo" | "video"): Promise<CamouflageHistoryItem[]> {
  const { data } = await supabase
    .from("camouflage_history")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(100);

  return data || [];
}

export async function deleteCamouflageFromHistory(item: CamouflageHistoryItem) {
  if (item.storage_path) {
    await supabase.storage.from("camouflage-results").remove([item.storage_path]);
  }
  await supabase.from("camouflage_history").delete().eq("id", item.id);
}

