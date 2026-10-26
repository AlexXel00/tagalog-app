# Tagalog-App

Persönliches, adaptives Tagalog-Lernprogramm fürs iPhone, als Web-App (PWA).

## Aufbau

| Teil | Aufgabe |
| --- | --- |
| GitHub Pages | Hostet die App (dieses Repo) |
| Supabase | Login, Lernfortschritt, geheime Schlüssel, Audio-Speicher |
| ElevenLabs | Tagalog-Stimme (Edge Function `tts`) |
| Claude API | Gespräche und Korrekturen (kommt später) |

Geheime Schlüssel stehen nie in diesem Repo, nur in den Supabase-Secrets.

## Ordner

- `index.html`, `css/`, `js/` - die App
- `sw.js` - Service Worker (offline, Audio-Speicher)
- `manifest.webmanifest`, `icons/` - Installation auf dem Homescreen
- `supabase/functions/tts/` - Edge Function für die Stimme

## Einrichtung Schritt für Schritt

1. **Repo anlegen:** auf GitHub ein öffentliches Repo `tagalog-app` erstellen.
2. **GitHub Pages einschalten:** Repo > Settings > Pages > Source: "Deploy from a branch", Branch `main`, Ordner `/ (root)`.
3. **ElevenLabs-Schlüssel:** bei ElevenLabs unter Profil > API Keys erstellen und in Supabase als Secret `ELEVENLABS_API_KEY` eintragen.
4. **Freigabe:** in Supabase das Secret `ALLOWED_EMAILS` mit der eigenen E-Mail-Adresse anlegen.
5. **Konto erstellen:** App öffnen, E-Mail und Passwort eingeben, "Konto erstellen", Bestätigungs-Mail öffnen, anmelden.
6. **Installieren:** in Safari auf Teilen > "Zum Home-Bildschirm".

## Stand

Version 0.1.1 - Grundgerüst: Login, Startseite, Stimm-Test mit ElevenLabs (Standardstimme "Sarah", im Gratis-Plan nutzbar).
