// Edge Function "tts": wandelt Tagalog-Text ueber ElevenLabs in Audio um.
// Erzeugte Audios werden im Storage-Bucket "audio" gespeichert und beim
// naechsten Mal direkt ausgeliefert (spart Kosten, funktioniert schneller).
//
// Benoetigte Secrets (im Supabase-Dashboard eintragen):
//   ELEVENLABS_API_KEY  - API-Schluessel von ElevenLabs
//   ALLOWED_EMAILS      - kommagetrennte E-Mail-Adressen, die die Funktion nutzen duerfen
// Optional:
//   DEFAULT_VOICE_ID    - Stimme, falls die App keine mitschickt
//   ELEVENLABS_MODEL    - Modell, Standard "eleven_multilingual_v2"

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FALLBACK_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MAX_TEXT_LENGTH = 400;

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

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Schritt 1: Pruefen, wer anfragt
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const email = userData?.user?.email?.toLowerCase();
  if (!email) return json({ error: "not_signed_in" }, 401);

  const allowed = (Deno.env.get("ALLOWED_EMAILS") ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(email)) return json({ error: "not_allowed" }, 403);

  // Schritt 2: Eingabe pruefen
  let body: { text?: unknown; voiceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_TEXT_LENGTH) return json({ error: "invalid_text" }, 400);

  const requestedVoice = typeof body.voiceId === "string" ? body.voiceId : "";
  const voiceId = /^[A-Za-z0-9]{10,40}$/.test(requestedVoice)
    ? requestedVoice
    : Deno.env.get("DEFAULT_VOICE_ID") || FALLBACK_VOICE_ID;
  const model = Deno.env.get("ELEVENLABS_MODEL") || "eleven_multilingual_v2";

  // Schritt 3: Gibt es das Audio schon?
  const key = await sha256Hex(`${model}|${voiceId}|${text}`);
  const path = `${voiceId}/${key}.mp3`;
  const admin = createClient(supabaseUrl, serviceKey);
  const bucket = admin.storage.from("audio");
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;

  const { data: existing } = await bucket.list(voiceId, { search: `${key}.mp3`, limit: 1 });
  if (existing && existing.some((f) => f.name === `${key}.mp3`)) {
    return json({ url: publicUrl, cached: true });
  }

  // Schritt 4: Neu erzeugen bei ElevenLabs
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return json({ error: "missing_elevenlabs_key" }, 500);

  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: model }),
    },
  );
  if (!ttsRes.ok) {
    const detail = (await ttsRes.text()).slice(0, 300);
    return json({ error: "elevenlabs_failed", status: ttsRes.status, detail }, 502);
  }
  const audio = new Uint8Array(await ttsRes.arrayBuffer());

  // Schritt 5: Speichern und Link zurueckgeben
  const { error: uploadError } = await bucket.upload(path, audio, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (uploadError) return json({ error: "upload_failed", detail: uploadError.message }, 500);

  return json({ url: publicUrl, cached: false });
});
