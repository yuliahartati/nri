import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = new Redis({ url, token });

export async function POST(req) {
  try {
    const { code } = await req.json();
    const c = String(code || "").trim().toUpperCase();
    if (!c.startsWith("BASIC-") && !c.startsWith("PRO-")) {
      return Response.json({ success: false, error: "Kode tidak valid." }, { status: 400 });
    }
    const key = `nri:code:${c}`;
    const status = await redis.get(key);
    if (!status) {
      return Response.json({ success: false, error: "Kode tidak ditemukan. Cek lagi atau hubungi WA." }, { status: 404 });
    }
    if (status !== "unused") {
      return Response.json({ success: false, error: "Kode ini sudah dipakai. 1 kode cuma buat 1 orang." }, { status: 409 });
    }
    await redis.set(key, "used");
    const tier = c.startsWith("PRO-") ? "pro" : "basic";
    return Response.json({ success: true, tier });
  } catch (e) {
    return Response.json({ success: false, error: "Gagal aktivasi." }, { status: 500 });
  }
}
