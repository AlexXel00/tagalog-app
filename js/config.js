// Oeffentliche Konfiguration. Diese Werte duerfen im Code stehen:
// Der Publishable Key erlaubt nur, was die Datenbank-Regeln zulassen.
// Geheime Schluessel (ElevenLabs, Anthropic) liegen nur in Supabase.
window.APP_CONFIG = {
  supabaseUrl: "https://howvdornaifhnmzxhvlg.supabase.co",
  supabaseKey: "sb_publishable_WdFl9D8ZeVAytZPlNBcWTw_xRgoYhR3",
  voiceId: "EXAVITQu4vr4xnSDxMaL",
  // Stimm-Modell und feste Sprache (fil = Filipino), damit kurze Woerter nicht englisch klingen
  ttsModel: "eleven_flash_v2_5",
  ttsLanguage: "fil",
  version: "0.3.0"
};
