# Hinweise für Claude

- Verbindliche Spezifikation: `docs/SPEC.md`. Die UI ist deutsch.
- Arbeitsweise: Phasen laut SPEC. Nach jeder Phase committen, kurz zusammenfassen und auf das OK des Users warten; nie selbst mit der nächsten Phase beginnen.
- Befehle: `npm run dev`, `npm test`, `npm run lint`, `npm run build`. Supabase CLI über `npx supabase`.

## Code

- `src/domain` bleibt frei von DOM und Bibliotheken und importiert mit `.ts`-Endung: Die Edge Functions (Deno) sollen dieselben Regeln nutzen (Tageswechsel, fällige und offene Gewohnheiten).
- `erasableSyntaxOnly` ist an: keine Parameter-Properties im Konstruktor, keine Enums.
- Tageslogik immer über `src/domain/day.ts` (`logicalDay`, `DayKey`). Tests laufen mit `TZ=Europe/Berlin`.

## Sync

- Jede synchronisierte Tabelle hat `updated_at` (Client, die neuere Änderung gewinnt), `deleted` (Grabstein statt Löschen) und `synced_at` (Server, Cursor fürs Abholen).
- Neue synchronisierte Tabelle: Dexie-Tabelle in `src/data/db.ts`, Eintrag in `syncedTables` und `RecordOf`, Tabellenname in `src/data/remote.ts`, Migration mit Trigger, RLS und Realtime (siehe die Schleife in der ersten Migration).
- Schreiben nur über `Store.save`, damit jede Änderung in die Upload-Warteschlange kommt.
- Abhaken, Zähler und Aussetzen sind Ereignisse (`habit_events`); Rückgängig markiert das Ereignis als gelöscht.
- Datenbank-Tests laufen in PGlite (`supabase/tests`).

## Design „Karopapier bei Nacht“

- Tokens in `src/index.css`: `paper`, `sheet`, `rule`, `fg`, `muted`, `ink`, `redpen`.
- `ink` bedeutet nur „erledigt / eigene Markierung“, `redpen` nur Korrekturen im Training.
- Schrift Atkinson Hyperlegible Next, Ziffern tabellarisch.

## Geheimnisse

Der Supabase-Service-Key liegt nur in den Edge-Function-Secrets, nie im Repo. URL und anon key kommen als Build-Variablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
