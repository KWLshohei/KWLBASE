/* ==========================================================================
   localStorage 永続化レイヤ
   バックエンドを持たないため、すべてのデータはブラウザ内に保存されます。
   ========================================================================== */

const NS = "kwlbase:v1";

export const KEYS = {
  users: `${NS}:users`,
  session: `${NS}:session`,
  bottles: `${NS}:bottles`,
  distilleries: `${NS}:distilleries`, // ユーザーが追加した蒸留所
  visits: `${NS}:visits`, // 訪問済みチェック
};

function available() {
  try {
    const probe = `${NS}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const canPersist = typeof window !== "undefined" && available();
const memory = new Map();

export function read(key, fallback) {
  try {
    const raw = canPersist ? window.localStorage.getItem(key) : memory.get(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (canPersist) window.localStorage.setItem(key, raw);
    else memory.set(key, raw);
    return true;
  } catch {
    // 容量超過などは握りつぶさずメモリへ退避
    memory.set(key, raw);
    return false;
  }
}

export function remove(key) {
  try {
    if (canPersist) window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
  memory.delete(key);
}

export const storageIsPersistent = canPersist;

export function uid(prefix = "id") {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
