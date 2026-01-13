import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data/processed');

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
        const historyList = [];
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'party_config.json');

        files.forEach(file => {
            const filePath = path.join(DATA_DIR, file);
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

        res.status(200).json(historyList);
    } catch (err) {
        console.error('History API error:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
}
