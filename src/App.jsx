import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const YEARS = ["18-19","19-20","20-21","21-22","22-23","23-24","24-25"];
const YEAR_LABELS = {
  "18-19":"2018–19","19-20":"2019–20","20-21":"2020–21",
  "21-22":"2021–22","22-23":"2022–23","23-24":"2023–24","24-25":"2024–25"
};
// Latest year with data — fares without a price in this year are flagged as potentially outdated
const CURRENT_YEAR = "22-23";

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

// ── Category badge ────────────────────────────────────────────────────────────
const CAT_COLOURS = {
  Single:"#1a56db", Pass:"#0e9f6e", Cap:"#7e3af2",
  "Multi-Trip":"#ff5a1f", Group:"#c27803", Transfer:"#6b7280",
};
function CategoryBadge({ cat }) {
  const c = CAT_COLOURS[cat] || "#6b7280";
  return (
    <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:4,
      fontSize:10.5, fontWeight:700, letterSpacing:"0.04em",
      background:c+"18", color:c, border:`1px solid ${c}40` }}>{cat}</span>
  );
}

// ── Outdated badge ────────────────────────────────────────────────────────────
function OutdatedBadge() {
  return (
    <span title="No price data in most recent year — may no longer be current"
      style={{ display:"inline-block", padding:"1px 6px", borderRadius:3,
        fontSize:10, fontWeight:700, background:"#fef3c7", color:"#92400e",
        border:"1px solid #fde68a", marginLeft:4, cursor:"help" }}>
      OUTDATED?
    </span>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ prices }) {
  const vals = YEARS.map(y => prices[y] ?? null).filter(v => v !== null);
  if (vals.length < 2) return <span style={{ color:"#9ca3af", fontSize:12 }}>—</span>;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const w = 72, h = 24, pad = 3;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length-1)) * (w - pad*2);
    const y = h - pad - ((v-min)/range) * (h - pad*2);
    return `${x},${y}`;
  }).join(" ");
  const trend = vals[vals.length-1] > vals[0] ? "#ef4444" : vals[vals.length-1] < vals[0] ? "#10b981" : "#94a3b8";
  return (
    <svg width={w} height={h}>
      <polyline points={points} fill="none" stroke={trend} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────
const COLOURS = ["#2563eb","#0e9f6e","#7e3af2","#ff5a1f","#c27803","#06b6d4","#ec4899","#84cc16"];
function TrendChart({ rows, metric }) {
  if (!rows.length) return (
    <div style={{ color:"#94a3b8", textAlign:"center", padding:40, fontSize:13 }}>
      No data available for this selection
    </div>
  );
  const grouped = {};
  rows.forEach(r => {
    const key = `${r.city} — ${r.ticket_type||r.ticket_type_raw||""} (${r.passenger_type})`;
    if (!grouped[key]) grouped[key] = { key, points:{} };
    const val = metric==="price" ? r.price_local
      : metric==="ppp" ? r.price_usd_ppp
      : metric==="min_wage" ? r.min_wage_minutes
      : r.avg_wage_minutes;
    if (val != null) grouped[key].points[r.financial_year] = val;
  });
  const series = Object.values(grouped).slice(0, 8);
  const allVals = series.flatMap(s => Object.values(s.points)).filter(Boolean);
  if (!allVals.length) return (
    <div style={{ color:"#94a3b8", textAlign:"center", padding:40, fontSize:13 }}>
      No price data for this selection — prices may not yet be loaded for these years
    </div>
  );
  const maxVal = Math.max(...allVals);
  const W=600, H=220, PL=64, PR=20, PT=20, PB=44;
  const iW=W-PL-PR, iH=H-PT-PB;
  const activeYears = YEARS.filter(y => series.some(s => s.points[y] != null));
  const metricLabel = { price:"Local price", ppp:"USD (PPP)", min_wage:"Min wage (mins)", avg_wage:"Avg wage (mins)" }[metric];
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={H} style={{ fontFamily:"inherit", display:"block" }}>
        {[0,0.25,0.5,0.75,1].map(t => {
          const y = PT + iH*(1-t), val = maxVal*t;
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={PL+iW} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4"/>
              <text x={PL-6} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val<10 ? val.toFixed(2) : Math.round(val)}
              </text>
            </g>
          );
        })}
        <text x={20} y={PT+iH/2} textAnchor="middle" fontSize="10" fill="#64748b"
          transform={`rotate(-90,20,${PT+iH/2})`}>{metricLabel}</text>
        {activeYears.map((y, i) => (
          <text key={y} x={PL+(i/(activeYears.length-1||1))*iW} y={H-8}
            textAnchor="middle" fontSize="10" fill="#6b7280">{YEAR_LABELS[y]}</text>
        ))}
        {series.map((s, si) => {
          const colour = COLOURS[si%COLOURS.length];
          const pts = activeYears.map((y, i) => {
            const v = s.points[y]; if (v==null) return null;
            return `${PL+(i/(activeYears.length-1||1))*iW},${PT+iH*(1-v/maxVal)}`;
          }).filter(Boolean);
          if (pts.length < 1) return null;
          return (
            <g key={s.key}>
              {pts.length>1 && <polyline points={pts.join(" ")} fill="none" stroke={colour}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
              {pts.map((pt,pi) => <circle key={pi} cx={pt.split(",")[0]} cy={pt.split(",")[1]} r="3" fill={colour}/>)}
            </g>
          );
        })}
      </svg>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:10 }}>
        {series.map((s, si) => (
          <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#4b5563" }}>
            <div style={{ width:18, height:2.5, background:COLOURS[si%COLOURS.length], borderRadius:1 }}/>
            <span style={{ maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = val => onChange(
    selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
  );
  const display = selected.length === 0 ? `All ${label.toLowerCase()}s`
    : selected.length === 1 ? selected[0]
    : `${selected.length} selected`;
  return (
    <div style={{ position:"relative" }}>
      <label style={LS.label}>{label}</label>
      <div onClick={() => setOpen(o => !o)} style={{
        ...LS.select, cursor:"pointer", userSelect:"none",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background: selected.length > 0 ? "#eff6ff" : "#fff",
        borderColor: selected.length > 0 ? "#93c5fd" : "#cbd5e1",
      }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color: selected.length > 0 ? "#1d4ed8" : "#374151" }}>{display}</span>
        <span style={{ fontSize:10, color:"#94a3b8", marginLeft:4 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:100,
          background:"#fff", border:"1px solid #cbd5e1", borderRadius:6,
          boxShadow:"0 4px 16px rgba(0,0,0,0.12)", maxHeight:220, overflowY:"auto",
          marginTop:2,
        }}>
          {selected.length > 0 && (
            <div onClick={() => { onChange([]); setOpen(false); }}
              style={{ padding:"8px 12px", fontSize:12, color:"#2563eb", cursor:"pointer",
                borderBottom:"1px solid #f1f5f9", fontWeight:600 }}>
              ✕ Clear selection
            </div>
          )}
          {options.map(opt => (
            <div key={opt} onClick={() => toggle(opt)}
              style={{ padding:"7px 12px", fontSize:13, cursor:"pointer", display:"flex",
                alignItems:"center", gap:8,
                background: selected.includes(opt) ? "#eff6ff" : "transparent",
                color: selected.includes(opt) ? "#1d4ed8" : "#374151",
              }}
              onMouseEnter={e => { if (!selected.includes(opt)) e.currentTarget.style.background="#f8fafc"; }}
              onMouseLeave={e => { if (!selected.includes(opt)) e.currentTarget.style.background="transparent"; }}>
              <span style={{ fontSize:14, lineHeight:1 }}>{selected.includes(opt) ? "☑" : "☐"}</span>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LS = {
  label: { display:"block", fontSize:11, fontWeight:600, color:"#64748b", marginBottom:5, letterSpacing:"0.04em", textTransform:"uppercase" },
  select: { width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #cbd5e1", background:"#fff", fontSize:13, color:"#111827", outline:"none" },
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function FaresPlatform() {
  const [allCities, setAllCities]         = useState([]);
  const [countries, setCountries]         = useState([]);
  const [cities, setCities]               = useState([]);
  const [passengerTypes, setPassengerTypes] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);
  const [peakPeriods, setPeakPeriods]     = useState([]);
  const [paymentMediaOptions, setPaymentMediaOptions] = useState([]);

  // Browse filters — now all multi-select arrays
  const [filters, setFilters] = useState({
    country: [], city: [], passenger_type: [], ticket_category: [],
    peak_period: [], payment_media: [], report_fare_only: false,
  });

  const [results, setResults]       = useState([]);
  const [priceMap, setPriceMap]     = useState({});
  const [econMap, setEconMap]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [searched, setSearched]     = useState(false);

  // Two separate tab states — one for top-level, one for result sub-tabs
  const [mainTab, setMainTab]       = useState("browse");   // "browse" | "compare"
  const [browseTab, setBrowseTab]   = useState("table");    // "table" | "econ" | "trends"
  const [compareTab, setCompareTab] = useState("table");    // "table" | "econ" | "trends"
  const [trendMetric, setTrendMetric] = useState("price");

  // Compare state
  const [compareA, setCompareA]             = useState("");
  const [compareB, setCompareB]             = useState("");
  const [compareC, setCompareC]             = useState("");
  const [comparePassenger, setComparePassenger] = useState([]);
  const [compareCategory, setCompareCategory]   = useState([]);
  const [compareResults, setCompareResults]     = useState([]);
  const [comparePriceMap, setComparePriceMap]   = useState({});
  const [compareEconMap, setCompareEconMap]     = useState({});
  const [compareLoading, setCompareLoading]     = useState(false);

  // Load all filter options from fares_full in one call
  useEffect(() => {
    apiFetch("fares_full", {
      select:"country,city,passenger_type,ticket_category,peak_code,peak_label,payment_media",
      limit:5000
    }).then(data => {
      setCountries([...new Set(data.map(d=>d.country))].filter(Boolean).sort());
      setPassengerTypes([...new Set(data.map(d=>d.passenger_type))].filter(Boolean).sort());
      setTicketCategories([...new Set(data.map(d=>d.ticket_category))].filter(Boolean).sort());
      // Build peak options: "A — All Day" etc
      const peakMap = {};
      data.forEach(d => { if (d.peak_code) peakMap[d.peak_code] = d.peak_label || d.peak_code; });
      setPeakPeriods(Object.entries(peakMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,label]) => ({ code, label, display:`${code} — ${label}` })));
      // Payment media — split comma-separated values
      const pmSet = new Set();
      data.forEach(d => {
        if (d.payment_media) d.payment_media.split(",").forEach(p => { const t=p.trim(); if(t) pmSet.add(t); });
      });
      setPaymentMediaOptions([...pmSet].sort());
      // Cities for compare
      const cityMap = {};
      data.forEach(d => { if(d.country&&d.city) { const k=`${d.country}||${d.city}`; cityMap[k]={key:k,country:d.country,city:d.city}; }});
      setAllCities(Object.values(cityMap).sort((a,b)=>a.country.localeCompare(b.country)||a.city.localeCompare(b.city)));
    }).catch(()=>{});
  }, []);

  // Update city list when country filter changes
  useEffect(() => {
    if (!filters.country.length) { setCities([]); return; }
    const filtered = allCities.filter(c => filters.country.includes(c.country)).map(c=>c.city);
    setCities([...new Set(filtered)].sort());
  }, [filters.country, allCities]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  // Fetch econ data for a list of fare ids
  const fetchEcon = async (ids) => {
    if (!ids.length) return {};
    try {
      const rows = await apiFetch("fares_latest_price", {
        select:"id,financial_year,price_usd_ppp,min_wage_minutes,avg_wage_minutes",
        id:`in.(${ids.join(",")})`, limit:10000,
      });
      const map = {};
      rows.forEach(r => {
        if (!map[r.id]) map[r.id] = {};
        map[r.id][r.financial_year] = { ppp:r.price_usd_ppp, min_wage:r.min_wage_minutes, avg_wage:r.avg_wage_minutes };
      });
      return map;
    } catch { return {}; }
  };

  // Build query params from multi-select filters
  const buildParams = (f, extra={}) => {
    const p = { select:"*", limit:300, order:"country.asc,city.asc,passenger_type.asc", ...extra };
    if (f.country?.length===1) p["country"]=`eq.${f.country[0]}`;
    else if (f.country?.length>1) p["country"]=`in.(${f.country.map(v=>`"${v}"`).join(",")})`;
    if (f.city?.length===1) p["city"]=`eq.${f.city[0]}`;
    else if (f.city?.length>1) p["city"]=`in.(${f.city.map(v=>`"${v}"`).join(",")})`;
    if (f.passenger_type?.length===1) p["passenger_type"]=`eq.${f.passenger_type[0]}`;
    else if (f.passenger_type?.length>1) p["passenger_type"]=`in.(${f.passenger_type.map(v=>`"${v}"`).join(",")})`;
    if (f.ticket_category?.length===1) p["ticket_category"]=`eq.${f.ticket_category[0]}`;
    else if (f.ticket_category?.length>1) p["ticket_category"]=`in.(${f.ticket_category.map(v=>`"${v}"`).join(",")})`;
    if (f.peak_period?.length===1) p["peak_code"]=`eq.${f.peak_period[0]}`;
    else if (f.peak_period?.length>1) p["peak_code"]=`in.(${f.peak_period.join(",")})`;
    if (f.report_fare_only) p["report_fare"]=`eq.true`;
    return p;
  };

  const fetchFaresAndPrices = async (params) => {
    const fares = await apiFetch("fares_full", params);
    let pMap = {}, eMap = {};
    if (fares.length > 0) {
      const ids = fares.map(f=>f.id).join(",");
      const prices = await apiFetch("fare_prices", {
        select:"fare_id,financial_year,price_local,currency_raw",
        fare_id:`in.(${ids})`, limit:10000,
      });
      prices.forEach(p => {
        if (!pMap[p.fare_id]) pMap[p.fare_id]={};
        pMap[p.fare_id][p.financial_year]=p.price_local;
      });
      eMap = await fetchEcon(fares.map(f=>f.id));
    }
    return { fares, pMap, eMap };
  };

  const search = useCallback(async () => {
    setLoading(true); setError(null); setSearched(true);
    try {
      const { fares, pMap, eMap } = await fetchFaresAndPrices(buildParams(filters));
      setResults(fares); setPriceMap(pMap); setEconMap(eMap);
    } catch(e) { setError("Failed to fetch data. Check your connection."); }
    setLoading(false);
  }, [filters]);

  const runCompare = useCallback(async () => {
    const selected = [compareA, compareB, compareC].filter(Boolean);
    if (selected.length < 2) return;
    setCompareLoading(true);
    try {
      const allFares = [];
      for (const ck of selected) {
        const [country, city] = ck.split("||");
        const f = { country:[country], city:[city], passenger_type:comparePassenger, ticket_category:compareCategory, report_fare_only:false };
        const { fares, pMap, eMap } = await fetchFaresAndPrices(buildParams(f, { limit:500 }));
        allFares.push({ fares, pMap, eMap });
      }
      const mergedFares = allFares.flatMap(r=>r.fares);
      const mergedPMap = Object.assign({}, ...allFares.map(r=>r.pMap));
      const mergedEMap = Object.assign({}, ...allFares.map(r=>r.eMap));
      setCompareResults(mergedFares); setComparePriceMap(mergedPMap); setCompareEconMap(mergedEMap);
    } catch(e) {}
    setCompareLoading(false);
  }, [compareA, compareB, compareC, comparePassenger, compareCategory]);

  const exportCSV = (data, pMap) => {
    if (!data.length) return;
    const headers = ["Country","City","Transit System","Fare System","Ticket Category",
      "Description","Ticket Type","Passenger Type","Concession","Peak","Zone","Payment Media",
      "Report Fare","Outdated?", ...YEARS.map(y=>`Price ${YEAR_LABELS[y]}`)];
    const rows = data.map(r => {
      const prices = pMap[r.id]||{};
      const outdated = !prices[CURRENT_YEAR];
      return [r.country,r.city,r.transit_system,r.fare_system,r.ticket_category,
        r.high_level_desc,r.ticket_type,r.passenger_type,r.is_concession,
        r.peak_label,r.zone,r.payment_media,r.report_fare, outdated?"Yes":"No",
        ...YEARS.map(y=>prices[y]??"")];
    });
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="ninesquared_fares_export.csv"; a.click();
  };

  const buildTrendRows = (fares, pMap, eMap) => fares.flatMap(fare =>
    YEARS.map(y => {
      const price_local = pMap[fare.id]?.[y];
      const econ = eMap[fare.id]?.[y];
      if (price_local==null && !econ) return null;
      return { ...fare, financial_year:y, price_local:price_local??null,
        price_usd_ppp:econ?.ppp??null, min_wage_minutes:econ?.min_wage??null, avg_wage_minutes:econ?.avg_wage??null };
    }).filter(Boolean)
  );

  const econColour = (val, allVals) => {
    if (val==null) return "#d1d5db";
    const max = Math.max(...allVals.filter(v=>v!=null));
    return val > max*0.66 ? "#dc2626" : val > max*0.33 ? "#d97706" : "#059669";
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const S = {
    app:{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#111827" },
    header:{ background:"#0f172a", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:54, borderBottom:"1px solid #1e293b" },
    main:{ maxWidth:1320, margin:"0 auto", padding:"22px 18px" },
    card:{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"18px 20px", marginBottom:16 },
    cardTitle:{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:12, letterSpacing:"0.06em", textTransform:"uppercase" },
    filterGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(165px,1fr))", gap:12 },
    btnPrimary:{ background:"#2563eb", color:"#fff", border:"none", padding:"9px 22px", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" },
    btnSecondary:{ background:"transparent", color:"#64748b", border:"1px solid #cbd5e1", padding:"9px 16px", borderRadius:6, fontSize:13, cursor:"pointer" },
    btnExport:{ background:"transparent", color:"#2563eb", border:"1px solid #bfdbfe", padding:"7px 14px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" },
    tabs:(active)=>({ padding:"7px 16px", borderRadius:6, fontSize:13, fontWeight:500, cursor:"pointer", border:"none", background:active?"#fff":"transparent", color:active?"#111827":"#64748b", boxShadow:active?"0 1px 3px rgba(0,0,0,0.08)":"none" }),
    tabsWrap:{ display:"flex", gap:2, background:"#f1f5f9", padding:4, borderRadius:8, width:"fit-content" },
    table:{ width:"100%", borderCollapse:"collapse", fontSize:12.5 },
    th:{ padding:"9px 11px", textAlign:"left", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", fontSize:10.5, fontWeight:700, color:"#64748b", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" },
    td:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", color:"#374151", verticalAlign:"middle" },
    tdNum:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", textAlign:"right", fontVariantNumeric:"tabular-nums", fontFamily:"monospace", fontSize:12, color:"#374151", verticalAlign:"middle" },
    tdMuted:{ padding:"8px 11px", borderBottom:"1px solid #f1f5f9", color:"#94a3b8", fontSize:12, verticalAlign:"middle" },
    statGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 },
    stat:{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"13px 16px" },
    statVal:{ fontSize:23, fontWeight:700, color:"#0f172a", lineHeight:1 },
    statLabel:{ fontSize:10.5, color:"#64748b", marginTop:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" },
    metricBtn:(a)=>({ padding:"5px 11px", borderRadius:5, fontSize:12, fontWeight:500, cursor:"pointer", border:"1px solid", borderColor:a?"#2563eb":"#e2e8f0", background:a?"#eff6ff":"transparent", color:a?"#2563eb":"#64748b" }),
  };

  const uniqueCities = [...new Set(results.map(r=>r.city))].filter(Boolean);
  const uniqueSystems = [...new Set(results.map(r=>r.transit_system))].filter(Boolean);
  const avg2223 = (() => { const v=results.map(r=>priceMap[r.id]?.[CURRENT_YEAR]).filter(x=>x!=null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; })();

  const EconTable = ({ data, pMap, eMap }) => {
    const allPPP = data.map(r=>eMap[r.id]?.["22-23"]?.ppp).filter(Boolean);
    const allMin = data.map(r=>eMap[r.id]?.["22-23"]?.min_wage).filter(Boolean);
    const allAvg = data.map(r=>eMap[r.id]?.["22-23"]?.avg_wage).filter(Boolean);
    return (
      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid #f1f5f9", fontSize:12, color:"#64748b" }}>
          Affordability metrics for 2022–23. <b>Min/Avg wage</b> = minutes of work to afford fare.
          Colour coding is relative to other fares in this result set.
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={S.table}>
            <thead><tr>
              {["Country","City","System","Fare System","Category","Ticket","Passenger","Local price","USD (PPP)","Min wage (mins)","Avg wage (mins)"].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.map(r => {
                const econ = eMap[r.id]?.["22-23"]||{};
                const price = pMap[r.id]?.[CURRENT_YEAR];
                return (
                  <tr key={r.id}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <td style={S.td}>{r.country}</td>
                    <td style={S.td}>{r.city}</td>
                    <td style={S.tdMuted}>{r.transit_system}</td>
                    <td style={S.tdMuted}>{r.fare_system||"—"}</td>
                    <td style={S.td}><CategoryBadge cat={r.ticket_category}/></td>
                    <td style={S.td}>{r.high_level_desc}<div style={{color:"#94a3b8",fontSize:11}}>{r.ticket_type}</div></td>
                    <td style={S.tdMuted}>{r.passenger_type}</td>
                    <td style={S.tdNum}>{price!=null ? price.toFixed(2) : "—"}</td>
                    <td style={{...S.tdNum, color:econColour(econ.ppp,allPPP), fontWeight:econ.ppp?600:400}}>{econ.ppp!=null?econ.ppp.toFixed(3):"—"}</td>
                    <td style={{...S.tdNum, color:econColour(econ.min_wage,allMin), fontWeight:econ.min_wage?600:400}}>{econ.min_wage!=null?econ.min_wage.toFixed(1):"—"}</td>
                    <td style={{...S.tdNum, color:econColour(econ.avg_wage,allAvg), fontWeight:econ.avg_wage?600:400}}>{econ.avg_wage!=null?econ.avg_wage.toFixed(1):"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FareTable = ({ data, pMap, showCity=true }) => (
    <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={S.table}>
          <thead><tr>
            {[...(showCity?["Country","City"]:[]),
              "System","Fare System","Category","Description","Passenger","Zone","Peak",
              ...YEARS.map(y=>YEAR_LABELS[y]),"Trend"].map(h=>(
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map(r => {
              const prices = pMap[r.id]||{};
              const outdated = !prices[CURRENT_YEAR];
              return (
                <tr key={r.id}
                  style={{ opacity: outdated ? 0.75 : 1 }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  {showCity && <><td style={S.td}>{r.country}</td><td style={S.td}>{r.city}</td></>}
                  <td style={S.tdMuted}>{r.transit_system}</td>
                  <td style={S.tdMuted}>{r.fare_system||"—"}</td>
                  <td style={S.td}><CategoryBadge cat={r.ticket_category}/></td>
                  <td style={S.td}>
                    <div style={{fontWeight:500}}>{r.high_level_desc}</div>
                    <div style={{color:"#94a3b8",fontSize:11}}>{r.ticket_type}</div>
                    {outdated && <OutdatedBadge/>}
                  </td>
                  <td style={S.td}>
                    <div>{r.passenger_type}</div>
                    {r.is_concession && <span style={{fontSize:10,color:"#7c3aed",background:"#f5f3ff",padding:"1px 5px",borderRadius:3}}>Concession</span>}
                  </td>
                  <td style={S.tdMuted}>{r.zone||"—"}</td>
                  <td style={S.tdMuted}>{r.peak_label||"—"}</td>
                  {YEARS.map(y=>(
                    <td key={y} style={S.tdNum}>
                      {prices[y]!=null
                        ? prices[y]<1000 ? prices[y].toFixed(2) : prices[y].toLocaleString()
                        : <span style={{color:"#e2e8f0"}}>—</span>}
                    </td>
                  ))}
                  <td style={{...S.td,paddingRight:12}}><Sparkline prices={prices}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length >= 300 && (
        <div style={{padding:"9px 14px",background:"#fffbeb",borderTop:"1px solid #fde68a",fontSize:12,color:"#92400e"}}>
          Showing first 300 results — refine filters for a more specific view.
        </div>
      )}
    </div>
  );

  return (
    <div style={S.app} onClick={e => {
      // Close any open dropdowns when clicking outside
      if (!e.target.closest('[data-multiselect]')) {}
    }}>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <N2Logo size={30}/>
          <span style={{color:"#f1f5f9",fontSize:15,fontWeight:600,letterSpacing:"-0.01em"}}>NineSquared</span>
          <span style={{color:"#475569",fontSize:11,marginLeft:4}}>/ Global Fares Platform</span>
        </div>
        <div style={{color:"#475569",fontSize:12}}>
          {results.length>0 && `${results.length} records loaded`}
        </div>
      </div>

      <div style={S.main}>
        {/* Top-level tabs */}
        <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
          <div style={S.tabsWrap}>
            {[["browse","Browse & Search"],["compare","Compare Cities"]].map(([t,l])=>(
              <button key={t} style={S.tabs(mainTab===t)} onClick={()=>setMainTab(t)}>{l}</button>
            ))}
          </div>
        </div>

        {/* ═══ BROWSE TAB ═══ */}
        {mainTab === "browse" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Search Filters — select multiple values in each filter</div>
              <div style={S.filterGrid}>
                <MultiSelect label="Country" options={countries} selected={filters.country}
                  onChange={v=>{ setF("country",v); setF("city",[]); }}/>
                <MultiSelect label="City" options={cities} selected={filters.city}
                  onChange={v=>setF("city",v)}/>
                <MultiSelect label="Passenger type" options={passengerTypes}
                  selected={filters.passenger_type} onChange={v=>setF("passenger_type",v)}/>
                <MultiSelect label="Ticket category" options={ticketCategories}
                  selected={filters.ticket_category} onChange={v=>setF("ticket_category",v)}/>
                <MultiSelect label="Peak / Off-peak" options={peakPeriods.map(p=>p.code)}
                  selected={filters.peak_period} onChange={v=>setF("peak_period",v)}/>
                <MultiSelect label="Payment media" options={paymentMediaOptions}
                  selected={filters.payment_media} onChange={v=>setF("payment_media",v)}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginTop:14}}>
                <label style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:"#374151",cursor:"pointer"}}>
                  <input type="checkbox" checked={filters.report_fare_only}
                    onChange={e=>setF("report_fare_only",e.target.checked)}/>
                  Report fares only
                </label>
                <div style={{flex:1}}/>
                <button style={S.btnSecondary} onClick={()=>{
                  setFilters({country:[],city:[],passenger_type:[],ticket_category:[],peak_period:[],payment_media:[],report_fare_only:false});
                  setResults([]); setPriceMap({}); setEconMap({}); setSearched(false);
                }}>Clear all</button>
                <button style={S.btnPrimary} onClick={search} disabled={loading}>
                  {loading?"Searching…":"Search"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"12px 16px",marginBottom:14,color:"#dc2626",fontSize:13}}>{error}</div>
            )}

            {searched && !loading && results.length===0 && (
              <div style={{...S.card,textAlign:"center",padding:"40px 0",color:"#94a3b8"}}>
                <div style={{fontSize:28,marginBottom:10}}>🔍</div>
                <div style={{fontWeight:600,color:"#374151"}}>No results found</div>
                <div style={{fontSize:13,marginTop:4}}>Try broadening your filters</div>
              </div>
            )}

            {results.length>0 && (
              <>
                <div style={S.statGrid}>
                  {[[results.length,"Fare records"],[uniqueCities.length,"Cities"],[uniqueSystems.length,"Transit systems"],
                    [avg2223!=null?(avg2223<100?avg2223.toFixed(2):Math.round(avg2223)):"—","Avg price 2022–23"]
                  ].map(([v,l])=>(
                    <div key={l} style={S.stat}><div style={S.statVal}>{v}</div><div style={S.statLabel}>{l}</div></div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={S.tabsWrap}>
                    {[["table","Fare table"],["econ","Affordability"],["trends","Price trends"]].map(([t,l])=>(
                      <button key={t} style={S.tabs(browseTab===t)} onClick={()=>setBrowseTab(t)}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"#94a3b8"}}>
                      <span style={{background:"#fef3c7",color:"#92400e",padding:"1px 5px",borderRadius:3,fontSize:10,fontWeight:700}}>OUTDATED?</span>
                      {" "}= no price in most recent year
                    </span>
                    <button style={S.btnExport} onClick={()=>exportCSV(results,priceMap)}>⬇ Export CSV</button>
                  </div>
                </div>
                {browseTab==="table" && <FareTable data={results} pMap={priceMap}/>}
                {browseTab==="econ" && <EconTable data={results} pMap={priceMap} eMap={econMap}/>}
                {browseTab==="trends" && (
                  <div style={S.card}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                      <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Show:</span>
                      {[["price","Local price"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k,l])=>(
                        <button key={k} style={S.metricBtn(trendMetric===k)} onClick={()=>setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <TrendChart rows={buildTrendRows(results,priceMap,econMap)} metric={trendMetric}/>
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
                <div style={{color:"#64748b",fontSize:13,maxWidth:440,margin:"0 auto",lineHeight:1.7}}>
                  5,100 fare records across 47 countries, 94 cities and 5 years of pricing history,
                  with PPP-adjusted pricing and wage affordability metrics.
                  Use the filters above to search — select multiple values in any filter.
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ COMPARE TAB ═══ */}
        {mainTab === "compare" && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Select cities to compare (2 required, 3rd optional)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                {[["City A (required)",compareA,setCompareA],["City B (required)",compareB,setCompareB],["City C (optional)",compareC,setCompareC]].map(([lbl,val,setter])=>(
                  <div key={lbl}>
                    <label style={LS.label}>{lbl}</label>
                    <select style={LS.select} value={val} onChange={e=>setter(e.target.value)}>
                      <option value="">Select city…</option>
                      {allCities.map(c=><option key={c.key} value={c.key}>{c.country} — {c.city}</option>)}
                    </select>
                  </div>
                ))}
                <MultiSelect label="Passenger type" options={passengerTypes}
                  selected={comparePassenger} onChange={setComparePassenger}/>
                <MultiSelect label="Ticket category" options={ticketCategories}
                  selected={compareCategory} onChange={setCompareCategory}/>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
                <button style={S.btnPrimary} onClick={runCompare}
                  disabled={!compareA||!compareB||compareLoading}>
                  {compareLoading?"Loading…":"Compare"}
                </button>
              </div>
            </div>

            {compareResults.length>0 && (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={S.tabsWrap}>
                    {[["table","Fare table"],["econ","Affordability"],["trends","Price trends"]].map(([t,l])=>(
                      <button key={t} style={S.tabs(compareTab===t)} onClick={()=>setCompareTab(t)}>{l}</button>
                    ))}
                  </div>
                  <button style={S.btnExport} onClick={()=>exportCSV(compareResults,comparePriceMap)}>⬇ Export CSV</button>
                </div>
                {compareTab==="table" && <FareTable data={compareResults} pMap={comparePriceMap} showCity={true}/>}
                {compareTab==="econ" && <EconTable data={compareResults} pMap={comparePriceMap} eMap={compareEconMap}/>}
                {compareTab==="trends" && (
                  <div style={S.card}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                      <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Show:</span>
                      {[["price","Local price"],["ppp","USD (PPP)"],["min_wage","Min wage (mins)"],["avg_wage","Avg wage (mins)"]].map(([k,l])=>(
                        <button key={k} style={S.metricBtn(trendMetric===k)} onClick={()=>setTrendMetric(k)}>{l}</button>
                      ))}
                    </div>
                    <TrendChart rows={buildTrendRows(compareResults,comparePriceMap,compareEconMap)} metric={trendMetric}/>
                  </div>
                )}
              </>
            )}

            {!compareResults.length && !compareLoading && (
              <div style={{...S.card,textAlign:"center",padding:"44px 0",color:"#94a3b8"}}>
                <div style={{fontSize:28,marginBottom:10}}>🏙️</div>
                <div style={{fontWeight:600,color:"#374151"}}>Select two or three cities above</div>
                <div style={{fontSize:13,marginTop:4}}>Compare fares, PPP prices and wage affordability side by side</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
