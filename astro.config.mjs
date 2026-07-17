import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import starlight from "@astrojs/starlight";

export default defineConfig({
  outDir: "./astroDist",
  publicDir: './src/data',
  build: { format: 'file' },
  integrations: [
    react(),
    starlight({
      title: 'Bitshares Astro UI Docs',
      sidebar: [
        { label: 'Overview', slug: 'docs/docs-index' },
      ]
    })
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});