import React from "react";
import { X, Plus, MapPin, Calendar, Wine, Globe2, Check, Crosshair } from "lucide-react";
import { C, radius, serif } from "../theme.js";
import { Badge, Button, EmptyState } from "./ui.jsx";
import BottleCard from "./BottleCard.jsx";

function Meta({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.inkDim }}>
      <span style={{ color: C.muted, lineHeight: 0 }}>{icon}</span>
      {children}
    </div>
  );
}

export default function DistilleryPanel({
  distillery,
  bottles,
  user,
  visited,
  onToggleVisited,
  onClose,
  onAddBottle,
  onEditBottle,
  onDeleteBottle,
  onFocus,
  onRequireAuth,
}) {
  if (!distillery) return null;

  return (
    <div
      className="kwl-enter"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
      }}
    >
      {/* ヘッダ */}
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: serif,
                fontSize: 20,
                letterSpacing: "0.02em",
                color: C.ink,
                wordBreak: "break-word",
              }}
            >
              {distillery.nameJa || distillery.name}
            </h2>
            {distillery.name && distillery.name !== distillery.nameJa ? (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{distillery.name}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{ background: "none", border: "none", color: C.inkFaint, lineHeight: 0, padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <Meta icon={<Globe2 size={13} />}>
            {distillery.country} ・ {distillery.region}
          </Meta>
          {distillery.founded ? (
            <Meta icon={<Calendar size={13} />}>創業 {distillery.founded} 年</Meta>
          ) : null}
          <Meta icon={<Wine size={13} />}>{distillery.style}</Meta>
          <Meta icon={<MapPin size={13} />}>
            {distillery.lat.toFixed(3)}, {distillery.lng.toFixed(3)}
          </Meta>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            onClick={() => (user ? onAddBottle() : onRequireAuth())}
          >
            <Plus size={14} />
            ボトルを登録
          </Button>
          <Button
            variant={visited ? "default" : "ghost"}
            onClick={() => (user ? onToggleVisited() : onRequireAuth())}
            title="訪問済みとして記録"
          >
            <Check size={14} color={visited ? C.ok : undefined} />
            {visited ? "訪問済み" : "訪問記録"}
          </Button>
          <Button variant="ghost" onClick={onFocus} title="地図でこの蒸留所を拡大">
            <Crosshair size={14} />
            地図で見る
          </Button>
        </div>
      </div>

      {/* ボトル一覧 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: "0.08em", color: C.muted, fontWeight: 700 }}>
            登録したボトル
          </span>
          <Badge>{bottles.length} 本</Badge>
        </div>

        {!user ? (
          <EmptyState icon={<Wine size={22} />} title="ログインすると記録できます">
            利用登録すると、この蒸留所のボトルを写真のように積み上げて残せます。
          </EmptyState>
        ) : bottles.length === 0 ? (
          <EmptyState icon={<Wine size={22} />} title="まだ記録がありません">
            「ボトルを登録」から、飲んだ一本をテイスティングノート付きで残しましょう。
          </EmptyState>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {bottles.map((b) => (
              <BottleCard
                key={b.id}
                bottle={b}
                distillery={distillery}
                onEdit={onEditBottle}
                onDelete={onDeleteBottle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
