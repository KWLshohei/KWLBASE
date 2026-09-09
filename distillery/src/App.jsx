import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  LogOut,
  Map as MapIcon,
  Library,
  List,
  Wine,
  UserPlus,
  X,
} from "lucide-react";
import { C, radius, serif } from "./theme.js";
import { Button, Chip, Input, Modal, Badge } from "./components/ui.jsx";
import WorldMap from "./components/WorldMap.jsx";
import DistilleryPanel from "./components/DistilleryPanel.jsx";
import CollectionView from "./components/CollectionView.jsx";
import BottleForm from "./components/BottleForm.jsx";
import AuthDialog from "./components/AuthDialog.jsx";
import AddDistilleryDialog from "./components/AddDistilleryDialog.jsx";
import { SEED_DISTILLERIES, REGION_PRESETS } from "./data/distilleries.js";
import { KEYS, read, write, uid } from "./lib/storage.js";
import { currentUser, logout } from "./lib/auth.js";
import {
  loadBottles,
  saveBottles,
  normalizeBottle,
  upsertBottle,
  removeBottle,
  buildStats,
} from "./lib/bottles.js";
import useMedia from "./lib/useMedia.js";

export default function App() {
  const narrow = useMedia("(max-width: 900px)");

  const [user, setUser] = useState(() => currentUser());
  const [bottles, setBottles] = useState(() => loadBottles());
  const [customDistilleries, setCustomDistilleries] = useState(() => {
    const list = read(KEYS.distilleries, []);
    return Array.isArray(list) ? list : [];
  });
  const [visits, setVisits] = useState(() => {
    const v = read(KEYS.visits, {});
    return v && typeof v === "object" ? v : {};
  });

  const [tab, setTab] = useState("map");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("world");
  const [selectedId, setSelectedId] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'register' | 'login' | null
  const [editing, setEditing] = useState(null); // { bottle, distilleryId }
  const [addingDistillery, setAddingDistillery] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  /* ------------------------------ 派生データ ------------------------------ */
  const distilleries = useMemo(
    () => [...SEED_DISTILLERIES, ...customDistilleries],
    [customDistilleries]
  );

  const distilleryById = useMemo(() => {
    const map = new Map();
    distilleries.forEach((d) => map.set(d.id, d));
    return map;
  }, [distilleries]);

  const myBottles = useMemo(
    () => (user ? bottles.filter((b) => b.userId === user.id) : []),
    [bottles, user]
  );

  const countByDistillery = useMemo(() => {
    const map = new Map();
    myBottles.forEach((b) => map.set(b.distilleryId, (map.get(b.distilleryId) || 0) + 1));
    return map;
  }, [myBottles]);

  const myVisits = useMemo(
    () => new Set(user ? visits[user.id] || [] : []),
    [visits, user]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return distilleries;
    return distilleries.filter((d) =>
      [d.name, d.nameJa, d.country, d.region, d.style]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [distilleries, query]);

  const highlightIds = useMemo(
    () => (query.trim() ? new Set(filtered.map((d) => d.id)) : null),
    [filtered, query]
  );

  const selected = selectedId ? distilleryById.get(selectedId) : null;

  const selectedBottles = useMemo(
    () => myBottles.filter((b) => b.distilleryId === selectedId),
    [myBottles, selectedId]
  );

  const stats = useMemo(() => buildStats(myBottles, distilleryById), [myBottles, distilleryById]);

  /* ------------------------------- 永続化 -------------------------------- */
  useEffect(() => {
    saveBottles(bottles);
  }, [bottles]);

  useEffect(() => {
    write(KEYS.distilleries, customDistilleries);
  }, [customDistilleries]);

  useEffect(() => {
    write(KEYS.visits, visits);
  }, [visits]);

  /* -------------------------------- 操作 --------------------------------- */
  const focusDistillery = useCallback((d, zoom = 16) => {
    if (!d) return;
    setFocusRequest({ center: [d.lat, d.lng], zoom, token: Date.now() });
  }, []);

  const selectDistillery = useCallback(
    (id, { focus = false } = {}) => {
      setSelectedId(id);
      setTab("map");
      setListOpen(false);
      if (focus) focusDistillery(distilleryById.get(id));
    },
    [distilleryById, focusDistillery]
  );

  const jumpToRegion = (preset) => {
    setRegion(preset.id);
    setFocusRequest({ center: preset.center, zoom: preset.zoom, token: Date.now() });
  };

  const requireAuth = () => setAuthMode("register");

  const handleSaveBottle = (formValues) => {
    const distilleryId = editing?.distilleryId;
    const bottle = normalizeBottle(
      { ...formValues, id: editing?.bottle?.id, createdAt: editing?.bottle?.createdAt },
      { userId: user?.id, distilleryId }
    );
    setBottles((prev) => upsertBottle(prev, bottle));
    setEditing(null);
    setSelectedId(distilleryId);
  };

  const handleDeleteBottle = (bottle) => {
    const ok = window.confirm(`「${bottle.name}」を削除しますか？この操作は取り消せません。`);
    if (!ok) return;
    setBottles((prev) => removeBottle(prev, bottle.id));
  };

  const toggleVisited = () => {
    if (!user || !selected) return;
    setVisits((prev) => {
      const mine = new Set(prev[user.id] || []);
      if (mine.has(selected.id)) mine.delete(selected.id);
      else mine.add(selected.id);
      return { ...prev, [user.id]: [...mine] };
    });
  };

  const handleAddDistillery = (values) => {
    const d = { ...values, id: uid("dst"), custom: true, ownerId: user?.id || null };
    setCustomDistilleries((prev) => [...prev, d]);
    setAddingDistillery(false);
    setSelectedId(d.id);
    focusDistillery(d);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setTab("map");
  };

  /* ------------------------------- 画面部品 ------------------------------- */
  const sidebar = (
    <aside
      style={{
        width: narrow ? "100%" : 300,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: C.surface,
        borderRight: narrow ? "none" : `1px solid ${C.border}`,
      }}
    >
      <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={14}
            color={C.muted}
            style={{ position: "absolute", left: 11, top: 11, pointerEvents: "none" }}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="蒸留所・国・地域で検索"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {REGION_PRESETS.map((p) => (
            <Chip key={p.id} active={region === p.id} onClick={() => jumpToRegion(p)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div
          style={{
            padding: "10px 14px 6px",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: C.muted,
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>蒸留所</span>
          <span style={{ color: C.inkFaint }}>{filtered.length} 件</span>
        </div>
        {filtered.map((d) => {
          const count = countByDistillery.get(d.id) || 0;
          const active = d.id === selectedId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDistillery(d.id, { focus: true })}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "9px 14px",
                textAlign: "left",
                background: active ? "rgba(209,154,74,0.12)" : "transparent",
                border: "none",
                borderLeft: `2px solid ${active ? C.accent : "transparent"}`,
                color: C.ink,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.nameJa || d.name}
                </span>
                <span style={{ display: "block", fontSize: 11, color: C.inkFaint }}>
                  {d.country} ・ {d.region}
                </span>
              </span>
              {count > 0 ? <Badge tone="accent">{count}</Badge> : null}
            </button>
          );
        })}
        <div style={{ padding: 14 }}>
          <Button
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => (user ? setAddingDistillery(true) : requireAuth())}
          >
            <Plus size={14} />
            蒸留所を追加
          </Button>
        </div>
      </div>
    </aside>
  );

  const panel = selected ? (
    <DistilleryPanel
      distillery={selected}
      bottles={selectedBottles}
      user={user}
      visited={myVisits.has(selected.id)}
      onToggleVisited={toggleVisited}
      onClose={() => setSelectedId(null)}
      onAddBottle={() => setEditing({ bottle: null, distilleryId: selected.id })}
      onEditBottle={(b) => setEditing({ bottle: b, distilleryId: b.distilleryId })}
      onDeleteBottle={handleDeleteBottle}
      onFocus={() => focusDistillery(selected)}
      onRequireAuth={requireAuth}
    />
  ) : null;

  /* -------------------------------- 描画 --------------------------------- */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      {/* ヘッダ */}
      <header
        style={{
          display: "flex",
          flexDirection: narrow ? "column" : "row",
          alignItems: narrow ? "stretch" : "center",
          gap: narrow ? 8 : 12,
          padding: narrow ? "10px 12px" : "12px 18px",
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            minWidth: 0,
            flex: narrow ? "1 1 auto" : "0 0 auto",
          }}
        >
          <Wine size={20} color={C.accent} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: serif,
                fontSize: 17,
                letterSpacing: "0.12em",
                color: C.ink,
                lineHeight: 1.2,
              }}
            >
              KWLBASE
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: C.muted }}>
              WHISKY DISTILLERY LOG
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 6, marginLeft: narrow ? 0 : 18, flexWrap: "wrap", order: narrow ? 2 : 0 }}>
          <Button
            variant={tab === "map" ? "default" : "ghost"}
            size={narrow ? "sm" : "md"}
            onClick={() => setTab("map")}
          >
            <MapIcon size={14} />
            地図
          </Button>
          <Button
            variant={tab === "collection" ? "default" : "ghost"}
            size={narrow ? "sm" : "md"}
            onClick={() => setTab("collection")}
          >
            <Library size={14} />
            コレクション
            {myBottles.length ? (
              <span style={{ color: C.bright, fontSize: 11 }}>{myBottles.length}</span>
            ) : null}
          </Button>
          {narrow && tab === "map" ? (
            <Button variant="ghost" size="sm" onClick={() => setListOpen(true)}>
              <List size={14} />
              一覧
            </Button>
          ) : null}
        </nav>

        <div
          style={{
            marginLeft: narrow ? 0 : "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            order: narrow ? 1 : 0,
            position: narrow ? "absolute" : "static",
            top: narrow ? 10 : undefined,
            right: narrow ? 12 : undefined,
          }}
        >
          {user ? (
            <>
              {!narrow ? (
                <span style={{ fontSize: 12, color: C.inkDim }}>
                  <span style={{ color: C.muted }}>ようこそ、</span>
                  {user.name} さん
                </span>
              ) : null}
              <Button variant="ghost" size="sm" onClick={handleLogout} title="ログアウト">
                <LogOut size={14} />
                {!narrow ? "ログアウト" : null}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAuthMode("login")}>
                ログイン
              </Button>
              <Button variant="primary" size="sm" onClick={() => setAuthMode("register")}>
                <UserPlus size={14} />
                利用登録
              </Button>
            </>
          )}
        </div>
      </header>

      {/* 本体 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {tab === "map" ? (
          <>
            {!narrow ? sidebar : null}

            <main style={{ flex: 1, minWidth: 0, padding: narrow ? 0 : 14, position: "relative" }}>
              <WorldMap
                distilleries={distilleries}
                selectedId={selectedId}
                onSelect={(id) => selectDistillery(id)}
                countByDistillery={countByDistillery}
                focusRequest={focusRequest}
                highlightIds={highlightIds}
                verticalAnchor={narrow ? 0.2 : 0.5}
              />
            </main>

            {!narrow && selected ? (
              <div style={{ width: 380, flexShrink: 0, minHeight: 0 }}>{panel}</div>
            ) : null}
          </>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <CollectionView
              bottles={myBottles}
              distilleryById={distilleryById}
              stats={stats}
              visitedCount={myVisits.size}
              user={user}
              onRequireAuth={requireAuth}
              onEdit={(b) => setEditing({ bottle: b, distilleryId: b.distilleryId })}
              onDelete={handleDeleteBottle}
              onJump={(id) => selectDistillery(id, { focus: true })}
            />
          </div>
        )}
      </div>

      {/* モバイル：蒸留所一覧ドロワー */}
      {narrow && listOpen ? (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setListOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,4,2,0.6)",
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            className="kwl-enter"
            style={{ width: "min(320px, 86vw)", display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: 8,
                background: C.surface,
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <button
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="閉じる"
                style={{ background: "none", border: "none", color: C.inkFaint, lineHeight: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      {/* モバイル：蒸留所詳細シート */}
      {narrow && selected ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            height: "72vh",
            zIndex: 45,
            borderTop: `1px solid ${C.borderStrong}`,
            borderRadius: `${radius.lg}px ${radius.lg}px 0 0`,
            overflow: "hidden",
            boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
          }}
          className="kwl-enter"
        >
          {panel}
        </div>
      ) : null}

      {/* ダイアログ群 */}
      {authMode ? (
        <AuthDialog
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onDone={(u) => {
            setUser(u);
            setAuthMode(null);
          }}
        />
      ) : null}

      {editing ? (
        <Modal
          title={editing.bottle ? "ボトルを編集" : "ボトルを登録"}
          subtitle="飲んだ一本を、味わいの記録とともに残しましょう。"
          onClose={() => setEditing(null)}
          width={520}
        >
          <BottleForm
            initial={editing.bottle}
            distillery={distilleryById.get(editing.distilleryId)}
            onSubmit={handleSaveBottle}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {addingDistillery ? (
        <AddDistilleryDialog
          onClose={() => setAddingDistillery(false)}
          onSubmit={handleAddDistillery}
        />
      ) : null}
    </div>
  );
}
