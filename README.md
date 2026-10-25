# Daily

Persönliche PWA für Gewohnheiten, Sport, Denktraining und Fokus, für das iPhone (vom Homescreen) und den PC (im Browser). Die Spezifikation steht in [docs/SPEC.md](docs/SPEC.md).

Stand: Phase 1, also der Daily Checker mit Sync, Backup, Streaks, Heatmap und Erfüllungsquoten.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/domain` | Regeln ohne Browser-Bezug: Tageswechsel, Häufigkeiten, Streaks, Quoten, Heatmap. Die Edge Functions nutzen sie später mit. |
| `src/data` | Lokale Datenbank (Dexie), Sync mit Supabase, Backup |
| `src/features` | Seiten: Heute, Gewohnheiten, Statistik, Einstellungen, Anmeldung |
| `src/components` | Gemeinsame Bausteine wie Kästchen, Heatmap und Sheets |
| `supabase` | Migrationen, Auth-Konfiguration, Mail-Vorlage, Datenbank-Tests |

So funktioniert der Sync:
- Jede Änderung landet zuerst in IndexedDB und in einer Warteschlange.
- Sobald eine Verbindung besteht, lädt die App die Warteschlange hoch und holt die Änderungen der anderen Geräte.
- Pro Eintrag gewinnt die neuere Änderung. Das setzt auch ein Trigger in der Datenbank durch.
- Jedes Abhaken ist ein eigener Eintrag. So addieren sich Taps von mehreren Geräten, statt sich zu überschreiben.

## Lokal starten

Voraussetzung: Node 24.

```sh
npm install
npm run dev        # http://localhost:5173/daily/
```

Ohne Supabase-Zugangsdaten läuft die App nur lokal, ohne Anmeldung und Sync. Das reicht zum Entwickeln. Für den Sync legst du eine Datei `.env.local` an; sie wird nicht eingecheckt:

```sh
VITE_SUPABASE_URL=https://<projekt-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key bzw. publishable key>
```

| Befehl | Zweck |
| --- | --- |
| `npm test` | Alle Tests (Vitest), auch die Datenbank-Tests in PGlite |
| `npm run lint` | Linter (oxlint) |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen |

## Supabase einrichten

Einmalig. Die Supabase CLI ist als Dev-Abhängigkeit installiert:

```sh
npx supabase login
npx supabase link --project-ref <projekt-ref>
npx supabase db push        # Tabellen, Row Level Security, Trigger
npx supabase config push    # Anmeldung per Code, Site-URL, Mail-Vorlage
```

Sobald dein Konto existiert (erste Anmeldung in der App), schaltest du die Registrierung ab. Dazu setzt du in `supabase/config.toml` unter `[auth]` und `[auth.email]` jeweils `enable_signup = false` und führst `npx supabase config push` erneut aus.

Kostenlose Supabase-Projekte pausieren nach 7 Tagen ohne Nutzung. Die App läuft dann offline weiter. Der Sync startet erst wieder, wenn du das Projekt im Supabase-Dashboard fortsetzt.

## Deployment

Jeder Push auf `main` startet die GitHub Action [`deploy.yml`](.github/workflows/deploy.yml): Lint, Tests, Build, Veröffentlichung auf GitHub Pages. Schlägt ein Test fehl, wird nicht deployt.

Einmalig im Repo einrichten:

- Settings → Pages → Source: „GitHub Actions“
- Settings → Secrets and variables → Actions → Variables: `SUPABASE_URL` und `SUPABASE_ANON_KEY`

Die App liegt unter [phil089669.github.io/daily](https://phil089669.github.io/daily/).

## Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Die App vom Homescreen starten und dort anmelden: E-Mail-Adresse eingeben, dann den Code aus der Mail eintippen.

Die Homescreen-App hat einen eigenen Speicher, getrennt von Safari. Deshalb erst installieren und dann in der installierten App anmelden. Die Anmeldung bleibt danach bestehen.

Am PC öffnest du die Adresse einfach im Browser. Chrome und Edge bieten in der Adressleiste zusätzlich „App installieren“ an.

## Backup

Unter Einstellungen → Backup:
- **Backup exportieren** speichert alle Daten als JSON-Datei. Auf dem iPhone geht das über das Teilen-Menü, z. B. „In Dateien sichern“.
- **Backup importieren** ersetzt alle Daten. Nach dem nächsten Sync gilt das auch auf deinen anderen Geräten.
