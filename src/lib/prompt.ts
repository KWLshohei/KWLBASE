import { CardInput, FLAVOR_MAP } from "./taste";

/**
 * 好みのフレーバーから、カード背景用アートワークのプロンプトを組み立てる。
 * カード上の文字は後段の Canvas で描くため、画像側には文字を入れさせない。
 */
export function buildArtworkPrompt(input: CardInput): string {
  const likes = input.likes.map((id) => FLAVOR_MAP.get(id)?.art).filter(Boolean);
  const avoid = input.dislikes.map((id) => FLAVOR_MAP.get(id)?.art).filter(Boolean);

  const mood = likes.length > 0 ? likes.join("; ") : "a warm glass of whisky resting on dark oak";

  return [
    "A moody, abstract still-life backdrop for a whisky lover's profile card.",
    `Evoke these flavours: ${mood}.`,
    avoid.length > 0 ? `Deliberately avoid any hint of: ${avoid.join("; ")}.` : "",
    "Painterly texture, cinematic low-key lighting, deep shadows in the lower half so overlaid text stays readable.",
    "Vertical composition, no people, no glassware labels, no text, no letters, no numbers, no logos, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}
