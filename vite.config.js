import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'templates-server',
      configureServer(server) {
        const templatesDir = path.resolve(__dirname, 'templates');

        // Watch the templates folder for added/deleted/changed files
        if (fs.existsSync(templatesDir)) {
          server.watcher.add(templatesDir);
        }

        // 1. Serve raw CSV file content directly from root templates/ directory with zero caching
        server.middlewares.use('/api/templates/file', (req, res, next) => {
          const reqPath = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
          const filePath = path.resolve(templatesDir, reqPath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
          res.statusCode = 404;
          res.end('File not found');
        });

        // 2. API endpoint to list all available CSV templates directly from templates/ folder
        server.middlewares.use('/api/templates', (req, res, next) => {
          if (req.method === 'GET' && (req.url === '' || req.url === '/' || req.url.startsWith('/?'))) {
            if (fs.existsSync(templatesDir)) {
              try {
                const files = fs.readdirSync(templatesDir)
                  .filter(f => f.toLowerCase().endsWith('.csv'))
                  .map(f => {
                    const name = f.replace(/\.csv$/i, '');
                    return {
                      name,
                      fileName: f,
                      url: `/api/templates/file/${encodeURIComponent(f)}`
                    };
                  });
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.end(JSON.stringify(files));
                return;
              } catch (err) {
                console.error("Error reading templates folder:", err);
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
          }
          next();
        });

        // 3. Notify frontend when templates are added, modified, or removed
        server.watcher.on('all', (event, filePath) => {
          if (filePath && filePath.startsWith(templatesDir)) {
            server.ws.send({
              type: 'custom',
              event: 'templates-updated'
            });
          }
        });
      },
      // When building for production (e.g. gh-pages), copy templates/ into dist/ and create manifest.json.
      // templates/ is the only copy of the CSV templates kept in the repository.
      closeBundle() {
        try {
          const templatesDir = path.resolve(__dirname, 'templates');
          const distTemplatesDir = path.resolve(__dirname, 'dist', 'templates');
          if (fs.existsSync(templatesDir)) {
            fs.rmSync(distTemplatesDir, { recursive: true, force: true });
            fs.mkdirSync(distTemplatesDir, { recursive: true });
            fs.cpSync(templatesDir, distTemplatesDir, { recursive: true });

            const files = fs.readdirSync(templatesDir)
              .filter(f => f.toLowerCase().endsWith('.csv'))
              .map(f => {
                const name = f.replace(/\.csv$/i, '');
                return {
                  name,
                  fileName: f,
                  url: `./templates/${encodeURIComponent(f)}`
                };
              });
            fs.writeFileSync(path.resolve(distTemplatesDir, 'manifest.json'), JSON.stringify(files, null, 2));
          }
        } catch (e) {
          console.warn("Could not copy templates to dist:", e);
        }
      }
    }
  ],
  base: './',
})
