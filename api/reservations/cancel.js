// Cancel Reservation API - dedicated endpoint for cancellation
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
    console.log('Cancel API called:', req.method);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Cancel: Unauthorized - no token');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.log('Cancel: Server config error - no JWT_SECRET');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
        console.log('Cancel: Invalid token');
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Apps Script Admin URL
    const adminScriptUrl = process.env.ADMIN_APPS_SCRIPT_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminScriptUrl) {
        console.log('Cancel: Admin API not configured');
        return res.status(500).json({
            success: false,
            message: 'Admin API not configured'
        });
    }

    try {
        const { eventId } = req.body || {};
        console.log('Cancel: Received eventId:', eventId);

        if (!eventId) {
            console.log('Cancel: Missing eventId');
            return res.status(400).json({ success: false, message: 'Missing eventId' });
        }

        console.log('Cancel: Sending to Apps Script:', adminScriptUrl);

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
        console.log('Cancel: Apps Script response:', JSON.stringify(data));

        return res.status(200).json(data);

    } catch (error) {
        console.error('Cancel API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to communicate with backend: ' + error.message
        });
    }
};
