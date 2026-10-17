import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react(), {name:'dev-policy',apply:'serve',transformIndexHtml:html=>html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*\/>/,'')}], publicDir:'Public', base:process.env.BASE_PATH || '/', build:{outDir:'Dist',chunkSizeWarningLimit:1100} });
