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

const FREE_LIMIT = 999;

function hashIP(ip) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN}`)
    .digest("hex");
}

function getIP(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

async function getUsage(request) {
  const cookieStore = await cookies();

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

  const ipHash = hashIP(getIP(request));

  const sessionKey = `nri:usage:session:${sessionId}`;
  const ipKey = `nri:usage:ip:${ipHash}`;

  const sessionUsage = Number((await redis.get(sessionKey)) || 0);
  const ipUsage = Number((await redis.get(ipKey)) || 0);

  const used = Math.max(sessionUsage, ipUsage);
  const remaining = Math.max(0, FREE_LIMIT - used);

  return {
    sessionKey,
    ipKey,
    used,
    remaining,
  };
}

export async function GET(request) {
  try {
    const usage = await getUsage(request);

    return Response.json({
      success: true,
      limit: FREE_LIMIT,
      used: usage.used,
      remaining: usage.remaining,
    });
  } catch (error) {
    console.error("NRI quota error:", error);

    return Response.json(
      {
        error: "Unable to check usage.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || !text.trim()) {
      return Response.json(
        { error: "Text is required." },
        { status: 400 }
      );
    }

    const usage = await getUsage(request);

    if (usage.remaining <= 0) {
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

    const newUsage = usage.used + 1;

    await redis.set(usage.sessionKey, newUsage, {
      ex: 60 * 60 * 24 * 30,
    });

    await redis.set(usage.ipKey, newUsage, {
      ex: 60 * 60 * 24 * 30,
    });

    return Response.json({
      success: true,
      analysis: response.output_text,
      usage: {
        used: newUsage,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - newUsage),
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