# CookBuddy — pornește de aici

Versiunea aceasta extinde proiectul Expo 54 existent. Nu este o aplicație publicată și nu modifică automat baza ta de date. Cheile tale nu sunt incluse în arhivă.

## Ce ai acum

- Registru de rețete cu imagini, căutare, tip de masă, favorite, editare, ștergere și notițe.
- Plan pentru 1–7 zile și 1–12 persoane, cu mic dejun, prânz și cină.
- Recomandări AI din registru și idei noi; preferințe, ingrediente excluse, timp maxim și opțiune de repetare a meselor pentru gătit în avans.
- Planificare deterministă din rețetele salvate, fără apel AI. Pentru rezultate bune, setează categoria fiecărei rețete. „Orice masă” permite folosirea ei la toate mesele.
- Înlocuirea individuală a unei mese cu o sugestie AI sau cu o rețetă aleasă din registru.
- Ajustarea porțiilor în plan și vizualizarea cantităților recalculate în pagina rețetei.
- Listă agregată de cumpărături, cu bife comune, scăderea stocului din cămară și distribuire prin meniul dispozitivului.
- Cămară și „Gătim cu ce avem”: sugestii AI care încearcă să minimizeze cumpărăturile.
- Feedback cu stele și comentarii, folosit în contextul recomandărilor următoare.
- Calorii pe porție: introduse manual, calculate local din ingrediente (tabel cu valori uzuale, fără AI) sau estimate cu AI. Planul arată totalul aproximativ pe zi și persoană.
- Import AI din text sau fotografie JPG/PNG/WebP; formular editabil înainte de salvare.
- Bucătărie comună pentru două conturi, conectate prin cod. Rețetele noi sunt comune; cele vechi pot fi mutate explicit din Profil.
- Salvare în Supabase, control al accesului și detectarea conflictelor între dispozitive.

## 1. Pornește proiectul local

Folosește Node.js 24 LTS (testele de domeniu folosesc suportul nativ pentru TypeScript).

1. Dezarhivează proiectul într-un folder nou.
2. Deschide terminalul în folderul care conține `package.json`.
3. Rulează `npm ci`.
4. Copiază `.env.example` ca `.env`.
5. Completează valorile pentru proiectul tău Supabase:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://PROIECTUL_TAU.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=CHEIA_PUBLICA_DIN_SUPABASE
```

Folosește cheia publică anon/publishable din setările proiectului, niciodată cheia `service_role` în aplicație.

## 2. Actualizează baza de date Supabase

Fă un backup al bazei de date existente înaintea migrării.

1. În Supabase Dashboard, deschide **SQL Editor**.
2. Deschide local `supabase/migrations/202611130001_cookbuddy_kitchen.sql`.
3. Copiază tot conținutul în SQL Editor și rulează-l.
4. La fel, rulează apoi `supabase/migrations/202611140001_recipe_calories.sql` (adaugă coloana `calories`). Până o rulezi, rețetele se salvează în continuare, dar fără calorii.

Migrarea păstrează rețetele existente, adaugă `household_id` și `meal_type` și creează tabelele pentru bucătării, membri, stare comună și limite AI. Poate fi rulată din nou.

**Politicile RLS existente pentru `recipes` sunt înlocuite** cu acces privat / acces pentru membrii bucătăriei. Rețetele vechi cu `user_id` corect rămân în registrul proprietarului; cele cu `user_id` lipsă nu sunt atribuite automat. Migrarea presupune structura de bază folosită în codul trimis: `id` UUID, ingrediente JSON/JSONB și câmpurile title, servings, time, steps, notes, image_url, is_favorite.

Bucketul `recipe-images` este folosit în continuare. Fotografiile rețetelor sunt publice prin URL, ca în proiectul original; nu încărca documente personale acolo. Noua politică de încărcare folosește calea `USER_ID/fotografie`. Politicile storage deja existente nu sunt șterse de această migrare.

## 3. Configurează AI gratuit cu OpenRouter

Opțiunea implicită este **`openrouter/free`**: OpenRouter alege un model gratuit compatibil cu cererea. Codul acceptă numai această rută sau un identificator terminat în `:free`. Nu există fallback automat către modele plătite.

La verificarea din 13 noiembrie 2026, OpenRouter documentează pentru modelele gratuite 20 cereri/minut și 50 cereri/zi pentru conturile fără credite cumpărate. Aceste limite și modelele disponibile se pot schimba. Aplicația mai impune o limită proprie de **20 cereri AI/zi/utilizator**, cu cel puțin 5 secunde între încercări. Cererile nereușite pot consuma cotă. Un singur plan este generat printr-o cerere, nu câte una pentru fiecare masă.

1. Creează un cont pe https://openrouter.ai/ și o cheie în https://openrouter.ai/settings/keys.
2. În Supabase Dashboard, deschide **Edge Functions → Secrets**.
3. Adaugă:
   - `OPENROUTER_API_KEY` = cheia creată;
   - `OPENROUTER_MODEL` = `openrouter/free`.
4. Instalează / folosește Supabase CLI conform https://supabase.com/docs/guides/cli/getting-started.
5. Din terminal, în folderul proiectului:

```bash
supabase login
supabase link --project-ref ID_UL_PROIECTULUI
supabase functions deploy cooking-ai
```

Funcția importă `src/domain/cooking.ts` (din afara folderului `supabase/`). Dacă deploy-ul eșuează cu „Module not found”, folosește bundling-ul fără Docker: `supabase functions deploy cooking-ai --use-api`.

`supabase/config.toml` setează `verify_jwt=false` pentru această funcție: **handlerul verifică explicit utilizatorul prin `auth.getUser()`**, înainte de accesarea AI-ului. Nu elimina această verificare. Secretele Supabase standard sunt disponibile în funcția deployată; nu copia cheia `service_role` în `.env` din aplicație.

Cheia OpenRouter stă exclusiv pe server. Setările, rețetele relevante, cămara, ultimele comentarii și materialul importat sunt trimise furnizorilor AI la cererea ta. Nu se trimite emailul în prompt. Pozele importate sunt procesate numai la apăsarea butonului AI, fără încărcare automată în bucket.

Suportul pentru importul din poză depinde de disponibilitatea unui model gratuit cu viziune și JSON. Dacă modelele sunt ocupate, folosește importul din text sau introducerea manuală. Răspunsurile invalide/incomplete sunt respinse, fără înlocuirea planului salvat.

## 4. Deschide aplicația

```bash
npm run web
```

Pentru telefon, poți rula `npm start` și folosi un client compatibil Expo SDK 54. Verificarea efectuată aici a acoperit buildul web; nu au fost realizate builduri native iOS/Android.

Dacă schimbi `.env`, repornește Expo cu cache curățat: `npx expo start --clear`.

## 5. Conectează contul lui Claudiu

1. Intră în contul tău și deschide **Profil**. Bucătăria se creează la prima încărcare după migrare.
2. Trimite-i codul afișat, prin canalul ales de tine.
3. Claudiu își creează propriul cont și introduce codul în **Profil → Codul bucătăriei partenerului**.
4. Pentru rețetele vechi, fiecare poate apăsa **Mută rețetele mele private în această bucătărie**.

Codul oferă acces la bucătărie, deci nu îl publica. Proprietarul poate roti codul. Rotirea oprește conectările noi cu vechiul cod, dar nu elimină membrii deja conectați. Limita este de două conturi în bucătărie. În această versiune nu există încă ecran pentru administrarea/eliminarea membrilor sau schimbarea între mai multe bucătării.

Planul, preferințele, cămara și bifele se salvează împreună, cu un număr de versiune. Dacă voi doi modificați simultan aceeași versiune, a doua salvare este refuzată, se încarcă datele noi și apare un mesaj pentru repetarea modificării.

Pentru actualizări live, activează tabelele `cookbuddy_state` și `recipes` în publicația **supabase_realtime** din Supabase. Activarea este opțională; butoanele **Actualizează** funcționează fără Realtime. Migrarea nu modifică automat publicațiile existente.

## Cum sunt calculate cumpărăturile

- Cantitățile ingredientelor sunt pentru toate porțiile rețetei de bază.
- Pentru 3 zile × 2 persoane cu aceeași cină, se însumează 6 porții. Totalul este afișat și în „De gătit pentru tot planul”.
- `kg` se convertește în `g`, iar `l` în `ml`. Nu se convertește volum în greutate.
- Denumirile identice, fără diferențe de majuscule sau diacritice, se cumulează. „Piept de pui” și „pui” rămân ingrediente diferite.
- Cantitățile vechi ca `300 g`, `1,5 l`, `1/2 kg` pot fi recunoscute. „După gust”, intervalele și textele ambigue sunt păstrate pentru verificare manuală; nu se înmulțesc prin ghicit.
- Cămara se scade doar pentru aceeași denumire și unități compatibile. Stocul nu se consumă automat când bifezi cumpărăturile sau când trece o zi: actualizează-l după gătit.
- Modificarea planului, porțiilor sau cămării resetează bifele listei.
- Modificarea unei rețete din registru nu schimbă retroactiv copia deja salvată în plan. Realege rețeta pentru a actualiza planul.

Recomandările nu sunt un plan medical. Excluderile folosesc verificare după denumire, nu o bază de alergeni: verifică ingredientele și etichetele în cazul alergiilor. Caloriile sunt estimări (valori medii pentru ingrediente crude sau estimarea AI), nu valori de etichetă; nu există alte calcule nutriționale sau prețuri.

## Verificări pentru dezvoltare

```bash
npm run typecheck
npm test
npm run test:db
npm run build:web
```

Pentru testele interfeței:

```bash
npx playwright install chromium
npm run test:ui
```

`test:ui` construiește separat `.test-dist` cu un proiect Supabase fictiv și interceptează toate cererile către acel proiect. Verifică rutele protejate, generarea locală a planului, porțiile, cumpărăturile, cămara și importul AI editabil. Nu folosește o cheie AI sau date reale.

Pentru funcția de server, cu Deno instalat:

```bash
deno check supabase/functions/cooking-ai/index.ts
deno test --allow-env supabase/functions/cooking-ai/index.test.ts
```

Testele de bază de date folosesc PostgreSQL încorporat prin PGlite și verifică migrarea, izolarea între conturi, conectarea, accesul comun, conflictele și limitele AI. Testele funcției AI folosesc răspunsuri simulate, fără apeluri către modele reale. Înainte de utilizare, verifică și autentificarea, salvarea și un apel AI în propriul proiect Supabase.

Surse pentru serviciile externe:
- https://openrouter.ai/collections/free-models
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/api/reference/limits
- https://supabase.com/docs/guides/functions
