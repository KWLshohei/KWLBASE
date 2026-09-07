export type Flavor = {
  id: string;
  label: string;
  /** カードのチップ色 / フォールバック背景のグラデーションに使う */
  color: string;
  /** 画像生成モデルに渡す英語の情景表現 */
  art: string;
};

export const FLAVORS: Flavor[] = [
  { id: "peat", label: "ピート・スモーキー", color: "#6E7A82", art: "drifting peat smoke and glowing embers" },
  { id: "sherry", label: "シェリー樽", color: "#8C2F39", art: "deep crimson sherry cask, dried figs and raisins" },
  { id: "bourbon", label: "バーボン樽・バニラ", color: "#C98A2B", art: "golden bourbon barrel staves, vanilla and toasted oak" },
  { id: "fruity", label: "フルーティー", color: "#D9622B", art: "orchard fruit, apricot and citrus peel" },
  { id: "floral", label: "華やか・フローラル", color: "#C77DA6", art: "delicate heather blossoms and floral petals" },
  { id: "spicy", label: "スパイシー", color: "#A0522D", art: "cinnamon bark, black pepper and clove" },
  { id: "sweet", label: "甘い・ハニー", color: "#E0A82E", art: "honeycomb and flowing caramel" },
  { id: "salty", label: "潮っぽい・ブリニー", color: "#2E7D8C", art: "coastal sea spray and salted rock" },
  { id: "mizunara", label: "ミズナラ・白檀", color: "#8A7551", art: "mizunara oak grain and sandalwood incense smoke" },
  { id: "rich", label: "濃厚・オイリー", color: "#5A3A2E", art: "thick oily texture, dark chocolate and espresso" },
  { id: "light", label: "軽やか・グレーン", color: "#9FB08C", art: "light grain fields and clear morning air" },
  { id: "wine", label: "ワインカスク", color: "#6B2D5B", art: "wine cask purple, blackberries and red wine" },
];

export const FLAVOR_MAP = new Map(FLAVORS.map((f) => [f.id, f]));

/** 明るい色の上には黒、暗い色の上には白を返す */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? "#22190F" : "#FFFFFF";
}

export type Serve = { id: string; label: string };

export const SERVES: Serve[] = [
  { id: "neat", label: "ストレート" },
  { id: "rock", label: "ロック" },
  { id: "twiceup", label: "トワイスアップ" },
  { id: "water", label: "水割り" },
  { id: "highball", label: "ハイボール" },
  { id: "hot", label: "ホット" },
];

export const SERVE_MAP = new Map(SERVES.map((s) => [s.id, s]));

export type Experience = { id: string; label: string };

export const EXPERIENCES: Experience[] = [
  { id: "rookie", label: "はじめたて" },
  { id: "explorer", label: "いろいろ開拓中" },
  { id: "veteran", label: "だいぶ長い" },
  { id: "deep", label: "沼の住人" },
];

export const EXPERIENCE_MAP = new Map(EXPERIENCES.map((e) => [e.id, e]));

export type CardInput = {
  nickname: string;
  likes: string[];
  dislikes: string[];
  serves: string[];
  favoriteDram: string;
  comment: string;
  experience: string;
};

export const LIMITS = {
  nickname: 20,
  favoriteDram: 40,
  comment: 60,
  likes: 5,
  dislikes: 3,
  serves: 3,
} as const;

export const EMPTY_CARD: CardInput = {
  nickname: "",
  likes: [],
  dislikes: [],
  serves: [],
  favoriteDram: "",
  comment: "",
  experience: "explorer",
};

/**
 * フォームからの入力とネットワーク越しの入力の両方をここで正規化する。
 * 未知の ID を落とし、上限で切り詰めた CardInput を返す。
 */
export function sanitizeCardInput(value: unknown): CardInput {
  const raw = (value ?? {}) as Partial<Record<keyof CardInput, unknown>>;

  const ids = (input: unknown, allowed: Map<string, unknown>, max: number) =>
    Array.isArray(input)
      ? Array.from(new Set(input.filter((v): v is string => typeof v === "string" && allowed.has(v)))).slice(0, max)
      : [];

  const text = (input: unknown, max: number) =>
    typeof input === "string" ? input.replace(/\s+/g, " ").trim().slice(0, max) : "";

  return {
    nickname: text(raw.nickname, LIMITS.nickname),
    likes: ids(raw.likes, FLAVOR_MAP, LIMITS.likes),
    dislikes: ids(raw.dislikes, FLAVOR_MAP, LIMITS.dislikes),
    serves: ids(raw.serves, SERVE_MAP, LIMITS.serves),
    favoriteDram: text(raw.favoriteDram, LIMITS.favoriteDram),
    comment: text(raw.comment, LIMITS.comment),
    experience: typeof raw.experience === "string" && EXPERIENCE_MAP.has(raw.experience) ? raw.experience : "explorer",
  };
}
