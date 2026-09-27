# COLOR – brýle pro barvoslepé (e-shop CZ/SK)

E-shop COLOR na Next.js 16 + Supabase: úvodní stránka podle grafiky, online ColorTest, katalog, košík, pokladna, zákaznický účet a slovenská verze (`/sk`).

## Co obsahuje
- **Úvodní stránka podle návrhu** – hero s posuvníkem „bez brýlí / s brýlemi“, blok ColorTest, dlaždice kategorií, technologie čoček, výhody, nejoblíbenější brýle se záložkami, skutečné příběhy.
- **ColorTest** (`/colortest`) – 10 barevných tabulek kreslených v prohlížeči. Barvy jsou spočítané simulací barvocitu (Machado 2009): RG tabulky pro protany i deutany mizí, dvě rozlišovací tabulky odliší protana od deutana, dvě tabulky zachytí tritana. Výsledek doporučí brýle. Test je orientační (upozornění je na stránce).
- **Obchod** – katalog s filtry (typ vady, použití, barva rámu a čoček, materiál), vyhledávání, detail produktu, oblíbené, košík, pokladna (Zásilkovna, PPL, dobírka, převod s QR Platbou), účet (objednávky, adresy, vrácení a reklamace), obsahové stránky (Jak to funguje, FAQ, Recenze, Příběhy, Blog, obchodní podmínky…).
- **CZ (Kč) a SK (€)**, texty v češtině a slovenštině.

## Nasazení: GitHub → Vercel
1. Repozitář je připravený a napojený na `https://github.com/Matuchovic/colorglass.git`. V Terminálu:
   ```bash
   cd ~/Downloads/colorglass
   git push -u origin main
   ```
   (GitHub chce místo hesla Personal Access Token, případně použijte GitHub Desktop → *Add Existing Repository* → *Push origin*.)
2. Vercel → **Add New… → Project → Import** `colorglass` → **Deploy**. Nic dalšího není potřeba – bez proměnných prostředí web běží v **náhledovém režimu** (data ze `src/server/preview/snapshot.json`, nákup a přihlášení vypnuté, štítek „Náhled“).
3. Pro ostrý provoz doplňte ve Vercelu proměnné z `.env.example` (*Settings → Environment Variables*) a nasaďte znovu.

## Supabase (ostrý provoz)
1. Založte projekt na supabase.com (region EU – Frankfurt).
2. Schéma databáze: `DATABASE_URL="<connection string>" scripts/db-apply-plain.sh` – **bez `--seed`** (seed obsahuje demo data). Vyžaduje `psql`; alternativně spusťte soubory ze `supabase/migrations/` postupně v SQL Editoru.
3. *Auth → URL Configuration*: Site URL = produkční doména; Redirect URLs `https://<doména>/auth/confirm` a `https://<doména>/auth/callback`.
4. *Auth → Email Templates*: vložte šablony ze `supabase/templates/`.
5. Ve Vercelu nastavte `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET`, `CRON_SECRET`, volitelně `RESEND_API_KEY` (e-maily), `NEXT_PUBLIC_PACKETA_API_KEY` (Zásilkovna) a klíče platební brány.

## Demo data – důležité
`supabase/seed.sql` slouží jen pro vývoj a testy: demo zákazníci, objednávky a **ukázková hodnocení** (počty a průměry odpovídají grafice). Do ostré databáze ho nenahrávejte. Texty „Ověřeno 12 500+ zákazníky“, „10+ let výzkumu a vývoje“, CE certifikace a příběhy zákazníků musí před spuštěním odpovídat skutečnosti – nepravdivá hodnocení a tvrzení zákon zakazuje.

## Lokální vývoj
```bash
npm install
cp .env.example .env.local   # bez Supabase proměnných = náhledový režim
npm run dev                  # http://localhost:3000
```
- Databáze lokálně: `DATABASE_URL=... scripts/db-apply-plain.sh --seed`
- Testy databáze: `DATABASE_URL=... npm run test:db` (21 testů: ceny, DPH, kupóny, atomické objednávky, sklad, webhooky plateb, oprávnění rolí)
- Nový snapshot pro náhled: `DATABASE_URL=... node scripts/export-preview-snapshot.mjs`

## Pro 100% shodu s grafikou ještě dodat
- fotku do hero s mužem uprostřed (teď je posuvník vlevo od něj),
- velké brýle z hero jako samostatné PNG (teď produktová fotka Pro Outdoor),
- odkazy na videa (tlačítka přehrát zatím vedou na stránku Příběhy).

## Struktura
| Cesta | Obsah |
| --- | --- |
| `src/app/[store]` | stránky (CZ bez prefixu, SK pod `/sk`) |
| `src/components/color` | sekce úvodní stránky COLOR |
| `src/components/colortest` | ColorTest – tabulky a vyhodnocení |
| `src/i18n` | texty CZ/SK |
| `src/server` | data, pokladna, platby, e-maily |
| `supabase/migrations` | schéma databáze; `supabase/seed-parts` demo data |
| `public/images`, `public/brand` | fotky, logo a ikony |
