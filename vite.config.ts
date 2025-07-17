// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default async () => {
  const plugins = [react(), runtimeErrorOverlay()];

  // Optional Replit plugin (only in dev mode on Replit)
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
  ) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
  }

  return defineConfig({
    root: path.join(__dirname, "client"),
    plugins,
    resolve: {
      alias: {
        "@": path.join(__dirname, "client", "src"),
        "@shared": path.join(__dirname, "shared"),
        "@assets": path.join(__dirname, "attached_assets"),
      },
    },
    build: {
      outDir: path.join(__dirname, "dist", "public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  });
};