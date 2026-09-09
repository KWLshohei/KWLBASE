import React, { useState } from "react";
import { C } from "../theme.js";
import { Button, Field, Input, Modal } from "./ui.jsx";

const blank = {
  nameJa: "",
  name: "",
  country: "",
  region: "",
  founded: "",
  lat: "",
  lng: "",
  style: "シングルモルト",
};

export default function AddDistilleryDialog({ onClose, onSubmit }) {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.nameJa.trim() && !form.name.trim()) {
      setError("蒸留所名を入力してください。");
      return;
    }
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
      setError("緯度は -90 〜 90 の数値で入力してください。");
      return;
    }
    if (!Number.isFinite(lng) || Math.abs(lng) > 180) {
      setError("経度は -180 〜 180 の数値で入力してください。");
      return;
    }
    setError("");
    onSubmit({
      nameJa: form.nameJa.trim() || form.name.trim(),
      name: form.name.trim() || form.nameJa.trim(),
      country: form.country.trim() || "その他",
      region: form.region.trim() || "—",
      founded: form.founded ? Number(form.founded) : null,
      style: form.style.trim() || "—",
      lat,
      lng,
    });
  };

  return (
    <Modal
      title="蒸留所を追加"
      subtitle="一覧にない蒸留所を、自分の地図に追加できます。"
      onClose={onClose}
      width={440}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 13 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="蒸留所名（日本語）">
            <Input value={form.nameJa} onChange={(e) => set({ nameJa: e.target.value })} placeholder="例）遊佐" />
          </Field>
          <Field label="蒸留所名（英語）">
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Yuza" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="国">
            <Input value={form.country} onChange={(e) => set({ country: e.target.value })} placeholder="日本" />
          </Field>
          <Field label="地域">
            <Input value={form.region} onChange={(e) => set({ region: e.target.value })} placeholder="山形" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="創業年">
            <Input
              type="number"
              min="1000"
              max="2100"
              value={form.founded}
              onChange={(e) => set({ founded: e.target.value })}
              placeholder="2018"
            />
          </Field>
          <Field label="スタイル">
            <Input value={form.style} onChange={(e) => set({ style: e.target.value })} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="緯度" hint="-90〜90">
            <Input
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={(e) => set({ lat: e.target.value })}
              placeholder="39.03"
              required
            />
          </Field>
          <Field label="経度" hint="-180〜180">
            <Input
              type="number"
              step="0.0001"
              value={form.lng}
              onChange={(e) => set({ lng: e.target.value })}
              placeholder="139.90"
              required
            />
          </Field>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: C.inkFaint, lineHeight: 1.7 }}>
          緯度経度は Google マップで蒸留所を長押しすると確認できます。
        </p>

        {error ? (
          <div style={{ fontSize: 12, color: C.danger }} role="alert">
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary">
            追加する
          </Button>
        </div>
      </form>
    </Modal>
  );
}
