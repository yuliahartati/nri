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

const FREE_FIELDS = [
  "narrative_overview",
  "primary_claim",
  "evidence",
  "assumptions",
  "framing",
];

const BASIC_FIELDS = [
  "narrative_overview",
  "primary_claim",
  "evidence",
  "assumptions",
  "framing",
  "missing_context",
  "reasoning_risks",
];

const MAX_INPUT = 8000;

function cleanAnalysisText(value) {
  return String(value ?? "")
    .trim()
    .replace(/^json\s*/i, "")
    .replace(/^\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAnalysis(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const raw = cleanAnalysisText(value);
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {}
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (error) {}
  }
  const recovered = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    const marker = `"${key}":`;
    const matchIndex = raw.indexOf(marker);
    if (matchIndex === -1) continue;
    const start = matchIndex + marker.length;
    const remainder = raw.slice(start).trimStart();
    if (remainder.startsWith('"')) {
      let escaped = false;
      for (let i = 1; i < remainder.length; i++) {
        const char = remainder[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') {
          const candidate = remainder.slice(0, i + 1);
          try {
            recovered[key] = JSON.parse(candidate);
          } catch (error) {}
          break;
        }
      }
      continue;
    }
    if (remainder.startsWith("[")) {
      const items = [];
      let position = 1;
      while (position < remainder.length) {
        while (position < remainder.length && /[\s,]/.test(remainder[position])) {
          position++;
        }
        if (position >= remainder.length || remainder[position] === "]") {
          break;
        }
        if (remainder[position] !== '"') {
          break;
        }
        let escaped = false;
        let end = -1;
        for (let i = position + 1; i < remainder.length; i++) {
          const char = remainder[i];
          if (escaped) {
            escaped = false;
            continue;
          }
          if (char === "\\") {
            escaped = true;
            continue;
          }
          if (char === '"') {
            end = i;
            break;
          }
        }
        if (end === -1) break;
        try {
          items.push(JSON.parse(remainder.slice(position, end + 1)));
        } catch (error) {
          break;
        }
        position = end + 1;
        while (position < remainder.length && /\s/.test(remainder[position])) {
          position++;
        }
        if (remainder[position] === ",") {
          position++;
          continue;
        }
        break;
      }
      if (items.length > 0) {
        recovered[key] = items;
      }
      continue;
    }
  }
  return Object.keys(recovered).length > 0 ? recovered : null;
}

function downloadMarkdown(analysisText, originalText) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const parsed = parseAnalysis(analysisText);
  let analysisSection = "";
  if (parsed && typeof parsed === "object") {
    for (const key of Object.keys(FIELD_LABELS)) {
      const value = parsed[key];
      if (value === undefined || value === null) continue;
      analysisSection += `## ${FIELD_LABELS[key]}\n\n`;
      if (Array.isArray(value)) {
        if (value.length === 0) {
          analysisSection += `Tidak ada bukti substantif.\n\n`;
        } else {
          for (const item of value) {
            analysisSection += `- ${String(item)}\n`;
          }
          analysisSection += `\n`;
        }
      } else {
        analysisSection += `${String(value)}\n\n`;
      }
    }
  } else {
    analysisSection = `${String(analysisText || "")}\n`;
  }
  const content = `# NRI Analysis Report

Generated: ${new Date().toLocaleString()}

## Original Text Analyzed

${originalText}

## Analysis

${analysisSection}`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nri-analysis-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderBody(body) {
  if (Array.isArray(body)) {
    return (
      <div>
        {body.map((item, index) => (
          <div key={index} style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            <span style={styles.listText}>
              {typeof item === "string" ? item : JSON.stringify(item)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (body && typeof body === "object") {
    return (
      <div>
        {Object.entries(body).map(([key, value]) => (
          <div key={key} style={styles.objectItem}>
            <div style={styles.objectKey}>{key.replace(/_/g, " ")}</div>
            <div>{typeof value === "string" ? value : JSON.stringify(value)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <div>{String(body ?? "")}</div>;
}

function getVisibleFields(tier) {
  if (tier === "pro") return Object.keys(FIELD_LABELS);
  if (tier === "basic") return BASIC_FIELDS;
  return FREE_FIELDS;
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [freeCount, setFreeCount] = useState(0);
  const [limit, setLimit] = useState(3);
  const [activationCode, setActivationCode] = useState("");
  const [tier, setTier] = useState("free");
  const [codeMessage, setCodeMessage] = useState("");

  useEffect(() => {
    async function loadQuota() {
      try {
        const response = await fetch("/api/analyze", { method: "GET", cache: "no-store" });
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

  async function handleActivate() {
    const c = activationCode.trim().toUpperCase();
    if (!c) { setCodeMessage("Masukin kode dulu."); return; }
    setCodeMessage("Cek kode...");
    try {
      const res = await fetch("/api/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) });
      const data = await res.json();
      if (!data.success) { setCodeMessage(data.error || "Kode tidak valid."); return; }
      setTier(data.tier);
      setCodeMessage(data.tier === "pro" ? "Kode Pro aktif. Semua 11 field kebuka." : "Kode Basic aktif. 7 field kebuka.");
    } catch { setCodeMessage("Gagal aktivasi. Coba lagi."); }
  }

  async function handleAnalyze() {
    if (text.length > MAX_INPUT) {
      setResult({ error: `Teks terlalu panjang. Maksimal ${MAX_INPUT} karakter. Saat ini ${text.length} karakter.` });
      return;
    }
    if (freeCount >= limit && tier === "free") {
      setResult({ error: "Free analysis limit reached.", limit: limit, remaining: 0 });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, activationCode: activationCode.trim().toUpperCase() }),
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
      setResult({ error: "Connection failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "56px" }}>
          <div style={styles.logo}>NRI</div>
          <a href="/pricing" style={{ color: "#a1a1a1", fontSize: "14px", textDecoration: "none" }}>Pricing</a>
        </div>

        <p style={styles.eyebrow}>NARRATIVE REASONING INTELLIGENCE</p>

        <h1 style={styles.title}>
          Understand the narrative.
          <br />
          Don’t just react to it.
        </h1>

        <p style={styles.subtitle}>
          Analytical assistance for understanding claims, evidence, assumptions, framing, and missing context.
        </p>

        <div style={{ background: "#15181d", border: "1px solid #292d34", borderRadius: "14px", padding: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", margin: "0 0 8px" }}>Punya kode aktivasi? {tier !== "free" ? `Paket aktif: ${tier.toUpperCase()}` : "Free 5 field"}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              placeholder="Contoh: PRO-XXXX-XXXX / BASIC-XXXX-XXXX"
              style={{ flex: 1, background: "#0d0f12", color: "#f5f5f5", border: "1px solid #292d34", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", outline: "none" }}
            />
            <button onClick={handleActivate} style={{ background: "#f5f5f5", color: "#0b0d10", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>
              Aktivasi
            </button>
          </div>
          {codeMessage ? <p style={{ fontSize: "12px", opacity: 0.7, margin: "8px 0 0" }}>{codeMessage}</p> : null}
          <p style={{ fontSize: "11px", opacity: 0.45, margin: "6px 0 0" }}>Beli di Pricing via WA, kamu dapat kode aktivasi 1x pakai.</p>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>Analyze a narrative</span>
            <span style={styles.free}>{tier === "free" ? `${Math.max(0, limit - freeCount)} FREE` : `${tier.toUpperCase()} AKTIF`}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a statement, news excerpt, caption, or argument here..."
            style={styles.textarea}
          />
          <div style={styles.bottomRow}>
            <span style={styles.counter}>{text.length} / {MAX_INPUT} characters {text.length > MAX_INPUT ? "- Terlalu panjang, tidak bisa dianalisa" : ""}</span>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              style={{ ...styles.button, opacity: text.trim() && !loading ? 1 : 0.45 }}
            >
              {loading ? "Analyzing..." : "Analyze →"}
            </button>
          </div>
        </div>

        {result && (
          <div style={styles.resultCard}>
            {result.analysis ? (
              <>
                <div style={styles.cardHeader}>
                  <span>NRI Analysis</span>
                  <button onClick={() => downloadMarkdown(result.analysis, text)} style={styles.downloadBtn}>
                    ↓ .md
                  </button>
                </div>
                {(() => {
                  const parsed = parseAnalysis(result.analysis);
                  if (!parsed) {
                    return <div style={styles.fallback}>{String(result.analysis)}</div>;
                  }
                  const visible = getVisibleFields(tier);
                  const sections = Object.entries(FIELD_LABELS)
                    .filter(([key]) => visible.includes(key) && parsed[key] !== undefined && parsed[key] !== null)
                    .map(([key, title]) => ({ key, title, body: parsed[key] }));
                  const lockedCount = Object.keys(FIELD_LABELS).length - sections.length;
                  if (sections.length === 0) {
                    return <div style={styles.fallback}>{JSON.stringify(parsed, null, 2)}</div>;
                  }
                  return (
                    <div>
                      {sections.map((section, index) => (
                        <details key={section.key} style={styles.accordion}>
                          <summary style={styles.summary}>
                            <span style={styles.sectionNumber}>{String(index + 1).padStart(2, "0")}</span>
                            <span style={styles.sectionTitle}>{section.title}</span>
                            <span style={styles.chevron}>+</span>
                          </summary>
                          <div style={styles.body}>{renderBody(section.body)}</div>
                        </details>
                      ))}
                      {lockedCount > 0 ? (
                        <div style={{ borderTop: "1px solid #292d34", padding: "16px 4px 4px", textAlign: "center" }}>
                          <p style={{ fontSize: "13px", opacity: 0.7 }}>{lockedCount} field masih dikunci di paket {tier.toUpperCase()}.</p>
                          <a href="/pricing" style={{ display: "inline-block", background: "#f5f5f5", color: "#0b0d10", padding: "10px 16px", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "13px", marginTop: "8px" }}>
                            Buka Semua Field - Lihat Paket
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={styles.errorBox}>
                {result.error ? (
                  <>
                    <div style={styles.errorTitle}>Analysis unavailable</div>
                    <div style={styles.errorText}>{result.error}</div>
                    <a href="/pricing" style={{ display: "block", background: "#f5f5f5", color: "#0b0d10", padding: "12px", borderRadius: "10px", textAlign: "center", textDecoration: "none", fontWeight: "700", fontSize: "14px", marginTop: "16px" }}>
                      Lihat Paket - Mulai Rp99.000
                    </a>
                    <p style={{ fontSize: "12px", opacity: 0.5, textAlign: "center", marginTop: "10px" }}>
                      Free 3x habis. Basic 30x / Pro 100x.
                    </p>
                  </>
                ) : (
                  <pre style={styles.fallback}>{JSON.stringify(result, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "48px", borderTop: "1px solid #292d34", paddingTop: "32px" }}>
          <h2 style={{ fontSize: "22px", marginBottom: "12px" }}>Kenapa NRI beda?</h2>
          <p style={{ fontSize: "14px", lineHeight: "1.7", opacity: 0.7 }}>
            NRI nggak kasih verdict benar atau salah. Dia nunjukin apa yang nggak kamu lihat: klaimnya apa, buktinya ada atau kosong, asumsinya apa, framing-nya gimana, dan konteks apa yang hilang.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "20px" }}>
            <div style={{ background: "#15181d", border: "1px solid #292d34", borderRadius: "12px", padding: "16px" }}>
              <b>1. Paste</b>
              <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "6px" }}>Paste berita, caption, atau argumen.</p>
            </div>
            <div style={{ background: "#15181d", border: "1px solid #292d34", borderRadius: "12px", padding: "16px" }}>
              <b>2. Lihat strukturnya</b>
              <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "6px" }}>Buka 11 field, dari claim sampai uncertainty.</p>
            </div>
            <div style={{ background: "#15181d", border: "1px solid #292d34", borderRadius: "12px", padding: "16px" }}>
              <b>3. Cek blind spot</b>
              <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "6px" }}>Apa yang diasumsikan tanpa bukti?</p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "40px", background: "#15181d", border: "1px solid #292d34", borderRadius: "16px", padding: "20px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Contoh blind spot</h2>
          <p style={{ fontSize: "14px", fontStyle: "italic", opacity: 0.8 }}>
            &quot;Mengapa pemerintah terus-menerus berbohong dan mencuri uang rakyat?&quot;
          </p>
          <p style={{ fontSize: "14px", lineHeight: "1.7", opacity: 0.7, marginTop: "12px" }}>
            Pertanyaannya kelihatan netral, tapi sudah mengasumsikan pemerintah berbohong dan mencuri tanpa bukti. NRI nangkap itu di Assumptions dan Reasoning Risks, bukan ikut jawab pertanyaannya.
          </p>
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <h2 style={{ fontSize: "20px" }}>Habis 3x gratis?</h2>
          <p style={{ fontSize: "14px", opacity: 0.7 }}>Basic 30x - Rp99.000 / Pro 100x - Rp149.000. Semua field kebuka di Pro.</p>
          <a href="/pricing" style={{ display: "inline-block", background: "#f5f5f5", color: "#0b0d10", padding: "12px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: "700", fontSize: "14px", marginTop: "14px" }}>
            Lihat Semua Paket
          </a>
        </div>

        <div style={{ marginTop: "40px", borderTop: "1px solid #292d34", paddingTop: "24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", fontWeight: "600" }}>Yulia Hartati</p>
          <p style={{ fontSize: "13px", opacity: 0.6, lineHeight: "1.6", maxWidth: "520px", margin: "8px auto 0" }}>
            Membangun NRI untuk literasi kognitif. Bukan buat menang debat, tapi buat lihat narasi lebih jernih sebelum bereaksi.
          </p>
        </div>

        <p style={styles.note}>NRI provides analytical assistance, not an AI verdict.</p>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0b0d10", color: "#f5f5f5", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  container: { width: "100%", maxWidth: "720px", margin: "0 auto", padding: "32px 20px 56px", boxSizing: "border-box" },
  logo: { fontSize: "24px", fontWeight: "800", letterSpacing: "-1px" },
  eyebrow: { fontSize: "11px", letterSpacing: "2px", opacity: 0.5, marginBottom: "18px" },
  title: { fontSize: "clamp(34px, 9vw, 58px)", lineHeight: "1.08", letterSpacing: "-2px", margin: "0 0 20px", fontWeight: "700" },
  subtitle: { fontSize: "16px", lineHeight: "1.6", opacity: 0.62, maxWidth: "560px", marginBottom: "36px" },
  card: { background: "#15181d", border: "1px solid #292d34", borderRadius: "18px", padding: "18px" },
  resultCard: { background: "#15181d", border: "1px solid #292d34", borderRadius: "18px", padding: "18px", marginTop: "12px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", fontSize: "14px", fontWeight: "600" },
  free: { fontSize: "10px", letterSpacing: "1px", opacity: 0.6 },
  textarea: { width: "100%", minHeight: "190px", resize: "vertical", boxSizing: "border-box", background: "#0d0f12", color: "#f5f5f5", border: "1px solid #292d34", borderRadius: "12px", padding: "16px", fontSize: "15px", lineHeight: "1.55", outline: "none", fontFamily: "inherit" },
  bottomRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", gap: "12px" },
  counter: { fontSize: "11px", opacity: 0.4 },
  button: { border: "none", borderRadius: "10px", padding: "12px 18px", background: "#f5f5f5", color: "#0b0d10", fontWeight: "700", fontSize: "14px", cursor: "pointer" },
  downloadBtn: { background: "transparent", border: "1px solid #292d34", borderRadius: "8px", padding: "7px 11px", color: "#f5f5f5", fontSize: "11px", cursor: "pointer" },
  accordion: { borderTop: "1px solid #292d34", padding: "0" },
  summary: { display: "flex", alignItems: "center", gap: "12px", padding: "17px 4px", cursor: "pointer", listStyle: "none", fontSize: "14px", fontWeight: "600", outline: "none" },
  sectionNumber: { fontSize: "10px", letterSpacing: "1px", opacity: 0.35, width: "22px" },
  sectionTitle: { flex: 1 },
  chevron: { fontSize: "18px", fontWeight: "400", opacity: 0.45 },
  body: { padding: "0 8px 20px 38px", fontSize: "14px", lineHeight: "1.7", color: "#d5d7da" },
  listItem: { display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" },
  bullet: { opacity: 0.45, flexShrink: 0 },
  listText: { flex: 1 },
  objectItem: { marginBottom: "14px" },
  objectKey: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.4, marginBottom: "4px" },
  fallback: { whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.6", opacity: 0.75 },
  errorBox: { padding: "12px 4px" },
  errorTitle: { fontSize: "14px", fontWeight: "600", marginBottom: "8px" },
  errorText: { fontSize: "13px", lineHeight: "1.6", opacity: 0.65 },
  note: { textAlign: "center", fontSize: "11px", opacity: 0.4, marginTop: "20px", lineHeight: "1.5" },
};
