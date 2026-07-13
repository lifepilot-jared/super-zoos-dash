import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isProduction = process.env.NODE_ENV === "production";
const configuredBase = process.env.VITE_BASE_PATH;

export default defineConfig({
  plugins: [react()],
  base: configuredBase ?? (isProduction ? "/super-zoos-dash/" : "/"),
});
