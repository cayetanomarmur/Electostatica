import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

const DATA_DIR = path.join(__dirname, '../data/processed');

// Helper to ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// SECURITY: Sanitize election ID to prevent path traversal attacks
const sanitizeId = (id) => {
    if (!id || typeof id !== 'string') return null;
    // Only allow alphanumeric, underscores, and hyphens
    // Block any path traversal attempts (../, ..\, etc.)
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized !== id) return null; // Reject if sanitization changed the input
    if (sanitized.length > 50) return null; // Limit length
    return sanitized;
};

// SECURITY: Validate file path is within DATA_DIR
const isPathSafe = (filePath) => {
    const resolved = path.resolve(filePath);
    const dataDir = path.resolve(DATA_DIR);
    return resolved.startsWith(dataDir + path.sep);
};

// Security headers middleware
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    // Disable caching for API responses
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.get('/api/elections', (req, res) => {
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
        res.json(elections);
    } catch (err) {
        console.error('Elections API error:', err.message);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.get('/api/results/:id', (req, res) => {
    // SECURITY: Sanitize the ID parameter
    const safeId = sanitizeId(req.params.id);
    if (!safeId) {
        return res.status(400).json({ error: 'Invalid election ID' });
    }

    const filePath = path.join(DATA_DIR, `${safeId}.json`);

    // SECURITY: Double-check path is within allowed directory
    if (!isPathSafe(filePath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Election not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(data);
    } catch (err) {
        console.error('Results API error:', err.message);
        res.status(500).json({ error: 'Failed to read election data' });
    }
});

app.get('/api/history', (req, res) => {
    try {
        const historyList = [];
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'party_config.json');

        files.forEach(file => {
            const filePath = path.join(DATA_DIR, file);

            // SECURITY: Verify path before reading
            if (!isPathSafe(filePath)) return;

            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                const year = parseInt(data.metadata?.year) || 0;
                const fileParts = file.replace('.json', '').split('_');
                const type = fileParts[0];
                const monthStr = fileParts.length >= 3 ? fileParts[2] : '06';
                const month = parseInt(monthStr) || 6;

                Object.entries(data.summary || {}).forEach(([code, summary]) => {
                    const siglas = data.candidacies?.[code]?.siglas || code;

                    historyList.push({
                        year,
                        month,
                        electionType: type,
                        party: siglas,
                        votes: summary.votes || 0,
                        seats: summary.seats || 0
                    });
                });
            } catch (parseErr) {
                console.error(`Error parsing ${file}:`, parseErr.message);
            }
        });

        historyList.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        res.json(historyList);
    } catch (err) {
        console.error('History API error:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/api/party-config', (req, res) => {
    const configPath = path.join(__dirname, '../data/party_config.json');

    // SECURITY: Verify path
    const resolvedPath = path.resolve(configPath);
    const expectedDir = path.resolve(path.join(__dirname, '../data'));

    if (!resolvedPath.startsWith(expectedDir + path.sep)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (fs.existsSync(configPath)) {
        try {
            res.json(JSON.parse(fs.readFileSync(configPath, 'utf-8')));
        } catch (err) {
            console.error('Party config error:', err.message);
            res.status(500).json({ error: 'Failed to read config' });
        }
    } else {
        res.json({});
    }
});

// SECURITY: Catch-all for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// SECURITY: Global error handler (don't expose stack traces)
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
