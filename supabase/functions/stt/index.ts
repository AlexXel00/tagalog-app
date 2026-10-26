// Edge Function "stt": schreibt eine Sprachaufnahme mit der ElevenLabs-Spracherkennung auf.
// Die App vergleicht den Text danach mit dem Zielsatz.
//
// Benoetigte Secrets: ELEVENLABS_API_KEY (mit Freigabe "Speech to Text"), ALLOWED_EMAILS
// Optional: STT_MODEL (Standard "scribe_v1"), STT_LANGUAGE (Standard "fil")

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MAX_BYTES = 3 * 1024 * 1024; // etwa 1 Minute Audio, reicht fuer kurze Saetze

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Schritt 1: Pruefen, wer anfragt
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const email = userData?.user?.email?.toLowerCase();
  if (!email) return json({ error: "not_signed_in" }, 401);
  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(email)) return json({ error: "not_allowed" }, 403);

  // Schritt 2: Aufnahme lesen
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "invalid_form" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "no_audio" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "too_long" }, 413);

  // Schritt 3: An ElevenLabs schicken
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return json({ error: "missing_elevenlabs_key" }, 500);

  const out = new FormData();
  out.append("file", file, file.name || "aufnahme");
  out.append("model_id", Deno.env.get("STT_MODEL") || "scribe_v1");
  const lang = Deno.env.get("STT_LANGUAGE") ?? "fil";
  if (lang) out.append("language_code", lang);
  out.append("tag_audio_events", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: out,
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return json({ error: "elevenlabs_failed", status: res.status, detail }, 502);
  }
  const data = await res.json();

  // Schritt 4: Nur das Noetige zurueckgeben
  const words = (data.words || [])
    .filter((w: { type?: string }) => w.type === "word")
    .map((w: { text: string; logprob?: number }) => ({ text: w.text, logprob: typeof w.logprob === "number" ? w.logprob : null }));
  return json({ text: data.text || "", language: data.language_code || null, words });
});
