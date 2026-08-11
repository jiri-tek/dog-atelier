// Combined Admin Data API - single endpoint for all admin data
// Reduces multiple API calls to one for faster loading
const crypto = require('crypto');

// Token verification
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Cache header - stale-while-revalidate pattern
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
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

    const adminScriptUrl = process.env.ADMIN_APPS_SCRIPT_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminScriptUrl) {
        return res.status(500).json({ success: false, message: 'Admin API not configured' });
    }

    try {
        // Parse which data to fetch (default: all)
        const include = req.query.include ? req.query.include.split(',') : ['reservations', 'closedDays', 'gallery'];
        const month = req.query.month; // For closed days month view

        // Build parallel fetch promises
        const fetches = {};

        if (include.includes('reservations')) {
            fetches.reservations = fetch(`${adminScriptUrl}?action=getReservationsFromCalendar&apiKey=${adminApiKey}`)
                .then(r => r.json())
                .catch(e => ({ success: false, error: e.message }));
        }

        if (include.includes('closedDays')) {
            // Fetch both closed days list and month days in parallel
            fetches.closedDays = fetch(`${adminScriptUrl}?action=getClosedDays&apiKey=${adminApiKey}`)
                .then(r => r.json())
                .catch(e => ({ success: false, error: e.message }));

            if (month) {
                fetches.monthDays = fetch(`${adminScriptUrl}?action=getDaysForMonth&month=${month}&apiKey=${adminApiKey}`)
                    .then(r => r.json())
                    .catch(e => ({ success: false, error: e.message }));
            }
        }

        if (include.includes('gallery')) {
            fetches.gallery = fetch(`${adminScriptUrl}?action=getGallery&apiKey=${adminApiKey}`)
                .then(r => r.json())
                .catch(e => ({ success: false, error: e.message }));
        }

        // Wait for all fetches in parallel
        const keys = Object.keys(fetches);
        const results = await Promise.all(Object.values(fetches));

        // Build response
        const response = {
            success: true,
            timestamp: Date.now()
        };

        keys.forEach((key, index) => {
            response[key] = results[index];
        });

        return res.status(200).json(response);

    } catch (error) {
        console.error('Admin Data API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch admin data'
        });
    }
};
