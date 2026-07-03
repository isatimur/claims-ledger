import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/claims-ledger/",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
