import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const nodeModules = name => fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react/jsx-runtime': nodeModules('react/jsx-runtime.js'),
      'react/jsx-dev-runtime': nodeModules('react/jsx-dev-runtime.js'),
      'react-router-dom': nodeModules('react-router-dom'),
      'lucide-react': nodeModules('lucide-react'),
      'leaflet': nodeModules('leaflet'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5174, strictPort: false },
});
