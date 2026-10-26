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
- `content/` - Lerninhalte pro Woche (Wörter, Sätze, Lückentexte, Grammatik, Aussprache, Kultur)
- `sw.js` - Service Worker (offline, Audio-Speicher)
- `manifest.webmanifest`, `icons/` - Installation auf dem Homescreen
- `supabase/functions/tts/` - Edge Function für die Stimme (Modell und Sprache `fil` wählbar)
- `supabase/functions/stt/` - Edge Function für die Aussprache-Prüfung (ElevenLabs-Spracherkennung)

## Einrichtung Schritt für Schritt

1. **Repo anlegen:** auf GitHub ein öffentliches Repo `tagalog-app` erstellen.
2. **GitHub Pages einschalten:** Repo > Settings > Pages > Source: "Deploy from a branch", Branch `main`, Ordner `/ (root)`.
3. **ElevenLabs-Schlüssel:** bei ElevenLabs unter Profil > API Keys erstellen (Freigaben: Text to Speech und Speech to Text) und in Supabase als Secret `ELEVENLABS_API_KEY` eintragen.
4. **Freigabe:** in Supabase das Secret `ALLOWED_EMAILS` mit der eigenen E-Mail-Adresse anlegen.
5. **Konto erstellen:** App öffnen, E-Mail und Passwort eingeben, "Konto erstellen", Bestätigungs-Mail öffnen, anmelden.
6. **Installieren:** in Safari auf Teilen > "Zum Home-Bildschirm".

## Stand

Version 0.3.0:

- Aussprache-Prüfung: aufnehmen, Spracherkennung schreibt mit, die App vergleicht Wort für Wort (grün, gelb, rot). Eingebaut im Aussprache-Schritt, bei neuen Wörtern, bei Wiederholungskarten (Deutsch zuerst) und als neues Format "Sprech-Challenge".
- Stimme fest auf Filipino (`language_code: fil`, Modell `eleven_flash_v2_5`), damit kurze Wörter wie "mabuti" nicht englisch gelesen werden.

Version 0.2.0 - erste echte Session:

1. Aussprache (Regel mit Hörbeispielen)
2. Wiederholung (Spaced Repetition, gespeichert in Supabase-Tabelle `learner_state`)
3. Hauptteil, täglich wechselnd: Neue Wörter, Hör-Rätsel, Lückentext, Warum-Karte, Satzbaukasten, Sprech-Challenge
4. Kultur-Häppchen

Inhalt: Woche 1 (42 Wörter, 13 Sätze, 11 Lückentexte, 7 Grammatik-Karten, 6 Aussprache-Regeln, 8 Kulturtexte).
Prüfliste für Muttersprachler in der App; Ergebnisse landen im Lernstand unter `review`.

Grenzen der Aussprache-Prüfung: Sie prüft, ob man verstanden wird. Feine Betonung erkennt die Spracherkennung nicht zuverlässig. Betonungspaare (áso/asó) brauchen echte Aufnahmen.
