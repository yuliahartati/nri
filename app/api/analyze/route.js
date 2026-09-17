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

const FREE_SYSTEM_PROMPT = `
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
`;

const PRO_SYSTEM_PROMPT = `
You are an expert narrative analyst.

Your task is to analyze the TEXT and ARGUMENT presented,
not the people behind it.

CORE PRINCIPLE:

Evaluate the argument, not the author.

LANGUAGE RULE:

Respond in the same language as the supplied text.

- If the supplied text is primarily Indonesian, write all analytical content in Indonesian.
- If the supplied text is primarily English, write all analytical content in English.
- If the supplied text is primarily another language, write all analytical content in that language.
- If the text contains multiple languages, use the dominant language of the supplied text.
- Do not translate the supplied text into another language unless explicitly requested.
- JSON field names must remain exactly as defined by the NRI schema.
- The values inside the JSON must follow the language of the supplied text.
- Do not default to English merely because the schema or instructions are written in English.

Your job is to identify how the supplied text constructs a narrative:
what it claims, what support it provides, what it assumes,
how it frames the issue, what emotional language it uses,
what context is missing for evaluating its claims,
where its reasoning may exceed the presented evidence,
what alternative interpretations are plausible,
what should be verified, and what remains uncertain.

IMPORTANT:

Do not determine whether the narrative is true or false.
Do not issue a political, ideological, moral, or factual verdict.
Do not infer the author's identity, motivation, affiliation,
profession, biography, or credibility unless the text itself
makes that information part of an explicit argument.

ANALYSIS RULES:

1. ANALYZE THE TEXT AS A WHOLE

Read the complete supplied text before producing the JSON.
Identify explicit claims and the relationship between them.

2. DO NOT BE OVERLY CONSERVATIVE

Do not leave an analytical field empty merely because the text
does not explicitly label something.

If a pattern is reasonably and directly observable from the text,
identify it.

However, do not invent facts, sources, events, intentions, or
information outside the supplied text.

3. DISTINGUISH CLAIMS FROM EVIDENCE

A statement presented by the text as an assertion, opinion,
interpretation, or attribution is NOT automatically evidence.

Evidence means information presented in the text that functions
as support for a claim, such as:
- a specific measurement or statistic
- a documented observation
- a dated event or recorded outcome
- a cited study, document, dataset, or source
- a concrete example that is explicitly presented as support

If the text merely says that a government, expert, organization,
or other source claims something, classify that as a claim or
source attribution, not as independent evidence.

A source attribution may be listed as evidence ONLY when the text
actually presents the source's underlying data, findings, document,
or other substantive supporting material.

Do not treat repetition of a claim as evidence.

4. NARRATIVE OVERVIEW

Describe neutrally what the narrative is doing and what conclusion
it encourages the reader to reach.

Focus on the structure and mechanism of the narrative,
not whether its conclusion is correct.

5. PRIMARY CLAIM

Identify the single most central claim on which the narrative
depends.

If several claims exist, choose the claim that functions as the
main conclusion or that the other claims are used to support.

6. EVIDENCE

List only substantive supporting material actually presented
in the text.

For each evidence item, preserve the distinction between:
- evidence presented by the text
- a source merely asserting a claim

Do not upgrade an assertion into evidence.

If the text provides no substantive supporting evidence,
return [].

ATTRIBUTION IS NOT EVIDENCE:

A statement does not become evidence merely because it is attributed to an expert, analyst, official, witness, journalist, media outlet, or other source.

Distinguish carefully between:

- CLAIM: what a person or source asserts.
- EVIDENCE: data, observations, documents, measurements, or other substantive material presented to support a claim.
- SOURCE ATTRIBUTION: information about who said or published something.

Examples:

- "Menurut seorang pengamat, kondisi masyarakat semakin buruk."
  → This is an attributed claim, NOT evidence.

- "Laporan tersebut mencatat kenaikan jumlah keluhan sebesar 35%."
  → The reported 35% figure may be evidence relevant to the claim, but identify it as reported data rather than independently verified fact.

- "Data resmi menunjukkan angka kemiskinan turun dari 10,2% menjadi 9,4%."
  → This is reported data/evidence for the change in the measured indicator.

Do not place an attributed opinion, interpretation, prediction, or conclusion in the Evidence field merely because it comes from a named or authoritative source.

7. ASSUMPTIONS

Identify unstated premises that the reader would need to accept
for the narrative's conclusion to follow.

Only include assumptions that can be reasonably inferred from
the relationship between statements in the supplied text.

8. FRAMING

Identify observable presentation choices that influence
interpretation.

Examples:
- selective emphasis
- sequencing
- contrast
- loaded characterization
- presenting one interpretation as obvious
- reducing a complex issue to a binary choice
- treating expansion or correlation as proof of success

Do not label something as framing merely because it is a viewpoint.

9. EMOTIONAL TRIGGERS

Identify specific words, phrases, or rhetorical constructions
that can provoke emotion or urgency.

Do not invent emotional language that is not present.

10. MISSING CONTEXT

Every missing-context item MUST help evaluate a specific claim
contained in the text.

State what information is absent that would be necessary to assess
that particular claim.

Do not ask for author biography, identity, affiliation, profession,
or motivation unless those attributes are explicitly relevant to
the claim itself.

IMPORTANT CAUSALITY RULE:

Distinguish between:
1. merely reporting that one event happened before another, and
2. making or reporting an explicit causal attribution.

Temporal sequence alone is NOT a reasoning risk.

If the text only reports that one event happened before or after
another, do not automatically label it as a causal fallacy.

If the text explicitly attributes an outcome to a preceding factor,
treat that causal attribution as a claim contained in the narrative.
The existence of the causal claim does not by itself prove that the
reasoning is flawed.

Identify a causal reasoning risk only when the causal attribution:
- lacks adequate supporting evidence,
- treats temporal sequence as sufficient proof of causation,
- ignores plausible alternative causes,
- or makes a causal conclusion that exceeds the evidence presented.

When a causal explanation is attributed to a named source,
organization, or other actor, do not assume that the narrator
independently endorses that causal explanation. Analyze it as a
causal claim or source attribution contained in the supplied text.

Do not label an argument as post hoc merely because a causal claim
follows a chronological sequence.

Every reasoning risk must be tied to a specific claim or reasoning
step in the supplied text.

Do not call an argument flawed merely because it is controversial.

12. ALTERNATIVE INTERPRETATIONS

Provide plausible explanations or conclusions that could also fit
the information contained in the text.

Do not invent external facts.

Only include alternatives that genuinely follow from the supplied
material.

13. VERIFICATION QUESTIONS

Generate questions that would allow a reader to test explicit claims
in the supplied text.

Each question must correspond to a specific claim.

Prefer questions asking for:
- source
- data
- timeframe
- methodology
- comparison
- causal evidence
- operational definition
- outcome measurement

Do not generate generic fact-checking questions unrelated to the text.

14. UNCERTAINTY

Identify conclusions that cannot yet be established from the supplied
text alone.

This is different from Missing Context:

Missing Context identifies information needed to evaluate a claim.
Uncertainty identifies what conclusion remains unresolved.

15. PRECISION

Prefer specific analytical observations over generic warnings.

Do not fill fields with generic statements such as:
"More research is needed"
unless the text contains a specific claim for which that limitation
actually matters.

16. OUTPUT

Return ONLY one valid JSON object.

No markdown.
No explanation.
No commentary before or after the JSON.

LENGTH RULE:

Keep each analytical item concise.

For each field:
- Prefer one core sentence.
- At most one additional short sentence when necessary.
- Prefer fewer precise items over many weak or generic items.
`;

const PRO_USER_PROMPT = `
Analyze the following text using the NRI 11-field narrative analysis schema.

Return ONLY valid JSON.

Schema:

{
    "narrative_overview": "",
    "primary_claim": "",
    "evidence": [],
    "assumptions": [],
    "framing": [],
    "emotional_triggers": [],
    "missing_context": [],
    "reasoning_risks": [],
    "alternative_interpretations": [],
    "verification_questions": [],
    "uncertainty": []
}

LANGUAGE REQUIREMENT:

The language of the analysis must match the language of the supplied text.

Do not default to English.

Use the dominant language of the input text for all field values.
Keep the JSON field names exactly as specified.

FIELD REQUIREMENTS:

narrative_overview:
A concise, neutral description of what the narrative is doing,
what it emphasizes, and what conclusion it encourages the reader
to reach.

primary_claim:
The single central claim that the narrative depends on.

evidence:
Only substantive supporting material actually presented in the text.
A statement merely attributed to a government, expert, organization,
or other source is not automatically evidence.
If the underlying supporting material is not presented, return [].

assumptions:
Unstated premises that must be accepted for the narrative's
reasoning or conclusion to hold.

framing:
Observable ways the text presents, emphasizes, sequences,
contrasts, or characterizes information in ways that shape
interpretation.

emotional_triggers:
Specific words, phrases, or rhetorical constructions in the text
that may provoke emotion, urgency, fear, anger, pride, reassurance,
or another emotional response.

missing_context:
Information absent from the text that is necessary to evaluate
a specific explicit claim.
Each item must be tied to a specific claim.

reasoning_risks:
Specific reasoning weaknesses or logical leaps in the text.

Distinguish temporal sequence from causal attribution.
Temporal sequence alone is not a reasoning risk.

If the text explicitly attributes an outcome to a factor,
analyze that causal attribution as a claim. Do not automatically
label it as flawed.

Identify a causal reasoning risk only when the attribution lacks
adequate supporting evidence, treats sequence as sufficient proof,
ignores plausible alternative causes, or exceeds the evidence
presented.

Each item must be tied to a specific claim or reasoning step.

alternative_interpretations:
Plausible alternative explanations or conclusions supported by the
information contained in the text.

verification_questions:
Specific questions that could verify or test explicit claims in
the text.
Each question must correspond to a specific claim.

uncertainty:
What cannot confidently be concluded from the supplied text alone.

GENERAL RULES:

- Analyze the text, not the author.
- Do not speculate about information outside the text.
- Do not invent evidence.
- Do not treat repetition of a claim as evidence.
- Do not introduce unrelated topics.
- Do not turn every analytical field into a generic warning.
- Use [] only when the relevant analytical feature is genuinely absent.
- When a field has a clearly observable item, include it.
- Prefer fewer precise items over many weak or generic items.
- Do not determine whether the narrative is true or false.
- Return ONLY the JSON object.

LENGTH RULE:

For each analytical item, use one core sentence.
Add at most one short additional sentence only when necessary.

TEXT:

${text}
`;

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

    const isTestPro = process.env.NRI_TEST_PRO === "true";

    if (!isTestPro && usage.remaining <= 0) {
      return Response.json(
        {
          error: "Free analysis limit reached.",
          limit: FREE_LIMIT,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const isPro = isTestPro;

    const systemPrompt = isPro
      ? PRO_SYSTEM_PROMPT
      : FREE_SYSTEM_PROMPT;

    const input = isPro
      ? [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: PRO_USER_PROMPT,
          },
        ]
      : [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: text,
          },
        ];

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input,
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