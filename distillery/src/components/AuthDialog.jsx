import React, { useState } from "react";
import { C } from "../theme.js";
import { Button, Field, Input, Modal } from "./ui.jsx";
import { registerUser, loginUser } from "../lib/auth.js";

export default function AuthDialog({ mode: initialMode = "register", onClose, onDone }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = isRegister ? await registerUser(form) : await loginUser(form);
      onDone(user);
    } catch (err) {
      setError(err.message || "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isRegister ? "利用登録" : "ログイン"}
      subtitle={
        isRegister
          ? "登録すると蒸留所ごとにボトルを記録できます。"
          : "登録済みのメールアドレスでログインします。"
      }
      onClose={onClose}
      width={420}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 13 }}>
        {isRegister ? (
          <Field label="ニックネーム">
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="ウイスキー好き"
              autoComplete="nickname"
              maxLength={40}
              required
            />
          </Field>
        ) : null}

        <Field label="メールアドレス">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="パスワード" hint={isRegister ? "8文字以上" : undefined}>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set({ password: e.target.value })}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </Field>

        {error ? (
          <div style={{ fontSize: 12, color: C.danger }} role="alert">
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "処理中…" : isRegister ? "登録して始める" : "ログイン"}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? "login" : "register");
            setError("");
          }}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 12,
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {isRegister ? "すでに登録済みの方はこちら" : "はじめての方は利用登録"}
        </button>

        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: C.inkFaint }}>
          ※ このアプリはサーバーを持たず、アカウントと記録はお使いのブラウザ内
          （localStorage）にのみ保存されます。他の端末とは共有されません。
        </p>
      </form>
    </Modal>
  );
}
