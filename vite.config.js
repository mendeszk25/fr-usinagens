import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        admin: "admin.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("three.core.js")) return "three-core";
          if (id.includes("node_modules/three")) return "three-renderer";
          if (id.includes("node_modules/gsap")) return "gsap";
        },
      },
    },
  },
});
