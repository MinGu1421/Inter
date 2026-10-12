import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

// 문항 구조와 동일해야 합니다 (public/questions.js)
const ITEM_COUNTS = { facility: 6, program: 3, safety: 3, transport: 4, staff: 3, etc: 1 };
const COMMENT_KEYS = [...Object.keys(ITEM_COUNTS), "free"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "허용되지 않는 요청이에요." });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  if (!body || typeof body !== "object") return res.status(400).json({ error: "잘못된 요청이에요." });

  // 봇 방지용 숨김 입력칸: 값이 있으면 조용히 성공 처리
  if (body.website) return res.status(200).json({ ok: true });

  const answers = {};
  for (const [sec, n] of Object.entries(ITEM_COUNTS)) {
    for (let i = 0; i < n; i++) {
      const v = Number(body.answers?.[`${sec}_${i}`]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return res.status(400).json({ error: "모든 문항에 답해 주세요." });
      }
      answers[`${sec}_${i}`] = v;
    }
  }

  const comments = {};
  for (const k of COMMENT_KEYS) {
    const t = body.comments?.[k];
    if (typeof t === "string" && t.trim()) comments[k] = t.trim().slice(0, k === "free" ? 1000 : 500);
  }

  const record = { submittedAt: new Date().toISOString(), answers, comments };
  try {
    await put(`responses/${Date.now()}-${randomUUID()}.json`, JSON.stringify(record), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch (e) {
    console.error("save failed", e);
    return res.status(500).json({ error: "저장에 실패했어요." });
  }
  return res.status(200).json({ ok: true });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
