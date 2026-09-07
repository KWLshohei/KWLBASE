import React, { useMemo, useState } from "react";
import { Search, Wine, MapPin, Globe2, Star } from "lucide-react";
import { C, radius, serif } from "../theme.js";
import { Chip, EmptyState, Input, Select, StatTile } from "./ui.jsx";
import BottleCard from "./BottleCard.jsx";
import FlavorRadar from "./FlavorRadar.jsx";
import { STATUS_LABELS } from "../lib/bottles.js";

const SORTS = [
  { value: "new", label: "新しい順" },
  { value: "rating", label: "評価が高い順" },
  { value: "name", label: "名前順" },
];

export default function CollectionView({
  bottles,
  distilleryById,
  stats,
  visitedCount,
  onEdit,
  onDelete,
  onJump,
  user,
  onRequireAuth,
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("new");

  const countries = useMemo(() => {
    const set = new Set();
    bottles.forEach((b) => {
      const d = distilleryById.get(b.distilleryId);
      if (d) set.add(d.country);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [bottles, distilleryById]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = bottles.filter((b) => {
      const d = distilleryById.get(b.distilleryId);
      if (country !== "all" && d?.country !== country) return false;
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      return [b.name, b.notes, b.category, b.caskType, d?.name, d?.nameJa, d?.region]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });

    const sorted = list.slice();
    sorted.sort((a, b) => {
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sort === "name") return a.name.localeCompare(b.name, "ja");
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return sorted;
  }, [bottles, distilleryById, query, country, status, sort]);

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState icon={<Wine size={26} />} title="ログインするとコレクションが表示されます">
          <button
            type="button"
            onClick={onRequireAuth}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              color: C.accent,
              textDecoration: "underline",
              fontSize: 12,
            }}
          >
            利用登録 / ログインする
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 20px 40px", overflowY: "auto", height: "100%" }}>
      <h2 style={{ margin: "0 0 14px", fontFamily: serif, fontSize: 20, letterSpacing: "0.04em" }}>
        マイコレクション
      </h2>

      {/* 統計 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatTile label="BOTTLES" value={stats.bottleCount} sub="登録ボトル" />
        <StatTile label="DISTILLERIES" value={stats.distilleryCount} sub="記録した蒸留所" />
        <StatTile label="COUNTRIES" value={stats.countryCount} sub="国・地域" />
        <StatTile label="VISITED" value={visitedCount} sub="訪問済み蒸留所" />
        <StatTile
          label="AVG RATING"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
          sub="平均評価"
        />
      </div>

      {/* 平均フレーバー */}
      {stats.hasFlavor ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: radius.lg,
            padding: "14px 14px 6px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              color: C.muted,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            あなたの好みの傾向
          </div>
          <FlavorRadar data={stats.avgFlavor} height={230} />
        </div>
      ) : null}

      {/* フィルタ */}
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            color={C.muted}
            style={{ position: "absolute", left: 11, top: 11, pointerEvents: "none" }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ボトル名・蒸留所・ノートを検索"
            style={{ paddingLeft: 32 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={[
              { value: "all", label: "すべての国" },
              ...countries.map((c) => ({ value: c, label: c })),
            ]}
            style={{ width: "auto", minWidth: 140 }}
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            options={SORTS}
            style={{ width: "auto", minWidth: 130 }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip active={status === "all"} onClick={() => setStatus("all")}>
              すべて
            </Chip>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* 一覧 */}
      {shown.length === 0 ? (
        <EmptyState icon={<Wine size={22} />} title="該当するボトルがありません">
          地図から蒸留所を選んで「ボトルを登録」すると、ここに並びます。
        </EmptyState>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          {shown.map((b) => (
            <BottleCard
              key={b.id}
              bottle={b}
              distillery={distilleryById.get(b.distilleryId)}
              showDistillery
              onEdit={onEdit}
              onDelete={onDelete}
              onJump={onJump}
            />
          ))}
        </div>
      )}
    </div>
  );
}
