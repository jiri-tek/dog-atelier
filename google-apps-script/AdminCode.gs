/**
 * DogAtelier Admin Backend
 *
 * IMPORTANT: This is a SEPARATE Apps Script from the main reservation system.
 * Deploy this as a new Web App with different URL.
 *
 * Setup:
 * 1. Create new Google Apps Script project
 * 2. Copy this code
 * 3. Set ADMIN_API_KEY in Script Properties
 * 4. Deploy as Web App (Anyone can access)
 * 5. Copy the Web App URL to Vercel env: ADMIN_APPS_SCRIPT_URL
 */

// ============ CONFIGURATION ============
const CONFIG = {
  SHEET_ID: '1wZ6okwr54P6OveK3kJWGVYXmNdYHzn2X1k8_roP6Nr4', // Same sheet as main system
  CALENDAR_ID: 'dogatelierostrava@gmail.com',
  ADMIN_EMAILS: ['dogatelierostrava@gmail.com', 'staffa.ppc@gmail.com'],
  RESERVATIONS_SHEET: 'List 1',
  GALLERY_SHEET: 'Galerie'
};

// ============ API KEY VERIFICATION ============
function verifyApiKey(apiKey) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const validKey = scriptProperties.getProperty('ADMIN_API_KEY');
  return apiKey === validKey;
}

// ============ MAIN HANDLERS ============
function doGet(e) {
  const apiKey = e.parameter.apiKey;
  const action = e.parameter.action;

  // Set CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!verifyApiKey(apiKey)) {
    return output.setContent(JSON.stringify({
      success: false,
      message: 'Invalid API key'
    }));
  }

  try {
    switch (action) {
      case 'getReservations':
        return output.setContent(JSON.stringify(getReservations()));
      case 'getGallery':
        return output.setContent(JSON.stringify(getGallery()));
      case 'getClosedDays':
        return output.setContent(JSON.stringify(getClosedDays()));
      case 'getDaysForMonth':
        return output.setContent(JSON.stringify(getAllDaysForMonth(e.parameter.month)));
      default:
        return output.setContent(JSON.stringify({
          success: false,
          message: 'Unknown action'
        }));
    }
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      message: error.toString()
    }));
  }
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);
    const apiKey = data.apiKey;
    const action = data.action;

    if (!verifyApiKey(apiKey)) {
      return output.setContent(JSON.stringify({
        success: false,
        message: 'Invalid API key'
      }));
    }

    switch (action) {
      case 'addReservation':
        return output.setContent(JSON.stringify(addReservation(data)));
      case 'updateReservation':
        return output.setContent(JSON.stringify(updateReservation(data)));
      case 'cancelReservation':
        return output.setContent(JSON.stringify(cancelReservation(data.eventId)));
      case 'addGalleryImage':
        return output.setContent(JSON.stringify(addGalleryImage(data.url, data.alt, data.publicId)));
      case 'deleteGalleryImage':
        return output.setContent(JSON.stringify(deleteGalleryImage(data.imageId)));
      case 'setClosedDay':
        return output.setContent(JSON.stringify(setClosedDay(data.date, data.isFullDay, data.closedHours)));
      default:
        return output.setContent(JSON.stringify({
          success: false,
          message: 'Unknown action'
        }));
    }
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      message: error.toString()
    }));
  }
}

// ============ RESERVATIONS ============
function getReservations() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESERVATIONS_SHEET);

  if (!sheet) {
    return { success: false, message: 'Rezervace sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const reservations = [];

  // Find column indices
  const cols = {
    timestamp: headers.indexOf('Timestamp') !== -1 ? headers.indexOf('Timestamp') : 0,
    firstName: headers.indexOf('Jméno') !== -1 ? headers.indexOf('Jméno') : headers.indexOf('Jmeno'),
    lastName: headers.indexOf('Příjmení') !== -1 ? headers.indexOf('Příjmení') : headers.indexOf('Prijmeni'),
    email: headers.indexOf('Email'),
    phone: headers.indexOf('Telefon'),
    date: headers.indexOf('Datum'),
    time: headers.indexOf('Čas') !== -1 ? headers.indexOf('Čas') : headers.indexOf('Cas'),
    service: headers.indexOf('Služba') !== -1 ? headers.indexOf('Služba') : headers.indexOf('Sluzba'),
    breed: headers.indexOf('Plemeno'),
    notes: headers.indexOf('Poznámky') !== -1 ? headers.indexOf('Poznámky') : headers.indexOf('Poznamky'),
    eventId: headers.indexOf('Event ID'),
    status: headers.indexOf('Status')
  };

  // Process rows (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row[cols.firstName] && !row[cols.lastName]) continue;

    const reservation = {
      rowIndex: i + 1, // 1-indexed for sheet operations
      timestamp: row[cols.timestamp],
      firstName: row[cols.firstName] || '',
      lastName: row[cols.lastName] || '',
      email: row[cols.email] || '',
      phone: row[cols.phone] || '',
      date: formatDate(row[cols.date]),
      time: formatTime(row[cols.time]),
      service: row[cols.service] || '',
      breed: row[cols.breed] || '',
      notes: row[cols.notes] || '',
      eventId: row[cols.eventId] || '',
      status: row[cols.status] || 'active'
    };

    // Create datetime for sorting using Czech date parser
    const parsedDate = parseCzechDate(row[cols.date], reservation.time);
    if (parsedDate) {
      reservation.parsedDate = parsedDate;
      reservation.datetime = parsedDate.toISOString();
      reservation.displayDate = formatDisplayDate(row[cols.date]);
    }

    reservations.push(reservation);
  }

  // Sort by date and filter upcoming
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const upcoming = reservations
    .filter(r => {
      if (!r.parsedDate) return false;
      return r.parsedDate >= yesterday; // Include today and future
    })
    .sort((a, b) => a.parsedDate - b.parsedDate);

  return {
    success: true,
    reservations: upcoming,
    total: reservations.length
  };
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date.getFullYear === 'function') {
    return Utilities.formatDate(date, 'Europe/Prague', 'yyyy-MM-dd');
  }
  // Parse Czech date format (d.M.yyyy or dd.MM.yyyy)
  const str = date.toString();
  const parts = str.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return str;
}

function formatDisplayDate(date) {
  if (!date) return '';
  if (typeof date.getFullYear === 'function') {
    return Utilities.formatDate(date, 'Europe/Prague', 'd.M.yyyy');
  }
  return date.toString();
}

function formatTime(time) {
  if (!time) return '';
  if (typeof time.getHours === 'function') {
    return Utilities.formatDate(time, 'Europe/Prague', 'HH:mm');
  }
  return time.toString();
}

function parseCzechDate(dateStr, timeStr) {
  if (!dateStr) return null;

  let year, month, day;

  if (typeof dateStr.getFullYear === 'function') {
    year = dateStr.getFullYear();
    month = dateStr.getMonth();
    day = dateStr.getDate();
  } else {
    const parts = dateStr.toString().split('.');
    if (parts.length !== 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    year = parseInt(parts[2], 10);
  }

  let hours = 0, minutes = 0;
  if (timeStr) {
    const timeParts = timeStr.toString().split(':');
    hours = parseInt(timeParts[0], 10) || 0;
    minutes = parseInt(timeParts[1], 10) || 0;
  }

  return new Date(year, month, day, hours, minutes);
}

function addReservation(data) {
  const { firstName, lastName, email, phone, date, time, service, breed, notes } = data;

  if (!firstName || !lastName || !email || !date || !time || !service) {
    return { success: false, message: 'Chybi povinne udaje' };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESERVATIONS_SHEET);

  if (!sheet) {
    return { success: false, message: 'Sheet nenalezen' };
  }

  try {
    // Parse date (expects YYYY-MM-DD format from form)
    const dateParts = date.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10) || 0;

    const startDate = new Date(year, month, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    // Create calendar event
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    let eventId = '';

    if (calendar) {
      const event = calendar.createEvent(
        `${service} - ${firstName} ${lastName}`,
        startDate,
        endDate,
        {
          description: `Telefon: ${phone}\nEmail: ${email}\nPlemeno: ${breed || 'Neuvedeno'}\nPoznamky: ${notes || ''}`
        }
      );
      eventId = event.getId();
    }

    // Add row to sheet
    const timestamp = new Date();
    const czechDate = `${day}.${month + 1}.${year}`;

    sheet.appendRow([
      timestamp,
      firstName,
      lastName,
      email,
      phone,
      czechDate,
      time,
      service,
      eventId,
      breed || '',
      notes || ''
    ]);

    return { success: true, message: 'Rezervace vytvorena', eventId: eventId };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateReservation(data) {
  const { eventId, firstName, lastName, email, phone, date, time, service, breed, notes } = data;

  if (!eventId) {
    return { success: false, message: 'Chybi eventId' };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESERVATIONS_SHEET);
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];

  const eventIdCol = headers.indexOf('Event ID');

  // Find the row
  let rowIndex = -1;
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][eventIdCol] === eventId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: 'Rezervace nenalezena' };
  }

  try {
    // Update sheet cells
    const cols = {
      firstName: headers.indexOf('Jméno') !== -1 ? headers.indexOf('Jméno') : headers.indexOf('Jmeno'),
      lastName: headers.indexOf('Příjmení') !== -1 ? headers.indexOf('Příjmení') : headers.indexOf('Prijmeni'),
      email: headers.indexOf('Email'),
      phone: headers.indexOf('Telefon'),
      date: headers.indexOf('Datum'),
      time: headers.indexOf('Čas') !== -1 ? headers.indexOf('Čas') : headers.indexOf('Cas'),
      service: headers.indexOf('Služba') !== -1 ? headers.indexOf('Služba') : headers.indexOf('Sluzba'),
      breed: headers.indexOf('Plemeno'),
      notes: headers.indexOf('Poznámky') !== -1 ? headers.indexOf('Poznámky') : headers.indexOf('Poznamky')
    };

    // Parse date
    const dateParts = date.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    const czechDate = `${day}.${month}.${year}`;

    // Update cells
    if (firstName && cols.firstName >= 0) sheet.getRange(rowIndex, cols.firstName + 1).setValue(firstName);
    if (lastName && cols.lastName >= 0) sheet.getRange(rowIndex, cols.lastName + 1).setValue(lastName);
    if (email && cols.email >= 0) sheet.getRange(rowIndex, cols.email + 1).setValue(email);
    if (phone && cols.phone >= 0) sheet.getRange(rowIndex, cols.phone + 1).setValue(phone);
    if (date && cols.date >= 0) sheet.getRange(rowIndex, cols.date + 1).setValue(czechDate);
    if (time && cols.time >= 0) sheet.getRange(rowIndex, cols.time + 1).setValue(time);
    if (service && cols.service >= 0) sheet.getRange(rowIndex, cols.service + 1).setValue(service);
    if (cols.breed >= 0) sheet.getRange(rowIndex, cols.breed + 1).setValue(breed || '');
    if (cols.notes >= 0) sheet.getRange(rowIndex, cols.notes + 1).setValue(notes || '');

    // Update calendar event
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (calendar && eventId) {
      try {
        const event = calendar.getEventById(eventId);
        if (event) {
          const timeParts = time.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10) || 0;

          const startDate = new Date(year, month - 1, day, hours, minutes);
          const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

          event.setTitle(`${service} - ${firstName} ${lastName}`);
          event.setTime(startDate, endDate);
          event.setDescription(`Telefon: ${phone}\nEmail: ${email}\nPlemeno: ${breed || 'Neuvedeno'}\nPoznamky: ${notes || ''}`);
        }
      } catch (e) {
        console.log('Calendar event update failed:', e);
      }
    }

    return { success: true, message: 'Rezervace aktualizovana' };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function cancelReservation(eventId) {
  if (!eventId) {
    return { success: false, message: 'Missing eventId' };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.RESERVATIONS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const eventIdCol = headers.indexOf('Event ID');
  const statusCol = headers.indexOf('Status');

  // Find the reservation
  let rowIndex = -1;
  let reservation = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][eventIdCol] === eventId) {
      rowIndex = i + 1;
      reservation = {
        firstName: data[i][headers.indexOf('Jméno') !== -1 ? headers.indexOf('Jméno') : headers.indexOf('Jmeno')],
        lastName: data[i][headers.indexOf('Příjmení') !== -1 ? headers.indexOf('Příjmení') : headers.indexOf('Prijmeni')],
        email: data[i][headers.indexOf('Email')],
        date: data[i][headers.indexOf('Datum')],
        time: data[i][headers.indexOf('Čas') !== -1 ? headers.indexOf('Čas') : headers.indexOf('Cas')],
        service: data[i][headers.indexOf('Služba') !== -1 ? headers.indexOf('Služba') : headers.indexOf('Sluzba')]
      };
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: 'Reservation not found' };
  }

  try {
    // Delete calendar event
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (calendar) {
      try {
        const event = calendar.getEventById(eventId);
        if (event) {
          event.deleteEvent();
        }
      } catch (e) {
        // Event might already be deleted
        console.log('Calendar event not found or already deleted:', e);
      }
    }

    // Update status in sheet
    if (statusCol !== -1) {
      sheet.getRange(rowIndex, statusCol + 1).setValue('cancelled');
    } else {
      // Add status column if it doesn't exist
      const lastCol = headers.length + 1;
      sheet.getRange(1, lastCol).setValue('Status');
      sheet.getRange(rowIndex, lastCol).setValue('cancelled');
    }

    // Send cancellation email to customer
    if (reservation && reservation.email) {
      sendCancellationEmail(reservation);
    }

    return { success: true, message: 'Reservation cancelled' };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function sendCancellationEmail(reservation) {
  const subject = 'Zrušení rezervace - DogAtelier';

  const formattedDate = reservation.date instanceof Date
    ? Utilities.formatDate(reservation.date, 'Europe/Prague', 'd.M.yyyy')
    : reservation.date;

  const body = `
Dobrý den ${reservation.firstName},

Vaše rezervace v DogAtelier byla zrušena.

Původní termín:
- Datum: ${formattedDate}
- Čas: ${reservation.time}
- Služba: ${reservation.service}

Pokud si přejete sjednat nový termín, navštivte prosím náš web:
https://dogatelier.cz

S pozdravem,
Tým DogAtelier

--
DogAtelier
Dr. Martínka 1166/69
Ostrava-Hrabůvka
Tel: +420 736 477 981
`;

  try {
    MailApp.sendEmail({
      to: reservation.email,
      subject: subject,
      body: body,
      name: 'DogAtelier'
    });
  } catch (e) {
    console.log('Failed to send cancellation email:', e);
  }
}

// ============ CLOSED DAYS ============
function getClosedDays() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const closedSheet = spreadsheet.getSheetByName('Zavřeno');

  if (!closedSheet) {
    return { success: false, message: 'Sheet Zavřeno nenalezen' };
  }

  const data = closedSheet.getDataRange().getValues();
  const headers = data[0];

  // Get time slot headers (columns from index 3 onwards)
  const timeSlots = [];
  for (let c = 3; c < headers.length; c++) {
    const headerVal = headers[c];
    let hour;
    if (typeof headerVal.getHours === 'function') {
      hour = headerVal.getHours();
    } else {
      hour = parseInt(headerVal.toString().split(':')[0]);
    }
    if (!isNaN(hour)) {
      timeSlots.push({ col: c, hour: hour, label: hour + ':00' });
    }
  }

  const closedDays = [];

  // Parse each row (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateValue = row[0];

    if (!dateValue) continue;

    // Parse date
    let dateStr;
    if (typeof dateValue.getFullYear === 'function') {
      dateStr = Utilities.formatDate(dateValue, 'Europe/Prague', 'd.M.yyyy');
    } else {
      dateStr = dateValue.toString();
    }

    const dayName = row[1] || '';
    const isFullDay = row[2] === true;

    // Get closed time slots
    const closedHours = [];
    for (const slot of timeSlots) {
      if (row[slot.col] === true) {
        closedHours.push(slot.hour);
      }
    }

    // Only include if something is closed
    if (isFullDay || closedHours.length > 0) {
      closedDays.push({
        rowIndex: i + 1,
        date: dateStr,
        dayName: dayName,
        isFullDay: isFullDay,
        closedHours: closedHours
      });
    }
  }

  return {
    success: true,
    closedDays: closedDays,
    timeSlots: timeSlots.map(s => s.label)
  };
}

function getAllDaysForMonth(yearMonth) {
  // yearMonth format: "2026-08"
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const closedSheet = spreadsheet.getSheetByName('Zavřeno');

  if (!closedSheet) {
    return { success: false, message: 'Sheet Zavřeno nenalezen' };
  }

  const data = closedSheet.getDataRange().getValues();
  const headers = data[0];

  // Get time slot headers
  const timeSlots = [];
  for (let c = 3; c < headers.length; c++) {
    const headerVal = headers[c];
    let hour;
    if (typeof headerVal.getHours === 'function') {
      hour = headerVal.getHours();
    } else {
      hour = parseInt(headerVal.toString().split(':')[0]);
    }
    if (!isNaN(hour)) {
      timeSlots.push({ col: c, hour: hour, label: hour + ':00' });
    }
  }

  const [targetYear, targetMonth] = yearMonth.split('-').map(Number);
  const days = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const dateValue = row[0];

    if (!dateValue) continue;

    let date;
    if (typeof dateValue.getFullYear === 'function') {
      date = dateValue;
    } else {
      const parts = dateValue.toString().split('.');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        continue;
      }
    }

    // Filter by month
    if (date.getFullYear() !== targetYear || (date.getMonth() + 1) !== targetMonth) {
      continue;
    }

    const dateStr = Utilities.formatDate(date, 'Europe/Prague', 'd.M.yyyy');
    const isFullDay = row[2] === true;

    const closedHours = [];
    for (const slot of timeSlots) {
      if (row[slot.col] === true) {
        closedHours.push(slot.hour);
      }
    }

    days.push({
      rowIndex: i + 1,
      date: dateStr,
      dayName: row[1] || '',
      day: date.getDate(),
      isFullDay: isFullDay,
      closedHours: closedHours
    });
  }

  return {
    success: true,
    days: days,
    timeSlots: timeSlots.map(s => s.label)
  };
}

function setClosedDay(dateStr, isFullDay, closedHours) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const closedSheet = spreadsheet.getSheetByName('Zavřeno');

  if (!closedSheet) {
    return { success: false, message: 'Sheet Zavřeno nenalezen' };
  }

  const data = closedSheet.getDataRange().getValues();
  const headers = data[0];

  // Find the row for this date
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const dateValue = data[i][0];
    let currentDate;

    if (typeof dateValue.getFullYear === 'function') {
      currentDate = Utilities.formatDate(dateValue, 'Europe/Prague', 'd.M.yyyy');
    } else {
      currentDate = dateValue.toString();
    }

    if (currentDate === dateStr) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: 'Datum nenalezeno v listu Zavřeno' };
  }

  try {
    // Set full day checkbox (column C = 3)
    closedSheet.getRange(rowIndex, 3).setValue(isFullDay === true);

    // Get time slot columns
    const timeSlots = [];
    for (let c = 3; c < headers.length; c++) {
      const headerVal = headers[c];
      let hour;
      if (typeof headerVal.getHours === 'function') {
        hour = headerVal.getHours();
      } else {
        hour = parseInt(headerVal.toString().split(':')[0]);
      }
      if (!isNaN(hour)) {
        timeSlots.push({ col: c + 1, hour: hour }); // +1 for 1-indexed
      }
    }

    // Set time slot checkboxes
    for (const slot of timeSlots) {
      const isChecked = closedHours && closedHours.includes(slot.hour);
      closedSheet.getRange(rowIndex, slot.col).setValue(isChecked === true);
    }

    return { success: true, message: 'Uloženo' };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============ GALLERY ============
function setupGallerySheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.GALLERY_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.GALLERY_SHEET);
    sheet.getRange('A1:D1').setValues([['ID', 'URL', 'Alt', 'Public ID']]);
    sheet.getRange('A1:D1').setFontWeight('bold');
  }

  return sheet;
}

function getGallery() {
  let sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.GALLERY_SHEET);

  if (!sheet) {
    sheet = setupGallerySheet();
    return { success: true, images: [] };
  }

  const data = sheet.getDataRange().getValues();
  const images = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) { // Has URL
      images.push({
        id: data[i][0] || `img-${i}`,
        url: data[i][1],
        alt: data[i][2] || '',
        publicId: data[i][3] || ''
      });
    }
  }

  return { success: true, images: images };
}

function addGalleryImage(url, alt, publicId) {
  if (!url) {
    return { success: false, message: 'Missing URL' };
  }

  let sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.GALLERY_SHEET);

  if (!sheet) {
    sheet = setupGallerySheet();
  }

  const id = `img-${Date.now()}`;
  sheet.appendRow([id, url, alt || '', publicId || '']);

  return { success: true, id: id, message: 'Image added' };
}

function deleteGalleryImage(imageId) {
  if (!imageId) {
    return { success: false, message: 'Missing imageId' };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.GALLERY_SHEET);

  if (!sheet) {
    return { success: false, message: 'Gallery sheet not found' };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === imageId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Image deleted' };
    }
  }

  return { success: false, message: 'Image not found' };
}

// ============ SETUP FUNCTIONS ============
function initialSetup() {
  // Set up API key
  const scriptProperties = PropertiesService.getScriptProperties();

  // Generate a random API key if not set
  if (!scriptProperties.getProperty('ADMIN_API_KEY')) {
    const apiKey = Utilities.getUuid();
    scriptProperties.setProperty('ADMIN_API_KEY', apiKey);
    Logger.log('Generated ADMIN_API_KEY: ' + apiKey);
    Logger.log('Copy this key to your Vercel environment variables!');
  } else {
    Logger.log('ADMIN_API_KEY already set: ' + scriptProperties.getProperty('ADMIN_API_KEY'));
  }

  // Set up Gallery sheet
  setupGallerySheet();

  Logger.log('Setup complete!');
}
