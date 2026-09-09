import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 単一ファイル配布用のビルド設定。
 * 依存もデータも 1 つの JS にまとめ、scripts/make-single.mjs で HTML に埋め込む。
 */
export default defineConfig({
  plugins: [react()],
  // 親ディレクトリ（リポジトリ直下の別アプリ）の postcss.config.mjs を
  // 拾わないよう、このアプリ用の空設定を明示する
  css: { postcss: {} },
  build: {
    outDir: "dist-single",
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "bundle.js",
        assetFileNames: "bundle.[ext]",
      },
    },
  },
});
