import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const YEARS = ["18-19", "19-20", "20-21", "21-22", "22-23"];
const YEAR_LABELS = {
  "18-19": "2018–19", "19-20": "2019–20", "20-21": "2020–21",
  "21-22": "2021–22", "22-23": "2022–23"
};

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${SUPABASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Colour coding for ticket categories ──────────────────────────────────────
const CATEGORY_COLOURS = {
  Single: "#1a56db", Pass: "#0e9f6e", Cap: "#7e3af2",
  "Multi-Trip": "#ff5a1f", Group: "#c27803", Transfer: "#6b7280",
};
function CategoryBadge({ cat }) {
  const colour = CATEGORY_COLOURS[cat] || "#6b7280";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      background: colour + "18", color: colour, border: `1px solid ${colour}40`,
    }}>{cat}</span>
  );
}

// ── Sparkline component ───────────────────────────────────────────────────────
function Sparkline({ prices }) {
  const vals = YEARS.map(y => prices[y] ?? null).filter(v => v !== null);
  if (vals.length < 2) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 4;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const first = vals[0], last = vals[vals.length - 1];
  const trend = last > first ? "#10b981" : last < first ? "#ef4444" : "#6b7280";
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={trend} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(" ").pop().split(",")[0]}
        cy={points.split(" ").pop().split(",")[1]} r="2.5" fill={trend} />
    </svg>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────
function TrendChart({ rows }) {
  if (!rows.length) return null;
  const grouped = {};
  rows.forEach(r => {
    const key = `${r.city} — ${r.transit_system} — ${r.ticket_type_raw} (${r.passenger_type})`;
    if (!grouped[key]) grouped[key] = { key, prices: {} };
    grouped[key].prices[r.financial_year] = r.price_local;
  });
  const series = Object.values(grouped).slice(0, 8);
  const allVals = series.flatMap(s => Object.values(s.prices)).filter(Boolean);
  if (!allVals.length) return null;
  const maxVal = Math.max(...allVals);
  const COLOURS = ["#1a56db","#0e9f6e","#7e3af2","#ff5a1f","#c27803","#06b6d4","#ec4899","#84cc16"];
  const W = 560, H = 200, PL = 60, PR = 20, PT = 20, PB = 40;
  const iW = W - PL - PR, iH = H - PT - PB;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ fontFamily: "inherit" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = PT + iH * (1 - t);
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={PL + iW} y2={y}
                stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={PL - 6} y={y + 4} textAnchor="end"
                fontSize="10" fill="#9ca3af">
                {(maxVal * t).toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* X axis labels */}
        {YEARS.map((y, i) => {
          const x = PL + (i / (YEARS.length - 1)) * iW;
          return (
            <text key={y} x={x} y={H - 8} textAnchor="middle"
              fontSize="10" fill="#6b7280">{YEAR_LABELS[y]}</text>
          );
        })}
        {/* Series lines */}
        {series.map((s, si) => {
          const colour = COLOURS[si % COLOURS.length];
          const points = YEARS.map((y, i) => {
            const v = s.prices[y];
            if (v == null) return null;
            const x = PL + (i / (YEARS.length - 1)) * iW;
            const py = PT + iH * (1 - v / maxVal);
            return `${x},${py}`;
          }).filter(Boolean);
          if (points.length < 2) return null;
          return (
            <polyline key={s.key} points={points.join(" ")}
              fill="none" stroke={colour} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 8 }}>
        {series.map((s, si) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4b5563" }}>
            <div style={{ width: 20, height: 2, background: COLOURS[si % COLOURS.length], borderRadius: 1 }} />
            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FaresPlatform() {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [passengerTypes, setPassengerTypes] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);

  const [filters, setFilters] = useState({
    country: "", city: "", passenger_type: "",
    ticket_category: "", report_fare_only: false,
  });
  const [results, setResults] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [trendData, setTrendData] = useState([]);

  // Load filter options on mount
  useEffect(() => {
    apiFetch("fares_full", { select: "country", limit: 5000 })
      .then(data => {
        const unique = [...new Set(data.map(d => d.country))].filter(Boolean).sort();
        setCountries(unique);
      }).catch(() => {});
    apiFetch("passenger_types", { select: "name", order: "name.asc", limit: 200 })
      .then(data => setPassengerTypes(data.map(d => d.name))).catch(() => {});
    apiFetch("ticket_categories", { select: "name", order: "name.asc", limit: 50 })
      .then(data => setTicketCategories(data.map(d => d.name))).catch(() => {});
  }, []);

  // Update city list when country changes
  useEffect(() => {
    if (!filters.country) { setCities([]); return; }
    apiFetch("fares_full", {
      select: "city", [`country`]: `eq.${filters.country}`, limit: 5000
    }).then(data => {
      const unique = [...new Set(data.map(d => d.city))].filter(Boolean).sort();
      setCities(unique);
    }).catch(() => {});
  }, [filters.country]);

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const search = useCallback(async () => {
    setLoading(true); setError(null); setSearched(true);
    try {
      const params = { select: "*", limit: 200, order: "country.asc,city.asc,passenger_type.asc" };
      if (filters.country) params["country"] = `eq.${filters.country}`;
      if (filters.city) params["city"] = `eq.${filters.city}`;
      if (filters.passenger_type) params["passenger_type"] = `eq.${filters.passenger_type}`;
      if (filters.ticket_category) params["ticket_category"] = `eq.${filters.ticket_category}`;
      if (filters.report_fare_only) params["report_fare"] = `eq.true`;

      const fares = await apiFetch("fares_full", params);
      setResults(fares);

      // Fetch prices for these fares
      if (fares.length > 0) {
        const ids = fares.map(f => f.id).join(",");
        const prices = await apiFetch("fare_prices", {
          select: "fare_id,financial_year,price_local,currency_raw",
          fare_id: `in.(${ids})`, limit: 5000,
        });
        const map = {};
        prices.forEach(p => {
          if (!map[p.fare_id]) map[p.fare_id] = {};
          map[p.fare_id][p.financial_year] = p.price_local;
        });
        setPriceMap(map);

        // Build trend data for chart
        if (activeTab === "trends") {
          const trendRows = prices.map(p => {
            const fare = fares.find(f => f.id === p.fare_id);
            return fare ? { ...p, ...fare } : null;
          }).filter(Boolean);
          setTrendData(trendRows);
        }
      } else {
        setPriceMap({}); setTrendData([]);
      }
    } catch (e) {
      setError("Failed to fetch data. Check your API key and connection.");
    }
    setLoading(false);
  }, [filters, activeTab]);

  // Re-run trend data when tab changes
  useEffect(() => {
    if (activeTab === "trends" && results.length > 0) {
      const ids = results.map(f => f.id).join(",");
      apiFetch("fare_prices", {
        select: "fare_id,financial_year,price_local,currency_raw",
        fare_id: `in.(${ids})`, limit: 5000,
      }).then(prices => {
        const trendRows = prices.map(p => {
          const fare = results.find(f => f.id === p.fare_id);
          return fare ? { ...p, ...fare } : null;
        }).filter(Boolean);
        setTrendData(trendRows);
      }).catch(() => {});
    }
  }, [activeTab]);

  const resetFilters = () => {
    setFilters({ country: "", city: "", passenger_type: "", ticket_category: "", report_fare_only: false });
    setResults([]); setPriceMap({}); setTrendData([]); setSearched(false);
  };

  const exportCSV = () => {
    if (!results.length) return;
    const headers = ["Country","City","Transit System","Fare System","Ticket Category",
      "High Level Desc","Ticket Type","Passenger Type","Is Concession","Peak",
      "Zone","Days Valid","Payment Media","Report Fare",
      ...YEARS.map(y => `Price ${YEAR_LABELS[y]}`)];
    const rows = results.map(r => [
      r.country, r.city, r.transit_system, r.fare_system, r.ticket_category,
      r.high_level_desc, r.ticket_type, r.passenger_type, r.is_concession,
      r.peak_label, r.zone, r.days_valid, r.payment_media, r.report_fare,
      ...YEARS.map(y => priceMap[r.id]?.[y] ?? ""),
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ninesquared_fares_export.csv";
    a.click();
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh", background: "#f8f9fc",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#111827",
    },
    header: {
      background: "#0f172a", padding: "0 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 56, borderBottom: "1px solid #1e293b",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 10,
    },
    logoMark: {
      width: 28, height: 28, background: "#3b82f6",
      borderRadius: 6, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff",
    },
    logoText: { color: "#f1f5f9", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
    logoSub: { color: "#64748b", fontSize: 11, fontWeight: 400, marginLeft: 4 },
    main: { maxWidth: 1200, margin: "0 auto", padding: "28px 24px" },
    card: {
      background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb",
      padding: "20px 24px", marginBottom: 20,
    },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 16, letterSpacing: "0.02em", textTransform: "uppercase" },
    filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
    label: { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" },
    select: {
      width: "100%", padding: "8px 10px", borderRadius: 6,
      border: "1px solid #d1d5db", background: "#fff",
      fontSize: 13, color: "#111827", outline: "none",
      appearance: "none", cursor: "pointer",
    },
    btnPrimary: {
      background: "#1d4ed8", color: "#fff", border: "none",
      padding: "9px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      cursor: "pointer", letterSpacing: "0.01em",
    },
    btnSecondary: {
      background: "transparent", color: "#6b7280",
      border: "1px solid #d1d5db", padding: "9px 16px",
      borderRadius: 6, fontSize: 13, cursor: "pointer",
    },
    btnExport: {
      background: "transparent", color: "#1d4ed8",
      border: "1px solid #bfdbfe", padding: "7px 14px",
      borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
    },
    tabs: { display: "flex", gap: 2, marginBottom: 20, background: "#f1f5f9", padding: 4, borderRadius: 8, width: "fit-content" },
    tab: (active) => ({
      padding: "7px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500,
      cursor: "pointer", border: "none",
      background: active ? "#fff" : "transparent",
      color: active ? "#111827" : "#6b7280",
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
    th: {
      padding: "10px 12px", textAlign: "left",
      background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
      fontSize: 11, fontWeight: 600, color: "#6b7280",
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
    },
    td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", color: "#374151", verticalAlign: "middle" },
    tdMuted: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", color: "#9ca3af", fontSize: 12 },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 },
    stat: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" },
    statVal: { fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1 },
    statLabel: { fontSize: 11, color: "#6b7280", marginTop: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" },
    checkRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 },
    empty: { textAlign: "center", padding: "48px 0", color: "#9ca3af" },
    emptyIcon: { fontSize: 32, marginBottom: 12 },
    pill: (val) => ({
      display: "inline-block", padding: "2px 8px", borderRadius: 12,
      fontSize: 11, background: val ? "#dcfce7" : "#f3f4f6",
      color: val ? "#15803d" : "#9ca3af",
    }),
  };

  const uniqueCities = [...new Set(results.map(r => r.city))].filter(Boolean);
  const uniqueSystems = [...new Set(results.map(r => r.transit_system))].filter(Boolean);
  const avgPrice22 = results.reduce((sum, r) => {
    const p = priceMap[r.id]?.["22-23"];
    return p ? { sum: sum.sum + p, n: sum.n + 1 } : sum;
  }, { sum: 0, n: 0 });

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoMark}>N²</div>
          <span style={S.logoText}>NineSquared</span>
          <span style={S.logoSub}>/ Fares Platform</span>
        </div>
        <div style={{ color: "#475569", fontSize: 12 }}>
          {results.length > 0 && `${results.length} records loaded`}
        </div>
      </div>

      <div style={S.main}>
        {/* Filter card */}
        <div style={S.card}>
          <div style={S.cardTitle}>Search Filters</div>
          <div style={S.filterGrid}>
            <div>
              <label style={S.label}>Country</label>
              <select style={S.select} value={filters.country}
                onChange={e => { set("country", e.target.value); set("city", ""); }}>
                <option value="">All countries</option>
                {countries.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>City</label>
              <select style={S.select} value={filters.city}
                onChange={e => set("city", e.target.value)}
                disabled={!filters.country}>
                <option value="">All cities</option>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Passenger type</label>
              <select style={S.select} value={filters.passenger_type}
                onChange={e => set("passenger_type", e.target.value)}>
                <option value="">All types</option>
                {passengerTypes.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Ticket category</label>
              <select style={S.select} value={filters.ticket_category}
                onChange={e => set("ticket_category", e.target.value)}>
                <option value="">All categories</option>
                {ticketCategories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <label style={S.checkRow}>
              <input type="checkbox" checked={filters.report_fare_only}
                onChange={e => set("report_fare_only", e.target.checked)} />
              <span style={{ fontSize: 13, color: "#374151" }}>Report fares only</span>
            </label>
            <div style={{ flex: 1 }} />
            <button style={S.btnSecondary} onClick={resetFilters}>Clear</button>
            <button style={S.btnPrimary} onClick={search} disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <>
            {/* Summary stats */}
            {results.length > 0 && (
              <div style={S.statGrid}>
                <div style={S.stat}>
                  <div style={S.statVal}>{results.length}</div>
                  <div style={S.statLabel}>Fare records</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal}>{uniqueCities.length}</div>
                  <div style={S.statLabel}>Cities</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal}>{uniqueSystems.length}</div>
                  <div style={S.statLabel}>Transit systems</div>
                </div>
                <div style={S.stat}>
                  <div style={S.statVal}>
                    {avgPrice22.n > 0 ? avgPrice22.sum / avgPrice22.n < 100
                      ? (avgPrice22.sum / avgPrice22.n).toFixed(2)
                      : Math.round(avgPrice22.sum / avgPrice22.n)
                      : "—"}
                  </div>
                  <div style={S.statLabel}>Avg price 2022–23</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            {results.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={S.tabs}>
                  {["browse","trends"].map(t => (
                    <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
                      {t === "browse" ? "Browse fares" : "Price trends"}
                    </button>
                  ))}
                </div>
                <button style={S.btnExport} onClick={exportCSV}>⬇ Export CSV</button>
              </div>
            )}

            {results.length === 0 ? (
              <div style={{ ...S.card, ...S.empty }}>
                <div style={S.emptyIcon}>🔍</div>
                <div style={{ fontWeight: 600, color: "#374151", marginBottom: 6 }}>No results found</div>
                <div style={{ fontSize: 13 }}>Try broadening your filters</div>
              </div>
            ) : activeTab === "browse" ? (
              <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {["Country","City","System","Category","Description","Passenger","Zone","Peak",
                          ...YEARS.map(y => YEAR_LABELS[y]),"Trend"].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => {
                        const prices = priceMap[r.id] || {};
                        return (
                          <tr key={r.id} style={{ background: "#fff" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <td style={S.td}>{r.country}</td>
                            <td style={S.td}>{r.city}</td>
                            <td style={S.tdMuted}>{r.transit_system}</td>
                            <td style={S.td}><CategoryBadge cat={r.ticket_category} /></td>
                            <td style={S.td}>
                              <div style={{ fontWeight: 500 }}>{r.high_level_desc}</div>
                              <div style={{ color: "#9ca3af", fontSize: 11 }}>{r.ticket_type}</div>
                            </td>
                            <td style={S.td}>
                              <div>{r.passenger_type}</div>
                              {r.is_concession && <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", padding: "1px 6px", borderRadius: 3 }}>Concession</span>}
                            </td>
                            <td style={S.tdMuted}>{r.zone || "—"}</td>
                            <td style={S.tdMuted}>{r.peak_label || "—"}</td>
                            {YEARS.map(y => (
                              <td key={y} style={{ ...S.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                {prices[y] != null
                                  ? prices[y] < 1000
                                    ? prices[y].toFixed(2)
                                    : prices[y].toLocaleString()
                                  : <span style={{ color: "#d1d5db" }}>—</span>}
                              </td>
                            ))}
                            <td style={{ ...S.td, paddingRight: 16 }}>
                              <Sparkline prices={prices} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {results.length === 200 && (
                  <div style={{ padding: "10px 16px", background: "#fffbeb", borderTop: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
                    Showing first 200 results — refine your filters for a more specific view.
                  </div>
                )}
              </div>
            ) : (
              <div style={S.card}>
                <div style={S.cardTitle}>Price trends over time</div>
                <TrendChart rows={trendData} />
                {trendData.length === 0 && (
                  <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                    No price data available for this selection
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!searched && (
          <div style={{ ...S.card, textAlign: "center", padding: "56px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#374151", marginBottom: 8 }}>
              NineSquared Global Fares Database
            </div>
            <div style={{ color: "#6b7280", fontSize: 13, maxWidth: 400, margin: "0 auto" }}>
              5,100 fare records across 47 countries, 94 cities and 5 years of pricing history.
              Select filters above and click Search to explore.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
