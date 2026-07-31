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

  // Days to show in advance
  DAYS_AHEAD: 30
};

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
 * Uses settings from "Nastavení" sheet
 */
function getAvailableSlots() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    throw new Error('Calendar not found. Check CALENDAR_ID configuration.');
  }

  // Load settings from sheet
  const settings = getSettings();

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

    // Skip closed dates
    if (settings.closedDates.includes(dateStr)) {
      continue;
    }

    // Check each appointment time from settings
    settings.appointmentTimes.forEach(hour => {
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
