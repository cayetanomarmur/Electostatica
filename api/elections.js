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

    try {
        const files = fs.readdirSync(DATA_DIR);
        const elections = files.filter(f => f.endsWith('.json') && f !== 'party_config.json').map(f => {
            const id = f.replace('.json', '');
            const parts = id.split('_');
            const type = parts[0];
            const year = parts[1];
            const month = parts[2] || '';

            const months = {
                '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
                '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
                '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
            };
            const monthName = months[month] || month;
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            const displayName = monthName ? `${typeName} ${monthName} ${year}` : `${typeName} ${year}`;

            return { id, type, year, month, name: displayName };
        });
        res.status(200).json(elections);
    } catch (err) {
        console.error('Elections API error:', err.message);
        res.status(500).json({ error: 'Failed to read data' });
    }
}
