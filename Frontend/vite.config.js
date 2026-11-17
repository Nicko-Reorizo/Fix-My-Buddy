import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModules = (name) =>
  fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));

function fixMyBuddyApiPlugin() {
  let apiAppPromise = null;

  async function getApiApp() {
    if (!apiAppPromise) {
      apiAppPromise = (async () => {
        // Resolve at runtime so Vite's config bundler does not pull Express/pg
        // into production builds, which install only frontend dependencies.
        const backendDirectory = path.resolve(__dirname, '../../Fix-My-Buddy-Backend');
        const envModuleUrl = pathToFileURL(path.join(backendDirectory, 'src/utils/env.js')).href;
        const serverModuleUrl = pathToFileURL(path.join(backendDirectory, 'src/server.js')).href;
        const { loadEnv } = await import(envModuleUrl);
        loadEnv(path.join(backendDirectory, '.env'));
        const { createApp } = await import(serverModuleUrl);
        return createApp();
      })();
    }
    return apiAppPromise;
  }

  return {
    name: 'fixmybuddy-api-middleware',
    apply: 'serve',
    async configureServer(server) {
      // Attach to Vite's HTTP server too, preserving the one-terminal dev setup.
      const backendDirectory = path.resolve(__dirname, '../../Fix-My-Buddy-Backend');
      const { loadEnv } = await import(pathToFileURL(path.join(backendDirectory, 'src/utils/env.js')).href);
      loadEnv(path.join(backendDirectory, '.env'));
      const { attachTrackingGateway } = await import(pathToFileURL(path.join(backendDirectory, 'src/ws/gateway.js')).href);
      attachTrackingGateway(server.httpServer);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (!req.url.startsWith('/api/') && req.url !== '/api')) {
          return next();
        }
        try {
          const app = await getApiApp();
          return app(req, res, next);
        } catch (error) {
          console.error('[Vite API Middleware Error]', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Backend initialization error.' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fixMyBuddyApiPlugin()],
  resolve: {
    // Keep a single copy of shared deps (original setup)
    alias: {
      'react/jsx-runtime': nodeModules('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': nodeModules('react/jsx-dev-runtime.js'),
      'react-router-dom': nodeModules('react-router-dom'),
      'lucide-react': nodeModules('lucide-react'),
      'leaflet': nodeModules('leaflet'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
