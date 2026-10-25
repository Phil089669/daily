# Daily – Spezifikation

Persönliche Web-App (PWA) mit fünf Bereichen: **Heute** (Daily Checker), **Sport**, **Denken** (Denktraining), **Fokus** und **Statistik**. Genutzt auf dem iPhone vom Homescreen und am PC im Browser, mit denselben Daten auf beiden Geräten.

Stand: 25.10.2026. Grundlage sind die ursprüngliche Spezifikation, die Antworten auf die offenen Fragen, die Änderungen und die beiden Ergänzungen „Sync und iPhone-Widget“ und „Sport“ vom selben Tag. Die Ergänzungen haben Vorrang vor der ursprünglichen Spezifikation.

## Tech-Stack und Infrastruktur

- React + TypeScript + Vite + Tailwind
- PWA (vite-plugin-pwa): offline nutzbar, auf dem iPhone zum Homescreen hinzufügbar. Neue Versionen werden nie mitten in der Nutzung eingespielt, sondern beim nächsten Start.
- Deployment auf GitHub Pages per GitHub Action, öffentliches Repo `daily`. Tests laufen vor jedem Deployment; schlägt einer fehl, wird nicht deployt.
- Mobile-first, Dark Mode (Standard; Hell und „Wie System“ wählbar), große Touch-Ziele. Am PC eine Seitenleiste statt der Tab-Leiste.
- Navigation: Tabs Heute · Sport · Denken · Fokus · Statistik, Einstellungen über das Zahnrad. Hash-Routing, weil GitHub Pages keine Client-Routen kennt.

## Sync und Anmeldung

- Backend: Supabase (Postgres, Auth, Row Level Security) in Frankfurt (`eu-central-1`), kein eigener Server. Row Level Security auf allen Tabellen.
- Login per E-Mail-Code (OTP) statt Magic Link, weil Links aus Mails auf dem iPhone in Safari statt in der Homescreen-App aufgehen. Die Sitzung bleibt dauerhaft angemeldet.
  - Offen: Kostenlose Supabase-Projekte, die ab dem 3. Juni 2026 angelegt wurden, dürfen ihre Mail-Vorlagen nur mit eigenem SMTP-Server ändern. Die Standard-Mail enthält nur einen Link. Für den Code braucht es deshalb SMTP (z. B. Gmail), sonst bleibt nur die Anmeldung per Passwort.
- Nur ein Nutzer: Nach dem Anlegen des Kontos wird die Registrierung in Supabase deaktiviert.
- Gleiche Daten auf PC (Browser) und iPhone (Homescreen-Web-App).
- Offline-first: Dexie (IndexedDB) ist der lokale Cache. Änderungen werden gepuffert und bei Verbindung synchronisiert. Konflikte löst „letzte Änderung gewinnt“ pro Eintrag.
- JSON-Export/-Import bleibt als Backup.
- Supabase-URL und anon key sind Build-Variablen der GitHub Action. Der Service-Key liegt nur in den Secrets der Edge Functions, nie im Repo.
- Kostenlose Supabase-Projekte pausieren nach 7 Tagen ohne Nutzung. Das ist akzeptiert; es gibt kein Keep-alive.

## 1. Daily Checker (Heute)

- Gewohnheiten anlegen, bearbeiten, sortieren, archivieren und löschen: Name, Slug, Kategorie, Häufigkeit (täglich, bestimmte Wochentage, X-mal pro Woche), Tagesziel.
- **Slug**: fest und kurz (z. B. „lesen“). Über ihn spricht die Kurzbefehle-API die Gewohnheit an.
- **Tagesziel**: Standard 1, optional mit Einheit (z. B. „2× meditieren“, „8 Gläser Wasser“). Es ersetzt „X-mal pro Tag“ und „Zählziel“. Bei „X-mal pro Woche“ zählt jeder Tag, an dem das Tagesziel erreicht ist.
- Startseite = Heute-Ansicht: alles Fällige auf einen Blick, Abhaken mit einem Tap, Zähler per Tap, Rückgängig-Funktion. Dazu die Sport-Einheit des Tages als abhakbare Gewohnheit (siehe Abschnitt 3).
- **Nachtragen**: In der Heute-Ansicht kann man zu vergangenen Tagen zurückblättern.
- **Aussetzen**: pro Gewohnheit und Tag (krank, Urlaub). Bricht die Streak nicht und verlängert sie nicht.
- **Tageswechsel** um 04:00 statt Mitternacht (einstellbar). Jeder Eintrag speichert sein Datum nach diesem Tageswechsel. Eine spätere Änderung der Einstellung verschiebt die Historie nicht.
- Ändert sich die Häufigkeit einer Gewohnheit, gilt das ab dem Änderungstag; alte Quoten bleiben korrekt.
- Streaks pro Gewohnheit, Heatmap im GitHub-Contribution-Stil, Wochen-/Monatsstatistik mit Erfüllungsquote. Die Woche beginnt am Montag.

## 2. Weniger Handy, mehr Fokus

Die App selbst darf nicht süchtig machen: kein Feed, keine Abzeichen, keine Zahl am App-Icon, höchstens eine Erinnerung pro Tag. Abhaken muss in unter 30 Sekunden erledigt sein; die App öffnet direkt in der Heute-Ansicht.

- **Fokus-Timer** für Deep-Work-Blöcke, Fokuszeit pro Tag wird geloggt. Der Timer rechnet mit Zeitstempeln und loggt korrekt, auch wenn die App zwischendurch geschlossen wird. Optional bleibt der Bildschirm an, am Ende kommt ein Gong. Zusätzlich gibt es eine Stoppuhr ohne festes Ende.
- **Bildschirmzeit** täglich manuell eintragen (aus den iPhone-Einstellungen abgelesen), standardmäßig für gestern, weil der heutige Tag noch läuft. Zielwert, Verlauf als Diagramm mit 7-Tage-Schnitt.
- Vorbelegte, löschbare Gewohnheiten: „Handy nicht im Schlafzimmer“, „Erste Stunde nach dem Aufstehen ohne Handy“, „20 Min. lesen“.
- **Erinnerung**: echte Web-Push-Nachricht über Supabase (Cron + Edge Function). Sie wird nur gesendet, wenn noch etwas offen ist, und nennt die offenen Punkte. Höchstens eine Nachricht pro Tag, Uhrzeit einstellbar.

## 3. Sport

Der Trainingsplan ist vorinstalliert; alles ist editierbar.

### Sport-Tab

- Wochenplan, Einheiten und Übungen sind editierbar; eigene Einheiten lassen sich anlegen.
- Die Heute-Ansicht zeigt automatisch die Einheit des Tages als abhakbare Gewohnheit. Tippen öffnet sie.
- In der Einheit: Sätze einzeln abhaken, Wiederholungen und Gewicht (kg) eintragen, Pausentimer, Notiz.
- Programmstart-Datum einstellbar. Die App berechnet die Programmwoche und zeigt automatisch die passende Version (siehe Steigerung).
- Verlauf pro Übung als Diagramm.
- Training und Joggen werden synchronisiert und sind auch über die Kurzbefehle-API abhakbar.

### Wochenplan (Standard)

| Tag | Einheit |
| --- | --- |
| Mo | Einheit A |
| Di | Oberkörper + Joggen |
| Mi | Einheit B |
| Do | Oberkörper + Joggen |
| Fr | Einheit A |
| Sa | Sprints (ab Woche 7) |
| So | Joggen |

- Täglich: Couch Stretch.
- Oberkörper: leere Einheit anlegen; die Übungen trägt der Nutzer selbst ein.
- Joggen: locker im Gesprächstempo. Eintragen: Minuten, km (optional), Schmerz Füße/Waden 0–10 mit Verlaufsdiagramm.

### Einheit A – Kraft & Sehnen

1. Einbeiniges Wadenheben auf Stufe, Hantel in der Hand – 3×8–12 pro Bein, 3 Sek hoch / 3 Sek runter (wichtigste Übung für Achillessehne und Fuß)
2. Wadenheben im Sitzen, Hanteln auf den Knien – 3×15
3. Bulgarian Split Squats mit zwei Hanteln – 3×8 pro Bein
4. Einbeiniges rumänisches Kreuzheben – 3×8 pro Bein
5. Einbeiniger Hip Thrust, Rücken auf dem Sofa, Hantel auf der Hüfte – 3×10, oben 2 Sek halten, voll durchstrecken
6. Hängendes Knieheben an der Klimmzugstange – 3×10 (Hüftbeuger für den Sprint)

### Einheit B – Explosiv & Reaktiv (barfuß oder flache Schuhe)

Aufwärmen: 5 Min locker, A-Skips, B-Skips

1. Pogo Jumps – 3×20 (nur aus den Füßen, Sprunggelenke steif, Bodenkontakt so kurz wie möglich)
2. Squat Jumps – 4×5
3. Standweitsprung – 4×4 (Hüfte beim Absprung komplett strecken)
4. Wechselsprünge – 3×6 pro Bein
5. Einbeinige Seit-Hops über eine Linie – 3×10 pro Bein (ab Woche 4)
6. Fußprogramm: Zehengang 30 Sek, Fersengang 30 Sek, Short Foot 3×10 (Fußgewölbe anspannen, Zehen nicht krallen)

### Täglich

Couch Stretch – 2×1 Min pro Seite, dabei Po anspannen (Timer mit Seitenwechsel-Signal)

### Sprints (Samstag, ab Woche 7)

6–8 Sprints über 20–30 m, 2–3 Min Pause (Timer). Hinweis: nie müde sprinten, Qualität vor Menge.

### Steigerung (automatisch nach Programmwoche)

- Woche 1–3: Einheit B nur Pogo Jumps 2×20 und Squat Jumps 2×5 (halbe Satzzahl, aufgerundet)
- Woche 4–6: Einheit B komplett. Einbeiniges Wadenheben: Wiederholungen steigern; sobald in allen Sätzen 12 sauber geloggt sind, schlägt die App vor, oben 3 Sek zu halten.
- Ab Woche 7: Sprints am Samstag aktiv

### Übungsanleitungen mit Bildern

Jede Übung hat eine Detailseite:

- Bilder aus free-exercise-db (github.com/yuhonas/free-exercise-db, Unlicense/Public Domain) werden ins Projekt kopiert, offline verfügbar, nicht gehotlinkt. Nur verwenden, wenn die Übung wirklich passt (z. B. nicht normales Wadenheben für die einbeinige Variante). Die Zuordnung Übung → DB-Eintrag wird in einer Tabelle dokumentiert und dem Nutzer zur Kontrolle gezeigt.
- Für Übungen ohne passenden Eintrag (z. B. Pogo Jumps, Couch Stretch, Short Foot, A-/B-Skips, Seit-Hops, Zehen-/Fersengang): eine selbst erstellte animierte SVG-Strichfigur (Start- und Endposition in Endlosschleife).
- Auf Deutsch: 3–5 Ausführungshinweise, 2–3 typische Fehler, Tempo/Halten, Zielmuskeln.
- Button „Video ansehen“: öffnet die YouTube-Suche nach „<Übungsname> richtige Ausführung“ (keine festen Video-Links).
- Keine Bilder von anderen Websites übernehmen.

## 4. Denktraining (Kernstück)

Tägliche Session von 30, 45 oder 60 Minuten (wählbar), automatisch aus Blöcken zusammengestellt. Die Session zählt als Gewohnheit im Daily Checker.

Session-Aufbau:

- 5 Min. Kopfrechnen zum Aufwärmen, danach 3, 4 oder 5 Blöcke à 8–11 Min. (bei 30, 45 oder 60 Min.).
- Welche Module drankommen, richtet sich danach, was am längsten nicht trainiert wurde und wo die Schwächen liegen. Wiederholungen werden eingestreut.
- Pausieren und Fortsetzen am selben Tag, auch nach einem App-Neustart.
- Die Gewohnheit „Denktraining“ gilt als erledigt, sobald die Session fertig ist.
- **Freies Üben** einzelner Module: aktualisiert das Rating, zählt aber nicht als Session.

Module (alle Aufgaben prozedural generiert):

1. Kopfrechnen unter Zeitdruck: Grundrechenarten, Prozent, Brüche, Quadrate, Überschlag
2. Zahlenfolgen und Muster
3. Logik: Syllogismen, Aussagenlogik, Knights-and-Knaves, Mini-Sudoku (4×4, 6×6) und KenKen (3×3 bis 6×6) mit eindeutiger Lösung. Der Lösungsweg kommt aus den Schritten des Lösers.
4. Wahrscheinlichkeit und Erwartungswert: Würfel, Karten, Münzen, bedingte Wahrscheinlichkeit
5. Matrizen-Rätsel im Raven-Stil als generierte SVG-Muster. Die falschen Antworten sind so gebaut, dass man die Lösung nicht allein aus den Optionen erraten kann.
6. Arbeitsgedächtnis: Zahlenspanne rückwärts, Dual-N-Back (max. 10 Min.; Position + Buchstabe über die Sprachausgabe des iPhones, dazu eine stumme Variante mit Position + Farbe)
7. Schätzen und Kalibrierung: Fermi-Fragen mit 90-%-Intervall, Auswertung der Trefferquote. Fragenkatalog als JSON, mind. 150 Fragen mit belegbarer Antwort (Quelle, Stand-Jahr).

Anforderungen:

- Adaptive Schwierigkeit pro Modul: Elo-ähnliches Rating, Start 1000 („mittel“), Ziel ca. 75 % Trefferwahrscheinlichkeit. Intern pro Aufgabentyp, angezeigt pro Modul.
- Sofortiges Feedback, bei Fehlern Lösungsweg anzeigen.
- Falsch gelöste Aufgabentypen kommen per Spaced Repetition wieder: später in derselben Session, dann nach 1, 3, 7 und 21 Tagen, jeweils als neu generierte Aufgabe.
- Schätzen: Intervall-Score auf log-Skala (Treffer und Breite), damit riesige Intervalle nichts bringen. Angezeigt wird die Trefferquote neben dem Ziel von 90 %.
- Statistik pro Modul: Genauigkeit, Tempo, Level-Verlauf als Diagramm.
- Zusammenfassung am Session-Ende.

## 5. Kurzbefehle-API und iPhone-Widget

### API

- Supabase Edge Function als kleine REST-API, abgesichert mit einem persönlichen API-Token (in der App erzeugbar und widerrufbar, nur gehasht gespeichert).
- `POST /checkin {habit}` → abhaken bzw. Zähler +1. Antwort als kurzer Text, z. B. „Lesen ✓ · 5/8 heute“.
- `POST /undo {habit}` → letzte Aktion rückgängig.
- `GET /today` → offene Gewohnheiten als Text.
- Gewohnheiten werden über ihren Slug angesprochen. Der Tageswechsel (04:00) gilt auch in der API.

### Einrichtungsseite „iPhone-Widget“ (in den Einstellungen)

- Pro Gewohnheit URL, Header und Body zum Kopieren.
- Anleitung: Kurzbefehl mit „Inhalte von URL abrufen“ (POST, Authorization-Header) und „Mitteilung anzeigen“; alle Kurzbefehle in einen Ordner „Daily“; großes Kurzbefehle-Widget mit diesem Ordner auf den Homescreen.
- Nur Aktionen verwenden, die im Widget laufen, ohne die Kurzbefehle-App zu öffnen.

## Qualität

- Vitest-Tests für alle Generatoren, mit reproduzierbarem Zufall und hunderten Durchläufen pro Level:
  - Lösung korrekt (z. B. Wahrscheinlichkeiten per vollständiger Aufzählung aller Ausgänge gegengerechnet)
  - Rätsel eindeutig (ein Löser zählt die Lösungen; bei Zahlenfolgen passt keine andere einfache Regel mit anderem nächstem Glied; Syllogismen nur mit Schlüssen, deren Gültigkeit nicht davon abhängt, ob die genannten Dinge existieren)
  - Schwierigkeit skaliert (eine messbare Größe je Generator steigt mit dem Level)
- Tests für Tageslogik (inkl. Zeitumstellung), Streaks, Quoten, Sync und Export → Import.
- Jedes Modul als Plugin mit einheitlichem Interface (`generate`, `check`, `explain`), damit neue Module leicht dazukommen.
- README: lokal starten, deployen, auf dem Handy installieren.

## Phasen

1. Grundgerüst, Daily Checker (inkl. Streaks, Heatmap, Quoten), Supabase-Sync (offline-first mit Dexie als lokalem Cache), Backup
2. Kurzbefehle-API und Widget-Einrichtungsseite
3. Sport: Trainingsplan und Übungsseiten mit Bildern
4. Denktraining mit Modul 1, 2, 4
5. Fokus, Statistik, Erinnerung
6. Restliche Module

Nach jeder Phase: committen, kurz zusammenfassen, auf OK warten.

## Umsetzungsentscheidungen

- Abhaken, Zähler-Taps und Aussetzen werden als einzelne Ereignisse gespeichert, jedes Tippen ein Eintrag. So gehen Taps von iPhone, PC und Kurzbefehlen nicht verloren, auch wenn sie gleichzeitig passieren. „Rückgängig“ nimmt das letzte Ereignis zurück. Für alle übrigen Einträge (Gewohnheiten, Kategorien, Einstellungen) gilt „letzte Änderung gewinnt“, durchgesetzt auch in der Datenbank.
- Der Tageswechsel wird in der eingestellten Zeitzone berechnet (Standard: Zeitzone des Geräts beim ersten Start), damit App und API denselben Tag sehen.
- Archivieren pausiert eine Gewohnheit ab dem Tag. Die archivierte Zeit zählt weder als verpasst noch für Streaks.
- Vorbelegte Einträge tragen einen alten Zeitstempel, damit sie eigene Änderungen oder Löschungen nie überschreiben.
