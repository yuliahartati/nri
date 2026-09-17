"use client";

import { useState, useEffect } from "react";

const SECTION_TITLES = [
  "Narrative Overview",
  "Primary Claim",
  "Evidence",
  "Assumptions",
  "Framing",
  "Emotional Triggers",
  "Missing Context",
  "Reasoning Risks",
  "Alternative Interpretations",
  "Verification Questions",
  "Uncertainty",
];

const FIELD_LABELS = {
  narrative_overview: "Narrative Overview",
  primary_claim: "Primary Claim",
  evidence: "Evidence",
  assumptions: "Assumptions",
  framing: "Framing",
  emotional_triggers: "Emotional Triggers",
  missing_context: "Missing Context",
  reasoning_risks: "Reasoning Risks",
  alternative_interpretations: "Alternative Interpretations",
  verification_questions: "Verification Questions",
  uncertainty: "Uncertainty",
};

function parseAnalysis(text) {
  // New JSON format
  try {
    const parsed = JSON.parse(text);

    if (parsed && typeof parsed === "object") {
      return Object.entries(FIELD_LABELS)
        .filter(([key]) => parsed[key] !== undefined)
        .map(([key, title]) => ({
          title,
          body: parsed[key],
        }));
    }
  } catch (error) {
    // Fall back to legacy text format
  }

  // Legacy numbered format
  const pattern = new RegExp(
    `(\\d+\\.\\s*(?:${SECTION_TITLES.join("|")}))`,
    "g"
  );

  const parts = text
    .split(pattern)
    .filter((p) => p.trim() !== "");

  const sections = [];

  for (let i = 0; i < parts.length; i++) {
    if (SECTION_TITLES.some((t) => parts[i].includes(t))) {
      sections.push({
        title: parts[i].trim(),
        body: (parts[i + 1] || "").trim(),
      });

      i++;
    }
  }

  return sections;
}

function renderSectionBody(body) {
  if (Array.isArray(body)) {
    return (
      <ul style={styles.list}>
        {body.map((item, index) => (
          <li key={index} style={styles.listItem}>
            {typeof item === "string"
              ? item
              : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof body === "object" && body !== null) {
    return (
      <div style={styles.objectBody}>
        {Object.entries(body).map(([key, value]) => (
          <div key={key} style={styles.objectItem}>
            <div style={styles.objectKey}>
              {key.replace(/_/g, " ")}
            </div>

            <div style={styles.objectValue}>
              {typeof value === "string"
                ? value
                : JSON.stringify(value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return body;
}

function downloadMarkdown(analysisText, originalText) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const content = `# NRI Analysis Report

Generated: ${new Date().toLocaleString()}

## Original Text Analyzed

${originalText}

## Analysis

${analysisText}
`;

  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `nri-analysis-${stamp}.md`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [freeCount, setFreeCount] = useState(0);
  const [limit, setLimit] = useState(3);

  useEffect(() => {
    async function loadQuota() {
      try {
        const response = await fetch("/api/analyze", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (data.success) {
          setFreeCount(data.used);
          setLimit(data.limit);
        }
      } catch (error) {
        console.error("Quota check failed:", error);
      }
    }

    loadQuota();
  }, []);

  async function handleAnalyze() {
    if (freeCount >= limit) {
      setResult({
        error: "Free analysis limit reached.",
        limit: limit,
        remaining: 0,
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      setResult(data);

      if (data.success && data.usage) {
        setFreeCount(data.usage.used);
      }

      if (response.status === 429) {
        setFreeCount(limit);
      }
    } catch (error) {
      setResult({
        error: "Connection failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <div style={styles.logo}>NRI</div>

        <p style={styles.eyebrow}>
          NARRATIVE REASONING INTELLIGENCE
        </p>

        <h1 style={styles.title}>
          Understand the narrative.
          <br />
          Don’t just react to it.
        </h1>

        <p style={styles.subtitle}>
          Analytical assistance for understanding claims, evidence,
          assumptions, framing, and missing context.
        </p>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>Analyze a narrative</span>

            <span style={styles.free}>
              {Math.max(0, limit - freeCount)} FREE
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={freeCount >= limit}
            placeholder="Paste a statement, news excerpt, caption, or argument here..."
            style={styles.textarea}
          />

          <div style={styles.bottomRow}>
            <span style={styles.counter}>
              {text.length} characters
            </span>

            <button
              onClick={handleAnalyze}
              disabled={
                !text.trim() ||
                loading ||
                freeCount >= limit
              }
              style={{
                ...styles.button,
                opacity:
                  text.trim() &&
                  !loading &&
                  freeCount < limit
                    ? 1
                    : 0.45,
              }}
            >
              {loading ? "Analyzing..." : "Analyze →"}
            </button>
          </div>
        </div>

        {result && (
          <div style={styles.resultCard}>
            {result.analysis ? (
              <>
                <div style={styles.resultHeader}>
                  <div>
                    <div style={styles.resultTitle}>
                      NRI Analysis
                    </div>

                    <div style={styles.resultSubtitle}>
                      Structured narrative analysis
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      downloadMarkdown(
                        result.analysis,
                        text
                      )
                    }
                    style={styles.downloadBtn}
                  >
                    ↓ .md
                  </button>
                </div>

                <div style={styles.sections}>
                  {(() => {
                    const sections = parseAnalysis(
                      result.analysis
                    );

                    if (sections.length === 0) {
                      return (
                        <div style={styles.fallback}>
                          {result.analysis}
                        </div>
                      );
                    }

                    return sections.map((section, idx) => (
                      <details
                        key={idx}
                        style={styles.accordionItem}
                      >
                        <summary
                          style={styles.accordionSummary}
                        >
                          <span style={styles.sectionNumber}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>

                          <span>
                            {section.title}
                          </span>

                          <span style={styles.chevron}>
                            +
                          </span>
                        </summary>

                        <div style={styles.accordionBody}>
                          {renderSectionBody(
                            section.body
                          )}
                        </div>
                      </details>
                    ));
                  })()}
                </div>
              </>
            ) : (
              <div style={styles.errorBox}>
                <div style={styles.errorTitle}>
                  Analysis unavailable
                </div>

                <div style={styles.errorText}>
                  {result.error ||
                    "Something went wrong."}
                </div>
              </div>
            )}
          </div>
        )}

        <p style={styles.note}>
          NRI provides analytical assistance, not an AI verdict.
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0d10",
    color: "#f5f5f5",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "720px",
    margin: "0 auto",
    padding: "32px 20px 48px",
    boxSizing: "border-box",
  },

  logo: {
    fontSize: "24px",
    fontWeight: "800",
    letterSpacing: "-1px",
    marginBottom: "56px",
  },

  eyebrow: {
    fontSize: "11px",
    letterSpacing: "2px",
    opacity: 0.55,
    marginBottom: "18px",
  },

  title: {
    fontSize: "clamp(34px, 9vw, 58px)",
    lineHeight: "1.08",
    letterSpacing: "-2px",
    margin: "0 0 20px",
    fontWeight: "700",
  },

  subtitle: {
    fontSize: "16px",
    lineHeight: "1.6",
    opacity: 0.65,
    maxWidth: "560px",
    marginBottom: "36px",
  },

  card: {
    background: "#15181d",
    border: "1px solid #292d34",
    borderRadius: "18px",
    padding: "18px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    fontSize: "14px",
    fontWeight: "600",
  },

  free: {
    fontSize: "10px",
    letterSpacing: "1px",
    opacity: 0.6,
  },

  textarea: {
    width: "100%",
    minHeight: "190px",
    resize: "vertical",
    boxSizing: "border-box",
    background: "#0d0f12",
    color: "#f5f5f5",
    border: "1px solid #292d34",
    borderRadius: "12px",
    padding: "16px",
    fontSize: "15px",
    lineHeight: "1.55",
    outline: "none",
    fontFamily: "inherit",
  },

  bottomRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "14px",
    gap: "12px",
  },

  counter: {
    fontSize: "11px",
    opacity: 0.4,
  },

  button: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    background: "#f5f5f5",
    color: "#0b0d10",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },

  resultCard: {
    marginTop: "18px",
    background: "#15181d",
    border: "1px solid #292d34",
    borderRadius: "18px",
    padding: "20px",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    paddingBottom: "18px",
    borderBottom: "1px solid #292d34",
  },

  resultTitle: {
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "-0.2px",
  },

  resultSubtitle: {
    fontSize: "11px",
    opacity: 0.45,
    marginTop: "4px",
  },

  downloadBtn: {
    background: "transparent",
    border: "1px solid #292d34",
    borderRadius: "9px",
    padding: "8px 11px",
    color: "#f5f5f5",
    fontSize: "11px",
    cursor: "pointer",
  },

  sections: {
    marginTop: "8px",
  },

  accordionItem: {
    borderBottom: "1px solid #292d34",
    padding: "0",
  },

  accordionSummary: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    listStyle: "none",
    padding: "17px 4px",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },

  sectionNumber: {
    fontSize: "10px",
    letterSpacing: "1px",
    opacity: 0.35,
    minWidth: "20px",
  },

  chevron: {
    marginLeft: "auto",
    fontSize: "18px",
    fontWeight: "300",
    opacity: 0.45,
  },

  accordionBody: {
    padding: "0 4px 20px 36px",
    fontSize: "13px",
    lineHeight: "1.7",
    opacity: 0.78,
  },

  list: {
    margin: 0,
    paddingLeft: "18px",
  },

  listItem: {
    marginBottom: "9px",
  },

  objectBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  objectItem: {
    paddingBottom: "10px",
  },

  objectKey: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    opacity: 0.4,
    marginBottom: "4px",
  },

  objectValue: {
    whiteSpace: "pre-wrap",
  },

  fallback: {
    whiteSpace: "pre-wrap",
    fontSize: "13px",
    lineHeight: "1.7",
    opacity: 0.78,
    padding: "18px 4px",
  },

  errorBox: {
    padding: "12px 4px",
  },

  errorTitle: {
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "8px",
  },

  errorText: {
    fontSize: "13px",
    lineHeight: "1.6",
    opacity: 0.65,
  },

  note: {
    textAlign: "center",
    fontSize: "11px",
    opacity: 0.4,
    marginTop: "20px",
    lineHeight: "1.5",
  },
};