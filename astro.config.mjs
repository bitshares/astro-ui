import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  outDir: "./astroDist",
  publicDir: './src/data',
  integrations: [
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});