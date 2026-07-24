# Návrhy webového designu pro DogAtelier

Tento dokument obsahuje **3 kompletní koncepty webového designu** (one-page struktura) pro salon **DogAtelier** (majitelka Petra, Ostrava – Hrabůvka). Návrhy jsou připraveny jako detailní textové a strukturální šablony (wireframy/mockupy) optimalizované pro rychlé nasazení a vizualizaci.

---

## Společné technologické a UX základy (Pro všechny koncepty)

- **Formát:** Jednostránkový responzivní web (One-page web).
- **Struktura menu:** Úvod | O mně | Služby | Ceník | Galerie | Kontakt
- **Integrace kalendáře:** Tlačítko „Online rezervace“ otevírá modální okno rezervačního systému (např. Reservio / Cal.com) s nativním pravidlem: *Délka služby + 30 minut automatická pauza*, přímý zápis do Google Kalendáře.
- **Typografie:** Elegantní bezpatkové písmo pro moderní vzhled (např. *Inter* nebo *Plus Jakarta Sans*) v kombinaci s prémiovým patkovým písmem pro nadpisy (*Playfair Display* nebo *Lora*), které reflektuje logo s hřebenovým jezevčíkem/psem.

---

# KONCEPT 1: „Pure Atelier“ (Minimalistický & Architektonický)
**Hlavní myšlenka:** Maximální čistota, vzdušnost, estetika prémiového kadeřnického studia. Důraz na dostatek bílého prostoru (whitespace) a geometrické uspořádání inspirované interiérem z dubu a šalvěje.

### 🎨 Barevná paleta (CSS proměnné)
```css
:root {
  --color-bg: #FFFFFF;           /* Čistě bílé pozadí */
  --color-surface: #F9F9F6;      /* Velmi světlý teplý tón (nádech slonoviny) */
  --color-primary: #1A1A1A;      /* Matná černá pro detaily a typografii */
  --color-accent: #7A8D80;       /* Tlumená šalvějová zelená */
  --color-wood: #D4B996;         /* Akcent přírodního dubu */
}
```

### 📑 Struktura a obsah sekcí

#### 1. Hero sekce (Úvod)
- **Vizuál:** Na 60 % šířky obrazovky velká, čistá fotografie interiéru (recepční pult z přírodního dubu s jemným podsvícením). Zbylých 40 % tvoří čisté bílé pozadí.
- **Typografie:** Velký, elegantní nadpis (serif): `DogAtelier`. Podnadpis: `Moderní grooming salon v Ostravě`.
- **Text:** *"Místo, kde se čas zpomalí a péče se stává uměním. Profesionální přístup s respektem k tempu vašeho psa."*
- **CTA Tlačítko:** Černý obdélník s bílým textem: `Online rezervace termínu`.

#### 2. Sekce: O mně (Příběh Petry)
- **Uspořádání:** Dva asymetrické sloupce.
- **Levý sloupec:** Portrétní fotografie Petry v moderním pracovním oblečení (zástěra v šalvějové barvě) s Molletkou nebo Matyldou.
- **Pravý sloupec:** - Nadpis: `Příběh, který dává smysl`
  - Text: *"Jmenuji se Petra a k profesi groomera mě přivedla životní změna... Velkou inspirací jsou mi moje dvě fenky – Molletka a Matylda, které jsme si s partnerem osvojili z útulku. Naučily mě, jak důležité je přistupovat ke každému s trpělivostí, respektem a pochopením."*
  - **Certifikace (In-line integrace):** Malý elegantní boxík na spodu textu: *„Absolventka certifikovaného vzdělávání v oblasti profesionálního groomingu a pravidelných odborných kurzů.“*

#### 3. Sekce: Služby & Filozofie
- **Uspořádání:** Třísloupcový grid s jemným šalvějovým ohraničením (border: 1px solid #7A8D80).
- **Karta 1: Kompletní úprava & Střih** (Koupání, foukání, stříhání, trimování, vyčesávání).
- **Karta 2: Nadstandardní péče** (Ozonová terapie, čištění uší, stříhání drápků).
- **Karta 3: Individualita & Konzultace** (Poradenství v péči o srst, sestavení domácí rutiny).
- **Doprovodný text na celou šířku:** *"Slovo Atelier pro mě představuje prostor, kde se netvoří podle jedné šablony..."*

#### 4. Sekce: Ceník
- **Design:** Čistá, minimalistická tabulka bez výplní, pouze tenké vodorovné černé linky.
- **Položky:** Levý sloupec název služby, pravý sloupec cena „od...“ podle velikosti pejska.
- **Zakončení:** Poznámka pod čarou: *„Každému pejskovi věnujeme tolik času, kolik jeho srst a psychická pohoda vyžadují. Cena je konečná a transparentní.“*

#### 5. Galerie & Reference
- **Galerie:** Velkoformátový „editorial“ grid. Fotografie „před a po“ nejsou vedle sebe v jednom divokém kolážovém okně, ale střídají se umělecké snímky psů po úpravě v interiéru salonu.
- **Reference:** Citace klientů vycentrované na střed, psané kurzívou, oddělené malým symbolem srdíčka/loga.

#### 6. Kontakt & Pata
- **Obsah:** Adresa (Dr. Martínka 1166/69, Ostrava – Hrabůvka), telefon, instagramový odkaz. 
- **Mapa:** Minimalistická černobílá vložená mapa Mapy.cz / Google Maps.

---

# KONCEPT 2: „Sage & Wood“ (Přírodní & Harmonický)
**Hlavní myšlenka:** Organický design, který přenáší klid a vůni přírodní kosmetiky přímo na uživatele. Dominuje šalvějově zelené pozadí v blocích a teplé tóny dřeva, evokující klidné a bezstresové prostředí.

### 🎨 Barevná paleta (CSS proměnné)
```css
:root {
  --color-bg: #F4F6F4;           /* Jemný šalvějový nádech pozadí */
  --color-surface: #FFFFFF;      /* Bílé karty pro strukturovaný obsah */
  --root-accent-green: #4E5E53;  /* Hluboká šalvějová pro texty a pozadí sekcí */
  --color-oak-warm: #E2C9A9;     /* Teplý přírodní dub na detaily */
  --color-dark: #222222;         /* Antracitová pro čitelnost */
}
```

### 📑 Struktura a obsah sekcí

#### 1. Hero sekce (Úvod)
- **Vizuál:** Celoplošné (Full-screen) rozvržení. Na pozadí je tlumená fotografie z pracovní části salonu (zelená vana, dřevěné poličky s ručníky a přírodní kosmetikou).
- **Překryv:** Jemný kouřový filtr, nad kterým září čistě bílý blok s textem.
- **Text:** Nadpis: `DogAtelier`. Podnadpis: `Klid, důvěra a individuální péče bez spěchu.`
- **CTA Tlačítko:** Šalvějově zelené tlačítko se zaoblenými rohy.

#### 2. Sekce: Filozofie salonu (Proč DogAtelier?)
- **Vizuál:** Velký akcent na text s vysokým kontrastem.
- **Obsah:** Tři kruhové ikony reprezentující klíčové hodnoty:
  1. *Dostatek času* (Žádný pásový provoz, 30 min pauza mezi klienty).
  2. *Respekt a klid* (Vhodné pro bázlivé nebo starší pejsky).
  3. *Přírodní kosmetika* (Šetrné šampony a ozonová terapie).

#### 3. Sekce: O mně
- **Uspořádání:** Text obéká fotografii dvou útulkových fenek Molletky a Matyldy, které jsou středobodem příběhu.
- **Text:** *"DogAtelier nevznikl proto, aby byl jen dalším psím salonem. Vznikl z touhy vytvořit místo, kde nebude hlavní rychlost... Moje dvě fenky mě naučily, jak důležité je přistupovat ke každému s trpělivostí a pochopením."*

#### 4. Sekce: Služby & Ceník (Kombinovaná sekce)
- **Design:** Dvoupatrové rozvržení. 
- **Horní část:** Ceník rozdělený do elegantních karet podle velikosti psů (Malá plemena / Střední / Velká) s jasným výčtem, co všechno balíček obsahuje (stříhání, čištění uší, drápky v ceně).
- **Spodní část:** Samostatný vizuální blok věnovaný *Ozonové terapii* s popisem benefitů pro kůži a srst.

#### 5. Galerie (Sociální schránka)
- **Design:** Stylizovaný pás fotek imitující čistý Instagram feed (čisté linie, detaily psí srsti, momentky z fénování a mazlení).

#### 6. Kontakt & Rezervace (Závěrečné call-to-action)
- **Design:** Velký šalvějový blok na konci stránky.
- **Obsah:** Vlevo kontaktní údaje a otevírací doba (na objednání), vpravo výrazný rezervační widget s textem *„Rezervujte pejskovi jeho čas bez stresu“*.

---

# KONCEPT 3: „Linear Elegance“ (Typografický & Kontrastní)
**Hlavní myšlenka:** Vysoce kontrastní, moderní a elegantní design inspirovaný stylem webu *ohmydogsalon.cz*. Využívá silnou černobílou linkovou grafiku (line-art), která přímo koresponduje s vybraným logem pejska z hřebenu. Vhodné pro klienty, kteří ocení špičkový korporátní design v lokálním podnikání.

### 🎨 Barevná paleta (CSS proměnné)
```css
:root {
  --color-bg: #FAF8F5;           /* Velmi světlý krémový tón (off-white) */
  --color-border: #111111;       /* Výrazné černé čisté linky */
  --color-text-main: #111111;    /* Černo-šedá dominuje */
  --color-accent-sage: #8A9A86;  /* Šalvějová jako doplňková barva pouze pro hover stavy */
}
```

### 📑 Struktura a obsah sekcí

#### 1. Hero sekce (Úvod)
- **Design:** Rozděleno napůl vertikální tenkou černou čárou. 
- **Vlevo:** Finální vybrané logo (Pes z hřebenu) v obrovském detailu, pod ním adresa `Ostrava – Hrabůvka`.
- **Vpravo:** Velká typografie nadpisu a text: *„DogAtelier — Profesionální péče o psy v klidném a příjemném prostředí.“* Tlačítko `Rezervovat online` je lemováno tlustým černým rámečkem (button outline styl).

#### 2. Sekce: Služby jako Interaktivní Seznam
- **Design:** Namísto klasických karet jsou služby seřazeny pod sebou jako řádky (list item), oddělené tenkou linkou. Při najetí myší (hover) se pozadí řádku jemně zbarví do šalvějové a zobrazí se malá náhledová fotka dané techniky (např. trimování).
- **Položky:** Kompletní úprava srsti | Koupání a foukání | Trimování | Ozonová terapie | Poradenství.

#### 3. Sekce: O mně (Osobní manifest)
- **Design:** Velké zobrazení textu s minimem grafických prvků. Text funguje jako „manifest“ kvality a lidskosti.
- **Text:** Zvýrazněné klíčové věty: *„Mým cílem není odbavit co nejvíce zákazníků...“*, *„Slovo Atelier pro mě představuje prostor, kde se netvoří podle jedné šablony.“*
- Fotografie Petry a jejích psů jsou umístěny v obdélníkových rámečcích s ostrými rohy.

#### 4. Sekce: Přehledný Ceník (Inspirováno ohmydogsalon)
- **Design:** Extrémně strukturovaný a přehledný ceník. Rozdělení na fixní úkony (stříhání drápků 150 Kč) a hodinové/komplexní sazby (Střih+koupel od 800 Kč). Vše uspořádáno do jasných boxů s vynikající čitelností na mobilních telefonech.

#### 5. Kontaktní blok s integrovanou navigací
- **Uspořádání:** Gridová tabulka 2x2:
  - **Box 1:** Adresa + odkaz na navigaci (Dr. Martínka 1166/69, Ostrava – Hrabůvka).
  - **Box 2:** Informace o parkování a dostupnosti v Hrabůvce.
  - **Box 3:** Online rezervace (přímý proklik).
  - **Box 4:** Instagram / Facebook / E-mail.

---

## 💡 Instrukce pro Claude Code / Vývojáře
Při generování kódu (HTML/CSS nebo React/Tailwind) na základě tohoto zadání dodržujte následující pravidla:
1. **Žádné klišé prvky:** Nepoužívejte ikony psích tlapek, kostí nebo kreslených psů (mimo schválené logo). Web musí působit jako luxusní wellness/beauty salon.
2. **Responzivita:** Tabulky ceníků se na mobilních zařízeních musí transformovat do vertikálních karet pod sebou.
3. **Plynulý posun (Smooth Scroll):** Implementujte hladké přechody mezi sekcemi single-page webu z navigačního menu.
4. **Optimalizace obrázků:** Všechny placeholder obrázky interiéru a psů stylujte pomocí CSS (`object-fit: cover; filter: saturate(0.9);`) pro zachování tlumoného, elegantního tónu.
