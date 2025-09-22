// api/ping.js
const ALLOWED_ORIGINS = [
  'https://loan881.github.io', // ton GitHub Pages
  'http://localhost:3000',
  'http://localhost:5500'
];

export default function handler(req, res) {
  const origin = req.headers.origin || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : '*';

  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  res.status(200).json({ ok: true, now: Date.now() });
}
