"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderCard } from "@/lib/cardRenderer";
import { loadLogoMark } from "@/lib/logo";
import {
  CardInput,
  EMPTY_CARD,
  EXPERIENCES,
  FLAVORS,
  LIMITS,
  readableOn,
  sanitizeCardInput,
  SERVES,
} from "@/lib/taste";

const STORAGE_KEY = "kwl-taste-card:input";

export default function CardStudio() {
  const [input, setInput] = useState<CardInput>(EMPTY_CARD);
  const [artwork, setArtwork] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLCanvasElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [useAiArt, setUseAiArt] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setInput(sanitizeCardInput(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  }, [input]);

  useEffect(() => {
    loadLogoMark().then(setLogo);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const family = getComputedStyle(document.body).fontFamily;
    renderCard(canvas, input, artwork, family, logo);
  }, [input, artwork, logo]);

  const logoUrl = useMemo(() => logo?.toDataURL() ?? null, [logo]);

  const cycleFlavor = useCallback((id: string) => {
    setInput((prev) => {
      if (prev.likes.includes(id)) {
        const likes = prev.likes.filter((x) => x !== id);
        if (prev.dislikes.length >= LIMITS.dislikes) return { ...prev, likes };
        return { ...prev, likes, dislikes: [...prev.dislikes, id] };
      }
      if (prev.dislikes.includes(id)) {
        return { ...prev, dislikes: prev.dislikes.filter((x) => x !== id) };
      }
      if (prev.likes.length >= LIMITS.likes) return prev;
      return { ...prev, likes: [...prev.likes, id] };
    });
  }, []);

  const toggleServe = useCallback((id: string) => {
    setInput((prev) => {
      if (prev.serves.includes(id)) return { ...prev, serves: prev.serves.filter((x) => x !== id) };
      if (prev.serves.length >= LIMITS.serves) return prev;
      return { ...prev, serves: [...prev.serves, id] };
    });
  }, []);

  /** 縦一列になる画面ではプレビューがフォームの下にあるため、結果まで送る */
  const revealPreview = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const generate = async () => {
    setNotice(null);
    if (!useAiArt) {
      setArtwork(null);
      revealPreview();
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch("/api/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !data.image) {
        setArtwork(null);
        setNotice(data.error ?? "アートワークを生成できませんでした。好みの色でカードを作ります。");
      } else {
        const image = new Image();
        image.src = data.image;
        await image.decode();
        setArtwork(image);
      }
    } catch {
      setArtwork(null);
      setNotice("通信に失敗しました。好みの色でカードを作ります。");
    } finally {
      setGenerating(false);
      revealPreview();
    }
  };

  const cardBlob = () =>
    new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, "image/png"));

  const fileName = `kwl-taste-card-${input.nickname || "card"}.png`;

  const download = async () => {
    const blob = await cardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const blob = await cardBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "KWL 好み交換カード" }).catch(() => {});
    } else {
      await download();
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:py-16">
      <header className="mb-12 flex max-w-3xl items-start gap-5 sm:gap-7">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 変換済みの data URL なので最適化の対象外
          <img src={logoUrl} alt="" className="w-16 shrink-0 sm:w-28" />
        )}
        <div>
          <p className="text-xs font-bold tracking-[0.28em] text-amber">KANSAI WHISKY LOVERS</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">好み交換カード</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            「何がお好きですか?」「苦手なものは?」を毎回ひとつずつ聞かなくていいように。
            好きな味と苦手な味がひと目で伝わる、名刺がわりのカード画像を作ります。
          </p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <Section title="あなたのこと">
            <Field label="ニックネーム">
              <input
                value={input.nickname}
                onChange={(e) => setInput((p) => ({ ...p, nickname: e.target.value.slice(0, LIMITS.nickname) }))}
                placeholder="例: たけ / KWL 太郎"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base outline-none placeholder:text-muted/50 focus:border-amber"
              />
            </Field>
            <Field label="ウイスキー歴">
              <div className="flex flex-wrap gap-2">
                {EXPERIENCES.map((exp) => (
                  <Chip
                    key={exp.id}
                    active={input.experience === exp.id}
                    onClick={() => setInput((p) => ({ ...p, experience: exp.id }))}
                  >
                    {exp.label}
                  </Chip>
                ))}
              </div>
            </Field>
          </Section>

          <Section
            title="好きな味・苦手な味"
            note="タップするたび 好き → 苦手 → 解除 と切り替わります"
          >
            <div className="mb-4 flex gap-4 text-xs text-muted">
              <span>
                好き <b className="text-amber">{input.likes.length}</b> / {LIMITS.likes}
              </span>
              <span>
                苦手 <b className="text-ink">{input.dislikes.length}</b> / {LIMITS.dislikes}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {FLAVORS.map((flavor) => {
                const liked = input.likes.includes(flavor.id);
                const disliked = input.dislikes.includes(flavor.id);
                return (
                  <button
                    key={flavor.id}
                    type="button"
                    onClick={() => cycleFlavor(flavor.id)}
                    style={liked ? { backgroundColor: flavor.color, color: readableOn(flavor.color) } : undefined}
                    className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
                      liked
                        ? "border-transparent"
                        : disliked
                          ? "border-dashed border-muted/60 text-muted line-through"
                          : "border-line bg-surface-2 text-ink/80 hover:border-amber/60"
                    }`}
                  >
                    {flavor.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="飲み方と一本">
            <Field label={`好きな飲み方(${LIMITS.serves}つまで)`}>
              <div className="flex flex-wrap gap-2">
                {SERVES.map((serve) => (
                  <Chip key={serve.id} active={input.serves.includes(serve.id)} onClick={() => toggleServe(serve.id)}>
                    {serve.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="いま推してる一本">
              <input
                value={input.favoriteDram}
                onChange={(e) =>
                  setInput((p) => ({ ...p, favoriteDram: e.target.value.slice(0, LIMITS.favoriteDram) }))
                }
                placeholder="例: アードベッグ ウーガダール"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base outline-none placeholder:text-muted/50 focus:border-amber"
              />
            </Field>
            <Field label="ひとこと">
              <input
                value={input.comment}
                onChange={(e) => setInput((p) => ({ ...p, comment: e.target.value.slice(0, LIMITS.comment) }))}
                placeholder="例: 甘いのから煙いのまで、一杯ずつ開拓中です"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base outline-none placeholder:text-muted/50 focus:border-amber"
              />
            </Field>
          </Section>

          <Section title="カードを作る">
            <label className="mb-5 flex items-start gap-3 text-sm text-muted">
              <input
                type="checkbox"
                checked={useAiArt}
                onChange={(e) => setUseAiArt(e.target.checked)}
                className="mt-0.5 size-4 accent-amber"
              />
              <span>
                好きな味に合わせた背景アートを AI で生成する
                <span className="mt-0.5 block text-xs text-muted/70">
                  オフにすると、好きな味の色から作るグラデーション背景になります
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="rounded-xl bg-amber px-6 py-3.5 text-base font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              >
                {generating ? "生成中…(30秒ほど)" : "背景をつくる"}
              </button>
              <button
                type="button"
                onClick={download}
                className="rounded-xl border border-line bg-surface-2 px-6 py-3.5 text-base font-bold transition hover:border-amber/60"
              >
                PNG を保存
              </button>
              <button
                type="button"
                onClick={share}
                className="rounded-xl border border-line bg-surface-2 px-6 py-3.5 text-base font-bold transition hover:border-amber/60"
              >
                共有
              </button>
            </div>
            {notice && <p className="mt-4 text-sm text-amber/90">{notice}</p>}
          </Section>
        </div>

        <aside ref={previewRef} className="scroll-mt-6 lg:sticky lg:top-10 lg:self-start">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-muted">PREVIEW</p>
          <div className="overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/60">
            <canvas ref={canvasRef} className="block w-full" />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted/80">
            入力するとその場で反映されます。イベントではこの画像を見せ合うだけで、好みの話が始められます。
          </p>
        </aside>
      </div>
    </main>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/70 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold tracking-wider text-muted">{label}</label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-bold transition ${
        active ? "border-amber bg-amber/15 text-amber" : "border-line bg-surface-2 text-ink/80 hover:border-amber/60"
      }`}
    >
      {children}
    </button>
  );
}
