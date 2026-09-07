import React, { useEffect, useRef } from "react";
import { X, Star } from "lucide-react";
import { C, radius } from "../theme.js";

/* ------------------------------- Button ------------------------------- */
export function Button({
  children,
  variant = "default",
  size = "md",
  style,
  ...rest
}) {
  const palette = {
    default: { bg: C.raised, fg: C.ink, border: C.border },
    primary: { bg: C.accent, fg: "#1a1409", border: C.accent },
    ghost: { bg: "transparent", fg: C.inkDim, border: "transparent" },
    danger: { bg: "transparent", fg: C.danger, border: "rgba(201,97,75,0.4)" },
  }[variant];

  const pad = size === "sm" ? "5px 10px" : size === "lg" ? "12px 20px" : "8px 14px";

  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: pad,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: variant === "primary" ? 700 : 600,
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: radius.md,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        opacity: rest.disabled ? 0.45 : 1,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Fields ------------------------------- */
const fieldStyle = {
  width: "100%",
  padding: "9px 11px",
  fontSize: 13,
  color: C.ink,
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: radius.md,
};

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.06em", color: C.muted, fontWeight: 700 }}>
          {label}
        </span>
        {hint ? <span style={{ fontSize: 10, color: C.inkFaint }}>{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function Input(props) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }} />;
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      style={{ ...fieldStyle, resize: "vertical", minHeight: 78, lineHeight: 1.6, ...props.style }}
    />
  );
}

export function Select({ options, ...props }) {
  return (
    <select {...props} style={{ ...fieldStyle, ...props.style }}>
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

/* -------------------------------- Chip -------------------------------- */
export function Chip({ active, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        padding: "5px 11px",
        fontSize: 12,
        fontWeight: 600,
        color: active ? "#1a1409" : C.inkDim,
        background: active ? C.accent : "transparent",
        border: `1px solid ${active ? C.accent : C.border}`,
        borderRadius: radius.pill,
        whiteSpace: "nowrap",
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------- Badge -------------------------------- */
export function Badge({ children, tone = "default", style }) {
  const tones = {
    default: { fg: C.inkDim, bg: "rgba(255,255,255,0.04)", bd: C.border },
    accent: { fg: C.bright, bg: "rgba(209,154,74,0.12)", bd: "rgba(209,154,74,0.35)" },
    ok: { fg: C.ok, bg: "rgba(127,165,100,0.12)", bd: "rgba(127,165,100,0.3)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 600,
        color: tones.fg,
        background: tones.bg,
        border: `1px solid ${tones.bd}`,
        borderRadius: radius.pill,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Stars -------------------------------- */
export function Stars({ value = 0, onChange, size = 16, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {stars.map((n) => {
        const filled = value >= n - 0.25;
        const half = !filled && value >= n - 0.75;
        const icon = (
          <Star
            size={size}
            strokeWidth={1.8}
            color={filled || half ? C.bright : C.borderStrong}
            fill={filled ? C.bright : half ? "rgba(238,195,126,0.4)" : "none"}
          />
        );
        if (readOnly || !onChange) return <span key={n}>{icon}</span>;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n}点`}
            onClick={() => onChange(value === n ? n - 0.5 : n)}
            style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }}
          >
            {icon}
          </button>
        );
      })}
      <span style={{ marginLeft: 6, fontSize: 12, color: C.inkFaint }}>
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

/* ------------------------------- Modal -------------------------------- */
export function Modal({ title, subtitle, onClose, children, width = 460 }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,2,0.72)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 60,
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="kwl-enter"
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "88vh",
          overflowY: "auto",
          background: C.surface,
          border: `1px solid ${C.borderStrong}`,
          borderRadius: radius.lg,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          outline: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.surface,
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 15, letterSpacing: "0.02em" }}>{title}</h2>
            {subtitle ? (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.inkFaint }}>{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: "none",
              border: "none",
              color: C.inkFaint,
              padding: 2,
              lineHeight: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ StatTile ------------------------------ */
export function StatTile({ label, value, sub }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: C.raised,
        border: `1px solid ${C.border}`,
        borderRadius: radius.md,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", color: C.muted, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.bright, lineHeight: 1.25 }}>
        {value}
      </div>
      {sub ? <div style={{ fontSize: 11, color: C.inkFaint }}>{sub}</div> : null}
    </div>
  );
}

/* ------------------------------ Empty --------------------------------- */
export function EmptyState({ icon, title, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "34px 18px",
        textAlign: "center",
        color: C.inkFaint,
      }}
    >
      {icon}
      <div style={{ fontSize: 13, color: C.inkDim, fontWeight: 600 }}>{title}</div>
      {children ? <div style={{ fontSize: 12, maxWidth: 320, lineHeight: 1.7 }}>{children}</div> : null}
    </div>
  );
}
