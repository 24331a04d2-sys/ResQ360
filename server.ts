import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processAiIncidentTriage } from './src/server/aiTriageHandler.ts';
import { reverseGeocodeServer, forwardGeocodeServer } from './src/server/geocodingHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// API endpoints
app.post('/api/analyze-incident', async (req, res) => {
  try {
    const result = await processAiIncidentTriage(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API /api/analyze-incident error:', error);
    res.status(500).json({ error: error?.message || 'Triage processing failed' });
  }
});

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }
  const address = await reverseGeocodeServer(lat, lon);
  res.json({ address });
});

app.get('/api/geocode', async (req, res) => {
  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    res.json({ results: [] });
    return;
  }
  const results = await forwardGeocodeServer(query);
  res.json({ results });
});

// Serve static frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`RESQ360 server running on port ${port}`);
});
