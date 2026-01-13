import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data/processed');

// SECURITY: Sanitize election ID
const sanitizeId = (id) => {
    if (!id || typeof id !== 'string') return null;
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized !== id || sanitized.length > 50) return null;
    return sanitized;
};

// SECURITY: Validate file path
const isPathSafe = (filePath) => {
    const resolved = path.resolve(filePath);
    const dataDir = path.resolve(DATA_DIR);
    return resolved.startsWith(dataDir + path.sep);
};

export default function handler(req, res) {
    // Security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const { id } = req.query;

    const safeId = sanitizeId(id);
    if (!safeId) {
        return res.status(400).json({ error: 'Invalid election ID' });
    }

    const filePath = path.join(DATA_DIR, `${safeId}.json`);

    if (!isPathSafe(filePath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Election not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.status(200).json(data);
    } catch (err) {
        console.error('Results API error:', err.message);
        res.status(500).json({ error: 'Failed to read election data' });
    }
}
