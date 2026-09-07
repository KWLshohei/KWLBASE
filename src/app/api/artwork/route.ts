import { NextRequest, NextResponse } from "next/server";
import { buildArtworkPrompt } from "@/lib/prompt";
import { sanitizeCardInput } from "@/lib/taste";

export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, { count: number; reset: number }>();

/** 1 インスタンス内での簡易レート制限。API キーの浪費を防ぐのが目的。 */
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "画像生成 API キーが未設定です。好みの色でカードを作ります。", code: "no_api_key" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "生成のリクエストが多すぎます。少し時間をおいてお試しください。", code: "rate_limited" },
      { status: 429 },
    );
  }

  const input = sanitizeCardInput(await request.json().catch(() => null));

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt: buildArtworkPrompt(input),
        size: "1024x1536",
        quality: "medium",
        n: 1,
      }),
    });

    if (!response.ok) {
      console.error("artwork upstream error", response.status, await response.text());
      return NextResponse.json(
        { error: "アートワークの生成に失敗しました。好みの色でカードを作ります。", code: "upstream_error" },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as { data?: { b64_json?: string }[] };
    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "アートワークの生成に失敗しました。好みの色でカードを作ります。", code: "empty_response" },
        { status: 502 },
      );
    }

    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error("artwork request failed", error);
    return NextResponse.json(
      { error: "アートワークの生成に失敗しました。好みの色でカードを作ります。", code: "network_error" },
      { status: 502 },
    );
  }
}
