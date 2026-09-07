import React, { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { C, radius } from "../theme.js";
import { Badge, Button, Stars } from "./ui.jsx";
import FlavorRadar from "./FlavorRadar.jsx";
import { STATUS_LABELS, toRadarData } from "../lib/bottles.js";
import { FLAVOR_AXES } from "../data/flavor.js";

export default function BottleCard({
  bottle,
  distillery,
  onEdit,
  onDelete,
  onJump,
  showDistillery = false,
}) {
  const [open, setOpen] = useState(false);
  const hasFlavor = FLAVOR_AXES.some(({ key }) => (bottle.flavor?.[key] ?? 0) > 0);

  const specs = [
    bottle.age ? `${bottle.age}年` : null,
    bottle.vintage ? `${bottle.vintage}` : null,
    bottle.abv ? `${bottle.abv}%` : null,
    bottle.caskType || null,
  ].filter(Boolean);

  return (
    <div
      style={{
        background: C.raised,
        border: `1px solid ${C.border}`,
        borderRadius: radius.md,
        padding: 13,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          {showDistillery && distillery ? (
            <button
              type="button"
              onClick={() => onJump?.(distillery.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 3,
                color: C.muted,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <MapPin size={11} />
              {distillery.nameJa || distillery.name}
            </button>
          ) : null}
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, wordBreak: "break-word" }}>
            {bottle.name}
          </div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3 }}>
            {bottle.category}
            {specs.length ? ` ・ ${specs.join(" ・ ")}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <Badge tone={bottle.status === "wishlist" ? "default" : "accent"}>
            {STATUS_LABELS[bottle.status] || bottle.status}
          </Badge>
          <Stars value={bottle.rating} readOnly size={13} />
        </div>
      </div>

      {bottle.notes && !open ? (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            lineHeight: 1.7,
            color: C.inkDim,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {bottle.notes}
        </p>
      ) : null}

      {open ? (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {hasFlavor ? <FlavorRadar data={toRadarData(bottle.flavor)} height={200} /> : null}
          {bottle.notes ? (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: C.inkDim, whiteSpace: "pre-wrap" }}>
              {bottle.notes}
            </p>
          ) : null}
          <div style={{ fontSize: 11, color: C.inkFaint, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {bottle.price ? <span>購入価格 ¥{Number(bottle.price).toLocaleString("ja-JP")}</span> : null}
            {bottle.drankAt ? <span>飲んだ日 {bottle.drankAt}</span> : null}
            <span>登録 {new Date(bottle.createdAt).toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 6, marginTop: 11, justifyContent: "flex-end" }}>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {open ? "閉じる" : "詳細"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit?.(bottle)}>
          <Pencil size={13} />
          編集
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete?.(bottle)}>
          <Trash2 size={13} />
          削除
        </Button>
      </div>
    </div>
  );
}
