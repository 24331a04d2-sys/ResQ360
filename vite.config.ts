import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { processAiIncidentTriage } from './src/server/aiTriageHandler';
import { reverseGeocodeServer, forwardGeocodeServer } from './src/server/geocodingHandler';

function apiServerPlugin(): Plugin {
  return {
    name: 'resq360-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/analyze-incident' && req.method === 'POST') {
          try {
            let bodyStr = '';
            for await (const chunk of req) {
              bodyStr += chunk;
            }
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const result = await processAiIncidentTriage(body);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('[API Error] /api/analyze-incident:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Triage processing failed' }));
          }
          return;
        }

        if (url.pathname === '/api/reverse-geocode' && req.method === 'GET') {
          const lat = parseFloat(url.searchParams.get('lat') || '');
          const lon = parseFloat(url.searchParams.get('lon') || '');
          if (isNaN(lat) || isNaN(lon)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'lat and lon are required' }));
            return;
          }
          const address = await reverseGeocodeServer(lat, lon);
          res.statusCode = 200;
          res.end(JSON.stringify({ address }));
          return;
        }

        if (url.pathname === '/api/geocode' && req.method === 'GET') {
          const query = url.searchParams.get('q') || '';
          if (!query.trim()) {
            res.statusCode = 200;
            res.end(JSON.stringify({ results: [] }));
            return;
          }
          const results = await forwardGeocodeServer(query);
          res.statusCode = 200;
          res.end(JSON.stringify({ results }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
