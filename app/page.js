"use client";

import { useState, useEffect } from "react";

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
          <div style={styles.card}>
            {result.analysis ? (
              <>
                <div style={styles.cardHeader}>
                  <span>NRI Analysis</span>
                </div>

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    opacity: 0.78,
                  }}
                >
                  {result.analysis}
                </div>
              </>
            ) : (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  opacity: 0.75,
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
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

  note: {
    textAlign: "center",
    fontSize: "11px",
    opacity: 0.4,
    marginTop: "20px",
    lineHeight: "1.5",
  },
};