/* ==========================================================================
   ボトル記録の CRUD と集計
   ========================================================================== */

import { KEYS, read, write, uid } from "./storage.js";
import { FLAVOR_AXES, EMPTY_FLAVOR } from "../data/flavor.js";

export function loadBottles() {
  const list = read(KEYS.bottles, []);
  return Array.isArray(list) ? list : [];
}

export function saveBottles(list) {
  write(KEYS.bottles, list);
}

function clampNumber(value, min, max) {
  // 未入力（空文字・null）は 0 ではなく「値なし」として扱う
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/** フォーム入力を保存できる形に正規化する */
export function normalizeBottle(input, { userId, distilleryId }) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("ボトル名を入力してください。");
  if (!userId) throw new Error("ボトルの登録にはログインが必要です。");
  if (!distilleryId) throw new Error("蒸留所が選択されていません。");

  const flavor = { ...EMPTY_FLAVOR };
  FLAVOR_AXES.forEach(({ key }) => {
    flavor[key] = clampNumber(input.flavor?.[key], 0, 5) ?? 0;
  });

  return {
    id: input.id || uid("btl"),
    userId,
    distilleryId,
    name,
    category: input.category || "シングルモルト",
    age: clampNumber(input.age, 0, 100),
    vintage: clampNumber(input.vintage, 1800, 2100),
    abv: clampNumber(input.abv, 0, 100),
    caskType: input.caskType || "",
    price: clampNumber(input.price, 0, 100000000),
    rating: clampNumber(input.rating, 0, 5) ?? 0,
    status: input.status || "opened", // opened | unopened | finished | wishlist
    drankAt: input.drankAt || "",
    notes: String(input.notes || "").slice(0, 2000),
    flavor,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertBottle(list, bottle) {
  const i = list.findIndex((b) => b.id === bottle.id);
  if (i === -1) return [bottle, ...list];
  const next = list.slice();
  next[i] = bottle;
  return next;
}

export function removeBottle(list, id) {
  return list.filter((b) => b.id !== id);
}

export const STATUS_LABELS = {
  opened: "開栓中",
  unopened: "未開栓",
  finished: "空き瓶",
  wishlist: "欲しい",
};

/** ユーザーのボトル群から統計を作る */
export function buildStats(bottles, distilleryById) {
  const distilleryIds = new Set();
  const countries = new Set();
  let ratingSum = 0;
  let ratingCount = 0;
  const flavorSum = { ...EMPTY_FLAVOR };
  let flavorCount = 0;

  bottles.forEach((b) => {
    distilleryIds.add(b.distilleryId);
    const d = distilleryById.get(b.distilleryId);
    if (d) countries.add(d.country);
    if (b.rating > 0) {
      ratingSum += b.rating;
      ratingCount += 1;
    }
    const hasFlavor = FLAVOR_AXES.some(({ key }) => (b.flavor?.[key] ?? 0) > 0);
    if (hasFlavor) {
      FLAVOR_AXES.forEach(({ key }) => {
        flavorSum[key] += b.flavor?.[key] ?? 0;
      });
      flavorCount += 1;
    }
  });

  const avgFlavor = FLAVOR_AXES.map(({ key, label }) => ({
    axis: label,
    key,
    value: flavorCount ? Number((flavorSum[key] / flavorCount).toFixed(2)) : 0,
  }));

  return {
    bottleCount: bottles.length,
    distilleryCount: distilleryIds.size,
    countryCount: countries.size,
    avgRating: ratingCount ? Number((ratingSum / ratingCount).toFixed(2)) : 0,
    avgFlavor,
    hasFlavor: flavorCount > 0,
  };
}

/** レーダーチャート用にボトル1本のフレーバーを整形 */
export function toRadarData(flavor) {
  return FLAVOR_AXES.map(({ key, label }) => ({
    axis: label,
    key,
    value: flavor?.[key] ?? 0,
  }));
}
