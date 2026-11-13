# Verificări — 13 noiembrie 2026

Au trecut:

- Compilarea TypeScript a aplicației (`npm run typecheck`).
- 6 teste pentru calculele ingredientelor, conversii, porții, cămară, planificare locală și validarea datelor AI.
- Testul de integrare PostgreSQL/PGlite: migrare inclusiv reexecutare, RLS între trei conturi, registru privat și comun, limita de doi membri, revizii, rotirea codului și cota AI.
- Verificarea TypeScript/Deno și testul funcției AI: autentificare, limitare cereri, refuzul modelelor plătite, răspuns valid, ingrediente excluse, erori de cotă, JSON invalid, imagini invalide și cheie lipsă.
- Exportul web Expo și testul în browser: rute protejate, registru, plan pentru trei zile, modificarea porțiilor, lista agregată, bife, scăderea cămării și import editabil înainte de salvare.
- Inspecția vizuală a ecranului de planificare la 1280 × 900 și 390 × 844. Fără erori JavaScript de pagină în fluxul testat.

Testele AI și interfața au folosit răspunsuri simulate. Testul bazei de date a folosit PostgreSQL încorporat, nu proiectul Supabase al utilizatoarei. Nu au fost aplicate modificări pe un serviciu live, nu s-au folosit chei reale AI și nu s-au realizat builduri native Android/iOS.

Pașii de activare în proiectul real sunt în START_HERE_RO.md. După configurare, verifică autentificarea, salvarea unei rețete, conectarea celor două conturi și o generare AI reală.
