# DogAtelier - Nastavení rezervačního systému

Tento dokument popisuje jak nastavit a propojit rezervační systém s Google Calendar, Google Sheets a emailovými notifikacemi.

## Přehled systému

Systém se skládá ze dvou částí:
1. **Frontend** - rezervační formulář v `dogatelier-final.html`
2. **Backend** - Google Apps Script (`google-apps-script/Code.gs`)

## Krok 1: Vytvoření Google Apps Script projektu

1. Přihlaste se do Google účtu `dogatelierostrava@gmail.com`
2. Otevřete [Google Apps Script](https://script.google.com)
3. Klikněte na **Nový projekt**
4. Přejmenujte projekt na "DogAtelier Rezervace"

## Krok 2: Vložení kódu

1. Otevřete soubor `google-apps-script/Code.gs` z tohoto projektu
2. Zkopírujte celý obsah souboru
3. Vložte ho do editoru Apps Script (nahraďte výchozí kód)
4. Uložte (Ctrl+S nebo Cmd+S)

## Krok 3: Konfigurace

V horní části kódu najdete sekci `CONFIG`. Zkontrolujte/upravte:

```javascript
const CONFIG = {
  // Google Sheet ID - již nastaveno správně
  SHEET_ID: '1wZ6okwr54P6OveK3kJWGVYXmNdYHzn2X1k8_roP6Nr4',

  // ID kalendáře - obvykle emailová adresa
  CALENDAR_ID: 'dogatelierostrava@gmail.com',

  // Emaily pro notifikace
  ALERT_EMAILS: ['dogatelierostrava@gmail.com', 'staffa.ppc@gmail.com'],

  // Pracovní doba (9:00 - 18:00)
  BUSINESS_HOURS: { start: 9, end: 18 },

  // Délka termínu v minutách
  SLOT_DURATION: 90,

  // Pauza mezi termíny
  BUFFER_TIME: 30,

  // Pracovní dny (1=Po, 2=Út, 3=St, 4=Čt, 5=Pá)
  WORKING_DAYS: [1, 2, 3, 4, 5]
};
```

## Krok 4: Oprávnění

1. Spusťte funkci `testSetup` (vyberte ji z dropdown menu a klikněte na ▶️)
2. Google vás požádá o oprávnění - povolte je:
   - Přístup ke Google Calendar
   - Přístup ke Google Sheets
   - Odesílání emailů přes Gmail

## Krok 5: Nasazení jako Web App

1. Klikněte na **Nasadit** → **Nové nasazení**
2. Vyberte typ: **Webová aplikace**
3. Nastavte:
   - **Popis**: "DogAtelier Rezervace v1.0"
   - **Spustit jako**: Já (váš účet)
   - **Kdo má přístup**: Kdokoliv
4. Klikněte na **Nasadit**
5. **DŮLEŽITÉ**: Zkopírujte URL webové aplikace (vypadá jako `https://script.google.com/macros/s/ABC.../exec`)

## Krok 6: Propojení s webem

1. Otevřete soubor `dogatelier-final.html`
2. Najděte řádek (cca řádek 1200+):
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
   ```
3. Nahraďte `YOUR_APPS_SCRIPT_URL_HERE` zkopírovanou URL z kroku 5

## Testování

### Test backendu
1. V Apps Script spusťte funkci `testSetup`
2. Zkontrolujte výstup v logu (Zobrazit → Protokoly)
3. Měli byste vidět:
   - ✓ Calendar access OK
   - ✓ Sheet access OK
   - ✓ Found X available slots

### Test frontendu
1. Otevřete `dogatelier-final.html` v prohlížeči
2. Klikněte na tlačítko "Online rezervace"
3. Měl by se otevřít modal s kalendářem
4. Vyberte datum a čas, vyplňte formulář
5. Odešlete testovací rezervaci

## Struktura Google Sheetu

Při první rezervaci se automaticky vytvoří hlavička:

| Timestamp | Jméno | Příjmení | Email | Telefon | Datum | Čas | Služba | Event ID |
|-----------|-------|----------|-------|---------|-------|-----|--------|----------|

## Emailové notifikace

Systém posílá 3 typy emailů:
1. **Alert pro majitele** - na oba emaily (dogatelierostrava@gmail.com, staffa.ppc@gmail.com)
2. **Potvrzení pro zákazníka** - na email z formuláře

## Úprava pracovní doby

Pro změnu pracovní doby upravte v `CONFIG`:

```javascript
// Příklad: 10:00 - 19:00, jen Po-Čt
BUSINESS_HOURS: { start: 10, end: 19 },
WORKING_DAYS: [1, 2, 3, 4]
```

## Řešení problémů

### "Calendar not found"
- Zkontrolujte, že `CALENDAR_ID` je správný email
- Ujistěte se, že Google Calendar je aktivní

### "Sheet not found"
- Zkontrolujte `SHEET_ID` (číslo z URL tabulky)
- Ujistěte se, že máte přístup k tabulce

### Formulář nefunguje
- Zkontrolujte konzoli prohlížeče (F12 → Console)
- Ověřte, že `APPS_SCRIPT_URL` je správně nastavena

### CORS chyby
- Apps Script Web App musí být nastavena jako "Kdokoliv" má přístup
- Při změně kódu je nutné vytvořit nové nasazení

## Aktualizace kódu

Při změnách v Apps Script:
1. Upravte kód
2. Uložte
3. **Nasadit** → **Správa nasazení** → **Upravit** → Zvyšte verzi
4. Nebo vytvořte nové nasazení a aktualizujte URL v HTML

---

**Kontakt pro technickou podporu**: staffa.ppc@gmail.com
