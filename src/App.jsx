import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const YEARS = ["18-19","19-20","20-21","21-22","22-23","23-24","24-25","25-26"];
const YEAR_LABELS = {
  "18-19":"2018–19","19-20":"2019–20","20-21":"2020–21","21-22":"2021–22",
  "22-23":"2022–23","23-24":"2023–24","24-25":"2024–25","25-26":"2025–26"
};
const CURRENT_YEAR = "24-25";

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${SUPABASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function N2Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#2563eb"/>
      <text x="20" y="27" textAnchor="middle" fontFamily="Georgia,serif"
        fontWeight="700" fontSize="20" fill="white">N²</text>
    </svg>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────
const CAT_COLOURS = {
  Single:"#1a56db", Pass:"#0e9f6e", Cap:"#7e3af2",
  "Multi-Trip":"#ff5a1f", Return:"#c27803", Transfer:"#6b7280", Group:"#0891b2",
};
function CategoryBadge({ cat }) {
  const c = CAT_COLOURS[cat] || "#6b7280";
  return (
    <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:4,
      fontSize:10.5, fontWeight:700, letterSpacing:"0.04em",
      background:c+"18", color:c, border:`1px solid ${c}40` }}>{cat || "—"}</span>
  );
}

function DiscontinuedBadge() {
  return (
    <span title="This fare product has been discontinued"
      style={{ display:"inline-block", padding:"1px 6px", borderRadius:3,
        fontSize:10, fontWeight:700, background:"#fef3c7", color:"#92400e",
        border:"1px solid #fde68a", marginLeft:4 }}>DISCONTINUED</span>
  );
}

function InactiveBadge() {
  return (
    <span title="This fare was not active in this year"
      style={{ display:"inline-block", padding:"1px 6px", borderRadius:3,
        fontSize:10, fontWeight:700, background:"#f1f5f9", color:"#94a3b8",
        border:"1px solid #e2e8f0", marginLeft:4 }}>INACTIVE</span>
  );
}

// ── Trend sparkline per product ───────────────────────────────────────────────
function Sparkline({ points }) {
  // points: { year -> value }
  const vals = YEARS.map(y => points[y] ?? null).filter(v => v !== null);
  if (vals.length < 2) return <span style={{ color:"#9ca3af", fontSize:12 }}>—</span>;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const w = 72, h = 24, pad = 3;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length-1)) * (w - pad*2);
    const y = h - pad - ((v-min)/range) * (h - pad*2);
    return `${x},${y}`;
  }).join(" ");
  const trend = vals[vals.length-1] > vals[0] ? "#ef4444"
    : vals[vals.length-1] < vals[0] ? "#10b981" : "#94a3b8";
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={trend} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────
const COLOURS = ["#2563eb","#0e9f6e","#7e3af2","#ff5a1f","#c27803","#06b6d4","#ec4899","#84cc16"];

function TrendChart({ products, metric }) {
  // products: array of { product_id, label, observations: {year -> {fare,ppp,min_wage,avg_wage}} }
  if (!products.length) return (
    <div style={{ color:"#94a3b8", textAlign:"center", padding:40, fontSize:13 }}>
      No data for this selection
    </div>
  );

  const getVal = (obs, m) => {
    if (!obs) return null;
    if (m === "fare") return obs.fare;
    if (m === "ppp") return obs.ppp;
    if (m === "min_wage") return obs.min_wage_mins;
    if (m === "avg_wage") return obs.avg_wage_mins;
    return null;
  };

  const series = products.slice(0, 8).map((p, si) => ({
    label: p.label,
    colour: COLOURS[si % COLOURS.length],
    points: YEARS.map(y => ({ year: y, val: getVal(p.observations[y], metric) }))
              .filter(pt => pt.val != null),
  }));

  const allVals = series.flatMap(s => s.points.map(pt => pt.val));
  if (!allVals.length) return (
    <div style={{ color:"#94a3b8", textAlign:"center", padding:40, fontSize:13 }}>
      No price data available — add observations for these products
    </div>
  );

  const maxVal = Math.max(...allVals);
  const activeYears = YEARS.filter(y => series.some(s => s.points.find(pt => pt.year === y)));
  const W=600, H=220, PL=64, PR=20, PT=20, PB=44;
  const iW=W-PL-PR, iH=H-PT-PB;

  const xOf = y => PL + (activeYears.indexOf(y) / (activeYears.length-1 || 1)) * iW;
  const yOf = v => PT + iH * (1 - v / maxVal);

  const metricLabel = { fare:"Local fare", ppp:"USD (PPP)", min_wage:"Min wage (mins)", avg_wage:"Avg wage (mins)" }[metric];

  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={H} style={{ fontFamily:"inherit", display:"block" }}>
        {[0,0.25,0.5,0.75,1].map(t => {
          const y = PT + iH*(1-t), val = maxVal*t;
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={PL+iW} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4"/>
              <text x={PL-6} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val < 10 ? val.toFixed(2) : Math.round(val)}
              </text>
            </g>
          );
        })}
        <text x={18} y={PT+iH/2} textAnchor="middle" fontSize="10" fill="#64748b"
          transform={`rotate(-90,18,${PT+iH/2})`}>{metricLabel}</text>
        {activeYears.map(y => (
          <text key={y} x={xOf(y)} y={H-8} textAnchor="middle" fontSize="10" fill="#6b7280">
            {YEAR_LABELS[y]}
          </text>
        ))}
        {series.map(s => {
          const pts = s.points.map(pt => `${xOf(pt.year)},${yOf(pt.val)}`);
          return (
            <g key={s.label}>
              {pts.length > 1 && <polyline points={pts.join(" ")} fill="none"
                stroke={s.colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
              {pts.map((pt, i) => (
                <circle key={i} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r="3" fill={s.colour}/>
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:10 }}>
        {series.map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#4b5563" }}>
            <div style={{ width:18, height:2.5, background:s.colour, borderRadius:1 }}/>
            <span style={{ maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const toggle = val => onChange(selected.includes(val) ? selected.filter(v=>v!==val) : [...selected, val]);
  const display = selected.length === 0 ? `All` : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div style={{ position:"relative" }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} tabIndex={-1}>
      <label style={LS.label}>{label}</label>
      <div onClick={() => !disabled && setOpen(o=>!o)} style={{
        ...LS.select, cursor: disabled ? "not-allowed" : "pointer", userSelect:"none",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background: selected.length > 0 ? "#eff6ff" : disabled ? "#f8fafc" : "#fff",
        borderColor: selected.length > 0 ? "#93c5fd" : "#cbd5e1",
        opacity: disabled ? 0.6 : 1,
      }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color: selected.length > 0 ? "#1d4ed8" : "#6b7280", fontSize:13 }}>{display}</span>
        <span style={{ fontSize:9, color:"#94a3b8", marginLeft:4 }}>{open?"▲":"▼"}</span>
      </div>
      {open && !disabled && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200,
          background:"#fff", border:"1px solid #cbd5e1", borderRadius:6,
          boxShadow:"0 4px 20px rgba(0,0,0,0.12)", maxHeight:240, overflowY:"auto", marginTop:2 }}>
          {selected.length > 0 && (
            <div onClick={() => { onChange([]); setOpen(false); }}
              style={{ padding:"8px 12px", fontSize:12, color:"#2563eb", cursor:"pointer",
                borderBottom:"1px solid #f1f5f9", fontWeight:600 }}>✕ Clear</div>
          )}
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)}
              style={{ padding:"7px 12px", fontSize:13, cursor:"pointer", display:"flex",
                alignItems:"center", gap:8,
                background: selected.includes(opt) ? "#eff6ff" : "transparent",
                color: selected.includes(opt) ? "#1d4ed8" : "#374151" }}
              onMouseEnter={e => { if (!selected.includes(opt)) e.currentTarget.style.background="#f8fafc"; }}
              onMouseLeave={e => { if (!selected.includes(opt)) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:13 }}>{selected.includes(opt) ? "☑" : "☐"}</span>
              <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LS = {
  label: { display:"block", fontSize:11, fontWeight:600, color:"#64748b", marginBottom:5, letterSpacing:"0.04em", textTransform:"uppercase" },
  select: { width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #cbd5e1", background:"#fff", outline:"none" },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#111827" },
  header:{ background:"#0f172a", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54 },
  main:{ maxWidth:1380, margin:"0 auto", padding:"22px 18px" },
  card:{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:16 },
  cardTitle:{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:12, letterSpacing:"0.06em", textTransform:"uppercase" },
  filterGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 },
  btnPrimary:{ background:"#2563eb", color:"#fff", border:"none", padding:"9px 22px", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" },
  btnSecondary:{ background:"transparent", color:"#64748b", border:"1px solid #cbd5e1", padding:"9px 16px", borderRadius:6, fontSize:13, cursor:"pointer" },
  btnExport:{ background:"transparent", color:"#2563eb", border:"1px solid #bfdbfe", padding:"7px 14px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" },
  tab:(a) => ({ padding:"7px 16px", borderRadius:6, fontSize:13, fontWeight:500, cursor:"pointer", border:"none",
    background:a?"#fff":"transparent", color:a?"#111827":"#64748b", boxShadow:a?"0 1px 3px rgba(0,0,0,0.08)":"none" }),
  tabWrap:{ display:"flex", gap:2, background:"#f1f5f9", padding:4, borderRadius:8, width:"fit-content" },
  table:{ width:"100%", borderCollapse:"collapse", fontSize:12.5 },
  th:{ padding:"9px 11px", textAlign:"left", background:"#f8fafc", borderBottom:"1px solid #e2e8f0",
    fontSize:10.5, fontWeight:700, color:"#64748b", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" },
  td:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", color:"#374151", verticalAlign:"middle" },
  tdNum:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", textAlign:"right",
    fontVariantNumeric:"tabular-nums", fontFamily:"monospace", fontSize:12, color:"#374151", verticalAlign:"middle" },
  tdMuted:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", color:"#94a3b8", fontSize:12, verticalAlign:"middle" },
  statGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 },
  stat:{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"13px 16px" },
  statVal:{ fontSize:23, fontWeight:700, color:"#0f172a", lineHeight:1 },
  statLabel:{ fontSize:10.5, color:"#64748b", marginTop:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" },
  metricBtn:(a)=>({ padding:"5px 11px", borderRadius:5, fontSize:12, fontWeight:500, cursor:"pointer",
    border:"1px solid", borderColor:a?"#2563eb":"#e2e8f0", background:a?"#eff6ff":"transparent", color:a?"#2563eb":"#64748b" }),
  econColour:(val, all) => {
    if (val == null) return "#d1d5db";
    const max = Math.max(...all.filter(v=>v!=null));
    return val > max*0.66 ? "#dc2626" : val > max*0.33 ? "#d97706" : "#059669";
  },
};

// ── Build query params ────────────────────────────────────────────────────────
function buildParams(f, extra={}) {
  const p = { select:"*", limit:500, ...extra };
  const inClause = (vals) => vals.length === 1 ? `eq.${vals[0]}` : `in.(${vals.map(v=>`"${v}"`).join(",")})`;
  if (f.country?.length) p["country"] = inClause(f.country);
  if (f.city?.length) p["city"] = inClause(f.city);
  if (f.unified_passenger_type?.length) p["unified_passenger_type"] = inClause(f.unified_passenger_type);
  if (f.ticket_category?.length) p["ticket_category"] = inClause(f.ticket_category);
  if (f.peak_period?.length) p["peak_period"] = inClause(f.peak_period);
  if (f.financial_year?.length) p["financial_year"] = inClause(f.financial_year);
  if (f.is_active_only) p["is_active"] = "eq.true";
  if (f.report_fare_only) p["report_fare"] = "eq.true";
  if (f.exclude_discontinued) p["product_discontinued"] = "eq.false";
  return p;
}

// ── Group observations by product_id ─────────────────────────────────────────
function groupByProduct(rows) {
  const map = {};
  rows.forEach(r => {
    if (!map[r.product_id]) {
      map[r.product_id] = {
        product_id: r.product_id,
        country: r.country, city: r.city, transit_system: r.transit_system,
        fare_system: r.fare_system, zone: r.zone,
        unified_passenger_type: r.unified_passenger_type,
        unified_ticket_type: r.unified_ticket_type,
        ticket_category: r.ticket_category,
        peak_period: r.peak_period, payment_media: r.payment_media,
        conditions: r.conditions,
        product_discontinued: r.product_discontinued,
        observations: {},
      };
    }
    map[r.product_id].observations[r.financial_year] = {
      fare: r.fare, ppp: r.ppp,
      min_wage_mins: r.min_wage_mins, avg_wage_mins: r.avg_wage_mins,
      is_active: r.is_active, comments: r.comments,
    };
  });
  return Object.values(map);
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FaresPlatform() {
  const [allCities, setAllCities]   = useState([]);
  const [countries, setCountries]   = useState([]);
  const [cities, setCities]         = useState([]);
  const [passengerTypes, setPassengerTypes] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);
  const [peakOptions, setPeakOptions] = useState([]);

  const [filters, setFilters] = useState({
    country:[], city:[], unified_passenger_type:[], ticket_category:[],
    peak_period:[], financial_year:[], is_active_only:false,
    report_fare_only:false, exclude_discontinued:false,
  });

  const [rawResults, setRawResults]   = useState([]);  // flat rows from API
  const [products, setProducts]       = useState([]);   // grouped by product_id
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [searched, setSearched]       = useState(false);

  const [mainTab, setMainTab]         = useState("browse");
  const [browseTab, setBrowseTab]     = useState("table");
  const [compareTab, setCompareTab]   = useState("table");
  const [trendMetric, setTrendMetric] = useState("fare");

  // Compare state
  const [compareA, setCompareA]       = useState("");
  const [compareB, setCompareB]       = useState("");
  const [compareC, setCompareC]       = useState("");
  const [comparePT, setComparePT]     = useState([]);
  const [compareCat, setCompareCat]   = useState([]);
  const [compareYears, setCompareYears] = useState([]);
  const [compareProducts, setCompareProducts] = useState([]);
  const [compareLoading, setCompareLoading]   = useState(false);

  // Load filter options from fares_full
  useEffect(() => {
    apiFetch("fares_full", {
      select:"country,city,unified_passenger_type,ticket_category,peak_period,financial_year",
      limit:50000
    }).then(data => {
      setCountries([...new Set(data.map(d=>d.country))].filter(Boolean).sort());
      setPassengerTypes([...new Set(data.map(d=>d.unified_passenger_type))].filter(Boolean).sort());
      setTicketCategories([...new Set(data.map(d=>d.ticket_category))].filter(Boolean).sort());
      setPeakOptions([...new Set(data.map(d=>d.peak_period))].filter(Boolean).sort());
      const cityMap = {};
      data.forEach(d => { if(d.country&&d.city) { const k=`${d.country}||${d.city}`; cityMap[k]={key:k,country:d.country,city:d.city}; }});
      setAllCities(Object.values(cityMap).sort((a,b)=>a.country.localeCompare(b.country)||a.city.localeCompare(b.city)));
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!filters.country.length) { setCities([]); return; }
    setCities(allCities.filter(c=>filters.country.includes(c.country)).map(c=>c.city).sort());
  }, [filters.country, allCities]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const search = useCallback(async () => {
    setLoading(true); setError(null); setSearched(true);
    try {
      const rows = await apiFetch("fares_full", buildParams(filters, { order:"country.asc,city.asc,unified_passenger_type.asc,financial_year.asc" }));
      setRawResults(rows);
      setProducts(groupByProduct(rows));
    } catch(e) { setError("Failed to fetch data. Check your connection."); }
    setLoading(false);
  }, [filters]);

  const runCompare = useCallback(async () => {
    const selected = [compareA, compareB, compareC].filter(Boolean);
    if (selected.length < 2) return;
    setCompareLoading(true);
    try {
      const allRows = [];
      for (const ck of selected) {
        const [country, city] = ck.split("||");
        const f = { country:[country], city:[city], unified_passenger_type:comparePT,
          ticket_category:compareCat, financial_year:compareYears,
          is_active_only:false, report_fare_only:false, exclude_discontinued:false };
        const rows = await apiFetch("fares_full", buildParams(f, {
          order:"unified_passenger_type.asc,financial_year.asc", limit:2000
        }));
        allRows.push(...rows);
      }
      setCompareProducts(groupByProduct(allRows));
    } catch(e) {}
    setCompareLoading(false);
  }, [compareA, compareB, compareC, comparePT, compareCat, compareYears]);

  const exportCSV = (prods) => {
    if (!prods.length) return;
    const headers = ["Country","City","System","Fare System","Category","Unified Ticket Type",
      "Passenger Type","Zone","Peak","Payment Media","Discontinued",
      ...YEARS.flatMap(y=>[`Fare ${YEAR_LABELS[y]}`,`PPP ${YEAR_LABELS[y]}`,`Min Wage ${YEAR_LABELS[y]}`,`Avg Wage ${YEAR_LABELS[y]}`])];
    const rows = prods.map(p => [
      p.country, p.city, p.transit_system, p.fare_system, p.ticket_category,
      p.unified_ticket_type, p.unified_passenger_type, p.zone, p.peak_period,
      p.payment_media, p.product_discontinued ? "Yes" : "No",
      ...YEARS.flatMap(y => {
        const o = p.observations[y];
        return [o?.fare??'', o?.ppp??'', o?.min_wage_mins??'', o?.avg_wage_mins??''];
      }),
    ]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="ninesquared_fares_export.csv"; a.click();
  };

  // ── Product table ─────────────────────────────────────────────────────────
  const ProductTable = ({ prods, showCountry=true }) => {
    const activeYears = YEARS.filter(y => prods.some(p => p.observations[y]));
    return (
      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {showCountry && <th style={S.th}>Country</th>}
                <th style={S.th}>City</th>
                <th style={S.th}>System</th>
                <th style={S.th}>Fare System</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Ticket Type</th>
                <th style={S.th}>Passenger</th>
                <th style={S.th}>Zone</th>
                <th style={S.th}>Peak</th>
                {activeYears.map(y => <th key={y} style={{...S.th,textAlign:"right"}}>{YEAR_LABELS[y]}</th>)}
                <th style={S.th}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {prods.map(p => {
                const farePoints = {};
                YEARS.forEach(y => { if(p.observations[y]?.fare != null) farePoints[y] = p.observations[y].fare; });
                const latestObs = p.observations[CURRENT_YEAR] || p.observations[YEARS.slice().reverse().find(y=>p.observations[y])];
                return (
                  <tr key={p.product_id}
                    style={{ opacity: p.product_discontinued ? 0.65 : 1 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    {showCountry && <td style={S.td}>{p.country}</td>}
                    <td style={S.td}>{p.city}</td>
                    <td style={S.tdMuted}>{p.transit_system}</td>
                    <td style={S.tdMuted}>{p.fare_system||"—"}</td>
                    <td style={S.td}><CategoryBadge cat={p.ticket_category}/></td>
                    <td style={S.td}>
                      <div style={{fontWeight:500}}>{p.unified_ticket_type}</div>
                      <div style={{color:"#94a3b8",fontSize:11}}>{p.zone||""}</div>
                      {p.product_discontinued && <DiscontinuedBadge/>}
                    </td>
                    <td style={S.tdMuted}>{p.unified_passenger_type}</td>
                    <td style={S.tdMuted}>{p.zone||"—"}</td>
                    <td style={S.tdMuted}>{p.peak_period||"—"}</td>
                    {activeYears.map(y => {
                      const obs = p.observations[y];
                      return (
                        <td key={y} style={S.tdNum}>
                          {obs?.fare != null
                            ? <span title={obs.comments||""}>{obs.fare < 1000 ? obs.fare.toFixed(2) : obs.fare.toLocaleString()}</span>
                            : <span style={{color:"#e2e8f0"}}>—</span>}
                          {obs && !obs.is_active && <InactiveBadge/>}
                        </td>
                      );
                    })}
                    <td style={{...S.td,paddingRight:12}}><Sparkline points={farePoints}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {prods.length >= 500 && (
          <div style={{padding:"9px 14px",background:"#fffbeb",borderTop:"1px solid #fde68a",fontSize:12,color:"#92400e"}}>
            Showing first 500 results — refine your filters for a more specific view.
          </div>
        )}
      </div>
    );
  };

  // ── Affordability table ───────────────────────────────────────────────────
  const AffordabilityTable = ({ prods }) => {
    const year = YEARS.slice().reverse().find(y => prods.some(p => p.observations[y])) || CURRENT_YEAR;
    const allPPP = prods.map(p=>p.observations[year]?.ppp).filter(Boolean);
    const allMin = prods.map(p=>p.observations[year]?.min_wage_mins).filter(Boolean);
    const allAvg = prods.map(p=>p.observations[year]?.avg_wage_mins).filter(Boolean);
    return (
      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#64748b"}}>
          Showing most recent year with data. Min/Avg wage = minutes of work to afford fare.
          Colour: <span style={{color:"#059669",fontWeight:600}}>green</span> = affordable,
          <span style={{color:"#d97706",fontWeight:600}}> amber</span> = moderate,
          <span style={{color:"#dc2626",fontWeight:600}}> red</span> = expensive relative to peers.
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={S.table}>
            <thead><tr>
              {["Country","City","System","Category","Ticket Type","Passenger","Zone",
                `Fare (${YEAR_LABELS[year]})`,`USD PPP`,`Min wage (mins)`,`Avg wage (mins)`].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {prods.map(p => {
                const obs = p.observations[year] || {};
                return (
                  <tr key={p.product_id}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <td style={S.td}>{p.country}</td>
                    <td style={S.td}>{p.city}</td>
                    <td style={S.tdMuted}>{p.transit_system}</td>
                    <td style={S.td}><CategoryBadge cat={p.ticket_category}/></td>
                    <td style={S.td}>{p.unified_ticket_type}</td>
                    <td style={S.tdMuted}>{p.unified_passenger_type}</td>
                    <td style={S.tdMuted}>{p.zone||"—"}</td>
                    <td style={S.tdNum}>{obs.fare!=null ? obs.fare.toFixed(2) : "—"}</td>
                    <td style={{...S.tdNum, color:S.econColour(obs.ppp,allPPP), fontWeight:obs.ppp?600:400}}>
                      {obs.ppp!=null ? obs.ppp.toFixed(4) : "—"}
                    </td>
                    <td style={{...S.tdNum, color:S.econColour(obs.min_wage_mins,allMin), fontWeight:obs.min_wage_mins?600:400}}>
                      {obs.min_wage_mins!=null ? obs.min_wage_mins.toFixed(1) : "—"}
                    </td>
                    <td style={{...S.tdNum, color:S.econColour(obs.avg_wage_mins,allAvg), fontWeight:obs.avg_wage_mins?600:400}}>
                      {obs.avg_wage_mins!=null ? obs.avg_wage_mins.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Stats
  const uniqueCities  = [...new Set(products.map(p=>p.city))].filter(Boolean);
  const uniqueSystems = [...new Set(products.map(p=>p.transit_system))].filter(Boolean);
  const latestFares   = products.map(p => {
    const y = YEARS.slice().reverse().find(yr => p.observations[yr]?.fare != null);
    return y ? p.observations[y].fare : null;
  }).filter(Boolean);
  const avgFare = latestFares.length ? latestFares.reduce((a,b)=>a+b,0)/latestFares.length : null;

  const trendProducts = products.slice(0, 8).map(p => ({
    ...p, label:`${p.city} — ${p.unified_ticket_type} (${p.unified_passenger_type})`
  }));

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <N2Logo size={30}/>
          <span style={{color:"#f1f5f9",fontSize:15,fontWeight:600,letterSpacing:"-0.01em"}}>NineSquared</span>
          <span style={{color:"#475569",fontSize:11,marginLeft:4}}>/ Global Fares Platform</span>
        </div>
        <div style={{color:"#475569",fontSize:12}}>
          {products.length>0 && `${products.length.toLocaleString()} products · ${rawResults.length.toLocaleString()} observations`}
        </div>
      </div>

      <div style={S.main}>
        {/* Top tabs */}
        <div style={{display:"flex",marginBottom:16}}>
          <div style={S.tabWrap}>
            {[["browse","Browse & Search"],["compare","Compare Cities"]].map(([t,l])=>(
              <button key={t} style={S.tab(mainTab===t)} onClick={()=>setMainTab(t)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ═══ BROWSE ═══ */}
        {mainTab==="browse" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Search Filters — select multiple values in each filter</div>
              <div style={S.filterGrid}>
                <MultiSelect label="Country" options={countries} selected={filters.country}
                  onChange={v=>{setF("country",v);setF("city",[]);}}/>
                <MultiSelect label="City" options={cities} selected={filters.city}
                  onChange={v=>setF("city",v)} disabled={!filters.country.length}/>
                <MultiSelect label="Passenger type" options={passengerTypes}
                  selected={filters.unified_passenger_type} onChange={v=>setF("unified_passenger_type",v)}/>
                <MultiSelect label="Ticket category" options={ticketCategories}
                  selected={filters.ticket_category} onChange={v=>setF("ticket_category",v)}/>
                <MultiSelect label="Peak / Off-peak" options={peakOptions}
                  selected={filters.peak_period} onChange={v=>setF("peak_period",v)}/>
                <MultiSelect label="Financial year" options={YEARS.map(y=>y)}
                  selected={filters.financial_year} onChange={v=>setF("financial_year",v)}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:20,marginTop:14,flexWrap:"wrap"}}>
                {[
                  ["is_active_only","Active fares only"],
                  ["report_fare_only","Report fares only"],
                  ["exclude_discontinued","Exclude discontinued products"],
                ].map(([key,lbl])=>(
                  <label key={key} style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:"#374151",cursor:"pointer"}}>
                    <input type="checkbox" checked={filters[key]} onChange={e=>setF(key,e.target.checked)}/>
                    {lbl}
                  </label>
                ))}
                <div style={{flex:1}}/>
                <button style={S.btnSecondary} onClick={()=>{
                  setFilters({country:[],city:[],unified_passenger_type:[],ticket_category:[],
                    peak_period:[],financial_year:[],is_active_only:false,report_fare_only:false,exclude_discontinued:false});
                  setRawResults([]); setProducts([]); setSearched(false);
                }}>Clear all</button>
                <button style={S.btnPrimary} onClick={search} disabled={loading}>
                  {loading?"Searching…":"Search"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,
                padding:"12px 16px",marginBottom:14,color:"#dc2626",fontSize:13}}>{error}</div>
            )}

            {searched && !loading && products.length===0 && (
              <div style={{...S.card,textAlign:"center",padding:"40px 0",color:"#94a3b8"}}>
                <div style={{fontSize:28,marginBottom:10}}>🔍</div>
                <div style={{fontWeight:600,color:"#374151"}}>No results found</div>
                <div style={{fontSize:13,marginTop:4}}>Try broadening your filters</div>
              </div>
            )}

            {products.length>0 && (
              <>
                <div style={S.statGrid}>
                  {[
                    [products.length.toLocaleString(),"Fare products"],
                    [uniqueCities.length,"Cities"],
                    [uniqueSystems.length,"Transit systems"],
                    [avgFare!=null?(avgFare<100?avgFare.toFixed(2):Math.round(avgFare).toLocaleString()):"—","Avg latest fare"],
                  ].map(([v,l])=>(
                    <div key={l} style={S.stat}><div style={S.statVal}>{v}</div><div style={S.statLabel}>{l}</div></div>
                  ))}
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={S.tabWrap}>
                    {[["table","Fare table"],["econ","Affordability"],["trends","Price trends"]].map(([t,l])=>(
                      <button key={t} style={S.tab(browseTab===t)} onClick={()=>setBrowseTab(t)}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:11,color:"#94a3b8"}}>
                      <span style={{background:"#fef3c7",color:"#92400e",padding:"1px 5px",borderRadius:3,fontSize:10,fontWeight:700}}>DISCONTINUED</span>
                      {" "}= fare product no longer offered
                    </span>
                    <button style={S.btnExport} onClick={()=>exportCSV(products)}>⬇ Export CSV</button>
                  </div>
                </div>

                {browseTab==="table" && <ProductTable prods={products}/>}
                {browseTab==="econ" && <AffordabilityTable prods={products}/>}
                {browseTab==="trends" && (
                  <div style={S.card}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                      <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Metric:</span>
                      {[["fare","Local fare"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k,l])=>(
                        <button key={k} style={S.metricBtn(trendMetric===k)} onClick={()=>setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <div style={{fontSize:12,color:"#94a3b8",marginBottom:12}}>
                      Showing up to 8 products from your results
                    </div>
                    <TrendChart products={trendProducts} metric={trendMetric}/>
                  </div>
                )}
              </>
            )}

            {!searched && (
              <div style={{...S.card,textAlign:"center",padding:"52px 0"}}>
                <N2Logo size={44}/>
                <div style={{fontWeight:700,fontSize:17,color:"#0f172a",marginTop:14,marginBottom:8}}>
                  NineSquared Global Fares Database
                </div>
                <div style={{color:"#64748b",fontSize:13,maxWidth:480,margin:"0 auto",lineHeight:1.8}}>
                  8,652 fare products across 47 countries and 115 cities, with 8 years of pricing
                  history (2018–19 to 2025–26), PPP-adjusted pricing, and wage affordability metrics.
                  <br/>Use the filters above — select multiple values in any filter.
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ COMPARE ═══ */}
        {mainTab==="compare" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Select cities to compare (2 required, 3rd optional)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                {[["City A (required)",compareA,setCompareA],
                  ["City B (required)",compareB,setCompareB],
                  ["City C (optional)",compareC,setCompareC]].map(([lbl,val,setter])=>(
                  <div key={lbl}>
                    <label style={LS.label}>{lbl}</label>
                    <select style={{...LS.select,fontSize:13,color:"#374151"}} value={val} onChange={e=>setter(e.target.value)}>
                      <option value="">Select city…</option>
                      {allCities.map(c=><option key={c.key} value={c.key}>{c.country} — {c.city}</option>)}
                    </select>
                  </div>
                ))}
                <MultiSelect label="Passenger type" options={passengerTypes}
                  selected={comparePT} onChange={setComparePT}/>
                <MultiSelect label="Ticket category" options={ticketCategories}
                  selected={compareCat} onChange={setCompareCat}/>
                <MultiSelect label="Financial year" options={YEARS}
                  selected={compareYears} onChange={setCompareYears}/>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
                <button style={S.btnPrimary} onClick={runCompare}
                  disabled={!compareA||!compareB||compareLoading}>
                  {compareLoading?"Loading…":"Compare"}
                </button>
              </div>
            </div>

            {compareProducts.length>0 && (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={S.tabWrap}>
                    {[["table","Fare table"],["econ","Affordability"],["trends","Price trends"]].map(([t,l])=>(
                      <button key={t} style={S.tab(compareTab===t)} onClick={()=>setCompareTab(t)}>{l}</button>
                    ))}
                  </div>
                  <button style={S.btnExport} onClick={()=>exportCSV(compareProducts)}>⬇ Export CSV</button>
                </div>
                {compareTab==="table" && <ProductTable prods={compareProducts} showCountry={true}/>}
                {compareTab==="econ" && <AffordabilityTable prods={compareProducts}/>}
                {compareTab==="trends" && (
                  <div style={S.card}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                      <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Metric:</span>
                      {[["fare","Local fare"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k,l])=>(
                        <button key={k} style={S.metricBtn(trendMetric===k)} onClick={()=>setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <TrendChart
                      products={compareProducts.slice(0,8).map(p=>({
                        ...p, label:`${p.city} — ${p.unified_ticket_type} (${p.unified_passenger_type})`
                      }))}
                      metric={trendMetric}/>
                  </div>
                )}
              </>
            )}

            {!compareProducts.length && !compareLoading && (
              <div style={{...S.card,textAlign:"center",padding:"44px 0",color:"#94a3b8"}}>
                <div style={{fontSize:28,marginBottom:10}}>🏙️</div>
                <div style={{fontWeight:600,color:"#374151"}}>Select two or three cities above</div>
                <div style={{fontSize:13,marginTop:4}}>
                  Compare fares, PPP-adjusted prices and wage affordability side by side across 8 years
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
