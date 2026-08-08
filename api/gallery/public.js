// Public Gallery API - no authentication required
// Used by the public website to display gallery images

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const adminScriptUrl = process.env.ADMIN_APPS_SCRIPT_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminScriptUrl) {
        return res.status(500).json({
            success: false,
            message: 'API not configured'
        });
    }

    try {
        const response = await fetch(`${adminScriptUrl}?action=getGallery&apiKey=${adminApiKey}`);
        const data = await response.json();

        if (data.success) {
            return res.status(200).json({
                success: true,
                images: data.images || []
            });
        } else {
            return res.status(200).json({
                success: true,
                images: []
            });
        }
    } catch (error) {
        console.error('Public Gallery API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to load gallery'
        });
    }
};
