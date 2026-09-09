/* ==========================================================================
   利用登録 / ログイン
   ローカル完結のデモ用認証です。パスワードはソルト付きハッシュで保存しますが、
   本番運用ではサーバー側の認証基盤に置き換えてください。
   ========================================================================== */

import { KEYS, read, write, remove, uid } from "./storage.js";

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** crypto.subtle が使えない環境（http の LAN アクセス等）向けのフォールバック */
function weakHash(text) {
  let h1 = 0x12345678;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ c, 1597334677) >>> 0;
  }
  return `w${h1.toString(16)}${h2.toString(16)}`;
}

export async function hashPassword(password, salt) {
  const text = `${salt}::${password}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toHex(digest);
  }
  return weakHash(text);
}

function makeSalt() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return toHex(crypto.getRandomValues(new Uint8Array(12)));
  }
  return Math.random().toString(36).slice(2);
}

export function loadUsers() {
  const users = read(KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  write(KEYS.users, users);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

/** 公開用に整形（ハッシュ・ソルトを含めない） */
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...rest } = user;
  return rest;
}

export async function registerUser({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 1) throw new Error("ニックネームを入力してください。");
  if (cleanName.length > 40) throw new Error("ニックネームは40文字以内で入力してください。");
  if (!validateEmail(cleanEmail)) throw new Error("メールアドレスの形式が正しくありません。");
  if (String(password || "").length < 8)
    throw new Error("パスワードは8文字以上で設定してください。");

  const users = loadUsers();
  if (users.some((u) => u.email === cleanEmail))
    throw new Error("このメールアドレスは既に登録されています。");

  const salt = makeSalt();
  const user = {
    id: uid("usr"),
    name: cleanName,
    email: cleanEmail,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, user]);
  write(KEYS.session, user.id);
  return publicUser(user);
}

export async function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const user = loadUsers().find((u) => u.email === cleanEmail);
  // ユーザー不在でも同じメッセージを返す（存在の推測を防ぐ）
  const invalid = new Error("メールアドレスまたはパスワードが違います。");
  if (!user) throw invalid;

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw invalid;

  write(KEYS.session, user.id);
  return publicUser(user);
}

export function currentUser() {
  const id = read(KEYS.session, null);
  if (!id) return null;
  return publicUser(loadUsers().find((u) => u.id === id));
}

export function logout() {
  remove(KEYS.session);
}
