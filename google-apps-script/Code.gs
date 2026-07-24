/**
 * DogAtelier Reservation System - Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Copy this entire code into the Code.gs file
 * 3. Update the CALENDAR_ID if using a different calendar
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
  ALERT_EMAILS: ['dogatelierostrava@gmail.com', 'staffa.ppc@gmail.com'],

  // Business hours (24h format)
  BUSINESS_HOURS: {
    start: 9,  // 9:00
    end: 18    // 18:00
  },

  // Slot duration in minutes
  SLOT_DURATION: 90,

  // Buffer time between appointments in minutes
  BUFFER_TIME: 30,

  // Days to show in advance
  DAYS_AHEAD: 30,

  // Working days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  WORKING_DAYS: [1, 2, 3, 4, 5] // Monday to Friday
};

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
 */
function getAvailableSlots() {
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    throw new Error('Calendar not found. Check CALENDAR_ID configuration.');
  }

  const slots = [];
  const now = new Date();
  const slotDuration = CONFIG.SLOT_DURATION + CONFIG.BUFFER_TIME;

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

    // Skip non-working days
    if (!CONFIG.WORKING_DAYS.includes(dayOfWeek)) {
      continue;
    }

    // Generate time slots for this day
    const dayStart = new Date(d);
    dayStart.setHours(CONFIG.BUSINESS_HOURS.start, 0, 0, 0);

    const dayEnd = new Date(d);
    dayEnd.setHours(CONFIG.BUSINESS_HOURS.end, 0, 0, 0);

    for (let slotStart = new Date(dayStart); slotStart.getTime() + (CONFIG.SLOT_DURATION * 60000) <= dayEnd.getTime(); slotStart.setMinutes(slotStart.getMinutes() + slotDuration)) {
      const slotEnd = new Date(slotStart.getTime() + CONFIG.SLOT_DURATION * 60000);

      // Check if slot conflicts with any existing event
      const isAvailable = !busyTimes.some(busy => {
        const bufferStart = slotStart.getTime();
        const bufferEnd = slotEnd.getTime() + (CONFIG.BUFFER_TIME * 60000);
        return (bufferStart < busy.end && bufferEnd > busy.start);
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
    }
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
  const { firstName, lastName, email, phone, datetime, service } = data;

  // Validate required fields
  if (!firstName || !lastName || !email || !phone || !datetime) {
    return { success: false, error: 'Vyplňte prosím všechna povinná pole.' };
  }

  // Parse the datetime
  const reservationDate = new Date(datetime);
  const endDate = new Date(reservationDate.getTime() + CONFIG.SLOT_DURATION * 60000);

  // Check if slot is still available
  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const existingEvents = calendar.getEvents(reservationDate, endDate);

  if (existingEvents.length > 0) {
    return { success: false, error: 'Tento termín již není dostupný. Vyberte prosím jiný.' };
  }

  // Create calendar event
  const eventTitle = `🐕 ${firstName} ${lastName} - ${service || 'Rezervace'}`;
  const eventDescription = `
Klient: ${firstName} ${lastName}
Email: ${email}
Telefon: ${phone}
Služba: ${service || 'Neuvedeno'}

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
    service: service || 'Neuvedeno',
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
    service: service || 'Neuvedeno'
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
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getActiveSheet();

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
      'Event ID'
    ]);
  }

  // Append new reservation
  sheet.appendRow([
    data.timestamp,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.date,
    data.time,
    data.service,
    data.eventId
  ]);
}

// ============ EMAIL FUNCTIONS ============

/**
 * Send alert emails to salon owners
 */
function sendAlertEmails(data) {
  const subject = `🐕 Nová rezervace - ${data.firstName} ${data.lastName}`;

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
        <p style="margin: 10px 0 0 0;">Služba: ${data.service}</p>
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
        <li>Telefon: [DOPLNIT TELEFON]</li>
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
