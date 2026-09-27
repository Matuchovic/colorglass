-- =============================================================================
-- COLOR 0009 · Referenční data pro produkci: trhy, DPH, nastavení, doprava, platby,
-- struktura kategorií, sekce homepage, bannery a kostry informačních stránek.
-- Vše je poté spravovatelné z administrace. Místa k doplnění jsou označena [DOPLNÍ PROVOZOVATEL].
-- =============================================================================

insert into public.markets (code, name, currency, locale, free_shipping_threshold, sort_order) values
  ('CZ', 'Česká republika', 'CZK', 'cs-CZ', 79900, 1),
  ('SK', 'Slovensko', 'EUR', 'sk-SK', 3300, 2);

insert into public.tax_classes (code, name) values
  ('standard', 'Základní sazba'), ('reduced', 'Snížená sazba'), ('zero', 'Osvobozeno / 0 %');

-- Sazby platné k 1. 1. 2025 (CZ 21/12 %, SK 23/19 %). Ověřte před spuštěním s účetním.
insert into public.tax_rates (tax_class, market, rate_bps) values
  ('standard', 'CZ', 2100), ('reduced', 'CZ', 1200), ('zero', 'CZ', 0),
  ('standard', 'SK', 2300), ('reduced', 'SK', 1900), ('zero', 'SK', 0);

insert into public.store_settings (key, value, is_public, description) values
  ('store.contact', '{"email": "podpora@color.cz", "phone": "+420 800 123 456", "hours": "Po–Pá 8:00–18:00"}', true, 'Kontakt na zákaznickou podporu'),
  ('store.company', '{"name": "[DOPLNÍ PROVOZOVATEL] obchodní firma", "address": "[DOPLNÍ PROVOZOVATEL] sídlo", "company_id": "[IČO]", "vat_id": "[DIČ]", "register": "[DOPLNÍ PROVOZOVATEL] spisová značka"}', true, 'Identifikace provozovatele (patička, doklady, e-maily)'),
  ('bank.accounts', '{"CZ": {"account": null, "iban": null}, "SK": {"iban": null}}', true, 'Bankovní účty pro platbu převodem (QR Platba)'),
  ('checkout.terms_version', '"2026-09-26"', true, 'Verze obchodních podmínek ukládaná k objednávce'),
  ('catalog.show_secondary_currency', 'false', true, 'Zobrazit na kartě i cenu druhého trhu (dle návrhu)'),
  ('delivery.cutoff_hour', '14', true, 'Hodina, do které objednávky expedujeme týž den'),
  ('social.links', '{"facebook": null, "instagram": null, "youtube": null, "tiktok": null}', true, 'Odkazy na sociální sítě'),
  ('orders.bank_transfer_days', '7', false, 'Lhůta pro platbu převodem, poté automatické storno'),
  ('orders.online_payment_minutes', '60', false, 'Lhůta pro online platbu, poté automatické storno');

insert into public.shipping_methods (code, carrier, type, name, description, delivery_days_min, delivery_days_max, max_weight_grams, cod_allowed, sort_order, translations) values
  ('packeta_pickup', 'packeta', 'pickup_point', 'Zásilkovna – výdejní místo nebo Z-BOX', 'Vyzvednutí na více než 10 000 místech v ČR a SR', 1, 2, 10000, true, 10,
   '{"sk": {"name": "Packeta – výdajné miesto alebo Z-BOX", "description": "Vyzdvihnutie na tisíckach miest v SR a ČR"}}'),
  ('packeta_home', 'packeta', 'address', 'Zásilkovna – doručení na adresu', 'Doručení kurýrem domů nebo do práce', 1, 2, 30000, true, 20,
   '{"sk": {"name": "Packeta – doručenie na adresu", "description": "Doručenie kuriérom domov alebo do práce"}}'),
  ('ppl', 'ppl', 'address', 'PPL', 'Kurýr zavolá nebo pošle SMS před doručením', 1, 2, 31500, true, 30, '{}'),
  ('dpd', 'dpd', 'address', 'DPD', 'Doručení s hodinovým oknem Predict', 1, 2, 31500, true, 40, '{}'),
  ('gls', 'gls', 'address', 'GLS', 'Doručení následující pracovní den', 1, 2, 40000, true, 50, '{}'),
  ('ceska_posta', 'ceska_posta', 'address', 'Česká pošta – Balík Do ruky', 'Doručení poštovním doručovatelem', 1, 3, 30000, true, 60, '{}'),
  ('sps', 'sps', 'address', 'SPS – Slovak Parcel Service', 'Kuriérske doručenie po Slovensku', 1, 2, 31500, true, 70,
   '{"sk": {"name": "SPS – Slovak Parcel Service", "description": "Kuriérske doručenie po Slovensku"}}'),
  ('slovenska_posta', 'slovenska_posta', 'address', 'Slovenská pošta – Balík na adresu', 'Doručenie poštovým doručovateľom', 1, 3, 30000, true, 80,
   '{"sk": {"name": "Slovenská pošta – balík na adresu", "description": "Doručenie poštovým doručovateľom"}}'),
  ('store_praha', 'store', 'store_pickup', 'Osobní odběr – COLOR výdejna Praha', 'Vyzvednutí zdarma [DOPLNÍ PROVOZOVATEL: adresa výdejny]', 0, 1, null, true, 90, '{}');

insert into public.shipping_method_markets (method_id, market, price)
select id, m.market::public.market_code, m.price
  from public.shipping_methods sm
  join (values
    ('packeta_pickup', 'CZ', 7900), ('packeta_pickup', 'SK', 290),
    ('packeta_home', 'CZ', 10900), ('packeta_home', 'SK', 390),
    ('ppl', 'CZ', 12900), ('dpd', 'CZ', 12900), ('dpd', 'SK', 490),
    ('gls', 'CZ', 11900), ('gls', 'SK', 450), ('ceska_posta', 'CZ', 13900),
    ('sps', 'SK', 450), ('slovenska_posta', 'SK', 350), ('store_praha', 'CZ', 0)
  ) as m(code, market, price) on m.code = sm.code;

insert into public.payment_methods (code, provider, name, description, is_online, sort_order, translations) values
  ('card', 'comgate', 'Online kartou, Apple Pay nebo Google Pay', 'Okamžitá a zabezpečená platba přes platební bránu', true, 10,
   '{"sk": {"name": "Online kartou, Apple Pay alebo Google Pay", "description": "Okamžitá a zabezpečená platba cez platobnú bránu"}}'),
  ('bank_transfer', 'bank_transfer', 'Bankovním převodem', 'Platební údaje a QR kód zobrazíme po dokončení objednávky', false, 20,
   '{"sk": {"name": "Bankovým prevodom", "description": "Platobné údaje zobrazíme po dokončení objednávky"}}'),
  ('cod', 'cod', 'Na dobírku', 'Zaplatíte hotově nebo kartou při převzetí', false, 30,
   '{"sk": {"name": "Na dobierku", "description": "Zaplatíte v hotovosti alebo kartou pri prevzatí"}}');

insert into public.payment_method_markets (method_code, market, fee) values
  ('card', 'CZ', 0), ('card', 'SK', 0), ('bank_transfer', 'CZ', 0), ('bank_transfer', 'SK', 0),
  ('cod', 'CZ', 3900), ('cod', 'SK', 150);

-- Struktura kategorií podle návrhu COLOR: typ barvocitné vady + způsob použití
insert into public.categories (slug, name, description, image_url, sort_order, seo_title, seo_description, translations) values
  ('bryle', 'Brýle pro barvoslepé', 'Brýle se speciálními filtračními čočkami, které zvyšují kontrast mezi barvami. Vyberte podle typu vady nebo podle použití.',
   '/images/products/color-pro-outdoor.webp', 1, 'Brýle pro barvoslepé – protan, deutan, tritan',
   'Brýle pro barvoslepé s filtračními čočkami pro protan, deutan i tritan. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.',
   '{"sk": {"name": "Okuliare pre farboslepých", "description": "Okuliare so špeciálnymi filtračnými šošovkami, ktoré zvyšujú kontrast medzi farbami. Vyberte podľa typu poruchy alebo podľa použitia."}}');

insert into public.categories (parent_id, slug, name, description, image_url, sort_order, translations)
select c.id, s.slug, s.name, s.descr, s.img, s.sort_order, s.tr::jsonb
  from public.categories c
  join (values
    ('protan', 'Protan', 'Brýle pro oslabené vnímání červené (protanomálie, protanopie) – červeno-zelená vada.', '/images/products/color-protan.webp', 1,
     '{"sk": {"description": "Okuliare pre oslabené vnímanie červenej (protanomália, protanopia) – červeno-zelená porucha."}}'),
    ('deutan', 'Deutan', 'Brýle pro oslabené vnímání zelené (deuteranomálie, deuteranopie) – nejčastější červeno-zelená vada.', '/images/products/color-deutan.webp', 2,
     '{"sk": {"description": "Okuliare pre oslabené vnímanie zelenej (deuteranomália, deuteranopia) – najčastejšia červeno-zelená porucha."}}'),
    ('tritan', 'Tritan', 'Brýle pro modro-žlutou vadu barevného vidění (tritanomálie).', '/images/products/color-pro-outdoor.webp', 3,
     '{"sk": {"description": "Okuliare pre modro-žltú poruchu farebného videnia (tritanomália)."}}'),
    ('indoor', 'Indoor', 'Brýle do interiéru – pro práci u počítače, ve škole i v kanceláři.', '/images/products/color-indoor.webp', 4,
     '{"sk": {"description": "Okuliare do interiéru – na prácu pri počítači, v škole aj v kancelárii."}}'),
    ('outdoor', 'Outdoor', 'Sluneční brýle s filtrem pro barvocit a UV400 ochranou.', '/images/products/color-sport.webp', 5,
     '{"sk": {"description": "Slnečné okuliare s filtrom pre farbocit a UV400 ochranou."}}'),
    ('clip-on', 'Clip-on', 'Filtrační nástavec na dioptrické brýle.', '/images/products/color-clip-on.webp', 6,
     '{"sk": {"description": "Filtračný nástavec na dioptrické okuliare."}}'),
    ('detske', 'Dětské', 'Lehké a odolné brýle pro děti.', '/images/products/color-kids.webp', 7,
     '{"sk": {"name": "Detské", "description": "Ľahké a odolné okuliare pre deti."}}')
  ) as s(slug, name, descr, img, sort_order, tr) on c.slug = 'bryle' and c.parent_id is null;

-- Informační a právní stránky: struktura s jasně označenými místy pro finální, právně ověřený text
insert into public.content_pages (slug, title, footer_group, sort_order, requires_legal_review, seo_description, body) values
('jak-to-funguje', 'Jak to funguje', 'about', 5, false, 'Jak fungují brýle pro barvoslepé a pro koho jsou vhodné.', $md$
## Proč některé barvy splývají
V sítnici máme tři typy čípků – pro červenou, zelenou a modrou část spektra. Při poruše barvocitu se citlivost dvou typů čípků překrývá víc než obvykle, a proto se některé odstíny (typicky červená, zelená, hnědá a oranžová) jeví podobně.

## Co dělají čočky COLOR
Speciální filtrační vrstvy potlačí úzké pásmo světla v místě, kde se citlivost čípků překrývá. Rozdíl mezi signály z čípků se zvětší a barvy, které dosud splývaly, od sebe snadněji rozlišíte. Čočky navíc chrání před UV zářením (UV400).

![Srovnání vnímání barev bez brýlí a s brýlemi](/images/color/comparison.webp)

## Typy vad a doporučené brýle
- **Protan** – oslabené vnímání červené. Doporučujeme [brýle Protan](/kategorie/bryle/protan).
- **Deutan** – oslabené vnímání zelené, nejčastější typ. Doporučujeme [brýle Deutan](/kategorie/bryle/deutan).
- **Tritan** – vzácná modro-žlutá porucha. Doporučujeme [brýle Tritan](/kategorie/bryle/tritan).

## Co od brýlí čekat
Brýle barvoslepost nevyléčí a nevrátí chybějící typ čípků. U většiny lidí s mírnou až střední vadou ale zvýrazní rozdíly mezi barvami. Nejlépe fungují na denním světle. Úplnou barvoslepost (achromatopsii) neřeší.

Nevíte, jaký typ vady máte? Spusťte [ColorTest](/colortest) – orientační test zabere 2 minuty.
$md$),
('faq', 'Časté dotazy', 'service', 10, false, 'Odpovědi na nejčastější otázky o brýlích pro barvoslepé.', $md$
## Pomohou brýle i mně?
Brýle COLOR zvyšují kontrast mezi barvami, které při poruše barvocitu splývají. Nejvíce pomáhají lidem s mírnou až střední **červeno-zelenou vadou** (protanomálie, deuteranomálie). Barvocit nevyléčí a účinek se liší člověk od člověka – proto máte **30 dní na vyzkoušení**.

## Jaký typ brýlí potřebuji?
Orientačně poradí [ColorTest](/colortest) – za 2 minuty ukáže pravděpodobný typ vady a doporučí brýle. Přesnou diagnózu určí oční lékař nebo optometrista.

## Mohu v brýlích řídit?
Sluneční modely (Pro Outdoor, Sport, Protan, Deutan, Tritan) mají ochranu UV400. Brýle s barevným filtrem nejsou vhodné pro řízení za šera a v noci. Filtr nemění to, zda splňujete zdravotní požadavky na řidiče.

## Nosím dioptrické brýle. Co mám zvolit?
Model [COLOR Clip-on](/produkt/color-clip-on) nasadíte na vlastní dioptrické brýle.

## Jsou vhodné pro děti?
Ano, [COLOR Kids](/produkt/color-kids) jsou lehké a odolné. U dětí doporučujeme poruchu barvocitu nejprve ověřit u očního lékaře.

## Za jak dlouho uvidím rozdíl?
Většina lidí vidí rozdíl hned. Někomu trvá několik dní, než si na nové vnímání barev zvykne – brýle proto zkoušejte hlavně venku na denním světle.

## Doprava a vrácení
Doprava je od 799 Kč zdarma po celé ČR a SR. Podrobnosti najdete na stránkách [Doprava a platba](/doprava-a-platba) a [Vrácení zboží](/vraceni-zbozi).
$md$),
('obchodni-podminky', 'Obchodní podmínky', 'about', 50, true, 'Obchodní podmínky internetového obchodu COLOR.', $md$
> **[DOPLNÍ PROVOZOVATEL]** Tato stránka obsahuje pouze strukturu. Finální znění musí připravit nebo schválit advokát.

## 1. Úvodní ustanovení
- Identifikace prodávajícího: obchodní firma, sídlo, IČO, DIČ, zápis v obchodním rejstříku **[DOPLNÍ PROVOZOVATEL]**
- Kontaktní údaje: e-mail, telefon, adresa pro doručování **[DOPLNÍ PROVOZOVATEL]**
- Vymezení pojmů (spotřebitel, podnikatel, kupní smlouva)

## 2. Uzavření kupní smlouvy
- Prezentace zboží, odeslání objednávky tlačítkem „Objednat s povinností platby“, potvrzení e-mailem

## 3. Cena a platební podmínky
- Ceny včetně DPH, způsoby platby, lhůty splatnosti, poplatky za dobírku

## 4. Dodání zboží
- Způsoby dopravy, dodací lhůty, přechod nebezpečí škody

## 5. Odstoupení od smlouvy
- Lhůta 14 dnů od převzetí pro spotřebitele, formulář, vrácení plateb do 14 dnů **[DOPLNÍ PROVOZOVATEL: případná prodloužená lhůta 30 dnů]**

## 6. Práva z vadného plnění
- Odkaz na [reklamační řád](/reklamacni-rad)

## 7. Mimosoudní řešení sporů
- Česká obchodní inspekce (www.coi.cz), platforma ODR **[DOPLNÍ PROVOZOVATEL]**

## 8. Závěrečná ustanovení
- Účinnost, změny podmínek, rozhodné právo **[DOPLNÍ PROVOZOVATEL]**
$md$),
('ochrana-osobnich-udaju', 'Ochrana osobních údajů', 'about', 40, true, 'Jak zpracováváme osobní údaje.', $md$
> **[DOPLNÍ PROVOZOVATEL]** Struktura informační povinnosti dle čl. 13 GDPR. Text musí schválit odpovědná osoba.

## Správce osobních údajů
**[DOPLNÍ PROVOZOVATEL: identifikace, kontakt, případně pověřenec]**

## Jaké údaje zpracováváme a proč
- Plnění smlouvy: jméno, adresa, e-mail, telefon, údaje o objednávce
- Zákonné povinnosti: účetní a daňové doklady
- Oprávněný zájem: prevence podvodů, zabezpečení účtu, ochrana před zneužitím formulářů
- Souhlas: newsletter, analytické a marketingové cookies

## Příjemci
- Dopravci, platební brány, poskytovatel hostingu a databáze, e-mailová služba **[DOPLNÍ PROVOZOVATEL: konkrétní zpracovatelé]**

## Doba uložení
**[DOPLNÍ PROVOZOVATEL]**

## Vaše práva
- Přístup, oprava, výmaz, omezení, přenositelnost, námitka, odvolání souhlasu, stížnost u ÚOOÚ
$md$),
('cookies', 'Zásady cookies', 'legal', 60, true, 'Jaké cookies používáme a jak změnit souhlas.', $md$
> **[DOPLNÍ PROVOZOVATEL]** Po napojení analytiky a marketingu doplňte konkrétní nástroje a doby uložení.

## Nezbytné cookies
- Přihlášení (Supabase Auth), košík (`color_cart`), volba souhlasu (`color_consent`), volba země a jazyka

## Analytické cookies
- Spouštějí se jen po udělení souhlasu **[DOPLNÍ PROVOZOVATEL: nástroj a doba uložení]**

## Marketingové cookies
- Spouštějí se jen po udělení souhlasu **[DOPLNÍ PROVOZOVATEL]**

## Změna souhlasu
Souhlas můžete kdykoli změnit odkazem „Nastavení cookies“ v patičce.
$md$),
('reklamacni-rad', 'Reklamace', 'service', 40, true, 'Jak reklamovat zboží.', $md$
> **[DOPLNÍ PROVOZOVATEL]** Finální reklamační řád musí odpovídat občanskému zákoníku a zákonu o ochraně spotřebitele.

## Jak reklamaci uplatnit
1. Přihlaste se do [svého účtu](/muj-ucet/reklamace) a vyberte objednávku, nebo nás kontaktujte přes [kontaktní formulář](/kontakt).
2. Popište vadu a přiložte fotografie.
3. Zboží zašlete na adresu **[DOPLNÍ PROVOZOVATEL]**.

## Lhůty
- Práva z vadného plnění lze uplatnit do 24 měsíců od převzetí.
- Reklamaci vyřídíme nejpozději do 30 dnů od uplatnění.
$md$),
('vraceni-zbozi', 'Vrácení zboží', 'service', 30, true, 'Brýle COLOR můžete do 30 dnů vrátit bez udání důvodu.', $md$
Brýle si v klidu vyzkoušejte. **Na vrácení máte 30 dní** od převzetí zásilky – bez udání důvodu (zákonná lhůta je 14 dní, my ji prodlužujeme).

> **[DOPLNÍ PROVOZOVATEL]** Ověřte znění se svými obchodními podmínkami.

## Jak zboží vrátit
1. V [účtu](/muj-ucet/vraceni) vyberte objednávku a brýle, které vracíte. Bez účtu nám napište na [podporu](/kontakt).
2. Brýle vraťte kompletní – v pouzdře, s hadříkem a bez poškození – a odešlete na adresu **[DOPLNÍ PROVOZOVATEL]**.
3. Peníze vrátíme stejným způsobem, jakým jste platili, nejpozději do 14 dnů od doručení vráceného zboží.
$md$),
('doprava-a-platba', 'Doprava a platba', 'service', 20, false, 'Způsoby dopravy a platby v ČR a SR.', $md$
## Doprava
Aktuální ceny a dopravce vidíte vždy v košíku podle zvolené země. Doprava je zdarma od 799 Kč v ČR a od 33 € na Slovensku.

## Platba
- Online kartou, Apple Pay nebo Google Pay
- Bankovním převodem (s QR kódem)
- Na dobírku

## Kdy zboží odešleme
Objednávky se zbožím skladem přijaté v pracovní den do 14:00 odesíláme ještě týž den.
$md$),
('kontakt', 'Kontakt', 'service', 50, false, 'Kontaktujte zákaznickou podporu COLOR.', $md$
Jsme tu pro vás v pracovní dny od 8:00 do 18:00. Nejrychleji vám pomůžeme přes formulář níže.

**[DOPLNÍ PROVOZOVATEL: provozovna, fakturační údaje]**
$md$),
('o-nas', 'O nás', 'about', 10, false, 'Kdo jsme a proč děláme brýle COLOR.', $md$
COLOR vznikl s jednoduchým cílem: pomoci lidem s poruchou barvocitu lépe rozlišit barvy, které jim dosud splývaly – v přírodě, v práci i na ulici.

Brýle navrhujeme se speciálními filtračními čočkami, které zvyšují kontrast mezi barvami. Každý model si můžete **30 dní vyzkoušet** a v případě potřeby vrátit.

> **[DOPLNÍ PROVOZOVATEL]** Doplňte příběh firmy, tým a údaje o výrobě a certifikaci čoček.
$md$),
('obchodni-spoluprace', 'Obchodní spolupráce', 'about', 30, false, 'Nabídka spolupráce pro dodavatele a partnery.', $md$
Máte produkt, který by se hodil do naší nabídky? Napište nám přes [kontaktní formulář](/kontakt) a do předmětu uveďte „Spolupráce“.
$md$),
('overovani-recenzi', 'Jak ověřujeme recenze', 'legal', 70, true, 'Informace o původu a ověřování recenzí.', $md$
Recenze označené „Ověřený nákup“ napsali zákazníci, kteří mají v účtu zaplacenou objednávku daného produktu. Ověření provádí systém automaticky podle historie objednávek.

Každou recenzi před zveřejněním kontroluje náš tým. Nezveřejňujeme recenze, které obsahují vulgarismy, osobní údaje nebo nesouvisejí s produktem. Negativní recenze nemažeme kvůli jejich hodnocení.

**[DOPLNÍ PROVOZOVATEL: ověřte soulad s § 5a zákona o ochraně spotřebitele]**
$md$),
('recenze', 'Recenze', 'about', 15, false, 'Hodnocení a zkušenosti zákazníků COLOR.', $md$
Hodnocení najdete u každého produktu – hvězdičky a počet hodnocení vidíte přímo ve [výpisu brýlí](/kategorie/bryle).

## Jak s recenzemi zacházíme
- Recenzi může napsat zákazník po nákupu. Recenze z ověřeného nákupu označujeme.
- Zveřejňujeme kladná i záporná hodnocení, upravujeme jen vulgarismy a osobní údaje.
- Podrobnosti najdete na stránce [Jak ověřujeme recenze](/overovani-recenzi).

## Podělte se o zkušenost
Máte brýle COLOR? Napište nám přes [kontakt](/kontakt) – se souhlasem rádi zveřejníme i váš příběh v sekci [Příběhy](/pribehy).
$md$),
('pribehy', 'Skutečné příběhy', 'about', 16, false, 'Zkušenosti lidí s poruchou barvocitu, kteří nosí brýle COLOR.', $md$
> **[DOPLNÍ PROVOZOVATEL]** Zveřejňujte jen skutečné příběhy se souhlasem zákazníků. Níže jsou texty z návrhu webu.

## Jakub, 28 let · Deutan
„Poprvé vidím podzimní listy v opravdových barvách.“

## Petra, 34 let · Protan
„Moje děti konečně vidí, jaké mají hračky barvy.“

## Martin, 41 let · Deutan
„Konečně vidím rozdíl mezi červenou a zelenou na semaforu.“
$md$),
('blog', 'Blog', 'about', 17, false, 'Články o barvocitu, barvosleposti a výběru brýlí.', $md$
## Co je porucha barvocitu a jak je častá
Poruchou barvocitu trpí přibližně 8 % mužů a 0,5 % žen. Většinou jde o vrozenou červeno-zelenou vadu, úplná barvoslepost je velmi vzácná.

## Protan, deutan, tritan: jaký je rozdíl
- **Protan** – slabší vnímání červené, červená může působit tmavší.
- **Deutan** – slabší vnímání zelené, nejčastější typ.
- **Tritan** – vzácná porucha v modro-žluté oblasti.

## Jak vybrat brýle
Rozhodněte se podle typu vady a podle toho, kde budete brýle nosit: venku (sluneční modely s UV400), uvnitř ([Indoor](/kategorie/bryle/indoor)) nebo na dioptrických brýlích ([Clip-on](/kategorie/bryle/clip-on)). S výběrem pomůže [ColorTest](/colortest).
$md$);

update public.content_pages set translations = '{"sk": {"title": "Obchodné podmienky"}}' where slug = 'obchodni-podminky';
update public.content_pages set translations = '{"sk": {"title": "Ochrana osobných údajov"}}' where slug = 'ochrana-osobnich-udaju';
update public.content_pages set translations = '{"sk": {"title": "Zásady cookies"}}' where slug = 'cookies';
update public.content_pages set translations = '{"sk": {"title": "Reklamácie"}}' where slug = 'reklamacni-rad';
update public.content_pages set translations = '{"sk": {"title": "Vrátenie tovaru"}}' where slug = 'vraceni-zbozi';
update public.content_pages set translations = '{"sk": {"title": "Doprava a platba"}}' where slug = 'doprava-a-platba';
update public.content_pages set translations = '{"sk": {"title": "Časté otázky"}}' where slug = 'faq';
update public.content_pages set translations = '{"sk": {"title": "Kontakt"}}' where slug = 'kontakt';
update public.content_pages set translations = '{"sk": {"title": "O nás"}}' where slug = 'o-nas';
update public.content_pages set translations = '{"sk": {"title": "Ako to funguje"}}' where slug = 'jak-to-funguje';
update public.content_pages set translations = '{"sk": {"title": "Recenzie"}}' where slug = 'recenze';
update public.content_pages set translations = '{"sk": {"title": "Skutočné príbehy"}}' where slug = 'pribehy';
update public.content_pages set translations = '{"sk": {"title": "Obchodná spolupráca"}}' where slug = 'obchodni-spoluprace';
update public.content_pages set translations = '{"sk": {"title": "Ako overujeme recenzie"}}' where slug = 'overovani-recenzi';
