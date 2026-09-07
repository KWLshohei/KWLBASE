import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import topo from "world-atlas/countries-110m.json";
import { Plus, Minus, Locate } from "lucide-react";
import { C, radius } from "../theme.js";

const MIN_K = 1;
const MAX_K = 400;
const LABEL_K = 4; // このズーム以上で蒸留所名を表示（重ならない分だけ）
const PIN_GAP = 12; // ピン同士を最低これだけ離す（画面ピクセル）
const DECLUTTER_K = 3; // これ以上に拡大した時だけ重なりをほどく
const MAX_SHIFT = 24; // 本来の位置からずらせる上限（画面ピクセル）
const LABEL_SIZE = 10;

const countries = feature(topo, topo.objects.countries);

function clampK(k) {
  return Math.min(MAX_K, Math.max(MIN_K, k));
}

/** ラベル幅の概算。全角は約1em、半角は約0.55em で見積もる */
function textWidth(text, size) {
  let w = 0;
  for (const ch of text) {
    w += ch.codePointAt(0) > 0x2e7f ? size : size * 0.55;
  }
  return w;
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** 選択中 > 登録済み > その他 の順（重なった時に優先して表示する順） */
function priority(item) {
  if (item.selected) return 0;
  if (item.count > 0) return 1;
  return 2;
}

export default function WorldMap({
  distilleries,
  selectedId,
  onSelect,
  countByDistillery,
  focusRequest, // { center: [lat, lng], zoom, token }
  highlightIds,
  verticalAnchor = 0.5,
}) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 900, h: 460 });
  const [measured, setMeasured] = useState(false);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [hovered, setHovered] = useState(null);
  const drag = useRef(null);

  /* ---- コンテナサイズの追従 ---- */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.round(width), h: Math.round(height) });
        setMeasured(true);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- ズーム時により詳細な地形を遅延読み込み ---- */
  const [detail, setDetail] = useState(null);
  const detailRequested = useRef(false);

  useEffect(() => {
    if (t.k < 4 || detailRequested.current) return;
    detailRequested.current = true;
    import("world-atlas/countries-50m.json")
      .then((mod) => {
        const topo50 = mod.default ?? mod;
        setDetail(feature(topo50, topo50.objects.countries));
      })
      .catch(() => {
        detailRequested.current = false; // 失敗時は次のズームで再試行
      });
  }, [t.k]);

  /* ---- 投影法とパス（サイズ変更時のみ再計算） ---- */
  const { projection, landPath, graticulePath, spherePath } = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [6, 6],
        [Math.max(size.w - 6, 20), Math.max(size.h - 6, 20)],
      ],
      { type: "Sphere" }
    );
    const path = geoPath(proj);
    return {
      projection: proj,
      landPath: path(detail || countries),
      graticulePath: path(geoGraticule10()),
      spherePath: path({ type: "Sphere" }),
    };
  }, [size.w, size.h, detail]);

  /* ---- 初期表示：コンテナの縦幅を活かすズーム倍率 ---- */
  const defaultT = useMemo(() => {
    const bounds = geoPath(projection).bounds({ type: "Sphere" });
    const [[x0, y0], [x1, y1]] = bounds;
    const ph = Math.max(y1 - y0, 1);
    // 縦長のコンテナ（スマホ等）では余白が大きくなるため少し拡大する。
    // ただし左右の見切れを抑えるため 1.3 倍まで、効果が小さい時は等倍のまま。
    const fill = (size.h - 12) / ph;
    const k = fill < 1.15 ? 1 : Math.min(1.3, fill);
    return {
      k,
      x: size.w / 2 - k * ((x0 + x1) / 2),
      y: size.h / 2 - k * ((y0 + y1) / 2),
    };
  }, [projection, size.w, size.h]);

  const initialized = useRef(false);
  useEffect(() => {
    if (!measured || initialized.current) return;
    initialized.current = true;
    setT(defaultT);
  }, [measured, defaultT]);

  /* ---- 蒸留所を投影座標へ ---- */
  const points = useMemo(() => {
    const out = [];
    distilleries.forEach((d) => {
      const p = projection([d.lng, d.lat]);
      if (!p || Number.isNaN(p[0])) return;
      out.push({ d, x: p[0], y: p[1] });
    });
    return out;
  }, [distilleries, projection]);

  /* ---- 画面座標へ変換し、ピン同士が重ならないよう押し広げる ----
     数百 m しか離れていない蒸留所（スプリングバンクとグレンスコシア等）は
     どれだけ拡大しても地図上では重なるため、画面上で最小間隔を確保して
     個別にクリックできるようにする。ずらしたピンは引き出し線で元の位置を示す。 */
  const pins = useMemo(() => {
    const margin = 60;
    const items = [];
    points.forEach(({ d, x, y }) => {
      const sx = x * t.k + t.x;
      const sy = y * t.k + t.y;
      if (sx < -margin || sx > size.w + margin) return;
      if (sy < -margin || sy > size.h + margin) return;
      items.push({
        d,
        ox: sx, // 本来の位置
        oy: sy,
        sx, // 表示位置（この後ずらす）
        sy,
        count: countByDistillery.get(d.id) || 0,
        selected: d.id === selectedId,
      });
    });

    // 世界地図のような広域表示では地理的な位置をそのまま見せる。
    // 拡大した時だけ、重なったピンをほどいて個別に選べるようにする。
    if (t.k < DECLUTTER_K) return items;

    // 優先度の高いものから確定させ、後から来たピンを押しのける
    items.sort((a, b) => priority(a) - priority(b));

    for (let iter = 0; iter < 14; iter += 1) {
      let moved = false;
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          let dx = b.sx - a.sx;
          let dy = b.sy - a.sy;
          let dist = Math.hypot(dx, dy);
          if (dist >= PIN_GAP) continue;
          if (dist < 0.01) {
            // 完全に同じ位置なら決まった向きにずらす（毎フレーム同じ結果になるように）
            const angle = (j * 2.3999) % (Math.PI * 2);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dist = 1;
          }
          const ux = dx / dist;
          const uy = dy / dist;
          const push = PIN_GAP - dist;
          // 先に確定した側（優先度が高い方）は動かさない
          b.sx += ux * push;
          b.sy += uy * push;
          moved = true;
        }
      }

      // 実際の場所から離れすぎないよう、ずらす量に上限をかける
      items.forEach((it) => {
        const dx = it.sx - it.ox;
        const dy = it.sy - it.oy;
        const dist = Math.hypot(dx, dy);
        if (dist <= MAX_SHIFT) return;
        it.sx = it.ox + (dx / dist) * MAX_SHIFT;
        it.sy = it.oy + (dy / dist) * MAX_SHIFT;
      });

      if (!moved) break;
    }

    return items;
  }, [points, t, size.w, size.h, countByDistillery, selectedId]);

  /* ---- ラベルは重ならないものだけ表示する ---- */
  const labels = useMemo(() => {
    if (t.k < LABEL_K) return [];

    // ピン自身が占める領域を先に埋めておく
    const boxes = pins.map((p) => ({
      x: p.sx - 7,
      y: p.sy - 7,
      w: 14,
      h: 14,
    }));

    const out = [];
    pins.forEach((p) => {
      if (highlightIds && !highlightIds.has(p.d.id)) return;
      const text = p.d.nameJa || p.d.name;
      const w = textWidth(text, LABEL_SIZE);
      const h = LABEL_SIZE + 3;
      const candidates = [
        { x: p.sx + 9, y: p.sy - h / 2 }, // 右
        { x: p.sx - 9 - w, y: p.sy - h / 2 }, // 左
        { x: p.sx - w / 2, y: p.sy + 9 }, // 下
        { x: p.sx - w / 2, y: p.sy - 9 - h }, // 上
      ];
      const spot = candidates.find((c) => {
        if (c.x < 2 || c.x + w > size.w - 2) return false;
        if (c.y < 2 || c.y + h > size.h - 2) return false;
        const box = { x: c.x, y: c.y, w, h };
        return !boxes.some((b) => overlaps(box, b));
      });
      if (!spot) return; // 置ける場所がなければ表示しない
      boxes.push({ x: spot.x, y: spot.y, w, h });
      out.push({
        id: p.d.id,
        text,
        x: spot.x,
        y: spot.y + h - 3,
        owned: p.count > 0,
      });
    });
    return out;
  }, [pins, t.k, highlightIds, size.w, size.h]);

  /* ---- 指定地点へフォーカス ---- */
  const focusOn = useCallback(
    (center, zoom) => {
      if (zoom <= 1) {
        setT(defaultT);
        return;
      }
      const p = projection([center[1], center[0]]);
      if (!p) return;
      const k = clampK(zoom);
      setT({
        k,
        x: size.w / 2 - k * p[0],
        y: size.h * verticalAnchor - k * p[1],
      });
    },
    [projection, size.w, size.h, defaultT, verticalAnchor]
  );

  useEffect(() => {
    if (!focusRequest) return;
    focusOn(focusRequest.center, focusRequest.zoom);
  }, [focusRequest, focusOn]);

  /* ---- ズーム操作 ---- */
  const zoomAround = useCallback((cx, cy, factor) => {
    setT((prev) => {
      const k = clampK(prev.k * factor);
      const ratio = k / prev.k;
      return { k, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
    });
  }, []);

  const onWheel = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    zoomAround(
      e.clientX - rect.left,
      e.clientY - rect.top,
      Math.exp(-e.deltaY * 0.0016)
    );
  };

  /* ホイールのデフォルトスクロールを抑止（React の passive listener 対策） */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const prevent = (e) => e.preventDefault();
    el.addEventListener("wheel", prevent, { passive: false });
    return () => el.removeEventListener("wheel", prevent);
  }, []);

  /* ---- ドラッグでパン / 2本指でピンチズーム ---- */
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const lastMoved = useRef(0);

  const localPoint = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));

    if (pointers.current.size === 1) {
      drag.current = { sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, moved: 0 };
    } else if (pointers.current.size === 2) {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  const onPointerMove = (e) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, localPoint(e));
    }

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const prev = pinch.current;
      pinch.current = { dist, mid };
      lastMoved.current = 999; // ピンチ中はクリック扱いにしない
      setT((cur) => {
        const k = clampK(cur.k * (dist / prev.dist));
        const ratio = k / cur.k;
        return {
          k,
          x: mid.x - (prev.mid.x - cur.x) * ratio,
          y: mid.y - (prev.mid.y - cur.y) * ratio,
        };
      });
      return;
    }

    const g = drag.current;
    if (!g) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    g.moved = Math.max(g.moved, Math.abs(dx) + Math.abs(dy));
    setT((prev) => ({ ...prev, x: g.ox + dx, y: g.oy + dy }));
  };

  const endDrag = (e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag.current) {
      lastMoved.current = drag.current.moved;
      drag.current = null;
    }
  };

  const handlePinClick = (d) => {
    if (lastMoved.current > 5) return;
    onSelect?.(d.id);
  };

  const inv = 1 / t.k; // 地形の線幅を画面上で一定に保つ

  return (
    <div
      ref={wrapRef}
      className="kwl-map"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 280,
        background: C.mapBg,
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ display: "block", cursor: drag.current ? "grabbing" : "grab" }}
      >
        <defs>
          <radialGradient id="kwl-sea" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#122029" />
            <stop offset="100%" stopColor={C.mapBg} />
          </radialGradient>
          <filter id="kwl-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 地形（拡大縮小する層） */}
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <path d={spherePath} fill="url(#kwl-sea)" stroke={C.gridStrong} strokeWidth={inv} />
          <path d={graticulePath} fill="none" stroke={C.grid} strokeWidth={0.6 * inv} />
          <path
            d={landPath}
            fill={C.land}
            stroke={C.landStroke}
            strokeWidth={0.5 * inv}
            strokeLinejoin="round"
          />
        </g>

        {/* 蒸留所（画面座標の層。大きさは常に一定） */}
        <g>
          {pins.map((p) => {
            const highlighted = !highlightIds || highlightIds.has(p.d.id);
            const owned = p.count > 0;
            const r = p.selected ? 5.5 : owned ? 4.5 : 3.2;
            const fill = owned ? C.bright : p.d.custom ? C.ok : C.accent;
            const shifted = Math.hypot(p.sx - p.ox, p.sy - p.oy) > 1.5;

            return (
              <g
                key={p.d.id}
                className="kwl-pin"
                opacity={highlighted ? 1 : 0.18}
                onClick={() => handlePinClick(p.d)}
                onPointerEnter={() => setHovered(p)}
                onPointerLeave={() =>
                  setHovered((h) => (h?.d.id === p.d.id ? null : h))
                }
              >
                {/* ずらした分の引き出し線（本来の位置を示す） */}
                {shifted ? (
                  <line
                    x1={p.ox}
                    y1={p.oy}
                    x2={p.sx}
                    y2={p.sy}
                    stroke={owned ? C.bright : C.accent}
                    strokeWidth={0.8}
                    opacity={0.45}
                  />
                ) : null}
                {owned || p.selected ? (
                  <circle
                    cx={p.sx}
                    cy={p.sy}
                    r={r * 2.4}
                    fill="none"
                    stroke={p.selected ? C.bright : C.accent}
                    strokeWidth={1}
                    opacity={p.selected ? 0.9 : 0.4}
                  />
                ) : null}
                <circle
                  cx={p.sx}
                  cy={p.sy}
                  r={r}
                  fill={fill}
                  stroke="#120e08"
                  strokeWidth={0.8}
                  filter={owned ? "url(#kwl-glow)" : undefined}
                />
                {/* タップ領域を広げる透明な円 */}
                <circle cx={p.sx} cy={p.sy} r={10} fill="transparent" />
              </g>
            );
          })}

          {labels.map((l) => (
            <text
              key={l.id}
              x={l.x}
              y={l.y}
              fontSize={LABEL_SIZE}
              fill={l.owned ? C.bright : C.inkDim}
              stroke="#0d1417"
              strokeWidth={2.4}
              paintOrder="stroke"
              style={{ pointerEvents: "none" }}
            >
              {l.text}
            </text>
          ))}
        </g>
      </svg>

      {/* ホバー時のツールチップ */}
      {hovered ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(hovered.sx + 12, 8), Math.max(size.w - 200, 8)),
            top: Math.min(Math.max(hovered.sy - 10, 8), size.h - 60),
            pointerEvents: "none",
            padding: "7px 10px",
            background: "rgba(20,17,13,0.94)",
            border: `1px solid ${C.borderStrong}`,
            borderRadius: radius.md,
            fontSize: 12,
            maxWidth: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontWeight: 700, color: C.ink }}>
            {hovered.d.nameJa || hovered.d.name}
          </div>
          <div style={{ color: C.inkFaint, fontSize: 11, marginTop: 2 }}>
            {hovered.d.country} / {hovered.d.region}
          </div>
          {hovered.count > 0 ? (
            <div style={{ color: C.bright, fontSize: 11, marginTop: 3 }}>
              登録ボトル {hovered.count} 本
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ズームコントロール */}
      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {[
          { icon: <Plus size={15} />, label: "拡大", act: () => zoomAround(size.w / 2, size.h / 2, 1.6) },
          { icon: <Minus size={15} />, label: "縮小", act: () => zoomAround(size.w / 2, size.h / 2, 1 / 1.6) },
          { icon: <Locate size={15} />, label: "全体表示", act: () => setT(defaultT) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            aria-label={b.label}
            title={b.label}
            onClick={b.act}
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              color: C.ink,
              background: "rgba(30,25,18,0.9)",
              border: `1px solid ${C.borderStrong}`,
              borderRadius: radius.sm,
            }}
          >
            {b.icon}
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          fontSize: 10,
          color: "rgba(242,233,216,0.35)",
          pointerEvents: "none",
        }}
      >
        ドラッグで移動 / ホイール・ピンチで拡大縮小
      </div>
    </div>
  );
}
