import OpenAI from "openai";
import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
});

const FREE_LIMIT = 3;

function hashIP(ip) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN}`)
    .digest("hex");
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    const text = body.text;

    if (!text || !text.trim()) {
      return Response.json(
        { error: "Text is required." },
        { status: 400 }
      );
    }

    // Get or create anonymous session
    let sessionId = cookieStore.get("nri_session")?.value;

    if (!sessionId) {
      sessionId = crypto.randomUUID();

      cookieStore.set("nri_session", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    // Hash IP for abuse protection
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "unknown";

    const ipHash = hashIP(ip);

    // Usage keys
    const sessionKey = `nri:usage:session:${sessionId}`;
    const ipKey = `nri:usage:ip:${ipHash}`;

    // Current usage
    const sessionUsage = Number((await redis.get(sessionKey)) || 0);
    const ipUsage = Number((await redis.get(ipKey)) || 0);

    // Block after 3 free analyses
    if (sessionUsage >= FREE_LIMIT || ipUsage >= FREE_LIMIT) {
      return Response.json(
        {
          error: "Free analysis limit reached.",
          limit: FREE_LIMIT,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: `
You are NRI (Narrative Reasoning Intelligence).

Your role is an analytical assistant, not an AI verdict.

Analyze the submitted narrative carefully. Separate what is explicitly stated from assumptions, framing, interpretation, and missing context.

Return a structured analysis with these sections:

1. Primary Claim
2. Evidence
3. Assumptions
4. Framing
5. Missing Context

For each section, provide a clear and concise analysis based only on the submitted narrative.

IMPORTANT OUTPUT FORMAT:

Use exactly these five section titles, in this exact order:

1. Primary Claim
2. Evidence
3. Assumptions
4. Framing
5. Missing Context

Do NOT add Markdown heading symbols such as # or ##.
Do NOT add any title before "1. Primary Claim".
Do NOT add any other sections.

Be neutral and evidence-oriented.
Do not invent facts that are not present in the submitted text.
If information is insufficient, explicitly say so.
          `,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    // Count successful analysis
    const newSessionUsage = sessionUsage + 1;
    const newIpUsage = ipUsage + 1;

    await redis.set(sessionKey, newSessionUsage, {
      ex: 60 * 60 * 24 * 30,
    });

    await redis.set(ipKey, newIpUsage, {
      ex: 60 * 60 * 24 * 30,
    });

    return Response.json({
      success: true,
      analysis: response.output_text,
      usage: {
        used: newSessionUsage,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - newSessionUsage),
      },
    });
  } catch (error) {
    console.error("NRI analysis error:", error);

    return Response.json(
      {
        error: "Analysis failed.",
        details: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}