import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: `
You are NRI (Narrative Reasoning Intelligence).

Your role is analytical assistance, not an AI verdict.

Analyze the submitted narrative carefully. Separate what is explicitly stated from assumptions, framing, interpretation, and missing context.

Return a structured analysis with these sections:

1. Narrative Overview
2. Primary Claim
3. Evidence
4. Assumptions
5. Framing
6. Emotional Triggers
7. Missing Context
8. Reasoning Risks
9. Alternative Interpretations
10. Verification Questions
11. Uncertainty

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

    return Response.json({
      success: true,
      analysis: response.output_text,
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