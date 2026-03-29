import { useState, useRef, useCallback } from "react";

// Uses /api/chat serverless function so your API key stays secret
const API_ENDPOINT = "/api/chat";

const QUICK_TOPICS = [
  { icon: "🏭", label: "Manufacturing Equipment", q: "Is manufacturing equipment exempt from Louisiana sales tax?" },
  { icon: "🛒", label: "Groceries", q: "Are groceries taxable in Louisiana?" },
  { icon: "💻", label: "Software / SaaS", q: "Is software or SaaS taxable in Louisiana?" },
  { icon: "🏗️", label: "Construction Materials", q: "Are construction materials subject to Louisiana sales tax?" },
  { icon: "🌾", label: "Agriculture", q: "Are farm supplies and equipment exempt from Louisiana sales tax?" },
  { icon: "🏥", label: "Medical Devices", q: "Are medical devices taxable in Louisiana?" },
  { icon: "📦", label: "Tangible Personal Property", q: "What is tangible personal property and is it taxable in Louisiana?" },
  { icon: "🚗", label: "Vehicles", q: "Are vehicles subject to Louisiana sales tax?" },
];

const BROWSE_CATS = [
  { icon: "🛍️", title: "Sales & Use Tax", ref: "RS 47:301–340", q: "Explain Louisiana sales and use tax laws" },
  { icon: "💼", title: "Income Tax", ref: "RS 47:51–299", q: "Explain Louisiana individual income tax laws" },
  { icon: "🏢", title: "Corporate Tax", ref: "RS 47:601–699", q: "Explain Louisiana corporate franchise and income tax" },
  { icon: "🏠", title: "Property Tax", ref: "RS 47:1701+", q: "Explain Louisiana property tax assessment rules" },
  { icon: "🏭", title: "Exemptions", ref: "RS 47:305", q: "What are all Louisiana sales tax exemptions?" },
  { icon: "⛽", title: "Excise & Severance", ref: "RS 47:631+", q: "Explain Louisiana excise and severance taxes" },
  { icon: "⚠️", title: "Penalties & Interest", ref: "RS 47:1601+", q: "What are Louisiana tax penalties and interest rules?" },
  { icon: "🚗", title: "Vehicle Tax", ref: "RS 47:451+", q: "What are Louisiana vehicle and motor vehicle tax rules?" },
];

const RATES = [
  { section: "Sales & Use Tax", rows: [
    ["State Sales Tax (general)", "4.45%", "Effective July 1, 2018"],
    ["Local Sales Tax (avg)", "~5.00%", "Varies by parish"],
    ["Combined Average", "~9.55%", "Among highest in US"],
    ["Prescription Drugs", "0%", "Exempt statewide"],
    ["Food (home consumption)", "State 0%", "Local tax may still apply"],
  ]},
  { section: "Individual Income Tax", rows: [
    ["$0 – $12,500", "1.85%", ""],
    ["$12,501 – $50,000", "3.50%", ""],
    ["Over $50,000", "4.25%", ""],
  ]},
  { section: "Corporate & Other", rows: [
    ["Corporate Income Tax", "3.5% – 7.5%", "Graduated brackets"],
    ["Corporate Franchise Tax", "$1.50/$1,000 capital", "Min $10"],
    ["Motor Fuel (gasoline)", "$0.20/gallon", ""],
    ["Cigarette Tax", "$1.08/pack", ""],
  ]},
];

function StatusBadge({ status }) {
  const map = {
    TAXABLE: { label: "⚠️ Taxable", bg: "rgba(230,57,70,0.15)", border: "rgba(230,57,70,0.35)", color: "#E63946" },
    EXEMPT: { label: "✅ Exempt", bg: "rgba(82,183,136,0.15)", border: "rgba(82,183,136,0.35)", color: "#52B788" },
    PARTIALLY_TAXABLE: { label: "◑ Partially Taxable", bg: "rgba(201,168,76,0.15)", border: "rgba(201,168,76,0.35)", color: "#C9A84C" },
    NEEDS_MORE_INFO: { label: "❓ More Info Needed", bg: "rgba(136,153,187,0.15)", border: "rgba(136,153,187,0.35)", color: "#8899BB" },
  };
  const s = map[status] || map.NEEDS_MORE_INFO;
  return (
    <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function ExampleCard({ ex }) {
  const isTaxable = ex.status === "taxable";
  return (
    <div style={{ background: "rgba(10,22,40,0.7)", border: "1px solid rgba(201,168,76,0.15)",
      borderRadius: 10, overflow: "hidden" }}>
      <div style={{ width: "100%", height: 130, background: "linear-gradient(135deg,#112240,#0A1628)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
        {isTaxable ? "📦" : "✅"}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#EEF2FF" }}>{ex.title}</div>
        <div style={{ fontSize: 12, color: "#8899BB", lineHeight: 1.5 }}>{ex.description}</div>
        <span style={{ display: "inline-block", marginTop: 8, padding: "3px 8px", borderRadius: 4,
          fontSize: 11, fontWeight: 600,
          background: isTaxable ? "rgba(230,57,70,0.12)" : "rgba(82,183,136,0.12)",
          color: isTaxable ? "#E63946" : "#52B788" }}>
          {isTaxable ? "⚠️ Taxable" : "✅ Exempt"}
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.1em", color: "#C9A84C", margin: "20px 0 12px" }}>
      {children}
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.2)" }} />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("answer");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const gold = "#C9A84C";
  const navy = "#0A1628";
  const navyCard = "#152A4A";
  const navyBorder = "rgba(201,168,76,0.2)";
  const textDim = "#8899BB";

  const callClaude = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setTab("answer");

    const systemPrompt = `You are an expert Louisiana state tax law advisor. You specialize in Louisiana Revised Statutes (RS) Title 47 and Louisiana Department of Revenue regulations.

Analyze the tax question and respond ONLY with a valid JSON object (no markdown, no backticks, no extra text) in this exact format:
{
  "status": "TAXABLE" or "EXEMPT" or "PARTIALLY_TAXABLE" or "NEEDS_MORE_INFO",
  "summary": "One direct sentence answer",
  "analysis": "Detailed 2-3 paragraph legal analysis with reasoning",
  "statutes": [
    { "code": "RS 47:XXX", "title": "Short title", "excerpt": "What this statute says about this topic" }
  ],
  "examples": [
    {
      "title": "Short example name",
      "description": "Real-world scenario description (2 sentences)",
      "status": "taxable" or "exempt"
    }
  ],
  "localNotes": "Parish or local tax notes if relevant",
  "tpp": true or false,
  "relatedQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}`;

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1800,
          system: systemPrompt,
          messages: [{ role: "user", content: `Louisiana tax question: ${q}` }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setResult({ q, ...parsed });
      setHistory(h => [{ q, status: parsed.status, data: { q, ...parsed } }, ...h.slice(0, 19)]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAsk = useCallback((q) => {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    setQuery(trimmed);
    callClaude(trimmed);
  }, [query, callClaude]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: navy, color: "#EEF2FF",
      minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${navyBorder}`, background: "rgba(10,22,40,0.95)",
        position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${gold}, #E8C97A)`,
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>⚖️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: gold, fontFamily: "Georgia, serif" }}>Louisiana Tax Advisor</div>
            <div style={{ fontSize: 11, color: textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>State Tax Law Intelligence</div>
          </div>
          <div style={{ background: "rgba(201,168,76,0.12)", border: `1px solid ${navyBorder}`, borderRadius: 20,
            padding: "4px 12px", fontSize: 11, color: gold, fontWeight: 500 }}>AI-Powered</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 40px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "44px 0 28px" }}>
          <div style={{ display: "inline-block", background: "rgba(201,168,76,0.1)", border: `1px solid ${navyBorder}`,
            borderRadius: 20, padding: "6px 16px", fontSize: 12, color: gold, fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            🏛️ Louisiana Revised Statutes · Title 47
          </div>
          <h2 style={{ fontSize: "clamp(26px,5vw,40px)", fontWeight: 900, fontFamily: "Georgia, serif",
            lineHeight: 1.15, marginBottom: 12 }}>
            Ask Any <span style={{ color: gold }}>Louisiana</span><br />Tax Law Question
          </h2>
          <p style={{ color: textDim, fontSize: 15, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Get instant answers on taxability, statute citations, and real-world examples — powered by Louisiana's tax code.
          </p>
        </div>

        {/* Quick Topics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
          {QUICK_TOPICS.map(t => (
            <button key={t.label} onClick={() => { setQuery(t.q); handleAsk(t.q); }}
              style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: `1px solid ${navyBorder}`, background: navyCard, color: textDim,
                whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ background: navyCard, border: `1px solid ${navyBorder}`, borderRadius: 14,
          padding: 4, display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
          <textarea value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder='e.g. "Is a delivery truck subject to Louisiana sales tax?"'
            rows={2}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#EEF2FF",
              fontFamily: "inherit", fontSize: 15, resize: "none", padding: "14px 16px", lineHeight: 1.5, minHeight: 56 }} />
          <button onClick={() => handleAsk()} disabled={loading || !query.trim()}
            style={{ flexShrink: 0, padding: "10px 22px", background: loading ? "rgba(201,168,76,0.4)" : gold,
              border: "none", borderRadius: 10, color: navy, fontFamily: "inherit", fontSize: 14,
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", margin: 4 }}>
            {loading ? "⏳ Analyzing…" : "Analyze →"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: navyCard, borderRadius: 12,
          padding: 4, border: `1px solid ${navyBorder}` }}>
          {[["answer","📋 Tax Analysis"], ["browse","📚 Browse Laws"], ["rates","📊 Rates"], ["history","🕓 History"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: "none", fontFamily: "inherit",
                fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "center",
                background: tab === id ? navy : "transparent",
                color: tab === id ? gold : textDim }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: ANSWER */}
        {tab === "answer" && (
          <div>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${navyCard}`, borderTopColor: gold,
                  borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: textDim }}>Analyzing Louisiana tax law…</p>
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
                borderRadius: 10, padding: "16px 18px", color: "#E63946", fontSize: 14, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && !result && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 8, color: gold }}>Ask Your Tax Question</h3>
                <p style={{ color: textDim, fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
                  Type any question about Louisiana state tax law above, or tap a quick topic to get started.
                </p>
              </div>
            )}

            {!loading && result && (
              <div>
                <div style={{ background: navyCard, border: `1px solid ${navyBorder}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${navyBorder}`,
                    display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <StatusBadge status={result.status} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{result.q}</div>
                      <div style={{ fontSize: 12, color: textDim }}>
                        {result.tpp ? "📦 Involves Tangible Personal Property · " : ""}Louisiana RS Title 47
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <p style={{ fontSize: 15, color: "#EEF2FF", fontWeight: 500, marginBottom: 14, lineHeight: 1.6 }}>{result.summary}</p>
                    {(result.analysis || "").split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} style={{ color: textDim, fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{p}</p>
                    ))}

                    {result.statutes?.length > 0 && (
                      <>
                        <SectionLabel>📜 Louisiana Statutes</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {result.statutes.map((s, i) => (
                            <div key={i} style={{ background: "rgba(10,22,40,0.6)", border: `1px solid ${navyBorder}`,
                              borderRadius: 8, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: gold,
                                background: "rgba(201,168,76,0.12)", padding: "2px 8px", borderRadius: 4,
                                whiteSpace: "nowrap", flexShrink: 0 }}>{s.code}</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#EEF2FF", marginBottom: 2 }}>{s.title}</div>
                                <div style={{ fontSize: 12, color: textDim, lineHeight: 1.5 }}>{s.excerpt}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.localNotes && (
                      <>
                        <SectionLabel>🗺️ Parish / Local Notes</SectionLabel>
                        <p style={{ color: textDim, fontSize: 14, lineHeight: 1.6 }}>{result.localNotes}</p>
                      </>
                    )}
                  </div>
                </div>

                {result.examples?.length > 0 && (
                  <div style={{ background: navyCard, border: `1px solid ${navyBorder}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${navyBorder}` }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>📸 Real-World Examples</div>
                      <div style={{ fontSize: 12, color: textDim, marginTop: 2 }}>{result.examples.length} scenarios</div>
                    </div>
                    <div style={{ padding: "20px 22px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                        {result.examples.map((ex, i) => <ExampleCard key={i} ex={ex} />)}
                      </div>
                    </div>
                  </div>
                )}

                {result.relatedQuestions?.length > 0 && (
                  <>
                    <SectionLabel>🔗 Related Questions</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
                      {result.relatedQuestions.map((rq, i) => (
                        <button key={i} onClick={() => { setQuery(rq); handleAsk(rq); }}
                          style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                            border: `1px solid ${navyBorder}`, background: navyCard, color: textDim, fontFamily: "inherit" }}>
                          {rq}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: BROWSE */}
        {tab === "browse" && (
          <div>
            <SectionLabel>Tax Law Categories</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 32 }}>
              {BROWSE_CATS.map((c, i) => (
                <div key={i} onClick={() => { setQuery(c.q); handleAsk(c.q); }}
                  style={{ background: navyCard, border: `1px solid ${navyBorder}`, borderRadius: 14,
                    padding: "20px 16px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: textDim }}>{c.ref}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: RATES */}
        {tab === "rates" && (
          <div style={{ background: navyCard, border: `1px solid ${navyBorder}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${navyBorder}` }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Louisiana State Tax Rate Schedule</div>
              <div style={{ fontSize: 12, color: textDim, marginTop: 2 }}>As of 2024–2025 · Subject to local additions</div>
            </div>
            <div style={{ padding: "20px 22px" }}>
              {RATES.map((section, si) => (
                <div key={si}>
                  <SectionLabel>{section.section}</SectionLabel>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: "1px solid rgba(201,168,76,0.07)" }}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ padding: "10px 14px", fontSize: 13,
                              color: ci === 1 ? gold : ci === 0 ? "#EEF2FF" : textDim,
                              fontFamily: ci === 1 ? "monospace" : "inherit",
                              fontWeight: ci === 1 ? 500 : "normal" }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <p style={{ marginTop: 16, fontSize: 12, color: textDim }}>
                * Verify current rates at <strong style={{ color: gold }}>revenue.louisiana.gov</strong>
              </p>
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🕓</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 8, color: gold }}>No History Yet</h3>
                <p style={{ color: textDim, fontSize: 14 }}>Your recent questions will appear here.</p>
              </div>
            ) : history.map((h, i) => (
              <div key={i} onClick={() => { setResult(h.data); setTab("answer"); setQuery(h.q); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderRadius: 10, cursor: "pointer", border: `1px solid ${navyBorder}`,
                  background: navyCard, marginBottom: 8 }}>
                <span>{h.status === "TAXABLE" ? "⚠️" : h.status === "EXEMPT" ? "✅" : h.status === "PARTIALLY_TAXABLE" ? "◑" : "❓"}</span>
                <span style={{ flex: 1, fontSize: 13, color: textDim }}>{h.q}</span>
                <StatusBadge status={h.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${navyBorder}`, padding: "24px 20px", textAlign: "center" }}>
        <p style={{ color: textDim, fontSize: 12, lineHeight: 1.7 }}>
          Not legal advice. Verify with the{" "}
          <a href="https://revenue.louisiana.gov" target="_blank" rel="noreferrer" style={{ color: gold }}>
            Louisiana Department of Revenue
          </a>{" "}
          or a licensed tax professional.
        </p>
      </div>
    </div>
  );
}
