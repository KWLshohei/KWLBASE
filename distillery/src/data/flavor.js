/* テイスティング評価軸（0〜5） */
export const FLAVOR_AXES = [
  { key: "smoky", label: "スモーキー", hint: "ピート・煙・薬品香" },
  { key: "sweet", label: "甘み", hint: "蜂蜜・バニラ・キャラメル" },
  { key: "fruity", label: "フルーティ", hint: "洋梨・林檎・トロピカル" },
  { key: "spicy", label: "スパイシー", hint: "胡椒・シナモン・オーク" },
  { key: "rich", label: "コク", hint: "シェリー・チョコ・ボディ" },
  { key: "floral", label: "華やかさ", hint: "花・青草・軽やかさ" },
];

export const EMPTY_FLAVOR = FLAVOR_AXES.reduce((acc, a) => {
  acc[a.key] = 0;
  return acc;
}, {});

export const CATEGORIES = [
  "シングルモルト",
  "ブレンデッドモルト",
  "ブレンデッド",
  "シングルグレーン",
  "バーボン",
  "ライ",
  "ポットスチル",
  "その他",
];

export const CASK_TYPES = [
  "バーボン樽",
  "シェリー樽",
  "ワイン樽",
  "ミズナラ",
  "ポート樽",
  "ラム樽",
  "リフィル",
  "不明 / その他",
];
