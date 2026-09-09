import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 親ディレクトリ（リポジトリ直下の別アプリ）の postcss.config.mjs を
  // 拾わないよう、このアプリ用の空設定を明示する
  css: { postcss: {} },
  base: "./",
  server: { host: true, port: 5173 },
});
