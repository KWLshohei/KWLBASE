import React, { useState } from "react";
import { C, radius } from "../theme.js";
import { Button, Field, Input, Select, Textarea, Stars } from "./ui.jsx";
import { CATEGORIES, CASK_TYPES, FLAVOR_AXES, EMPTY_FLAVOR } from "../data/flavor.js";
import { STATUS_LABELS } from "../lib/bottles.js";

const blank = {
  name: "",
  category: "シングルモルト",
  age: "",
  vintage: "",
  abv: "",
  caskType: "",
  price: "",
  rating: 0,
  status: "opened",
  drankAt: "",
  notes: "",
  flavor: { ...EMPTY_FLAVOR },
};

export default function BottleForm({ initial, distillery, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...blank, ...(initial || {}) }));
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setFlavor = (key, value) =>
    setForm((f) => ({ ...f, flavor: { ...f.flavor, [key]: Number(value) } }));

  const submit = (e) => {
    e.preventDefault();
    try {
      setError("");
      onSubmit(form);
    } catch (err) {
      setError(err.message || "保存できませんでした。");
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      {distillery ? (
        <div
          style={{
            padding: "8px 11px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
            fontSize: 12,
            color: C.inkDim,
          }}
        >
          蒸留所：
          <strong style={{ color: C.bright }}>
            {distillery.nameJa || distillery.name}
          </strong>
          <span style={{ color: C.inkFaint }}>
            {" "}
            / {distillery.country}・{distillery.region}
          </span>
        </div>
      ) : null}

      <Field label="ボトル名" hint="必須">
        <Input
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="例）12年 シェリーカスク"
          maxLength={120}
          required
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="カテゴリ">
          <Select
            value={form.category}
            options={CATEGORIES}
            onChange={(e) => set({ category: e.target.value })}
          />
        </Field>
        <Field label="樽">
          <Select
            value={form.caskType}
            options={[{ value: "", label: "未選択" }, ...CASK_TYPES.map((v) => ({ value: v, label: v }))]}
            onChange={(e) => set({ caskType: e.target.value })}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Field label="熟成年数" hint="年">
          <Input
            type="number"
            min="0"
            max="100"
            value={form.age}
            onChange={(e) => set({ age: e.target.value })}
            placeholder="12"
          />
        </Field>
        <Field label="ヴィンテージ">
          <Input
            type="number"
            min="1800"
            max="2100"
            value={form.vintage}
            onChange={(e) => set({ vintage: e.target.value })}
            placeholder="2011"
          />
        </Field>
        <Field label="度数" hint="%">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.abv}
            onChange={(e) => set({ abv: e.target.value })}
            placeholder="46"
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="購入価格" hint="円">
          <Input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => set({ price: e.target.value })}
            placeholder="8800"
          />
        </Field>
        <Field label="状態">
          <Select
            value={form.status}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={(e) => set({ status: e.target.value })}
          />
        </Field>
        <Field label="飲んだ日">
          <Input
            type="date"
            value={form.drankAt}
            onChange={(e) => set({ drankAt: e.target.value })}
          />
        </Field>
      </div>

      <Field label="評価">
        <div style={{ paddingTop: 2 }}>
          <Stars value={Number(form.rating) || 0} onChange={(v) => set({ rating: v })} size={20} />
        </div>
      </Field>

      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.06em",
            color: C.muted,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          テイスティング（0〜5）
        </div>
        <div style={{ display: "grid", gap: 9 }}>
          {FLAVOR_AXES.map((axis) => (
            <div
              key={axis.key}
              style={{ display: "grid", gridTemplateColumns: "88px 1fr 22px", alignItems: "center", gap: 10 }}
            >
              <span style={{ fontSize: 12, color: C.inkDim }} title={axis.hint}>
                {axis.label}
              </span>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={form.flavor[axis.key] ?? 0}
                onChange={(e) => setFlavor(axis.key, e.target.value)}
                aria-label={axis.label}
                style={{ width: "100%", accentColor: C.accent }}
              />
              <span style={{ fontSize: 12, color: C.bright, textAlign: "right" }}>
                {form.flavor[axis.key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Field label="テイスティングノート">
        <Textarea
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="香り、味わい、余韻、飲んだ場所やシーンなど"
          maxLength={2000}
        />
      </Field>

      {error ? (
        <div style={{ fontSize: 12, color: C.danger }} role="alert">
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        ) : null}
        <Button type="submit" variant="primary">
          {initial?.id ? "更新する" : "登録する"}
        </Button>
      </div>
    </form>
  );
}
