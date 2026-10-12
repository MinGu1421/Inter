import { list, get } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  const key = String(req.query.key || "");
  const admin = String(process.env.ADMIN_KEY || "");
  if (!admin || key.length !== admin.length || !timingSafeEqual(Buffer.from(key), Buffer.from(admin))) {
    return res.status(401).json({ error: "관리자 키가 올바르지 않아요." });
  }

  const records = [];
  let cursor;
  do {
    const page = await list({ prefix: "responses/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      try {
        const r = await get(b.pathname, { access: "private", useCache: false });
        if (!r || !r.stream) continue;
        const text = await new Response(r.stream).text();
        records.push(JSON.parse(text));
      } catch (e) {
        console.error("read failed", b.pathname, e);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  records.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ count: records.length, records });
}
