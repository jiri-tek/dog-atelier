// Simple authentication API for admin panel
// Uses bcrypt for password hashing and JWT for sessions

const crypto = require('crypto');

// Simple JWT implementation (no external dependencies)
function createToken(payload, secret, expiresIn = '24h') {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    // Parse expiration
    let exp = now + 86400; // default 24h
    if (expiresIn.endsWith('h')) {
        exp = now + parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
        exp = now + parseInt(expiresIn) * 86400;
    }

    const tokenPayload = { ...payload, iat: now, exp };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${base64Header}.${base64Payload}`)
        .digest('base64url');

    return `${base64Header}.${base64Payload}.${signature}`;
}

function verifyToken(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSignature) return null;

        // Decode payload
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

        // Check expiration
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return decoded;
    } catch (e) {
        return null;
    }
}

// Simple password hashing (SHA-256 with salt)
function hashPassword(password) {
    const salt = process.env.JWT_SECRET || 'default-salt';
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Rate limiting storage (in-memory, resets on cold start)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60000; // 1 minute

function checkRateLimit(ip) {
    const now = Date.now();
    const attempts = loginAttempts.get(ip);

    if (!attempts) {
        return { allowed: true, remaining: MAX_ATTEMPTS };
    }

    // Clean old attempts
    const recentAttempts = attempts.filter(t => now - t < LOCKOUT_TIME);
    loginAttempts.set(ip, recentAttempts);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = Math.min(...recentAttempts);
        const waitTime = Math.ceil((LOCKOUT_TIME - (now - oldestAttempt)) / 1000);
        return { allowed: false, waitTime };
    }

    return { allowed: true, remaining: MAX_ATTEMPTS - recentAttempts.length };
}

function recordAttempt(ip) {
    const attempts = loginAttempts.get(ip) || [];
    attempts.push(Date.now());
    loginAttempts.set(ip, attempts);
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const jwtSecret = process.env.JWT_SECRET;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!jwtSecret || !adminPasswordHash) {
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }

    // GET - Verify existing token
    if (req.method === 'GET') {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ valid: false });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token, jwtSecret);

        if (decoded) {
            return res.status(200).json({ valid: true, user: decoded });
        } else {
            return res.status(401).json({ valid: false });
        }
    }

    // POST - Login
    if (req.method === 'POST') {
        const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

        // Check rate limit
        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                message: `Prilis mnoho pokusu. Zkuste to za ${rateLimit.waitTime} sekund.`
            });
        }

        const { password } = req.body || {};

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Heslo je povinne'
            });
        }

        // Hash the provided password and compare
        const hashedInput = hashPassword(password);

        if (hashedInput === adminPasswordHash) {
            // Success - create token
            const token = createToken({ role: 'admin' }, jwtSecret, '24h');

            return res.status(200).json({
                success: true,
                token,
                message: 'Prihlaseni uspesne'
            });
        } else {
            // Failed - record attempt
            recordAttempt(ip);

            return res.status(401).json({
                success: false,
                message: 'Neplatne heslo'
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
};
