import { CardInput, EXPERIENCE_MAP, FLAVOR_MAP, readableOn, SERVE_MAP } from "./taste";

export const CARD_W = 1080;
export const CARD_H = 1350;

const PAD = 76;
const INK = "#F6F1E7";
const AMBER = "#E7B24B";
const MUTED = "#A8998A";

type Ctx = CanvasRenderingContext2D;

function font(ctx: Ctx, weight: number, size: number, family: string, spacing = "0em") {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = spacing;
}

/** 日本語は単語境界がないため、幅を超えた位置で折る。行頭に来ない文字はぶら下げる。 */
function wrapLines(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  let truncated = false;

  for (const ch of text) {
    if (line === "" || ctx.measureText(line + ch).width <= maxW) {
      line += ch;
      continue;
    }
    if ("、。，．」』）｝〕】,.!?！？".includes(ch)) {
      line += ch;
      continue;
    }
    if (lines.length === maxLines - 1) {
      truncated = true;
      break;
    }
    lines.push(line);
    line = ch;
  }

  if (!truncated) {
    if (line) lines.push(line);
    return lines;
  }

  while (line.length > 1 && ctx.measureText(`${line}…`).width > maxW) line = line.slice(0, -1);
  lines.push(`${line}…`);
  return lines;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

type ChipStyle = { fill: string; text: string; border?: string };

function drawChips(
  ctx: Ctx,
  chips: { label: string; style: ChipStyle }[],
  x: number,
  y: number,
  maxW: number,
  family: string,
  draw: boolean,
): number {
  const size = 32;
  const h = 60;
  const padX = 26;
  const gap = 14;
  font(ctx, 700, size, family);
  ctx.textBaseline = "middle";

  let cx = x;
  let cy = y;
  let rows = 1;

  for (const chip of chips) {
    const w = ctx.measureText(chip.label).width + padX * 2;
    if (cx > x && cx + w > x + maxW) {
      cx = x;
      cy += h + gap;
      rows += 1;
    }
    if (draw) {
      ctx.fillStyle = chip.style.fill;
      roundRect(ctx, cx, cy, w, h, h / 2);
      ctx.fill();
      if (chip.style.border) {
        ctx.strokeStyle = chip.style.border;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = chip.style.text;
      font(ctx, 700, size, family);
      ctx.fillText(chip.label, cx + padX, cy + h / 2 + 1);
    }
    cx += w + gap;
  }

  return rows * h + (rows - 1) * gap;
}

function drawLabel(ctx: Ctx, text: string, x: number, y: number, family: string, draw: boolean): number {
  if (draw) {
    font(ctx, 700, 23, family, "0.2em");
    ctx.fillStyle = MUTED;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.letterSpacing = "0em";
  }
  return 23;
}

/** 本文ブロックを組む。draw=false のときは高さだけ返すので、下端揃えの計算に使える。 */
function layoutBody(ctx: Ctx, input: CardInput, startY: number, family: string, draw: boolean): number {
  const x = PAD;
  const maxW = CARD_W - PAD * 2;
  let y = startY;

  // ウイスキー歴のピル
  const exp = EXPERIENCE_MAP.get(input.experience);
  if (exp) {
    const label = `ウイスキー歴 ${exp.label}`;
    font(ctx, 700, 24, family, "0.08em");
    const w = ctx.measureText(label).width + 44;
    if (draw) {
      ctx.strokeStyle = "rgba(231,178,75,0.55)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, w, 48, 24);
      ctx.stroke();
      ctx.fillStyle = AMBER;
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + 22, y + 25);
      ctx.letterSpacing = "0em";
    }
    y += 48 + 26;
  }

  // ニックネーム
  const nickname = input.nickname || "名無しのラバーズ";
  const nameSize = nickname.length > 10 ? 62 : 82;
  font(ctx, 900, nameSize, family);
  const nameLines = wrapLines(ctx, nickname, maxW, 2);
  if (draw) {
    ctx.fillStyle = INK;
    ctx.textBaseline = "top";
    nameLines.forEach((line, i) => ctx.fillText(line, x, y + i * (nameSize * 1.16)));
  }
  y += nameLines.length * (nameSize * 1.16) + 40;

  // 好きな味
  y += drawLabel(ctx, "好きな味", x, y, family, draw) + 18;
  const likeChips =
    input.likes.length > 0
      ? input.likes.map((id) => {
          const f = FLAVOR_MAP.get(id)!;
          return { label: f.label, style: { fill: f.color, text: readableOn(f.color) } };
        })
      : [{ label: "これから探します", style: { fill: "rgba(255,255,255,0.10)", text: INK } }];
  y += drawChips(ctx, likeChips, x, y, maxW, family, draw) + 32;

  // 苦手な味
  if (input.dislikes.length > 0) {
    y += drawLabel(ctx, "苦手な味", x, y, family, draw) + 18;
    const chips = input.dislikes.map((id) => ({
      label: FLAVOR_MAP.get(id)!.label,
      style: { fill: "rgba(255,255,255,0.06)", text: MUTED, border: "rgba(255,255,255,0.22)" },
    }));
    y += drawChips(ctx, chips, x, y, maxW, family, draw) + 32;
  }

  // 飲み方 と 推し銘柄
  const rows: [string, string][] = [];
  if (input.serves.length > 0) {
    rows.push(["好きな飲み方", input.serves.map((id) => SERVE_MAP.get(id)!.label).join(" / ")]);
  }
  if (input.favoriteDram) rows.push(["いま推してる一本", input.favoriteDram]);

  for (const [label, value] of rows) {
    y += drawLabel(ctx, label, x, y, family, draw) + 14;
    font(ctx, 500, 34, family);
    const lines = wrapLines(ctx, value, maxW, 2);
    if (draw) {
      ctx.fillStyle = INK;
      ctx.textBaseline = "top";
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * 46));
    }
    y += lines.length * 46 + 26;
  }

  // 一言
  if (input.comment) {
    font(ctx, 500, 32, family);
    const lines = wrapLines(ctx, input.comment, maxW - 34, 2);
    const h = lines.length * 46;
    if (draw) {
      ctx.fillStyle = "rgba(231,178,75,0.75)";
      ctx.fillRect(x, y + 4, 5, h - 8);
      ctx.fillStyle = "#E8DDC9";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => ctx.fillText(line, x + 34, y + i * 46));
    }
    y += h + 8;
  }

  return y - startY;
}

function drawBackground(ctx: Ctx, input: CardInput, artwork: CanvasImageSource | null) {
  if (artwork) {
    const iw = "width" in artwork ? Number(artwork.width) : CARD_W;
    const ih = "height" in artwork ? Number(artwork.height) : CARD_H;
    const scale = Math.max(CARD_W / iw, CARD_H / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(artwork, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h);
  } else {
    // アートワークが無いときは、好きな味の色から背景を作る
    const colors = input.likes.map((id) => FLAVOR_MAP.get(id)!.color);
    if (colors.length === 0) colors.push("#6B4A2F", "#2A1D16");
    if (colors.length === 1) colors.push("#241A14");

    const base = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    colors.forEach((c, i) => base.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    colors.forEach((c, i) => {
      const blob = ctx.createRadialGradient(
        CARD_W * (0.2 + 0.6 * ((i * 0.37) % 1)),
        CARD_H * (0.12 + 0.3 * ((i * 0.61) % 1)),
        0,
        CARD_W * (0.2 + 0.6 * ((i * 0.37) % 1)),
        CARD_H * (0.12 + 0.3 * ((i * 0.61) % 1)),
        CARD_W * 0.6,
      );
      blob.addColorStop(0, `${c}AA`);
      blob.addColorStop(1, `${c}00`);
      ctx.fillStyle = blob;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
    });
  }

  // 文字が乗る下半分を暗く落とす
  const scrim = ctx.createLinearGradient(0, 0, 0, CARD_H);
  scrim.addColorStop(0, "rgba(14,11,8,0.55)");
  scrim.addColorStop(0.26, "rgba(14,11,8,0.34)");
  scrim.addColorStop(0.52, "rgba(14,11,8,0.82)");
  scrim.addColorStop(1, "rgba(14,11,8,0.95)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
}

const LOGO_H = 170;

function drawFrame(ctx: Ctx, family: string, logo: HTMLCanvasElement | null) {
  ctx.strokeStyle = "rgba(231,178,75,0.35)";
  ctx.lineWidth = 3;
  roundRect(ctx, 26, 26, CARD_W - 52, CARD_H - 52, 22);
  ctx.stroke();

  // ロゴを左に置き、読ませたい文字はその右に並べる(ロゴ内の文字は小さすぎて読めないため)
  let textX = PAD;
  if (logo) {
    const w = LOGO_H * (logo.width / logo.height);
    ctx.drawImage(logo, PAD, 66, w, LOGO_H);
    textX = PAD + w + 28;
  }

  ctx.textBaseline = "top";
  font(ctx, 900, 24, family, "0.22em");
  ctx.fillStyle = AMBER;
  ctx.fillText("KANSAI WHISKY LOVERS", textX, 122);

  font(ctx, 500, 25, family, "0.06em");
  ctx.fillStyle = MUTED;
  ctx.fillText("関西ウイスキーラバーズ ／ 好み交換カード", textX, 158);
  ctx.letterSpacing = "0em";

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(PAD, 262, CARD_W - PAD * 2, 2);

  const footerY = CARD_H - PAD - 52;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(PAD, footerY, CARD_W - PAD * 2, 2);

  font(ctx, 500, 24, family, "0.08em");
  ctx.fillStyle = MUTED;
  ctx.fillText("名刺がわりの、好みの一杯。", PAD, footerY + 22);

  font(ctx, 700, 24, family, "0.18em");
  ctx.fillStyle = "rgba(231,178,75,0.8)";
  const tag = "KWL TASTE CARD";
  ctx.fillText(tag, CARD_W - PAD - ctx.measureText(tag).width, footerY + 22);
  ctx.letterSpacing = "0em";
}

export function renderCard(
  canvas: HTMLCanvasElement,
  input: CardInput,
  artwork: CanvasImageSource | null,
  family: string,
  logo: HTMLCanvasElement | null,
) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, CARD_W, CARD_H);
  drawBackground(ctx, input, artwork);
  drawFrame(ctx, family, logo);

  const bodyH = layoutBody(ctx, input, 0, family, false);
  const bottom = CARD_H - PAD - 52 - 46;
  const startY = Math.max(300, bottom - bodyH);
  layoutBody(ctx, input, startY, family, true);
}
