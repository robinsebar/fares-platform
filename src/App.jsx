import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Update these when new fare years are added to the database
const YEARS = ["18-19", "19-20", "20-21", "21-22", "22-23", "23-24", "24-25"];
const YEAR_LABELS = {
  "18-19": "2018–19", "19-20": "2019–20", "20-21": "2020–21",
  "21-22": "2021–22", "22-23": "2022–23", "23-24": "2023–24", "24-25": "2024–25"
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

// ── Logo ─────────────────────────────────────────────────────────────────────
function N2Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#2563eb"/>
      <text x="20" y="27" textAnchor="middle" fontFamily="Georgia, serif"
        fontWeight="700" fontSize="20" fill="white">N²</text>
    </svg>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────
const CAT_COLOURS = {
  Single: "#1a56db", Pass: "#0e9f6e", Cap: "#7e3af2",
  "Multi-Trip": "#ff5a1f", Group: "#c27803", Transfer: "#6b7280",
};
function CategoryBadge({ cat }) {
  const c = CAT_COLOURS[cat] || "#6b7280";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      background: c + "18", color: c, border: `1px solid ${c}40`,
    }}>{cat}</span>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ prices }) {
  const vals = YEARS.map(y => prices[y] ?? null).filter(v => v !== null);
  if (vals.length < 2) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const w = 80, h = 28, pad = 4;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const trend = vals[vals.length-1] > vals[0] ? "#ef4444" : vals[vals.length-1] < vals[0] ? "#10b981" : "#6b7280";
  return (
    <svg width={w} height={h}>
      <polyline points={points} fill="none" stroke={trend} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────
const COLOURS = ["#2563eb","#0e9f6e","#7e3af2","#ff5a1f","#c27803","#06b6d4","#ec4899","#84cc16"];
function TrendChart({ rows, metric }) {
  if (!rows.length) return <div style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No data for this selection</div>;

  const grouped = {};
  rows.forEach(r => {
    const key = `${r.city} — ${r.ticket_type || r.ticket_type_raw} (${r.passenger_type})`;
    if (!grouped[key]) grouped[key] = { key, city: r.city, points: {} };
    let val = null;
    if (metric === "price") val = r.price_local;
    else if (metric === "ppp") val = r.price_usd_ppp;
    else if (metric === "min_wage") val = r.min_wage_minutes;
    else if (metric === "avg_wage") val = r.avg_wage_minutes;
    if (val != null) grouped[key].points[r.financial_year] = val;
  });

  const series = Object.values(grouped).slice(0, 8);
  const allVals = series.flatMap(s => Object.values(s.points)).filter(Boolean);
  if (!allVals.length) return <div style={{ color: "#9ca3af", textAlign: "center", padding: 32 }}>No price data for this selection</div>;

  const maxVal = Math.max(...allVals);
  const W = 600, H = 220, PL = 64, PR = 20, PT = 20, PB = 44;
  const iW = W - PL - PR, iH = H - PT - PB;
  const activeYears = YEARS.filter(y => series.some(s => s.points[y] != null));

  const metricLabel = { price: "Local price", ppp: "USD (PPP)", min_wage: "Min wage (mins)", avg_wage: "Avg wage (mins)" }[metric];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ fontFamily: "inherit", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = PT + iH * (1 - t);
          const val = maxVal * t;
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val < 10 ? val.toFixed(2) : Math.round(val)}
              </text>
            </g>
          );
        })}
        <text x={PL - 40} y={PT + iH / 2} textAnchor="middle" fontSize="10" fill="#6b7280"
          transform={`rotate(-90, ${PL - 40}, ${PT + iH / 2})`}>{metricLabel}</text>
        {activeYears.map((y, i) => {
          const x = PL + (i / (activeYears.length - 1 || 1)) * iW;
          return (
            <text key={y} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              {YEAR_LABELS[y]}
            </text>
          );
        })}
        {series.map((s, si) => {
          const colour = COLOURS[si % COLOURS.length];
          const pts = activeYears.map((y, i) => {
            const v = s.points[y];
            if (v == null) return null;
            const x = PL + (i / (activeYears.length - 1 || 1)) * iW;
            const py = PT + iH * (1 - v / maxVal);
            return `${x},${py}`;
          }).filter(Boolean);
          if (pts.length < 1) return null;
          return (
            <g key={s.key}>
              {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={colour} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />}
              {pts.map((pt, pi) => (
                <circle key={pi} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r="3" fill={colour} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 10 }}>
        {series.map((s, si) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4b5563" }}>
            <div style={{ width: 20, height: 2.5, background: COLOURS[si % COLOURS.length], borderRadius: 1 }} />
            <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── City selector for comparison ──────────────────────────────────────────────
function CitySelector({ allCities, selected, onChange, label }) {
  return (
    <div>
      <label style={LS.label}>{label}</label>
      <select style={LS.select} value={selected} onChange={e => onChange(e.target.value)}>
        <option value="">Select city…</option>
        {allCities.map(c => <option key={c.key} value={c.key}>{c.country} — {c.city}</option>)}
      </select>
    </div>
  );
}

// ── Shared label styles ───────────────────────────────────────────────────────
const LS = {
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" },
  select: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, color: "#111827", outline: "none" },
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FaresPlatform() {
  const [allCities, setAllCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [passengerTypes, setPassengerTypes] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);

  const [filters, setFilters] = useState({
    country: "", city: "", passenger_type: "", ticket_category: "", report_fare_only: false,
  });
  const [results, setResults] = useState([]);
  const [priceMap, setPriceMap] = useState({});      // fare_id -> { year -> price_local }
  const [econMap, setEconMap] = useState({});         // fare_id -> { year -> { ppp, min_wage, avg_wage } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  // Compare tab state
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareC, setCompareC] = useState("");
  const [comparePassenger, setComparePassenger] = useState("");
  const [compareCategory, setCompareCategory] = useState("");
  const [compareResults, setCompareResults] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [comparePriceMap, setComparePriceMap] = useState({});
  const [compareEconMap, setCompareEconMap] = useState({});
  const [trendMetric, setTrendMetric] = useState("price");

  // Load filter options from fares_full (avoids RLS issues on lookup tables)
  useEffect(() => {
    apiFetch("fares_full", { select: "country,city,passenger_type,ticket_category", limit: 5000 })
      .then(data => {
        const uniqueCountries = [...new Set(data.map(d => d.country))].filter(Boolean).sort();
        setCountries(uniqueCountries);
        const uniquePT = [...new Set(data.map(d => d.passenger_type))].filter(Boolean).sort();
        setPassengerTypes(uniquePT);
        const uniqueTC = [...new Set(data.map(d => d.ticket_category))].filter(Boolean).sort();
        setTicketCategories(uniqueTC);
        // Build city list for comparison
        const cityMap = {};
        data.forEach(d => {
          if (d.country && d.city) {
            const key = `${d.country}||${d.city}`;
            cityMap[key] = { key, country: d.country, city: d.city };
          }
        });
        setAllCities(Object.values(cityMap).sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city)));
      }).catch(() => {});
  }, []);

  // Update city dropdown when country changes
  useEffect(() => {
    if (!filters.country) { setCities([]); return; }
    const filtered = allCities.filter(c => c.country === filters.country).map(c => c.city);
    setCities(filtered);
  }, [filters.country, allCities]);

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  // Fetch economics data for a set of fare IDs
  async function fetchEcon(fareIds, fareList) {
    if (!fareIds.length) return {};
    const ids = fareIds.join(",");
    try {
      const prices = await apiFetch("fares_latest_price", {
        select: "id,financial_year,price_local,price_usd_ppp,min_wage_minutes,avg_wage_minutes",
        id: `in.(${ids})`, limit: 10000,
      });
      // fares_latest_price only has 22-23; for full econ across years we use fare_prices + city_economics join via view
      // Build map: fare_id -> year -> econ
      const map = {};
      prices.forEach(p => {
        if (!map[p.id]) map[p.id] = {};
        map[p.id][p.financial_year] = {
          ppp: p.price_usd_ppp,
          min_wage: p.min_wage_minutes,
          avg_wage: p.avg_wage_minutes,
        };
      });
      return map;
    } catch { return {}; }
  }

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

      if (fares.length > 0) {
        const ids = fares.map(f => f.id).join(",");
        // Fetch prices
        const prices = await apiFetch("fare_prices", {
          select: "fare_id,financial_year,price_local,currency_raw",
          fare_id: `in.(${ids})`, limit: 10000,
        });
        const pMap = {};
        prices.forEach(p => {
          if (!pMap[p.fare_id]) pMap[p.fare_id] = {};
          pMap[p.fare_id][p.financial_year] = p.price_local;
        });
        setPriceMap(pMap);

        // Fetch econ data via fares_latest_price view
        const fareIds = fares.map(f => f.id);
        const eMap = await fetchEcon(fareIds, fares);
        setEconMap(eMap);
      } else {
        setPriceMap({}); setEconMap({});
      }
    } catch (e) {
      setError("Failed to fetch data. Check your connection.");
    }
    setLoading(false);
  }, [filters]);

  // Compare cities
  const runCompare = useCallback(async () => {
    const selectedCities = [compareA, compareB, compareC].filter(Boolean);
    if (selectedCities.length < 2) return;
    setCompareLoading(true);
    try {
      const allFares = [];
      for (const cityKey of selectedCities) {
        const [country, city] = cityKey.split("||");
        const params = { select: "*", limit: 500, country: `eq.${country}`, city: `eq.${city}` };
        if (comparePassenger) params["passenger_type"] = `eq.${comparePassenger}`;
        if (compareCategory) params["ticket_category"] = `eq.${compareCategory}`;
        const fares = await apiFetch("fares_full", params);
        allFares.push(...fares);
      }
      setCompareResults(allFares);

      if (allFares.length > 0) {
        const ids = allFares.map(f => f.id).join(",");
        const prices = await apiFetch("fare_prices", {
          select: "fare_id,financial_year,price_local,currency_raw",
          fare_id: `in.(${ids})`, limit: 10000,
        });
        const pMap = {};
        prices.forEach(p => {
          if (!pMap[p.fare_id]) pMap[p.fare_id] = {};
          pMap[p.fare_id][p.financial_year] = p.price_local;
        });
        setComparePriceMap(pMap);

        const eMap = await fetchEcon(allFares.map(f => f.id), allFares);
        setCompareEconMap(eMap);
      }
    } catch (e) { }
    setCompareLoading(false);
  }, [compareA, compareB, compareC, comparePassenger, compareCategory]);

  const exportCSV = (data, pMap) => {
    if (!data.length) return;
    const headers = ["Country","City","Transit System","Fare System","Ticket Category",
      "Description","Ticket Type","Passenger Type","Is Concession","Peak","Zone","Days Valid",
      "Payment Media", "Report Fare",
      ...YEARS.map(y => `Price ${YEAR_LABELS[y]}`)];
    const rows = data.map(r => [
      r.country, r.city, r.transit_system, r.fare_system, r.ticket_category,
      r.high_level_desc, r.ticket_type, r.passenger_type, r.is_concession,
      r.peak_label, r.zone, r.days_valid, r.payment_media, r.report_fare,
      ...YEARS.map(y => pMap[r.id]?.[y] ?? ""),
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

  // Build trend rows for chart
  const buildTrendRows = (fares, pMap, eMap) => {
    const rows = [];
    fares.forEach(fare => {
      YEARS.forEach(y => {
        const price_local = pMap[fare.id]?.[y];
        const econ = eMap[fare.id]?.[y];
        if (price_local != null || econ) {
          rows.push({
            ...fare,
            financial_year: y,
            price_local: price_local ?? null,
            price_usd_ppp: econ?.ppp ?? null,
            min_wage_minutes: econ?.min_wage ?? null,
            avg_wage_minutes: econ?.avg_wage ?? null,
          });
        }
      });
    });
    return rows;
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    app: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#111827" },
    header: { background: "#0f172a", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, borderBottom: "1px solid #1e293b" },
    logoArea: { display: "flex", alignItems: "center", gap: 10 },
    logoText: { color: "#f1f5f9", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
    logoSub: { color: "#475569", fontSize: 11, marginLeft: 6 },
    main: { maxWidth: 1280, margin: "0 auto", padding: "24px 20px" },
    card: { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "18px 22px", marginBottom: 18 },
    cardTitle: { fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 14, letterSpacing: "0.06em", textTransform: "uppercase" },
    filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 },
    label: { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" },
    select: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#111827", outline: "none" },
    btnPrimary: { background: "#2563eb", color: "#fff", border: "none", padding: "9px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
    btnSecondary: { background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "9px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer" },
    btnExport: { background: "transparent", color: "#2563eb", border: "1px solid #bfdbfe", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" },
    tabs: { display: "flex", gap: 2, background: "#f1f5f9", padding: 4, borderRadius: 8, width: "fit-content" },
    tab: (a) => ({ padding: "7px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: a ? "#fff" : "transparent", color: a ? "#111827" : "#64748b", boxShadow: a ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
    th: { padding: "10px 12px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" },
    td: { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", color: "#374151", verticalAlign: "middle" },
    tdNum: { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", color: "#374151", verticalAlign: "middle", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", fontSize: 12 },
    tdMuted: { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", color: "#94a3b8", fontSize: 12, verticalAlign: "middle" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 },
    stat: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 18px" },
    statVal: { fontSize: 24, fontWeight: 700, color: "#0f172a", lineHeight: 1 },
    statLabel: { fontSize: 10.5, color: "#64748b", marginTop: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
    metricBtn: (a) => ({ padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid", borderColor: a ? "#2563eb" : "#e2e8f0", background: a ? "#eff6ff" : "transparent", color: a ? "#2563eb" : "#64748b" }),
    econCell: (val, max) => ({
      padding: "9px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right",
      fontVariantNumeric: "tabular-nums", fontSize: 12,
      color: val == null ? "#d1d5db" : val > max * 0.66 ? "#dc2626" : val > max * 0.33 ? "#d97706" : "#059669",
      fontWeight: val != null ? 600 : 400,
    }),
  };

  const uniqueCities = [...new Set(results.map(r => r.city))].filter(Boolean);
  const uniqueSystems = [...new Set(results.map(r => r.transit_system))].filter(Boolean);
  const avg2223 = (() => {
    const vals = results.map(r => priceMap[r.id]?.["22-23"]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();

  const trendRows = buildTrendRows(results, priceMap, econMap);
  const compareTrendRows = buildTrendRows(compareResults, comparePriceMap, compareEconMap);

  const econColour = (val, allVals) => {
    if (val == null) return "#d1d5db";
    const max = Math.max(...allVals.filter(v => v != null));
    if (val > max * 0.66) return "#dc2626";
    if (val > max * 0.33) return "#d97706";
    return "#059669";
  };

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logoArea}>
          <N2Logo size={30} />
          <span style={S.logoText}>NineSquared</span>
          <span style={S.logoSub}>/ Global Fares Platform</span>
        </div>
        <div style={{ color: "#475569", fontSize: 12 }}>
          {results.length > 0 && `${results.length} records`}
        </div>
      </div>

      <div style={S.main}>
        {/* Top tabs — Browse vs Compare */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={S.tabs}>
            {[["browse","Browse & Search"],["compare","Compare Cities"]].map(([t, l]) => (
              <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── BROWSE TAB ── */}
        {activeTab === "browse" && (
          <>
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
                    onChange={e => set("city", e.target.value)} disabled={!filters.country}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  <input type="checkbox" checked={filters.report_fare_only}
                    onChange={e => set("report_fare_only", e.target.checked)} />
                  Report fares only
                </label>
                <div style={{ flex: 1 }} />
                <button style={S.btnSecondary} onClick={() => {
                  setFilters({ country: "", city: "", passenger_type: "", ticket_category: "", report_fare_only: false });
                  setResults([]); setPriceMap({}); setEconMap({}); setSearched(false);
                }}>Clear</button>
                <button style={S.btnPrimary} onClick={search} disabled={loading}>
                  {loading ? "Searching…" : "Search"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 14, color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}

            {searched && !loading && results.length === 0 && (
              <div style={{ ...S.card, textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                <div style={{ fontWeight: 600, color: "#374151" }}>No results found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Try broadening your filters</div>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div style={S.statGrid}>
                  {[
                    [results.length, "Fare records"],
                    [uniqueCities.length, "Cities"],
                    [uniqueSystems.length, "Transit systems"],
                    [avg2223 != null ? (avg2223 < 100 ? avg2223.toFixed(2) : Math.round(avg2223)) : "—", "Avg price 2022–23"],
                  ].map(([v, l]) => (
                    <div key={l} style={S.stat}>
                      <div style={S.statVal}>{v}</div>
                      <div style={S.statLabel}>{l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={S.tabs}>
                    {[["table","Fare table"],["econ","Affordability"],["trends","Price trends"]].map(([t, l]) => (
                      <button key={t} style={S.tab(activeTab === "browse_"+t)}
                        onClick={() => setActiveTab("browse_"+t)}>{l}</button>
                    ))}
                  </div>
                  <button style={S.btnExport} onClick={() => exportCSV(results, priceMap)}>⬇ Export CSV</button>
                </div>

                {/* Fare table */}
                {(activeTab === "browse" || activeTab === "browse_table") && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {["Country","City","System","Category","Description","Passenger","Zone",
                              ...YEARS.map(y => YEAR_LABELS[y]),"Trend"].map(h => (
                              <th key={h} style={S.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map(r => {
                            const prices = priceMap[r.id] || {};
                            return (
                              <tr key={r.id}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={S.td}>{r.country}</td>
                                <td style={S.td}>{r.city}</td>
                                <td style={S.tdMuted}>{r.transit_system}</td>
                                <td style={S.td}><CategoryBadge cat={r.ticket_category} /></td>
                                <td style={S.td}>
                                  <div style={{ fontWeight: 500 }}>{r.high_level_desc}</div>
                                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.ticket_type}</div>
                                </td>
                                <td style={S.td}>
                                  <div>{r.passenger_type}</div>
                                  {r.is_concession && <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", padding: "1px 5px", borderRadius: 3 }}>Concession</span>}
                                </td>
                                <td style={S.tdMuted}>{r.zone || "—"}</td>
                                {YEARS.map(y => (
                                  <td key={y} style={S.tdNum}>
                                    {prices[y] != null
                                      ? prices[y] < 1000 ? prices[y].toFixed(2) : prices[y].toLocaleString()
                                      : <span style={{ color: "#e2e8f0" }}>—</span>}
                                  </td>
                                ))}
                                <td style={{ ...S.td, paddingRight: 14 }}>
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
                        Showing first 200 results — refine filters for a more specific view.
                      </div>
                    )}
                  </div>
                )}

                {/* Affordability table */}
                {activeTab === "browse_econ" && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>
                      Affordability metrics for 2022–23. <strong>Min/Avg wage</strong> = minutes of work to afford the fare.
                      Colour: <span style={{ color: "#059669", fontWeight: 600 }}>green</span> = affordable,
                      <span style={{ color: "#d97706", fontWeight: 600 }}> amber</span> = moderate,
                      <span style={{ color: "#dc2626", fontWeight: 600 }}> red</span> = expensive relative to peers.
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {["Country","City","System","Ticket","Passenger","Local price","USD (PPP)","Min wage (mins)","Avg wage (mins)"].map(h => (
                              <th key={h} style={S.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const allPPP = results.map(r => econMap[r.id]?.["22-23"]?.ppp).filter(Boolean);
                            const allMin = results.map(r => econMap[r.id]?.["22-23"]?.min_wage).filter(Boolean);
                            const allAvg = results.map(r => econMap[r.id]?.["22-23"]?.avg_wage).filter(Boolean);
                            return results.map(r => {
                              const econ = econMap[r.id]?.["22-23"] || {};
                              const price = priceMap[r.id]?.["22-23"];
                              return (
                                <tr key={r.id}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                                  <td style={S.td}>{r.country}</td>
                                  <td style={S.td}>{r.city}</td>
                                  <td style={S.tdMuted}>{r.transit_system}</td>
                                  <td style={S.td}>
                                    <CategoryBadge cat={r.ticket_category} />
                                    <span style={{ marginLeft: 6, fontSize: 12 }}>{r.high_level_desc}</span>
                                  </td>
                                  <td style={S.tdMuted}>{r.passenger_type}</td>
                                  <td style={S.tdNum}>{price != null ? price.toFixed(2) : "—"}</td>
                                  <td style={{ ...S.tdNum, color: econ.ppp != null ? econColour(econ.ppp, allPPP) : "#d1d5db", fontWeight: econ.ppp ? 600 : 400 }}>
                                    {econ.ppp != null ? econ.ppp.toFixed(3) : "—"}
                                  </td>
                                  <td style={{ ...S.tdNum, color: econ.min_wage != null ? econColour(econ.min_wage, allMin) : "#d1d5db", fontWeight: econ.min_wage ? 600 : 400 }}>
                                    {econ.min_wage != null ? econ.min_wage.toFixed(1) : "—"}
                                  </td>
                                  <td style={{ ...S.tdNum, color: econ.avg_wage != null ? econColour(econ.avg_wage, allAvg) : "#d1d5db", fontWeight: econ.avg_wage ? 600 : 400 }}>
                                    {econ.avg_wage != null ? econ.avg_wage.toFixed(1) : "—"}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trends chart */}
                {activeTab === "browse_trends" && (
                  <div style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Show:</span>
                      {[["price","Local price"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k, l]) => (
                        <button key={k} style={S.metricBtn(trendMetric === k)} onClick={() => setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <TrendChart rows={trendRows} metric={trendMetric} />
                  </div>
                )}
              </>
            )}

            {!searched && (
              <div style={{ ...S.card, textAlign: "center", padding: "52px 0" }}>
                <N2Logo size={44} />
                <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginTop: 14, marginBottom: 8 }}>
                  NineSquared Global Fares Database
                </div>
                <div style={{ color: "#64748b", fontSize: 13, maxWidth: 420, margin: "0 auto", lineHeight: 1.7 }}>
                  5,100 fare records across 47 countries, 94 cities and 5 years of pricing history,
                  with PPP-adjusted pricing and wage affordability metrics.
                </div>
              </div>
            )}
          </>
        )}

        {/* ── COMPARE CITIES TAB ── */}
        {activeTab === "compare" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Select cities to compare</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <CitySelector allCities={allCities} selected={compareA} onChange={setCompareA} label="City A (required)" />
                <CitySelector allCities={allCities} selected={compareB} onChange={setCompareB} label="City B (required)" />
                <CitySelector allCities={allCities} selected={compareC} onChange={setCompareC} label="City C (optional)" />
                <div>
                  <label style={LS.label}>Passenger type</label>
                  <select style={LS.select} value={comparePassenger} onChange={e => setComparePassenger(e.target.value)}>
                    <option value="">All types</option>
                    {passengerTypes.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LS.label}>Ticket category</label>
                  <select style={LS.select} value={compareCategory} onChange={e => setCompareCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {ticketCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button style={S.btnPrimary}
                  onClick={runCompare}
                  disabled={!compareA || !compareB || compareLoading}>
                  {compareLoading ? "Loading…" : "Compare"}
                </button>
              </div>
            </div>

            {compareResults.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={S.tabs}>
                    {[["compare_table","Fare table"],["compare_econ","Affordability"],["compare_trends","Price trends"]].map(([t, l]) => (
                      <button key={t} style={S.tab(activeTab === t)}
                        onClick={() => setActiveTab(t)}>{l}</button>
                    ))}
                  </div>
                  <button style={S.btnExport} onClick={() => exportCSV(compareResults, comparePriceMap)}>⬇ Export CSV</button>
                </div>

                {(activeTab === "compare" || activeTab === "compare_table") && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {["City","System","Category","Description","Passenger",
                              ...YEARS.map(y => YEAR_LABELS[y]),"Trend"].map(h => (
                              <th key={h} style={S.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareResults.map(r => {
                            const prices = comparePriceMap[r.id] || {};
                            return (
                              <tr key={r.id}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={{ ...S.td, fontWeight: 600 }}>{r.city}</td>
                                <td style={S.tdMuted}>{r.transit_system}</td>
                                <td style={S.td}><CategoryBadge cat={r.ticket_category} /></td>
                                <td style={S.td}>{r.high_level_desc}
                                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.ticket_type}</div>
                                </td>
                                <td style={S.tdMuted}>{r.passenger_type}</td>
                                {YEARS.map(y => (
                                  <td key={y} style={S.tdNum}>
                                    {prices[y] != null
                                      ? prices[y] < 1000 ? prices[y].toFixed(2) : prices[y].toLocaleString()
                                      : <span style={{ color: "#e2e8f0" }}>—</span>}
                                  </td>
                                ))}
                                <td style={S.td}><Sparkline prices={prices} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "compare_econ" && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>
                      Affordability comparison for 2022–23 across selected cities. Min/Avg wage = minutes of work to afford fare.
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {["City","System","Ticket","Passenger","Local price","USD (PPP)","Min wage (mins)","Avg wage (mins)"].map(h => (
                              <th key={h} style={S.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const allPPP = compareResults.map(r => compareEconMap[r.id]?.["22-23"]?.ppp).filter(Boolean);
                            const allMin = compareResults.map(r => compareEconMap[r.id]?.["22-23"]?.min_wage).filter(Boolean);
                            const allAvg = compareResults.map(r => compareEconMap[r.id]?.["22-23"]?.avg_wage).filter(Boolean);
                            return compareResults.map(r => {
                              const econ = compareEconMap[r.id]?.["22-23"] || {};
                              const price = comparePriceMap[r.id]?.["22-23"];
                              return (
                                <tr key={r.id}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                                  <td style={{ ...S.td, fontWeight: 600 }}>{r.city}</td>
                                  <td style={S.tdMuted}>{r.transit_system}</td>
                                  <td style={S.td}><CategoryBadge cat={r.ticket_category} /><span style={{ marginLeft: 6, fontSize: 12 }}>{r.high_level_desc}</span></td>
                                  <td style={S.tdMuted}>{r.passenger_type}</td>
                                  <td style={S.tdNum}>{price != null ? price.toFixed(2) : "—"}</td>
                                  <td style={{ ...S.tdNum, color: econColour(econ.ppp, allPPP), fontWeight: econ.ppp ? 600 : 400 }}>
                                    {econ.ppp != null ? econ.ppp.toFixed(3) : "—"}
                                  </td>
                                  <td style={{ ...S.tdNum, color: econColour(econ.min_wage, allMin), fontWeight: econ.min_wage ? 600 : 400 }}>
                                    {econ.min_wage != null ? econ.min_wage.toFixed(1) : "—"}
                                  </td>
                                  <td style={{ ...S.tdNum, color: econColour(econ.avg_wage, allAvg), fontWeight: econ.avg_wage ? 600 : 400 }}>
                                    {econ.avg_wage != null ? econ.avg_wage.toFixed(1) : "—"}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "compare_trends" && (
                  <div style={S.card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Show:</span>
                      {[["price","Local price"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k, l]) => (
                        <button key={k} style={S.metricBtn(trendMetric === k)} onClick={() => setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <TrendChart rows={compareTrendRows} metric={trendMetric} />
                  </div>
                )}
              </>
            )}

            {!compareResults.length && !compareLoading && (
              <div style={{ ...S.card, textAlign: "center", padding: "44px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🏙️</div>
                <div style={{ fontWeight: 600, color: "#374151" }}>Select two or three cities above</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Compare fares, PPP prices and wage affordability side by side</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
