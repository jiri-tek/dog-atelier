/**
 * DogAtelier Reservation System - Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Copy this entire code into the Code.gs file
 * 3. Create "Nastavení" sheet in your spreadsheet (see setupSettingsSheet function)
 * 4. Deploy as Web App (Deploy > New deployment > Web app)
 *    - Execute as: Me (your account)
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and paste it into the HTML file (APPS_SCRIPT_URL variable)
 */

// ============ CONFIGURATION ============
const CONFIG = {
  // Google Sheet ID (from the URL)
  SHEET_ID: '1wZ6okwr54P6OveK3kJWGVYXmNdYHzn2X1k8_roP6Nr4',

  // Calendar ID (usually the email address)
  CALENDAR_ID: 'dogatelierostrava@gmail.com',

  // Email addresses for alerts
  ALERT_EMAILS: ['dogatelierostrava@gmail.com', 'staffa.ppc@gmail.com', 'p.holla@email.cz'],

  // Default slot duration in minutes (used for calendar event length)
  SLOT_DURATION: 150,  // 2.5 hours

  // Show slots until end of year (calculated dynamically)
  DAYS_AHEAD: calculateDaysUntilEndOfYear()
};

/**
 * Calculate days until end of current year
 */
function calculateDaysUntilEndOfYear() {
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31); // Dec 31
  const diffTime = endOfYear.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 30); // At least 30 days
}

// ============ SETTINGS FROM SHEET ============

/**
 * Load settings from "Nastavení" sheet
 */
function getSettings() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const settingsSheet = spreadsheet.getSheetByName('Nastavení');

    if (!settingsSheet) {
      // Return defaults if settings sheet doesn't exist
      return {
        workingDays: [1, 2, 3, 4, 5], // Mon-Fri
        appointmentTimes: [9, 12, 15],
        closedDates: [],
        slotDuration: 150
      };
    }

    const data = settingsSheet.getDataRange().getValues();
    const settings = {
      workingDays: [],
      appointmentTimes: [],
      closedDates: [],
      slotDuration: CONFIG.SLOT_DURATION
    };

    // Parse settings
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      const enabled = data[i][2];

      if (key === 'PRACOVNÍ DNY') {
        // Parse working days
        if (value && enabled === true) {
          const dayMap = {'Po': 1, 'Út': 2, 'St': 3, 'Čt': 4, 'Pá': 5, 'So': 6, 'Ne': 0};
          const days = value.toString().split(',').map(d => d.trim());
          settings.workingDays = days.map(d => dayMap[d]).filter(d => d !== undefined);
        }
      } else if (key === 'ČASY REZERVACÍ') {
        // Parse appointment times
        if (value) {
          const times = value.toString().split(',').map(t => {
            const hour = parseInt(t.trim().split(':')[0]);
            return isNaN(hour) ? null : hour;
          }).filter(t => t !== null);
          if (times.length > 0) settings.appointmentTimes = times;
        }
      } else if (key === 'DÉLKA REZERVACE (min)') {
        if (value) settings.slotDuration = parseInt(value) || CONFIG.SLOT_DURATION;
      } else if (key === 'ZAVŘENO' && value) {
        // Parse closed dates
        try {
          if (value instanceof Date) {
            settings.closedDates.push(Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
          } else {
            // Try to parse date string
            const dateStr = value.toString();
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              const date = new Date(parts[2], parts[1] - 1, parts[0]);
              settings.closedDates.push(Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    }

    // Use defaults if empty
    if (settings.workingDays.length === 0) settings.workingDays = [1, 2, 3, 4, 5];
    if (settings.appointmentTimes.length === 0) settings.appointmentTimes = [9, 12, 15];

    return settings;
  } catch (e) {
    // Return defaults on error
    return {
      workingDays: [1, 2, 3, 4, 5],
      appointmentTimes: [9, 12, 15],
      closedDates: [],
      slotDuration: 150
    };
  }
}

/**
 * Create or update the Settings sheet with default values
 * Run this function once to create the settings sheet
 */
function setupSettingsSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let settingsSheet = spreadsheet.getSheetByName('Nastavení');

  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet('Nastavení');
  }

  // Clear and setup
  settingsSheet.clear();

  // Headers
  settingsSheet.getRange('A1:C1').setValues([['Nastavení', 'Hodnota', 'Aktivní']]);
  settingsSheet.getRange('A1:C1').setFontWeight('bold');
  settingsSheet.getRange('A1:C1').setBackground('#7A8D80');
  settingsSheet.getRange('A1:C1').setFontColor('white');

  // Settings rows
  const settings = [
    ['PRACOVNÍ DNY', 'Po, Út, St, Čt, Pá', true],
    ['ČASY REZERVACÍ', '9:00, 12:00, 15:00', ''],
    ['DÉLKA REZERVACE (min)', '150', ''],
    ['', '', ''],
    ['ZAVŘENO (přidejte řádky)', '', ''],
    ['ZAVŘENO', '', ''],
    ['ZAVŘENO', '', ''],
    ['ZAVŘENO', '', ''],
    ['ZAVŘENO', '', ''],
    ['ZAVŘENO', '', ''],
  ];

  settingsSheet.getRange(2, 1, settings.length, 3).setValues(settings);

  // Format
  settingsSheet.setColumnWidth(1, 200);
  settingsSheet.setColumnWidth(2, 200);
  settingsSheet.setColumnWidth(3, 80);

  // Add checkbox for Aktivní
  settingsSheet.getRange('C2').insertCheckboxes();

  // Add note
  settingsSheet.getRange('A13').setValue('NÁVOD:');
  settingsSheet.getRange('A14').setValue('• Pracovní dny: Po, Út, St, Čt, Pá, So, Ne');
  settingsSheet.getRange('A15').setValue('• Časy: např. 9:00, 12:00, 15:00');
  settingsSheet.getRange('A16').setValue('• Zavřeno: zadejte datum ve formátu 24.12.2025');
  settingsSheet.getRange('A17').setValue('• Po změně nastavení není třeba nic dalšího dělat');
  settingsSheet.getRange('A13:A17').setFontStyle('italic');
  settingsSheet.getRange('A13:A17').setFontColor('#666666');

  console.log('Settings sheet created successfully!');
}

// ============ WEB APP HANDLERS ============

/**
 * Handle GET requests - returns available time slots
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getSlots') {
      const slots = getAvailableSlots();
      return jsonResponse({ success: true, slots: slots });
    }

    return jsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Handle POST requests - creates a reservation
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'createReservation') {
      const result = createReservation(data);
      return jsonResponse(result);
    }

    return jsonResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ CALENDAR FUNCTIONS ============

/**
 * Get available time slots for the next X days
 * Uses settings from "Nastavení" sheet and checks "Zavřeno" sheet
 */
function getAvailableSlots() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    throw new Error('Calendar not found. Check CALENDAR_ID configuration.');
  }

  // Load settings from sheet
  const settings = getSettings();

  // Load closed slots from "Zavřeno" sheet
  const closedData = getClosedSlots();

  const slots = [];
  const now = new Date();

  // Start from tomorrow
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(0, 0, 0, 0);

  // End date
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + CONFIG.DAYS_AHEAD);

  // Get all events in the date range
  const events = calendar.getEvents(startDate, endDate);
  const busyTimes = events.map(event => ({
    start: event.getStartTime().getTime(),
    end: event.getEndTime().getTime()
  }));

  // Generate available slots for each day
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Skip non-working days
    if (!settings.workingDays.includes(dayOfWeek)) {
      continue;
    }

    // Skip closed dates (from Nastavení sheet)
    if (settings.closedDates.includes(dateStr)) {
      continue;
    }

    // Skip full day closures (from Zavřeno sheet)
    if (closedData.closedDates.includes(dateStr)) {
      continue;
    }

    // Get closed hours for this specific date (from Zavřeno sheet)
    const closedHours = closedData.closedSlots[dateStr] || [];

    // Check each appointment time from settings
    settings.appointmentTimes.forEach(hour => {
      // Skip if this specific hour is closed
      if (closedHours.includes(hour)) {
        return;
      }

      const slotStart = new Date(d);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + settings.slotDuration * 60000);

      // Check if slot conflicts with any existing event
      const isAvailable = !busyTimes.some(busy => {
        return (slotStart.getTime() < busy.end && slotEnd.getTime() > busy.start);
      });

      if (isAvailable) {
        slots.push({
          date: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
          time: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), 'HH:mm'),
          datetime: slotStart.toISOString(),
          displayDate: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), 'd.M.yyyy'),
          displayTime: Utilities.formatDate(slotStart, Session.getScriptTimeZone(), 'H:mm'),
          dayName: getDayName(slotStart.getDay())
        });
      }
    });
  }

  return slots;
}

/**
 * Get Czech day name
 */
function getDayName(dayIndex) {
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  return days[dayIndex];
}

// ============ RESERVATION FUNCTIONS ============

/**
 * Create a new reservation
 */
function createReservation(data) {
  const { firstName, lastName, email, phone, datetime, service, breed, notes } = data;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !datetime || !service) {
    return { success: false, error: 'Vyplňte prosím všechna povinná pole.' };
  }

  // Load settings
  const settings = getSettings();

  // Parse the datetime
  const reservationDate = new Date(datetime);
  const endDate = new Date(reservationDate.getTime() + settings.slotDuration * 60000);

  // Check if slot is still available
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const existingEvents = calendar.getEvents(reservationDate, endDate);

  if (existingEvents.length > 0) {
    return { success: false, error: 'Tento termín již není dostupný. Vyberte prosím jiný.' };
  }

  // Create calendar event
  const eventTitle = `${firstName} ${lastName} - ${service}`;
  const eventDescription = `
Klient: ${firstName} ${lastName}
Email: ${email}
Telefon: ${phone}
Služba: ${service}
Plemeno: ${breed || 'Neuvedeno'}
Poznámky: ${notes || 'Žádné'}

Rezervováno přes web: ${new Date().toLocaleString('cs-CZ')}
  `.trim();

  const event = calendar.createEvent(eventTitle, reservationDate, endDate, {
    description: eventDescription,
    location: 'DogAtelier, Dr. Martínka 1166/69, Ostrava – Hrabůvka'
  });

  // Log to Google Sheet
  logToSheet({
    timestamp: new Date(),
    firstName,
    lastName,
    email,
    phone,
    date: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'd.M.yyyy'),
    time: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'H:mm'),
    service: service,
    breed: breed || '',
    notes: notes || '',
    eventId: event.getId()
  });

  // Send email alerts
  sendAlertEmails({
    firstName,
    lastName,
    email,
    phone,
    date: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'd.M.yyyy'),
    time: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'H:mm'),
    dayName: getDayName(reservationDate.getDay()),
    service: service,
    breed: breed || 'Neuvedeno',
    notes: notes || 'Žádné'
  });

  // Send confirmation to customer
  sendCustomerConfirmation({
    firstName,
    email,
    date: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'd.M.yyyy'),
    time: Utilities.formatDate(reservationDate, Session.getScriptTimeZone(), 'H:mm'),
    dayName: getDayName(reservationDate.getDay())
  });

  return {
    success: true,
    message: 'Rezervace byla úspěšně vytvořena. Potvrzení jsme vám zaslali na email.',
    eventId: event.getId()
  };
}

// ============ GOOGLE SHEET FUNCTIONS ============

/**
 * Log reservation to Google Sheet
 */
function logToSheet(data) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = spreadsheet.getSheetByName('Rezervace');

  // If "Rezervace" sheet doesn't exist, use the first sheet
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
  }

  // Check if headers exist, if not create them
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Jméno',
      'Příjmení',
      'Email',
      'Telefon',
      'Datum',
      'Čas',
      'Služba',
      'Plemeno',
      'Poznámky',
      'Event ID'
    ]);
  }

  // Format phone number as text (add apostrophe to prevent formula interpretation)
  const phoneFormatted = "'" + data.phone;

  // Append new reservation
  sheet.appendRow([
    data.timestamp,
    data.firstName,
    data.lastName,
    data.email,
    phoneFormatted,
    data.date,
    data.time,
    data.service,
    data.breed,
    data.notes,
    data.eventId
  ]);
}

// ============ EMAIL FUNCTIONS ============

/**
 * Send alert emails to salon owners
 */
function sendAlertEmails(data) {
  const subject = 'Nová rezervace - ' + data.firstName + ' ' + data.lastName;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A1A1A; border-bottom: 2px solid #7A8D80; padding-bottom: 10px;">
        Nová rezervace v DogAtelier
      </h2>

      <div style="background: #F9F9F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #7A8D80; margin-top: 0;">Údaje o klientovi</h3>
        <p><strong>Jméno:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
        <p><strong>Telefon:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
      </div>

      <div style="background: #7A8D80; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Termín</h3>
        <p style="font-size: 18px; margin: 0;">
          <strong>${data.dayName} ${data.date}</strong> v <strong>${data.time}</strong>
        </p>
        <p style="margin: 10px 0 0 0;"><strong>Služba:</strong> ${data.service}</p>
        <p style="margin: 5px 0 0 0;"><strong>Plemeno:</strong> ${data.breed}</p>
      </div>

      <div style="background: #FFF8E7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4A574;">
        <h4 style="color: #1A1A1A; margin: 0 0 10px 0;">Poznámky od klienta:</h4>
        <p style="margin: 0; color: #444;">${data.notes}</p>
      </div>

      <p style="color: #666; font-size: 12px;">
        Tato rezervace byla automaticky přidána do Google Kalendáře.
      </p>
    </div>
  `;

  CONFIG.ALERT_EMAILS.forEach(email => {
    GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
  });
}

/**
 * Send confirmation email to customer
 */
function sendCustomerConfirmation(data) {
  const subject = 'Potvrzení rezervace - DogAtelier';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A1A1A; border-bottom: 2px solid #7A8D80; padding-bottom: 10px;">
        Děkujeme za Vaši rezervaci!
      </h2>

      <p>Dobrý den, ${data.firstName},</p>

      <p>Vaše rezervace v salonu <strong>DogAtelier</strong> byla úspěšně vytvořena.</p>

      <div style="background: #7A8D80; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Váš termín</h3>
        <p style="font-size: 18px; margin: 0;">
          <strong>${data.dayName} ${data.date}</strong> v <strong>${data.time}</strong>
        </p>
      </div>

      <div style="background: #F9F9F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #7A8D80; margin-top: 0;">Kde nás najdete</h3>
        <p>
          <strong>DogAtelier</strong><br>
          Dr. Martínka 1166/69<br>
          Ostrava – Hrabůvka
        </p>
        <p>
          <a href="https://maps.google.com/?q=Dr.+Martínka+1166/69,+Ostrava+Hrabůvka" style="color: #7A8D80;">
            Zobrazit na mapě →
          </a>
        </p>
      </div>

      <p>
        Pokud potřebujete termín změnit nebo zrušit, kontaktujte nás prosím na:
      </p>
      <ul>
        <li>Email: <a href="mailto:dogatelierostrava@gmail.com">dogatelierostrava@gmail.com</a></li>
        <li>Telefon: <a href="tel:+420736477981">+420 736 477 981</a></li>
      </ul>

      <p>Těšíme se na Vás!</p>

      <p style="color: #7A8D80;">
        <strong>Petra</strong><br>
        DogAtelier
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="color: #999; font-size: 12px;">
        Toto je automaticky generovaný email. Prosím neodpovídejte na něj přímo.
      </p>
    </div>
  `;

  GmailApp.sendEmail(data.email, subject, '', {
    htmlBody: htmlBody,
    name: 'DogAtelier',
    replyTo: 'dogatelierostrava@gmail.com'
  });
}

// ============ CLOSED DAYS SHEET FUNCTIONS ============

/**
 * Create the "Zavřeno" sheet with checkboxes for dates and time slots
 * Run this function once to create the sheet
 */
function setupClosedDaysSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let closedSheet = spreadsheet.getSheetByName('Zavřeno');

  if (!closedSheet) {
    closedSheet = spreadsheet.insertSheet('Zavřeno');
  }

  // Clear and setup
  closedSheet.clear();

  // Load settings to get appointment times
  const settings = getSettings();
  const times = settings.appointmentTimes.map(h => h + ':00');

  // Headers
  const headers = ['Datum', 'Den', 'Celý den', ...times];
  closedSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  closedSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  closedSheet.getRange(1, 1, 1, headers.length).setBackground('#7A8D80');
  closedSheet.getRange(1, 1, 1, headers.length).setFontColor('white');

  // Generate dates until end of year (skip weekends)
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  const rows = [];

  for (let d = new Date(today); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const dayOfWeek = date.getDay();

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'd.M.yyyy');
    const dayName = getDayName(dayOfWeek);

    // Row: Date, Day name, Celý den checkbox, time checkboxes...
    const row = [dateStr, dayName, false];
    times.forEach(() => row.push(false));
    rows.push(row);
  }

  closedSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  // Add checkboxes
  const checkboxRange = closedSheet.getRange(2, 3, rows.length, 1 + times.length);
  checkboxRange.insertCheckboxes();

  // Format columns
  closedSheet.setColumnWidth(1, 100);
  closedSheet.setColumnWidth(2, 80);
  closedSheet.setColumnWidth(3, 80);
  times.forEach((_, i) => closedSheet.setColumnWidth(4 + i, 60));

  // Freeze header row
  closedSheet.setFrozenRows(1);

  // Add conditional formatting - highlight rows where "Celý den" is checked
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2=TRUE')
    .setBackground('#FFCCCC')
    .setRanges([closedSheet.getRange(2, 1, rows.length, headers.length)])
    .build();
  closedSheet.setConditionalFormatRules([rule]);

  // Add note at the bottom
  const noteRow = rows.length + 4;
  closedSheet.getRange(noteRow, 1).setValue('NÁVOD:');
  closedSheet.getRange(noteRow + 1, 1).setValue('• Zaškrtněte "Celý den" pro uzavření celého dne');
  closedSheet.getRange(noteRow + 2, 1).setValue('• Nebo zaškrtněte jednotlivé časy pro částečné uzavření');
  closedSheet.getRange(noteRow + 3, 1).setValue('• Po změně spusťte funkci "syncClosedToCalendar" pro vytvoření událostí v kalendáři');
  closedSheet.getRange(noteRow, 1, 4, 1).setFontStyle('italic');
  closedSheet.getRange(noteRow, 1, 4, 1).setFontColor('#666666');

  console.log('Zavřeno sheet created successfully with ' + rows.length + ' days!');
}

/**
 * Refresh the Zavřeno sheet - add new dates, keep existing checkboxes
 * Run this periodically to add more dates
 */
function refreshClosedDaysSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const closedSheet = spreadsheet.getSheetByName('Zavřeno');

  if (!closedSheet) {
    setupClosedDaysSheet();
    return;
  }

  const settings = getSettings();
  const times = settings.appointmentTimes.map(h => h + ':00');

  // Get existing dates
  const data = closedSheet.getDataRange().getValues();
  const existingDates = new Set();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      existingDates.add(data[i][0].toString());
    }
  }

  // Find the last row with data
  let lastRow = closedSheet.getLastRow();

  // Add new dates until end of year (skip weekends)
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  const newRows = [];

  for (let d = new Date(today); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const dayOfWeek = date.getDay();

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'd.M.yyyy');

    if (!existingDates.has(dateStr)) {
      const dayName = getDayName(dayOfWeek);
      const row = [dateStr, dayName, false];
      times.forEach(() => row.push(false));
      newRows.push(row);
    }
  }

  if (newRows.length > 0) {
    const startRow = lastRow + 1;
    closedSheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);

    // Add checkboxes to new rows
    const checkboxRange = closedSheet.getRange(startRow, 3, newRows.length, 1 + times.length);
    checkboxRange.insertCheckboxes();

    console.log('Added ' + newRows.length + ' new dates to Zavřeno sheet');
  } else {
    console.log('No new dates to add');
  }
}

/**
 * Get closed time slots from the "Zavřeno" sheet
 * Returns an object with closed dates and specific time slots
 */
function getClosedSlots() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const closedSheet = spreadsheet.getSheetByName('Zavřeno');

  const result = {
    closedDates: [],      // Full day closures: ['2025-08-01', '2025-08-02']
    closedSlots: {}       // Partial closures: {'2025-08-03': [9, 12], '2025-08-04': [15]}
  };

  if (!closedSheet) {
    return result;
  }

  const data = closedSheet.getDataRange().getValues();
  const headers = data[0];

  // Find time column indices (starting from column 4)
  const timeColumns = [];
  for (let c = 3; c < headers.length; c++) {
    const timeStr = headers[c].toString();
    const hour = parseInt(timeStr.split(':')[0]);
    if (!isNaN(hour)) {
      timeColumns.push({ col: c, hour: hour });
    }
  }

  // Parse each row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateStr = row[0];

    if (!dateStr) continue;

    // Parse date
    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      const parts = dateStr.toString().split('.');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        continue;
      }
    }

    const isoDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const wholeDay = row[2] === true;

    if (wholeDay) {
      result.closedDates.push(isoDate);
    } else {
      // Check individual time slots
      const closedHours = [];
      timeColumns.forEach(tc => {
        if (row[tc.col] === true) {
          closedHours.push(tc.hour);
        }
      });

      if (closedHours.length > 0) {
        result.closedSlots[isoDate] = closedHours;
      }
    }
  }

  return result;
}

/**
 * Sync closed days to Google Calendar
 * Creates "Dovolená" events for checked dates/times
 */
function syncClosedToCalendar() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    console.log('Calendar not found!');
    return;
  }

  const settings = getSettings();
  const closedData = getClosedSlots();

  let created = 0;
  let skipped = 0;

  // Process full day closures
  closedData.closedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check if event already exists
    const existingEvents = calendar.getEvents(date, nextDay);
    const hasHolidayEvent = existingEvents.some(e =>
      e.getTitle().includes('Dovolená') || e.getTitle().includes('Zavřeno')
    );

    if (!hasHolidayEvent) {
      calendar.createAllDayEvent('Dovolená - DogAtelier', date, {
        description: 'Automaticky vytvořeno z listu Zavřeno'
      });
      created++;
    } else {
      skipped++;
    }
  });

  // Process partial day closures
  Object.keys(closedData.closedSlots).forEach(dateStr => {
    const hours = closedData.closedSlots[dateStr];
    const date = new Date(dateStr);

    hours.forEach(hour => {
      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);

      const endTime = new Date(startTime.getTime() + settings.slotDuration * 60000);

      // Check if event already exists
      const existingEvents = calendar.getEvents(startTime, endTime);
      const hasHolidayEvent = existingEvents.some(e =>
        e.getTitle().includes('Dovolená') || e.getTitle().includes('Zavřeno')
      );

      if (!hasHolidayEvent) {
        calendar.createEvent('Zavřeno - DogAtelier', startTime, endTime, {
          description: 'Automaticky vytvořeno z listu Zavřeno'
        });
        created++;
      } else {
        skipped++;
      }
    });
  });

  console.log('Sync complete! Created: ' + created + ' events, Skipped (already exist): ' + skipped);
}

/**
 * Remove all "Dovolená" and "Zavřeno" events created by this script
 * Use this to clean up and resync
 */
function clearClosedCalendarEvents() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    console.log('Calendar not found!');
    return;
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getFullYear(), 11, 31);

  const events = calendar.getEvents(startDate, endDate);
  let deleted = 0;

  events.forEach(event => {
    const title = event.getTitle();
    const desc = event.getDescription() || '';

    if ((title.includes('Dovolená') || title.includes('Zavřeno')) &&
        desc.includes('Automaticky vytvořeno z listu Zavřeno')) {
      event.deleteEvent();
      deleted++;
    }
  });

  console.log('Deleted ' + deleted + ' events');
}

/**
 * Automatic trigger - syncs calendar when checkbox is changed
 * SETUP: Run setupOnEditTrigger() once to install this trigger
 */
function onZavrenoEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();

    // Only process edits on "Zavřeno" sheet
    if (sheet.getName() !== 'Zavřeno') {
      return;
    }

    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    // Only process checkbox columns (3 = Celý den, 4+ = time slots)
    if (row < 2 || col < 3) {
      return;
    }

    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (!calendar) {
      return;
    }

    const settings = getSettings();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Get date from column A
    const dateValue = sheet.getRange(row, 1).getValue();
    let date;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      const parts = dateValue.toString().split('.');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        return;
      }
    }

    const isChecked = e.value === 'TRUE' || e.value === true;
    const isCelyDen = col === 3;

    if (isCelyDen) {
      // Full day toggle
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      if (isChecked) {
        // Create all-day event
        const existingEvents = calendar.getEvents(date, nextDay);
        const hasEvent = existingEvents.some(ev =>
          ev.getTitle().includes('Dovolená') &&
          ev.getDescription()?.includes('Automaticky vytvořeno')
        );

        if (!hasEvent) {
          calendar.createAllDayEvent('Dovolená - DogAtelier', date, {
            description: 'Automaticky vytvořeno z listu Zavřeno'
          });
        }
      } else {
        // Remove all-day event
        const events = calendar.getEvents(date, nextDay);
        events.forEach(ev => {
          if (ev.getTitle().includes('Dovolená') &&
              ev.getDescription()?.includes('Automaticky vytvořeno')) {
            ev.deleteEvent();
          }
        });
      }
    } else {
      // Specific time slot toggle
      const timeStr = headers[col - 1];
      const hour = parseInt(timeStr.toString().split(':')[0]);

      if (isNaN(hour)) return;

      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + settings.slotDuration * 60000);

      if (isChecked) {
        // Create time-specific event
        const existingEvents = calendar.getEvents(startTime, endTime);
        const hasEvent = existingEvents.some(ev =>
          ev.getTitle().includes('Zavřeno') &&
          ev.getDescription()?.includes('Automaticky vytvořeno')
        );

        if (!hasEvent) {
          calendar.createEvent('Zavřeno - DogAtelier', startTime, endTime, {
            description: 'Automaticky vytvořeno z listu Zavřeno'
          });
        }
      } else {
        // Remove time-specific event
        const events = calendar.getEvents(startTime, endTime);
        events.forEach(ev => {
          if (ev.getTitle().includes('Zavřeno') &&
              ev.getDescription()?.includes('Automaticky vytvořeno')) {
            ev.deleteEvent();
          }
        });
      }
    }
  } catch (error) {
    console.log('onZavrenoEdit error: ' + error.message);
  }
}

/**
 * Install the onEdit trigger for automatic calendar sync
 * Run this function ONCE to set up automatic sync
 */
function setupOnEditTrigger() {
  // Remove existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onZavrenoEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger
  ScriptApp.newTrigger('onZavrenoEdit')
    .forSpreadsheet(CONFIG.SHEET_ID)
    .onEdit()
    .create();

  console.log('onEdit trigger installed successfully!');
}

// ============ TEST FUNCTIONS ============

/**
 * Test function - run this to verify setup
 */
function testSetup() {
  console.log('Testing DogAtelier Reservation System...');

  // Test Calendar access
  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (calendar) {
      console.log('✓ Calendar access OK: ' + calendar.getName());
    } else {
      console.log('✗ Calendar not found!');
    }
  } catch (e) {
    console.log('✗ Calendar error: ' + e.message);
  }

  // Test Sheet access
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    console.log('✓ Sheet access OK: ' + sheet.getName());
  } catch (e) {
    console.log('✗ Sheet error: ' + e.message);
  }

  // Test settings
  try {
    const settings = getSettings();
    console.log('✓ Settings loaded:');
    console.log('  Working days: ' + settings.workingDays.join(', '));
    console.log('  Appointment times: ' + settings.appointmentTimes.join(', '));
    console.log('  Closed dates: ' + (settings.closedDates.length > 0 ? settings.closedDates.join(', ') : 'none'));
  } catch (e) {
    console.log('✗ Settings error: ' + e.message);
  }

  // Test available slots
  try {
    const slots = getAvailableSlots();
    console.log('✓ Found ' + slots.length + ' available slots');
    if (slots.length > 0) {
      console.log('  First slot: ' + slots[0].displayDate + ' ' + slots[0].displayTime);
    }
  } catch (e) {
    console.log('✗ Slots error: ' + e.message);
  }

  console.log('Test complete!');
}
