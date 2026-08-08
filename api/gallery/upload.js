// Gallery Upload API - handles direct image uploads
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
        return res.status(500).json({
            success: false,
            message: 'Admin API not configured'
        });
    }

    try {
        const { base64Data, fileName, mimeType, alt } = req.body || {};

        if (!base64Data || !fileName || !mimeType) {
            return res.status(400).json({ success: false, message: 'Missing image data' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(mimeType)) {
            return res.status(400).json({ success: false, message: 'Invalid file type. Allowed: JPG, PNG, WebP, GIF' });
        }

        // Check file size (base64 is ~33% larger than binary)
        // Limit to ~5MB original = ~6.7MB base64
        if (base64Data.length > 7000000) {
            return res.status(400).json({ success: false, message: 'File too large. Maximum 5MB' });
        }

        const response = await fetch(adminScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadGalleryImage',
                apiKey: adminApiKey,
                base64Data,
                fileName,
                mimeType,
                alt: alt || ''
            })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Gallery Upload API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
};
