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

function cleanAnalysisText(value) {
return String(value ?? "")
.trim()
.replace(/^json\s*/i, "")   .replace(/^\s*/i, "")
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

// 1. Normal valid JSON
try {
const parsed = JSON.parse(raw);

if (parsed && typeof parsed === "object") {  
  return parsed;  
}

} catch (error) {}

// 2. JSON embedded inside extra text
const firstBrace = raw.indexOf("{");
const lastBrace = raw.lastIndexOf("}");

if (firstBrace !== -1 && lastBrace !== -1) {
try {
const parsed = JSON.parse(
raw.slice(firstBrace, lastBrace + 1)
);

if (parsed && typeof parsed === "object") {  
    return parsed;  
  }  
} catch (error) {}

}

// 3. Recovery for a response that was cut off.
// This does NOT rewrite the analysis.
// It only recovers complete fields already present in Luna's output.
const recovered = {};

for (const key of Object.keys(FIELD_LABELS)) {
const keyPattern = new RegExp(
"${key}"\\s*:,
"m"
);

const match = keyPattern.exec(raw);  

if (!match) continue;  

const start = match.index + match[0].length;  
const remainder = raw.slice(start).trimStart();  

// String field  
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

// Array field  
if (remainder.startsWith("[")) {  
  const items = [];  
  let position = 1;  

  while (position < remainder.length) {  
    while (  
      position < remainder.length &&  
      /[\s,]/.test(remainder[position])  
    ) {  
      position++;  
    }  

    if (  
      position >= remainder.length ||  
      remainder[position] === "]"  
    ) {  
      break;  
    }  

    if (remainder[position] !== '"') {  
      break;  
    }  

    let escaped = false;  
    let end = -1;  

    for (  
      let i = position + 1;  
      i < remainder.length;  
      i++  
    ) {  
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
      items.push(  
        JSON.parse(  
          remainder.slice(position, end + 1)  
        )  
      );  
    } catch (error) {  
      break;  
    }  

    position = end + 1;  

    while (  
      position < remainder.length &&  
      /\s/.test(remainder[position])  
    ) {  
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

return Object.keys(recovered).length > 0
? recovered
: null;
}

function downloadMarkdown(analysisText, originalText) {
const stamp = new Date()
.toISOString()
.replace(/[:.]/g, "-")
.slice(0, 19);

const content = `# NRI Analysis Report

Generated: ${new Date().toLocaleString()}

Original Text Analyzed

${originalText}

Analysis

${analysisText}
`;

const blob = new Blob([content], {
type: "text/markdown;charset=utf-8",
});

const url = URL.createObjectURL(blob);
const a = document.createElement("a");

a.href = url;
a.download = nri-analysis-${stamp}.md;

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
          {typeof item === "string"  
            ? item  
            : JSON.stringify(item)}  
        </span>  
      </div>  
    ))}  
  </div>  
);

}

if (
body &&
typeof body === "object"
) {
return (
<div>
{Object.entries(body).map(
([key, value]) => (
<div  
key={key}  
style={styles.objectItem}  
>
<div style={styles.objectKey}>
{key.replace(/_/g, " ")}
</div>

<div>  
            {typeof value === "string"  
              ? value  
              : JSON.stringify(value)}  
          </div>  
        </div>  
      )  
    )}  
  </div>  
);

}

return (
<div>
{String(body ?? "")}
</div>
);
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
const response = await fetch(
"/api/analyze",
{
method: "GET",
cache: "no-store",
}
);

const data = await response.json();  

    if (data.success) {  
      setFreeCount(data.used);  
      setLimit(data.limit);  
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
  const response = await fetch(  
    "/api/analyze",  
    {  
      method: "POST",  
      headers: {  
        "Content-Type":  
          "application/json",  
      },  
      body: JSON.stringify({ text }),  
    }  
  );  

  const data = await response.json();  

  setResult(data);  

  if (  
    data.success &&  
    data.usage  
  ) {  
    setFreeCount(  
      data.usage.used  
    );  
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

<div style={styles.logo}>  
      NRI  
    </div>  

    <p style={styles.eyebrow}>  
      NARRATIVE REASONING INTELLIGENCE  
    </p>  

    <h1 style={styles.title}>  
      Understand the narrative.  
      <br />  
      Don’t just react to it.  
    </h1>  

    <p style={styles.subtitle}>  
      Analytical assistance for understanding claims,  
      evidence, assumptions, framing, and missing context.  
    </p>  

    <div style={styles.card}>  

      <div style={styles.cardHeader}>  
        <span>  
          Analyze a narrative  
        </span>  

        <span style={styles.free}>  
          {Math.max(  
            0,  
            limit - freeCount  
          )}{" "}  
          FREE  
        </span>  
      </div>  

      <textarea  
        value={text}  
        onChange={(e) =>  
          setText(e.target.value)  
        }  
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
      <div style={styles.resultCard}>  

        {result.analysis ? (  
          <>  
            <div style={styles.cardHeader}>  
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
                      parsed[key] !==  
                        undefined &&  
                      parsed[key] !==  
                        null  
                  )  
                  .map(  
                    ([key, title]) => ({  
                      key,  
                      title,  
                      body:  
                        parsed[key],  
                    })  
                  );  

              if (  
                sections.length === 0  
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
                              index + 1  
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

    <p style={styles.note}>  
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
padding: "32px 20px 56px",
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
opacity: 0.5,
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
opacity: 0.62,
maxWidth: "560px",
marginBottom: "36px",
},

card: {
background: "#15181d",
border: "1px solid #292d34",
borderRadius: "18px",
padding: "18px",
},

resultCard: {
background: "#15181d",
border: "1px solid #292d34",
borderRadius: "18px",
padding: "18px",
marginTop: "12px",
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

downloadBtn: {
background: "transparent",
border: "1px solid #292d34",
borderRadius: "8px",
padding: "7px 11px",
color: "#f5f5f5",
fontSize: "11px",
cursor: "pointer",
},

accordion: {
borderTop: "1px solid #292d34",
padding: "0",
},

summary: {
display: "flex",
alignItems: "center",
gap: "12px",
padding: "17px 4px",
cursor: "pointer",
listStyle: "none",
fontSize: "14px",
fontWeight: "600",
outline: "none",
},

sectionNumber: {
fontSize: "10px",
letterSpacing: "1px",
opacity: 0.35,
width: "22px",
},

sectionTitle: {
flex: 1,
},

chevron: {
fontSize: "18px",
fontWeight: "400",
opacity: 0.45,
},

body: {
padding: "0 8px 20px 38px",
fontSize: "14px",
lineHeight: "1.7",
color: "#d5d7da",
},

listItem: {
display: "flex",
alignItems: "flex-start",
gap: "10px",
marginBottom: "10px",
},

bullet: {
opacity: 0.45,
flexShrink: 0,
},

listText: {
flex: 1,
},

objectItem: {
marginBottom: "14px",
},

objectKey: {
fontSize: "10px",
textTransform: "uppercase",
letterSpacing: "1px",
opacity: 0.4,
marginBottom: "4px",
},

fallback: {
whiteSpace: "pre-wrap",
fontSize: "13px",
lineHeight: "1.6",
opacity: 0.75,
},

errorBox: {
padding: "12px 4px",
},

errorTitle: {
fontSize: "14px",
fontWeight: "600",
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
