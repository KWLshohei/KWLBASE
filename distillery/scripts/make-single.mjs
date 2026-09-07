/**
 * dist-single/ のビルド結果を 1 枚の HTML にまとめる。
 *
 *   node scripts/make-single.mjs            → dist-single/kwlbase.html（単体で開ける完全な HTML）
 *   node scripts/make-single.mjs --fragment → dist-single/kwlbase.fragment.html
 *     （<html>/<head>/<body> を持たない断片。ホスティング先が外枠を用意する場合に使う）
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "dist-single";
const fragment = process.argv.includes("--fragment");

const files = readdirSync(OUT_DIR);
const jsName = files.find((f) => f.endsWith(".js"));
const cssName = files.find((f) => f.endsWith(".css"));
if (!jsName) throw new Error("dist-single にバンドルが見つかりません。先に vite build を実行してください。");

const js = readFileSync(join(OUT_DIR, jsName), "utf8");
const css = cssName ? readFileSync(join(OUT_DIR, cssName), "utf8") : "";

// </script> がバンドル文字列に現れても HTML が壊れないようにエスケープする
const safeJs = js.replaceAll("</script", "<\\/script");

const title = "KWLBASE 蒸留所ログ";

// favicon も data URI で埋め込み、外部リクエストを一切発生させない
let iconTag = "";
try {
  const svg = readFileSync(join("public", "favicon.svg"), "utf8");
  iconTag = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}" />`;
} catch {
  /* favicon が無くても構わない */
}
const head = `<style>\n${css}\n</style>`;
const body = `<div id="root"></div>\n<script>\n${safeJs}\n</script>`;

const html = fragment
  ? `<title>${title}</title>\n${head}\n${body}\n`
  : `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#14110d" />
<title>${title}</title>
${iconTag}
${head}
</head>
<body>
${body}
</body>
</html>
`;

const outFile = join(OUT_DIR, fragment ? "kwlbase.fragment.html" : "kwlbase.html");
writeFileSync(outFile, html);
console.log(`${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
