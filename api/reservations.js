// Reservations API - communicates with Google Apps Script for admin functions
const crypto = require('crypto');

// Token verification (same as in auth.js)
function verifyToken(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSignature) return null;

        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return decoded;
    } catch (e) {
        return null;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Apps Script Admin URL
    const adminScriptUrl = process.env.ADMIN_APPS_SCRIPT_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminScriptUrl) {
        return res.status(500).json({
            success: false,
            message: 'Admin API not configured. Set ADMIN_APPS_SCRIPT_URL in environment variables.'
        });
    }

    try {
        // GET - List reservations (from calendar for real-time data)
        if (req.method === 'GET') {
            const source = req.query.source || 'calendar';
            const action = source === 'sheet' ? 'getReservations' : 'getReservationsFromCalendar';

            const response = await fetch(`${adminScriptUrl}?action=${action}&apiKey=${adminApiKey}`);
            const data = await response.json();

            return res.status(200).json(data);
        }

        // POST - Add new reservation
        if (req.method === 'POST') {
            const { firstName, lastName, email, phone, date, time, service, breed, notes } = req.body || {};

            if (!firstName || !lastName || !email || !date || !time || !service) {
                return res.status(400).json({ success: false, message: 'Chybi povinne udaje' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addReservation',
                    apiKey: adminApiKey,
                    firstName, lastName, email, phone, date, time, service, breed, notes
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        // PUT - Update reservation
        if (req.method === 'PUT') {
            const { eventId, firstName, lastName, email, phone, date, time, service, breed, notes } = req.body || {};

            if (!eventId) {
                return res.status(400).json({ success: false, message: 'Chybi eventId' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateReservation',
                    apiKey: adminApiKey,
                    eventId, firstName, lastName, email, phone, date, time, service, breed, notes
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        // DELETE - Cancel reservation
        if (req.method === 'DELETE') {
            const { eventId } = req.body || {};

            if (!eventId) {
                return res.status(400).json({ success: false, message: 'Missing eventId' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancelReservation',
                    apiKey: adminApiKey,
                    eventId
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to communicate with backend'
        });
    }
};
