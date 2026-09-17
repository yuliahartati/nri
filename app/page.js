"use client";

import { useState, useEffect } from "react";

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

const FIELD_KEYS = Object.keys(FIELD_LABELS);

function cleanAnalysisText(value) {
  return String(value ?? "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryParseJSON(raw) {
  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object"
    ) {
      return parsed;
    }
  } catch (error) {}

  return null;
}

function findFieldPositions(raw) {
  const positions = [];

  for (const key of FIELD_KEYS) {
    const pattern = new RegExp(
      `"${key}"\\s*:`,
      "g"
    );

    const match = pattern.exec(raw);

    if (match) {
      positions.push({
        key,
        start: match.index,
        valueStart:
          match.index + match[0].length,
      });
    }
  }

  return positions.sort(
    (a, b) => a.start - b.start
  );
}

function cleanRecoveredValue(value) {
  let result = value.trim();

  if (result.endsWith(",")) {
    result = result
      .slice(0, -1)
      .trim();
  }

  return result;
}

function parseRecoveredValue(rawValue) {
  const value =
    cleanRecoveredValue(rawValue);

  // Normal JSON value
  const parsed = tryParseJSON(value);

  if (parsed !== null) {
    return parsed;
  }

  // Recover a quoted string even when
  // the complete JSON object is malformed.
  if (
    value.startsWith('"')
  ) {
    let endQuote = -1;
    let escaped = false;

    for (
      let i = 1;
      i < value.length;
      i++
    ) {
      const char = value[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        endQuote = i;
        break;
      }
    }

    if (endQuote !== -1) {
      const candidate =
        value.slice(
          0,
          endQuote + 1
        );

      try {
        return JSON.parse(candidate);
      } catch (error) {
        return candidate.slice(
          1,
          -1
        );
      }
    }
  }

  // Recover arrays containing complete
  // quoted items.
  if (value.startsWith("[")) {
    const items = [];
    let current = "";
    let insideString = false;
    let escaped = false;

    for (
      let i = 1;
      i < value.length;
      i++
    ) {
      const char = value[i];

      if (insideString) {
        current += char;

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === "\\") {
          escaped = true;
          continue;
        }

        if (char === '"') {
          insideString = false;
        }

        continue;
      }

      if (char === '"') {
        insideString = true;
        current += char;
        continue;
      }

      if (char === ",") {
        const item =
          current.trim();

        if (
          item.startsWith('"') &&
          item.endsWith('"')
        ) {
          try {
            items.push(
              JSON.parse(item)
            );
          } catch (error) {}
        }

        current = "";
        continue;
      }

      if (char === "]") {
        const item =
          current.trim();

        if (
          item.startsWith('"') &&
          item.endsWith('"')
        ) {
          try {
            items.push(
              JSON.parse(item)
            );
          } catch (error) {}
        }

        break;
      }

      current += char;
    }

    if (items.length > 0) {
      return items;
    }
  }

  return value;
}

function recoverFields(raw) {
  const positions =
    findFieldPositions(raw);

  if (positions.length === 0) {
    return null;
  }

  const recovered = {};

  for (
    let i = 0;
    i < positions.length;
    i++
  ) {
    const current =
      positions[i];

    const next =
      positions[i + 1];

    const valueEnd = next
      ? next.start
      : raw.length;

    let rawValue =
      raw.slice(
        current.valueStart,
        valueEnd
      );

    rawValue =
      rawValue.trim();

    // Remove a trailing comma belonging
    // to the previous JSON field.
    if (
      rawValue.endsWith(",")
    ) {
      rawValue =
        rawValue
          .slice(0, -1)
          .trim();
    }

    if (!rawValue) {
      continue;
    }

    const parsedValue =
      parseRecoveredValue(
        rawValue
      );

    if (
      parsedValue !==
        null &&
      parsedValue !==
        undefined &&
      parsedValue !== ""
    ) {
      recovered[
        current.key
      ] = parsedValue;
    }
  }

  return Object.keys(
    recovered
  ).length > 0
    ? recovered
    : null;
}

function parseAnalysis(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const raw =
    cleanAnalysisText(value);

  // --------------------------------
  // 1. Normal JSON
  // --------------------------------

  const direct =
    tryParseJSON(raw);

  if (direct) {
    return direct;
  }

  // --------------------------------
  // 2. JSON embedded in text
  // --------------------------------

  const firstBrace =
    raw.indexOf("{");

  const lastBrace =
    raw.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    const embedded =
      raw.slice(
        firstBrace,
        lastBrace + 1
      );

    const parsedEmbedded =
      tryParseJSON(
        embedded
      );

    if (parsedEmbedded) {
      return parsedEmbedded;
    }
  }

  // --------------------------------
  // 3. Field-level recovery
  // --------------------------------
  //
  // Important:
  // This does NOT summarize,
  // rewrite, or reinterpret Luna.
  //
  // It only extracts the existing
  // NRI fields so the UI can render
  // them as accordions.

  return recoverFields(raw);
}

function downloadMarkdown(
  analysisText,
  originalText
) {
  const stamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      )
      .slice(
        0,
        19
      );

  const content = `# NRI Analysis Report

Generated: ${new Date().toLocaleString()}

## Original Text Analyzed

${originalText}

## Analysis

${analysisText}
`;

  const blob = new Blob(
    [content],
    {
      type:
        "text/markdown;charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href = url;

  a.download =
    `nri-analysis-${stamp}.md`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function renderBody(body) {
  if (Array.isArray(body)) {
    return (
      <div>
        {body.map(
          (item, index) => (
            <div
              key={index}
              style={
                styles.listItem
              }
            >
              <span
                style={
                  styles.bullet
                }
              >
                •
              </span>

              <span
                style={
                  styles.listText
                }
              >
                {typeof item ===
                "string"
                  ? item
                  : JSON.stringify(
                      item
                    )}
              </span>
            </div>
          )
        )}
      </div>
    );
  }

  if (
    body &&
    typeof body ===
      "object"
  ) {
    return (
      <div>
        {Object.entries(
          body
        ).map(
          ([key, value]) => (
            <div
              key={key}
              style={
                styles.objectItem
              }
            >
              <div
                style={
                  styles.objectKey
                }
              >
                {key.replace(
                  /_/g,
                  " "
                )}
              </div>

              <div>
                {typeof value ===
                "string"
                  ? value
                  : JSON.stringify(
                      value
                    )}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div>
      {String(
        body ?? ""
      )}
    </div>
  );
}

export default function Home() {
  const [text, setText] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [freeCount, setFreeCount] =
    useState(0);

  const [limit, setLimit] =
    useState(3);

  useEffect(() => {
    async function loadQuota() {
      try {
        const response =
          await fetch(
            "/api/analyze",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (data.success) {
          setFreeCount(
            data.used
          );

          setLimit(
            data.limit
          );
        }
      } catch (error) {
        console.error(
          "Quota check failed:",
          error
        );
      }
    }

    loadQuota();
  }, []);

  async function handleAnalyze() {
    if (
      freeCount >= limit
    ) {
      setResult({
        error:
          "Free analysis limit reached.",
        limit: limit,
        remaining: 0,
      });

      return;
    }

    setLoading(true);

    setResult(null);

    try {
      const response =
        await fetch(
          "/api/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              text,
            }),
          }
        );

      const data =
        await response.json();

      setResult(data);

      if (
        data.success &&
        data.usage
      ) {
        setFreeCount(
          data.usage.used
        );
      }

      if (
        response.status ===
        429
      ) {
        setFreeCount(
          limit
        );
      }
    } catch (error) {
      setResult({
        error:
          "Connection failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={
        styles.page
      }
    >
      <section
        style={
          styles.container
        }
      >
        <div
          style={
            styles.logo
          }
        >
          NRI
        </div>

        <p
          style={
            styles.eyebrow
          }
        >
          NARRATIVE REASONING
          INTELLIGENCE
        </p>

        <h1
          style={
            styles.title
          }
        >
          Understand the narrative.
          <br />
          Don’t just react to it.
        </h1>

        <p
          style={
            styles.subtitle
          }
        >
          Analytical assistance for
          understanding claims,
          evidence, assumptions,
          framing, and missing context.
        </p>

        <div
          style={
            styles.card
          }
        >
          <div
            style={
              styles.cardHeader
            }
          >
            <span>
              Analyze a narrative
            </span>

            <span
              style={
                styles.free
              }
            >
              {Math.max(
                0,
                limit -
                  freeCount
              )}{" "}
              FREE
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) =>
              setText(
                e.target.value
              )
            }
            placeholder="Paste a statement, news excerpt, caption, or argument here..."
            style={
              styles.textarea
            }
          />

          <div
            style={
              styles.bottomRow
            }
          >
            <span
              style={
                styles.counter
              }
            >
              {text.length}{" "}
              characters
            </span>

            <button
              onClick={
                handleAnalyze
              }
              disabled={
                !text.trim() ||
                loading
              }
              style={{
                ...styles.button,
                opacity:
                  text.trim() &&
                  !loading
                    ? 1
                    : 0.45,
              }}
            >
              {loading
                ? "Analyzing..."
                : "Analyze →"}
            </button>
          </div>
        </div>

        {result && (
          <div
            style={
              styles.resultCard
            }
          >
            {result.analysis ? (
              <>
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <span>
                    NRI Analysis
                  </span>

                  <button
                    onClick={() =>
                      downloadMarkdown(
                        result.analysis,
                        text
                      )
                    }
                    style={
                      styles.downloadBtn
                    }
                  >
                    ↓ .md
                  </button>
                </div>

                {(() => {
                  const parsed =
                    parseAnalysis(
                      result.analysis
                    );

                  if (!parsed) {
                    return (
                      <div
                        style={
                          styles.fallback
                        }
                      >
                        {String(
                          result.analysis
                        )}
                      </div>
                    );
                  }

                  const sections =
                    Object.entries(
                      FIELD_LABELS
                    )
                      .filter(
                        ([key]) =>
                          parsed[
                            key
                          ] !==
                            undefined &&
                          parsed[
                            key
                          ] !==
                            null
                      )
                      .map(
                        (
                          [
                            key,
                            title,
                          ]
                        ) => ({
                          key,
                          title,
                          body:
                            parsed[
                              key
                            ],
                        })
                      );

                  if (
                    sections.length ===
                    0
                  ) {
                    return (
                      <div
                        style={
                          styles.fallback
                        }
                      >
                        {JSON.stringify(
                          parsed,
                          null,
                          2
                        )}
                      </div>
                    );
                  }

                  return (
                    <div>
                      {sections.map(
                        (
                          section,
                          index
                        ) => (
                          <details
                            key={
                              section.key
                            }
                            style={
                              styles.accordion
                            }
                          >
                            <summary
                              style={
                                styles.summary
                              }
                            >
                              <span
                                style={
                                  styles.sectionNumber
                                }
                              >
                                {String(
                                  index +
                                    1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <span
                                style={
                                  styles.sectionTitle
                                }
                              >
                                {
                                  section.title
                                }
                              </span>

                              <span
                                style={
                                  styles.chevron
                                }
                              >
                                +
                              </span>
                            </summary>

                            <div
                              style={
                                styles.body
                              }
                            >
                              {renderBody(
                                section.body
                              )}
                            </div>
                          </details>
                        )
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div
                style={
                  styles.errorBox
                }
              >
                {result.error ? (
                  <>
                    <div
                      style={
                        styles.errorTitle
                      }
                    >
                      Analysis unavailable
                    </div>

                    <div
                      style={
                        styles.errorText
                      }
                    >
                      {result.error}
                    </div>
                  </>
                ) : (
                  <pre
                    style={
                      styles.fallback
                    }
                  >
                    {JSON.stringify(
                      result,
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        <p
          style={
            styles.note
          }
        >
          NRI provides analytical assistance,
          not an AI verdict.
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
    padding:
      "32px 20px 56px",
    boxSizing: "border-box",
  },

  