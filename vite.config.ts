import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    reportCompressedSize: false,
  },
  server: {
    port: 4000,
  },
});
