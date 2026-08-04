// Closed Days API - manages opening hours via Google Apps Script
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
            message: 'Admin API not configured'
        });
    }

    try {
        // GET - List closed days or get days for month
        if (req.method === 'GET') {
            const { month } = req.query;

            let url;
            if (month) {
                url = `${adminScriptUrl}?action=getDaysForMonth&month=${month}&apiKey=${adminApiKey}`;
            } else {
                url = `${adminScriptUrl}?action=getClosedDays&apiKey=${adminApiKey}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            return res.status(200).json(data);
        }

        // POST - Set closed day
        if (req.method === 'POST') {
            const { date, isFullDay, closedHours } = req.body || {};

            if (!date) {
                return res.status(400).json({ success: false, message: 'Chybí datum' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setClosedDay',
                    apiKey: adminApiKey,
                    date,
                    isFullDay: isFullDay || false,
                    closedHours: closedHours || []
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('Closed Days API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to communicate with backend'
        });
    }
};
