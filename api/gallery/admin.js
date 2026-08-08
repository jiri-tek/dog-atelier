// Gallery API - manages images via Google Apps Script
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        // GET - List gallery images
        if (req.method === 'GET') {
            const response = await fetch(`${adminScriptUrl}?action=getGallery&apiKey=${adminApiKey}`);
            const data = await response.json();

            return res.status(200).json(data);
        }

        // POST - Add new image
        if (req.method === 'POST') {
            const { url, alt, publicId } = req.body || {};

            if (!url) {
                return res.status(400).json({ success: false, message: 'Missing image URL' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addGalleryImage',
                    apiKey: adminApiKey,
                    url,
                    alt: alt || '',
                    publicId: publicId || ''
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        // DELETE - Remove image
        if (req.method === 'DELETE') {
            const { imageId } = req.body || {};

            if (!imageId) {
                return res.status(400).json({ success: false, message: 'Missing imageId' });
            }

            const response = await fetch(adminScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteGalleryImage',
                    apiKey: adminApiKey,
                    imageId
                })
            });

            const data = await response.json();
            return res.status(200).json(data);
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });

    } catch (error) {
        console.error('Gallery API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to communicate with backend'
        });
    }
};
