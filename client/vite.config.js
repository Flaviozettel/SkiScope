import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
      supported: {
          'top-level-await': true //browsers can handle top-level-await features
      },
  }
});
