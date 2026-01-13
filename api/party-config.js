import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const configPath = path.join(process.cwd(), 'data/party_config.json');

    if (fs.existsSync(configPath)) {
        try {
            res.status(200).json(JSON.parse(fs.readFileSync(configPath, 'utf-8')));
        } catch (err) {
            console.error('Party config error:', err.message);
            res.status(500).json({ error: 'Failed to read config' });
        }
    } else {
        res.status(200).json({});
    }
}
