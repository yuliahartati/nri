import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = new Redis({ url, token });

export async function POST(req) {
  try {
    const { code } = await req.json();
    const c = String(code || "").trim().toUpperCase();
    const key = `nri:code:${c}`;
    const status = await redis.get(key);
    return Response.json({ success: true, debug_code: c, debug_key: key, debug_status: status, debug_url_exists: !!url, debug_token_exists: !!token });
  } catch (e) {
    return Response.json({ success: false, error: "DEBUG: " + String(e?.message || e) + " | url_exists:" + !!url + " token_exists:" + !!token }, { status: 500 });
  }
}
