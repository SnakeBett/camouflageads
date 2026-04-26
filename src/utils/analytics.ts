import { supabase } from "@/lib/supabase";

export async function logPageEvent(page: string, metadata?: Record<string, any>) {
  const sessionId = getOrCreateSessionId();

  await supabase.from("page_events").insert({
    session_id: sessionId,
    page,
    metadata: metadata || {},
  });
}

export async function logAnalyticsEvent(
  eventName: string,
  source: string,
  metadata?: Record<string, any>,
) {
  try {
    await fetch("/~api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventName, source, ...metadata }),
    });
  } catch {}
}

function getOrCreateSessionId(): string {
  const key = "session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

