import React, { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const YEARS = ["18-19","19-20","20-21","21-22","22-23","23-24","24-25","25-26"];
const YEAR_LABELS = {
  "18-19":"2018–19","19-20":"2019–20","20-21":"2020–21","21-22":"2021–22",
  "22-23":"2022–23","23-24":"2023–24","24-25":"2024–25","25-26":"2025–26"
};
const CURRENT_YEAR = "25-26";

// ── Currency notes per country ────────────────────────────────────────────────
// Add or update entries here to show a currency note beside local fares.
const COUNTRY_CURRENCIES = {
  "Australia":      { code:"AUD", name:"Australian dollar",  symbol:"A$" },
  "New Zealand":    { code:"NZD", name:"New Zealand dollar", symbol:"NZ$" },
  "United Kingdom": { code:"GBP", name:"British pound",      symbol:"£" },
  "United States":  { code:"USD", name:"US dollar",          symbol:"US$" },
  "Canada":         { code:"CAD", name:"Canadian dollar",    symbol:"CA$" },
  "Japan":          { code:"JPY", name:"Japanese yen",       symbol:"¥" },
  "Singapore":      { code:"SGD", name:"Singapore dollar",   symbol:"S$" },
  "Hong Kong":      { code:"HKD", name:"Hong Kong dollar",   symbol:"HK$" },
  "Germany":        { code:"EUR", name:"Euro",               symbol:"€" },
  "France":         { code:"EUR", name:"Euro",               symbol:"€" },
  "Netherlands":    { code:"EUR", name:"Euro",               symbol:"€" },
  "Sweden":         { code:"SEK", name:"Swedish krona",      symbol:"kr" },
  "Norway":         { code:"NOK", name:"Norwegian krone",    symbol:"kr" },
  "Denmark":        { code:"DKK", name:"Danish krone",       symbol:"kr" },
  "Switzerland":    { code:"CHF", name:"Swiss franc",        symbol:"CHF" },
  "South Korea":    { code:"KRW", name:"South Korean won",   symbol:"₩" },
  "China":          { code:"CNY", name:"Chinese yuan",       symbol:"¥" },
  "India":          { code:"INR", name:"Indian rupee",       symbol:"₹" },
  "Brazil":         { code:"BRL", name:"Brazilian real",     symbol:"R$" },
  "Mexico":         { code:"MXN", name:"Mexican peso",       symbol:"MX$" },
  "South Africa":   { code:"ZAR", name:"South African rand", symbol:"R" },
};

// ── Product-level commentary ──────────────────────────────────────────────────
// Add notes to specific fare products by product_id.
// These appear as an information note on the relevant row in the fare table.
// To add a note: PRODUCT_NOTES[product_id] = "Your note here."
// product_id values can be found by inspecting the database or CSV exports.
const PRODUCT_NOTES = {
  // Example entries (remove or replace with real product_ids):
  // 1234: "This fare was restructured in 2022–23 as part of a zone simplification.",
  // 5678: "Concession eligibility was extended in 2023–24 to include tertiary students.",
};

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
// Light variant (white + light-green) — for use on dark backgrounds
function N2Logo({ height = 32 }) {
  const w = Math.round(height * (2020 / 444.1));
  return (
    <svg width={w} height={height} viewBox="0 0 2020 444.1" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path fill="#fff" d="M265.3,5.8c1.1,1.7,2,2.9,2.7,4.1,18.7,31.9,37.5,63.9,56.2,95.8,1.7,2.9,2.1,5.2.3,8.3-18.5,31.9-37,63.8-55.4,95.8-.6,1-1.3,1.9-2.3,3.3-.8-1-1.6-2-2.3-3-18.7-32.1-37.5-64.2-56-96.5-1.1-1.9-1.3-5.5-.2-7.4,18-32.5,36.3-64.9,54.6-97.2.7-1.1,1.5-2.2,2.4-3.2h0Z"/>
        <path fill="#fff" d="M78.2,114.6c1.7-.2,3-.4,4.3-.4,36.7,0,73.4,0,110.1,0,3.4,0,5.5,1.1,7.3,4.1,18.6,31.9,37.2,63.7,55.9,95.5.7,1.1,1.2,2.4,2.1,4.2-1.8.2-3.1.4-4.4.4-37,0-74,0-111,0-3,0-5.1-.7-6.7-3.5-18.6-32.3-37.4-64.6-56.2-96.9-.5-1.1-1-2.2-1.4-3.4h0Z"/>
        <path fill="#b2d9a3" d="M69,119.8c1.2,1.8,2.2,3.1,3,4.6,18.6,31.4,37.2,62.9,55.7,94.3,1.7,2.8,2.4,5.2.5,8.4-18.5,31.6-37,63.3-55.4,95-.6,1-1.4,1.9-2.5,3.5-1.1-1.5-2-2.6-2.7-3.8-18.7-31.9-37.4-63.7-56.2-95.6-1.8-3.1-2-5.6-.2-8.7,18.4-31.2,36.8-62.4,55-93.7.7-1.2,1.5-2.3,2.6-3.9Z"/>
        <path fill="#b2d9a3" d="M274.2,2.6c2.1-.2,3.6-.4,5-.4,36.7.1,73.4.2,110.1.3,2.9-.2,5.7,1.3,7,3.9,19.5,31.4,39.1,62.8,58.7,94.2.7,1.1,1.2,2.3,2.1,4.1-2.1.1-3.6.3-5,.3-37.8,0-75.6-.1-113.3,0-3.6,0-5.9-1-7.7-4.2-18.1-31.2-36.3-62.4-54.5-93.5-.7-1.3-1.3-2.6-2.4-4.6h0Z"/>
        <path fill="#b2d9a3" d="M455.5,339.5c-1.2,2.3-1.9,3.8-2.7,5.2-17.6,30.6-35.3,61.1-52.9,91.7-2.1,3.7-4.5,5.3-8.9,5.3-36.1,0-72.2,0-108.2.2h-6.1c1.2-2.3,1.8-3.8,2.6-5.1,17.9-30.9,35.9-61.8,53.8-92.7,2-3.5,4.3-4.9,8.3-4.9,36.2.1,72.5,0,108.7,0,1.5,0,2.9.1,5.5.3h0Z"/>
        <path fill="#fff" d="M79,329.8c5.2-9,9.7-17,14.3-25,13.9-24.1,27.9-48.1,41.8-72.3,2-3.6,4.3-5.1,8.6-5.1,36.4.2,72.8.1,109.2.1h5.5c-1.1,2.3-1.8,3.7-2.5,5.1-17.5,30.8-34.9,61.6-52.3,92.4-1.7,3-3.6,4.4-7.1,4.4-33.8,0-67.6.2-101.5.4-5,0-10,0-16,0h0Z"/>
        <path fill="#fff" d="M267.3,438.1c-1.3-2-2.2-3.1-2.9-4.4-18.2-31-36.4-62.1-54.7-93.1-1.6-2.7-2-4.9-.3-7.9,18.4-32.2,36.8-64.4,55-96.5.5-.9,1.2-1.7,2.2-3.1,1.1,1.6,2.1,2.7,2.9,4.1,18.3,31.2,36.7,62.3,55,93.5,1.9,3.2,1.8,5.6,0,8.7-18.2,31.4-36.3,62.9-54.3,94.4-.8,1.3-1.6,2.5-2.9,4.5h0Z"/>
        <path fill="#fff" d="M275.5,217.6c1-1.9,1.5-3.3,2.3-4.6,18.1-31.5,36.1-62.9,54.2-94.4,1.8-3.1,3.8-4.6,7.5-4.6,36.2.3,72.5.4,108.7.5,1.1,0,2.3.2,3.9.4-.9,1.7-1.5,3.1-2.2,4.3-18.1,31.6-36.3,63.1-54.4,94.8-1.6,2.7-3.4,4.3-6.8,4.3-36.7-.2-73.4-.4-110.1-.5-.7,0-1.4-.1-3.1-.3h0Z"/>
        <path fill="#fff" d="M454.5,329.8h-45.7c-23.2,0-46.4,0-69.6.2-3.5,0-5.5-1.1-7.3-4.1-18.3-31.2-36.6-62.3-55-93.4-.7-1.2-1.3-2.5-2.3-4.5,2.2-.1,3.6-.3,5.1-.3,36.7,0,73.4,0,110-.2,3.9,0,6,1.3,7.9,4.6,17.9,30.7,35.8,61.4,53.8,91.9.9,1.5,1.6,3.1,2.9,5.8h0Z"/>
      </g>
      <g>
        <path fill="#b2d9a3" d="M557,176.8c-.3.8-1,1.7-.9,2.5,5.7,32.9,3,66.1,3.5,99.1,0,3.9.8,6.5,5.5,8.3,7.3,2.9,10.5,7.7,8.3,14.8-1.2,3.8-1.2,7.9-1.9,12.3h-20.6c-9.3,0-18.7,0-28,0-2.9,0-4.1-.6-4.2-3.2-.1-3.2-.1-6.6-1.3-9.7-2.9-7.5,2-11.7,8.7-14.5,4.4-1.9,5.2-4.3,5.2-8-.1-36.8-.1-73.6,0-110.4,0-3.2-.8-5.3-4.6-6.4-1.4-.6-2.8-1.3-4-2.1-4.9-2.5-7.4-5.8-6.1-11,1.2-4.7,1.4-9.6,2.1-14.8h38.3c5.5,0,12.1-1.4,16,.7s5.1,7.7,7.3,11.9c15.5,29.4,31.2,58.8,46.2,88.4,5.1,10.1,8.3,21,12.4,31.5l1.5,3.9h1.6c.3-1.2.5-2.3.5-3.5-5.4-32.5-2.5-65.2-3.1-97.8,0-3.5-.7-5.9-4.9-7.2-1.1-.5-2.1-1.1-3-1.8-4.7-3-8.1-6.1-6.2-11.9,1.5-4.4,1.4-9.3,2-14.1h52.5c.9,6.4,2.7,12.8,2.2,19.1-.2,2.7-4.5,6.1-7.9,7.6-5.5,2.4-6.3,5.6-6.3,10.3.2,45.7.1,91.3.1,137v5.6c-1.2.2-2.5.4-3.7.4-11.5,0-22.9,0-34.4,0-2.8,0-4.4-.6-5.6-2.9-17.6-33.7-35.5-67.2-52.8-101-4.8-9.3-7.5-19.3-11.2-29-.5-1.4-1-2.7-1.5-4.1h-1.6s0,0,0,0Z"/>
        <path fill="#fff" d="M1957.6,186.2c0-7.9,0-15.5,0-23.2,0-1-1.4-1.9-2.2-2.9-.2-.2-.6-.2-1-.3-13.9-5-14.8-6.2-13.7-18.4,1.1-11.2,1-11.5,14.4-12.3,13.1-.8,26.3-1.1,40-1.6v6.2c0,48.9,0,97.7,0,146.6,0,3.6.4,6,5.4,6.3.9.1,1.7.3,2.5.6,5,1.1,7.8,3.2,6.9,8.1-.6,3.2-.6,6.5,0,9.7.7,4.8-1.6,7.1-6.8,8.8-10,3.4-20.6,5.1-31.4,5.1-2.2-.1-4.2-1-5.7-2.3-2.1-2.2-3.6-4.9-5.5-7.8l-3.4,2.1c-21.3,13.3-55.9,10.3-70.7-6.2-7.1-7.9-10.2-17.1-11.6-26.7-3.1-19.9-3.7-39.8,3.7-59.2,10.6-27.7,36.4-37.8,68.2-34.3,3.5.4,7.1,1,11,1.6h0ZM1957.6,213.2c-4.8-.7-9.5-1.5-14.1-2.1-16.1-2-26.1,2.9-28.9,16.2-2.4,11.4-2.8,23.1-2.7,34.7,0,6.9,2.4,13.9,4.7,20.7,1.6,5.2,7,9,13.4,9.4,9.5.9,18.2-1,25.3-6.7,1.4-1.2,2.2-2.8,2.3-4.5.2-22.3,0-44.6,0-67.7h0Z"/>
        <path fill="#fff" d="M1162.8,185.8h-5.3c-8.3,0-8.5,0-10.3-6.9-1-3.4-1.7-6.9-2-10.5-.2-2.7-1.2-4.1-4.4-4.3-5.9-.4-11.9-1.3-17.8-1.2-9.6.2-16.8,6-18.3,13.9-2.4,12.3,2.4,20,16,24.7,8.9,3,18.1,5.7,27.3,8.1,33.5,8.7,45.7,27.7,44.3,55.5-1.4,27.1-19.3,46.1-48.6,52.5-18.9,4.1-37.5,2.2-55.6-2.8-7.8-2.1-15-5.6-22.3-8.9-1.7-.7-3.4-3.3-3.2-4.8,1.6-10.8,3.6-21.5,5.5-32.3.5-2.8,2.3-4.2,6.1-3.9,5.8.3,11.6.3,17.5,0,2.7,0,4.2.6,4.8,2.9,1.2,5.5,2.4,11,3.9,16.4.4,1.3,1.6,3,2.9,3.5,9.5,3.1,19.4,4.1,29.4,1.7,10-2.2,17.2-9.7,17.5-18.4.8-12.8-3.1-19.2-15.1-23.1-10-3.2-20.2-5.9-30.3-8.9-25.4-7.3-39.9-23.5-41.3-45.9-.7-11.4.4-22.5,6.8-32.7,10.3-16.2,27.1-24.4,48.4-26,21.3-1.6,41.5,2.8,60.7,10.6,2.8,1.1,4.1,2.6,3.6,5.1-1.8,10.3-3.6,20.7-5.4,31-.6,3.7-3,5.3-7.5,4.7-2.5-.2-5-.2-7.4,0h0Z"/>
        <path fill="#fff" d="M1335.2,369.2h-61.9c-.8-6.1-1.8-12.1-2.3-18.1,0-1.7.8-3.3,2.4-4.4,4.1-2.5,8.7-4.4,12.8-6.8,1.3-.8,2.9-2.2,3-3.4.3-8.7.1-17.4.1-26.6-.9.3-1.7.7-2.6,1.2-14.3,8.8-30.2,9.8-46.7,5.9-16.6-3.9-26.1-13.9-30.2-27.2-7.3-23.8-8-47.9.8-71.6,13-35.2,53.8-39.9,80.5-30.1,2.8,1,4.8,1.3,7.6-.2,2.4-1.2,5.1-1.8,7.9-1.9,6.5-.3,13,0,20.1,0v4.9c0,48.7,0,97.5-.1,146.3,0,3.2.8,5.2,4.2,6.7,5.7,2.4,7.7,6.3,6.4,11.6-1.1,4.4-1.4,9-2.1,13.8h0ZM1289.4,249v-26.1c0-5.9-3.5-9.6-10.4-11.1-18.2-3.9-28.8.8-32.9,15.8-4.6,16.6-4.5,33.9.3,50.4,4,13.6,16,18,31.1,11.8,3.2-1.2,6.1-2.9,8.6-5,1.7-1.5,2.8-3.5,3-5.7.3-10,.1-20.1.1-30.1h0Z"/>
        <path fill="#b2d9a3" d="M836.9,313.7h-61.3c-.9-6.3-2.3-12.6-2.3-18.8,0-2.1,3.4-5.2,6-6,7.9-2.5,8.5-7.2,8.3-13.2-.4-19.8-.2-39.6,0-59.4,0-2.7-.7-4.5-3.9-5.4-.8-.3-1.6-.6-2.3-1.1-5.9-2.8-10-6.4-7.7-12.8.5-1.7.8-3.5.8-5.3,1.2-9.1,1.1-9.4,11.8-10.2,11.5-.9,23-1.1,35-1.6v13.2c1.7-.9,2.8-1.4,3.9-2.1,15.8-9.2,33.2-11.8,51.8-8.3,14.7,2.8,23.5,10.9,26.5,22.8,2.3,9.8,3.6,19.8,3.9,29.8.6,15.2.2,30.4,0,45.7,0,2.7.5,4.6,3.8,5.5,1.1.4,2.2.9,3.2,1.5,5.9,2.7,8.6,6.4,6.9,12.3-1.2,4.1-1.3,8.5-2,13.1h-61.4c-.8-6.3-2.3-12.8-2.2-19.4,0-2.1,4.2-4.9,7.1-5.9,6.3-2.2,7.3-5.8,7.1-11.1-.4-14.9,0-29.8-.2-44.8,0-4.4-.7-8.8-1.9-13.1-1.9-6.3-6.5-9-14.1-9.5-9.4-.8-18.8,1.6-26.2,6.5-1.6,1.2-2.6,2.9-2.8,4.7-.2,20.2-.2,40.5,0,60.7,0,1.5,1.9,3,3.2,4.4.9.7,2,1.2,3.2,1.6,6.6,2.8,9.5,6.8,7.5,13.3-1.3,3.9-1.2,8.1-1.8,12.7h0Z"/>
        <path fill="#fff" d="M1478.1,183.6v101.9c9.7,3,14.6,8.8,14.6,17.3,0,9.4.1,9.7-10.7,12.6-7.8,2-16.1,2.9-24.1,4.3-5.1.9-8-1.2-9.8-4.8-1.2-2.4-2.1-4.9-2.8-6.4-9.8,3.2-19.5,7.6-29.8,9.5-9.5,1.5-19.2,1.7-28.7.4-16-2-25.4-11.4-27.8-25.8-.9-5.7-1.4-11.4-1.5-17.2-.2-18.8-.1-37.5,0-56.3,0-2.7-.6-4.5-3.8-5.5-1.6-.6-3.1-1.4-4.5-2.3-5.2-2.7-7.4-6.2-5.7-11.5,1-3.6,1.5-7.3,1.5-11,.1-2.3,1-3.4,3.7-3.9,15.1-2.3,30.3-3.4,46.2-1.8v4.9c0,26.9,0,53.8,0,80.7.1,4.4.8,8.8,2,13.1,1.4,5.4,6.1,8,12.5,8.5,10.2.8,19.5-1.6,27.9-6.3,1.7-1.1,2.8-2.8,2.9-4.6.2-20.5.2-41.1,0-61.6,0-1.3-1.7-2.8-2.9-4-.9-.7-2-1.2-3.2-1.6-6.5-2.9-9.6-7.1-7.5-13.3.2-.9.4-1.7.6-2.6.7-3.6,0-8.3,2.5-10.4s8.2-2.3,12.5-2.4c11.8-.4,23.5-.2,35.9-.2h0Z"/>
        <path fill="#fff" d="M1616.7,285.5c9.9,2.8,14.8,8.5,14.8,17.2v1.8c0,9.7,0,10-11.3,12.2-9.2,1.7-18.6,2.5-28.2,3.7-1.7-5.9-3.2-10.9-4.7-16.5-6,6.8-13.4,11.4-22.7,13.6-10.2,2.4-20.4,3.2-30.7.9-20.7-4.5-33.5-20.6-31.8-39.8,1.9-22.2,17.5-34.6,44-35.1,10.7-.2,21.4,0,33.1,0-.5-7.2-.4-13.9-1.6-20.5-1.4-7.4-7.9-11.7-16.9-12.3-1.2,0-2.5-.1-3.7-.2-13-.2-13.5.1-15.1,10.6-.8,5.4-4.3,8.1-10.6,8.1s-9.5-.1-14.3,0c-2.7,0-4.6-.4-4.9-2.8-1.1-9.3-2.2-18.7-3.1-28,0-.9,1.4-2.3,2.6-2.8,22.7-10.4,46.8-14.5,72.3-10.3,18.8,3.1,30.8,15.5,31.7,33.6,1.1,20.6.7,41.3,1,62,0,1.6,0,3.1,0,4.7h0ZM1578.8,263.2c-6.7,0-12.8,0-19,0-2.1,0-4.2.3-6.3.7-8.5,1.4-13.1,6.8-12.7,14.6.4,8,5.6,13.2,14.3,14,7.8.7,15.6-1.4,21.4-5.9,1.2-1,2-2.3,2.1-3.7.3-6.3.2-12.7.2-19.7h0Z"/>
        <path fill="#fff" d="M1781.6,260.2c2.2,6.6,3.3,12.8,6.2,18.4,4.6,9,14.6,11.4,25.2,11.7,12.6.4,24.3-2.3,35.7-8.3,2.6,6.9,5.3,13.5,7.6,20.2.3.9-1,2.4-2,3.3-6.9,6-15.3,9.7-24.8,11.9-13.5,3.2-27.7,3.3-41.3.4-19.9-4.2-32.9-15.2-38.9-31.3-8.7-23.5-8.6-47.2,1.9-70.3,13.8-30.7,49.2-36.8,77.5-29.9,14,3.4,21.8,12.4,26,23.7,4.3,11.4,5.4,23.2,4.4,35-.8,10.6-7.2,15.4-19.8,15.4-18.6,0-37.3,0-57.9,0h0ZM1825.2,236.5c0-4.1.5-7.7,0-11.1-1.1-6.5-4.5-11.9-12.6-13.9-7.8-1.9-15.3-1.2-20.9,4-6.7,6.3-8,14.2-8.7,22.6l42.3-1.7Z"/>
        <path fill="#b2d9a3" d="M969.5,257.5c.9,4.5,1.3,8.3,2.4,12,3.4,11.1,11.6,16.6,25.2,17.4,13.5.9,26.9-1.9,38.3-8,2.6,6.6,5.3,13,7.4,19.4.4,1.1-1.1,3-2.2,4-10.5,8.8-23.7,12.5-38.1,13.4-20,1.2-38.8-1.5-53.3-14.5-9.4-8.4-14-18.7-16.1-29.8-3.6-18.8-3.3-37.4,4.5-55.5,14.4-33.8,52-37.8,78-31.5,10.7,2.6,18.3,8.7,23,17.2,7.2,13.2,8.9,27.3,7.4,41.6-1.1,10.2-7.4,14.3-19.9,14.3-13.9,0-27.8,0-41.8,0h-14.8s0,0,0,0ZM968.8,235.8c11.6-.4,21.3-.8,30.9-1.1,13.8-.4,14.9-1.7,12-13.2-1.8-7.2-7.2-11.7-14.8-12.6-9.8-1.1-17.5,1.5-21.2,8.4-2.9,5.6-4.4,11.6-6.9,18.5h0Z"/>
        <path fill="#fff" d="M1689.7,183.3v15.5c12.3-10.8,25.5-17.9,43.5-14.6v33.7c-9,.6-17.3,1-25.7,1.6-1.7.2-3.4.6-5.1,1.2-8.1,2.5-9.3,4-9.3,11.2v52.6c9.1,3.3,17.4,6.3,25.7,9.4,3.2,1.2,4.4,3.3,3.8,6.5-1.1,5.3-1.6,10.8-2.4,16.4h-76.7c-.6-4.4-1.1-8.6-1.8-12.8-1.3-7.9-.7-9.8,7.8-13.4,5.1-2.2,6.2-4.8,6.2-9.3-.3-20.8-.2-41.7,0-62.5,0-2.7-.7-4.5-3.9-5.4-1.6-.6-3.1-1.4-4.5-2.3-4.9-2.4-7.1-5.7-5.9-10.6,1-3.6,1.5-7.3,1.6-11,0-3.6,2-4.3,5.7-4.9,13.6-2.2,27.2-3,41.2-1.5h0Z"/>
        <path fill="#b2d9a3" d="M759.7,313.7h-61.3c-.8-6.3-2.2-12.4-2.1-18.6,0-2.1,3-5.3,5.6-6.1,8.1-2.7,8.8-7.6,8.6-13.9-.5-19.3-.2-38.7,0-58,0-3.1-.4-5.5-4.4-6.4-1-.4-1.9-.8-2.7-1.4-5.3-2.7-8.7-6-6.9-11.9,1-3.6,1.5-7.3,1.5-11,.2-2.7,1.7-3.5,4.5-3.9,15-2.3,30.3-2.9,45.5-1.7v5.1c0,31.6,0,63.2,0,94.8,0,3,.8,5,4.3,6.1,1.8.5,3.3,1.7,4.9,2.6,3.9,2.1,5.8,4.7,4.9,8.9-1.1,5.1-1.5,10.2-2.3,15.5h0Z"/>
        <path fill="#b2d9a3" d="M728.7,165.5c-15.5,0-22.4-6-22.4-19.6,0-13.4,7.2-19.9,22.2-20s22.4,6.5,22.6,19.8c.2,13.3-7.1,19.7-22.4,19.8h0Z"/>
      </g>
    </svg>
  );
}

// Dark variant (near-black + forest-green) — for use on white/light backgrounds
function N2LogoDark({ height = 32 }) {
  const w = Math.round(height * (2020 / 444.1));
  return (
    <svg width={w} height={height} viewBox="0 0 2020 444.1" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path fill="#231f20" d="M265.3,5.8c1.1,1.7,2,2.9,2.7,4.1,18.7,31.9,37.5,63.9,56.2,95.8,1.7,2.9,2.1,5.2.3,8.3-18.5,31.9-37,63.8-55.4,95.8-.6,1-1.3,1.9-2.3,3.3-.8-1-1.6-2-2.3-3-18.7-32.1-37.5-64.2-56-96.5-1.1-1.9-1.3-5.5-.2-7.4,18-32.5,36.3-64.9,54.6-97.2.7-1.1,1.5-2.2,2.4-3.2h0Z"/>
        <path fill="#231f20" d="M78.2,114.6c1.7-.2,3-.4,4.3-.4,36.7,0,73.4,0,110.1,0,3.4,0,5.5,1.1,7.3,4.1,18.6,31.9,37.2,63.7,55.9,95.5.7,1.1,1.2,2.4,2.1,4.2-1.8.2-3.1.4-4.4.4-37,0-74,0-111,0-3,0-5.1-.7-6.7-3.5-18.6-32.3-37.4-64.6-56.2-96.9-.5-1.1-1-2.2-1.4-3.4h0Z"/>
        <path fill="#4f7155" d="M69,119.8c1.2,1.8,2.2,3.1,3,4.6,18.6,31.4,37.2,62.9,55.7,94.3,1.7,2.8,2.4,5.2.5,8.4-18.5,31.6-37,63.3-55.4,95-.6,1-1.4,1.9-2.5,3.5-1.1-1.5-2-2.6-2.7-3.8-18.7-31.9-37.4-63.7-56.2-95.6-1.8-3.1-2-5.6-.2-8.7,18.4-31.2,36.8-62.4,55-93.7.7-1.2,1.5-2.3,2.6-3.9Z"/>
        <path fill="#4f7155" d="M274.2,2.6c2.1-.2,3.6-.4,5-.4,36.7.1,73.4.2,110.1.3,2.9-.2,5.7,1.3,7,3.9,19.5,31.4,39.1,62.8,58.7,94.2.7,1.1,1.2,2.3,2.1,4.1-2.1.1-3.6.3-5,.3-37.8,0-75.6-.1-113.3,0-3.6,0-5.9-1-7.7-4.2-18.1-31.2-36.3-62.4-54.5-93.5-.7-1.3-1.3-2.6-2.4-4.6h0Z"/>
        <path fill="#4f7155" d="M455.5,339.5c-1.2,2.3-1.9,3.8-2.7,5.2-17.6,30.6-35.3,61.1-52.9,91.7-2.1,3.7-4.5,5.3-8.9,5.3-36.1,0-72.2,0-108.2.2h-6.1c1.2-2.3,1.8-3.8,2.6-5.1,17.9-30.9,35.9-61.8,53.8-92.7,2-3.5,4.3-4.9,8.3-4.9,36.2.1,72.5,0,108.7,0,1.5,0,2.9.1,5.5.3h0Z"/>
        <path fill="#231f20" d="M79,329.8c5.2-9,9.7-17,14.3-25,13.9-24.1,27.9-48.1,41.8-72.3,2-3.6,4.3-5.1,8.6-5.1,36.4.2,72.8.1,109.2.1h5.5c-1.1,2.3-1.8,3.7-2.5,5.1-17.5,30.8-34.9,61.6-52.3,92.4-1.7,3-3.6,4.4-7.1,4.4-33.8,0-67.6.2-101.5.4-5,0-10,0-16,0h0Z"/>
        <path fill="#231f20" d="M267.3,438.1c-1.3-2-2.2-3.1-2.9-4.4-18.2-31-36.4-62.1-54.7-93.1-1.6-2.7-2-4.9-.3-7.9,18.4-32.2,36.8-64.4,55-96.5.5-.9,1.2-1.7,2.2-3.1,1.1,1.6,2.1,2.7,2.9,4.1,18.3,31.2,36.7,62.3,55,93.5,1.9,3.2,1.8,5.6,0,8.7-18.2,31.4-36.3,62.9-54.3,94.4-.8,1.3-1.6,2.5-2.9,4.5h0Z"/>
        <path fill="#231f20" d="M275.5,217.6c1-1.9,1.5-3.3,2.3-4.6,18.1-31.5,36.1-62.9,54.2-94.4,1.8-3.1,3.8-4.6,7.5-4.6,36.2.3,72.5.4,108.7.5,1.1,0,2.3.2,3.9.4-.9,1.7-1.5,3.1-2.2,4.3-18.1,31.6-36.3,63.1-54.4,94.8-1.6,2.7-3.4,4.3-6.8,4.3-36.7-.2-73.4-.4-110.1-.5-.7,0-1.4-.1-3.1-.3h0Z"/>
        <path fill="#231f20" d="M454.5,329.8h-45.7c-23.2,0-46.4,0-69.6.2-3.5,0-5.5-1.1-7.3-4.1-18.3-31.2-36.6-62.3-55-93.4-.7-1.2-1.3-2.5-2.3-4.5,2.2-.1,3.6-.3,5.1-.3,36.7,0,73.4,0,110-.2,3.9,0,6,1.3,7.9,4.6,17.9,30.7,35.8,61.4,53.8,91.9.9,1.5,1.6,3.1,2.9,5.8h0Z"/>
      </g>
      <g>
        <path fill="#4f7155" d="M557,176.8c-.3.8-1,1.7-.9,2.5,5.7,32.9,3,66.1,3.5,99.1,0,3.9.8,6.5,5.5,8.3,7.3,2.9,10.5,7.7,8.3,14.8-1.2,3.8-1.2,7.9-1.9,12.3h-20.6c-9.3,0-18.7,0-28,0-2.9,0-4.1-.6-4.2-3.2-.1-3.2-.1-6.6-1.3-9.7-2.9-7.5,2-11.7,8.7-14.5,4.4-1.9,5.2-4.3,5.2-8-.1-36.8-.1-73.6,0-110.4,0-3.2-.8-5.3-4.6-6.4-1.4-.6-2.8-1.3-4-2.1-4.9-2.5-7.4-5.8-6.1-11,1.2-4.7,1.4-9.6,2.1-14.8h38.3c5.5,0,12.1-1.4,16,.7s5.1,7.7,7.3,11.9c15.5,29.4,31.2,58.8,46.2,88.4,5.1,10.1,8.3,21,12.4,31.5l1.5,3.9h1.6c.3-1.2.5-2.3.5-3.5-5.4-32.5-2.5-65.2-3.1-97.8,0-3.5-.7-5.9-4.9-7.2-1.1-.5-2.1-1.1-3-1.8-4.7-3-8.1-6.1-6.2-11.9,1.5-4.4,1.4-9.3,2-14.1h52.5c.9,6.4,2.7,12.8,2.2,19.1-.2,2.7-4.5,6.1-7.9,7.6-5.5,2.4-6.3,5.6-6.3,10.3.2,45.7.1,91.3.1,137v5.6c-1.2.2-2.5.4-3.7.4-11.5,0-22.9,0-34.4,0-2.8,0-4.4-.6-5.6-2.9-17.6-33.7-35.5-67.2-52.8-101-4.8-9.3-7.5-19.3-11.2-29-.5-1.4-1-2.7-1.5-4.1h-1.6s0,0,0,0Z"/>
        <path fill="#231f20" d="M1957.6,186.2c0-7.9,0-15.5,0-23.2,0-1-1.4-1.9-2.2-2.9-.2-.2-.6-.2-1-.3-13.9-5-14.8-6.2-13.7-18.4,1.1-11.2,1-11.5,14.4-12.3,13.1-.8,26.3-1.1,40-1.6v6.2c0,48.9,0,97.7,0,146.6,0,3.6.4,6,5.4,6.3.9.1,1.7.3,2.5.6,5,1.1,7.8,3.2,6.9,8.1-.6,3.2-.6,6.5,0,9.7.7,4.8-1.6,7.1-6.8,8.8-10,3.4-20.6,5.1-31.4,5.1-2.2-.1-4.2-1-5.7-2.3-2.1-2.2-3.6-4.9-5.5-7.8l-3.4,2.1c-21.3,13.3-55.9,10.3-70.7-6.2-7.1-7.9-10.2-17.1-11.6-26.7-3.1-19.9-3.7-39.8,3.7-59.2,10.6-27.7,36.4-37.8,68.2-34.3,3.5.4,7.1,1,11,1.6h0ZM1957.6,213.2c-4.8-.7-9.5-1.5-14.1-2.1-16.1-2-26.1,2.9-28.9,16.2-2.4,11.4-2.8,23.1-2.7,34.7,0,6.9,2.4,13.9,4.7,20.7,1.6,5.2,7,9,13.4,9.4,9.5.9,18.2-1,25.3-6.7,1.4-1.2,2.2-2.8,2.3-4.5.2-22.3,0-44.6,0-67.7h0Z"/>
        <path fill="#231f20" d="M1162.8,185.8h-5.3c-8.3,0-8.5,0-10.3-6.9-1-3.4-1.7-6.9-2-10.5-.2-2.7-1.2-4.1-4.4-4.3-5.9-.4-11.9-1.3-17.8-1.2-9.6.2-16.8,6-18.3,13.9-2.4,12.3,2.4,20,16,24.7,8.9,3,18.1,5.7,27.3,8.1,33.5,8.7,45.7,27.7,44.3,55.5-1.4,27.1-19.3,46.1-48.6,52.5-18.9,4.1-37.5,2.2-55.6-2.8-7.8-2.1-15-5.6-22.3-8.9-1.7-.7-3.4-3.3-3.2-4.8,1.6-10.8,3.6-21.5,5.5-32.3.5-2.8,2.3-4.2,6.1-3.9,5.8.3,11.6.3,17.5,0,2.7,0,4.2.6,4.8,2.9,1.2,5.5,2.4,11,3.9,16.4.4,1.3,1.6,3,2.9,3.5,9.5,3.1,19.4,4.1,29.4,1.7,10-2.2,17.2-9.7,17.5-18.4.8-12.8-3.1-19.2-15.1-23.1-10-3.2-20.2-5.9-30.3-8.9-25.4-7.3-39.9-23.5-41.3-45.9-.7-11.4.4-22.5,6.8-32.7,10.3-16.2,27.1-24.4,48.4-26,21.3-1.6,41.5,2.8,60.7,10.6,2.8,1.1,4.1,2.6,3.6,5.1-1.8,10.3-3.6,20.7-5.4,31-.6,3.7-3,5.3-7.5,4.7-2.5-.2-5-.2-7.4,0h0Z"/>
        <path fill="#231f20" d="M1335.2,369.2h-61.9c-.8-6.1-1.8-12.1-2.3-18.1,0-1.7.8-3.3,2.4-4.4,4.1-2.5,8.7-4.4,12.8-6.8,1.3-.8,2.9-2.2,3-3.4.3-8.7.1-17.4.1-26.6-.9.3-1.7.7-2.6,1.2-14.3,8.8-30.2,9.8-46.7,5.9-16.6-3.9-26.1-13.9-30.2-27.2-7.3-23.8-8-47.9.8-71.6,13-35.2,53.8-39.9,80.5-30.1,2.8,1,4.8,1.3,7.6-.2,2.4-1.2,5.1-1.8,7.9-1.9,6.5-.3,13,0,20.1,0v4.9c0,48.7,0,97.5-.1,146.3,0,3.2.8,5.2,4.2,6.7,5.7,2.4,7.7,6.3,6.4,11.6-1.1,4.4-1.4,9-2.1,13.8h0ZM1289.4,249v-26.1c0-5.9-3.5-9.6-10.4-11.1-18.2-3.9-28.8.8-32.9,15.8-4.6,16.6-4.5,33.9.3,50.4,4,13.6,16,18,31.1,11.8,3.2-1.2,6.1-2.9,8.6-5,1.7-1.5,2.8-3.5,3-5.7.3-10,.1-20.1.1-30.1h0Z"/>
        <path fill="#4f7155" d="M836.9,313.7h-61.3c-.9-6.3-2.3-12.6-2.3-18.8,0-2.1,3.4-5.2,6-6,7.9-2.5,8.5-7.2,8.3-13.2-.4-19.8-.2-39.6,0-59.4,0-2.7-.7-4.5-3.9-5.4-.8-.3-1.6-.6-2.3-1.1-5.9-2.8-10-6.4-7.7-12.8.5-1.7.8-3.5.8-5.3,1.2-9.1,1.1-9.4,11.8-10.2,11.5-.9,23-1.1,35-1.6v13.2c1.7-.9,2.8-1.4,3.9-2.1,15.8-9.2,33.2-11.8,51.8-8.3,14.7,2.8,23.5,10.9,26.5,22.8,2.3,9.8,3.6,19.8,3.9,29.8.6,15.2.2,30.4,0,45.7,0,2.7.5,4.6,3.8,5.5,1.1.4,2.2.9,3.2,1.5,5.9,2.7,8.6,6.4,6.9,12.3-1.2,4.1-1.3,8.5-2,13.1h-61.4c-.8-6.3-2.3-12.8-2.2-19.4,0-2.1,4.2-4.9,7.1-5.9,6.3-2.2,7.3-5.8,7.1-11.1-.4-14.9,0-29.8-.2-44.8,0-4.4-.7-8.8-1.9-13.1-1.9-6.3-6.5-9-14.1-9.5-9.4-.8-18.8,1.6-26.2,6.5-1.6,1.2-2.6,2.9-2.8,4.7-.2,20.2-.2,40.5,0,60.7,0,1.5,1.9,3,3.2,4.4.9.7,2,1.2,3.2,1.6,6.6,2.8,9.5,6.8,7.5,13.3-1.3,3.9-1.2,8.1-1.8,12.7h0Z"/>
        <path fill="#231f20" d="M1478.1,183.6v101.9c9.7,3,14.6,8.8,14.6,17.3,0,9.4.1,9.7-10.7,12.6-7.8,2-16.1,2.9-24.1,4.3-5.1.9-8-1.2-9.8-4.8-1.2-2.4-2.1-4.9-2.8-6.4-9.8,3.2-19.5,7.6-29.8,9.5-9.5,1.5-19.2,1.7-28.7.4-16-2-25.4-11.4-27.8-25.8-.9-5.7-1.4-11.4-1.5-17.2-.2-18.8-.1-37.5,0-56.3,0-2.7-.6-4.5-3.8-5.5-1.6-.6-3.1-1.4-4.5-2.3-5.2-2.7-7.4-6.2-5.7-11.5,1-3.6,1.5-7.3,1.5-11,.1-2.3,1-3.4,3.7-3.9,15.1-2.3,30.3-3.4,46.2-1.8v4.9c0,26.9,0,53.8,0,80.7.1,4.4.8,8.8,2,13.1,1.4,5.4,6.1,8,12.5,8.5,10.2.8,19.5-1.6,27.9-6.3,1.7-1.1,2.8-2.8,2.9-4.6.2-20.5.2-41.1,0-61.6,0-1.3-1.7-2.8-2.9-4-.9-.7-2-1.2-3.2-1.6-6.5-2.9-9.6-7.1-7.5-13.3.2-.9.4-1.7.6-2.6.7-3.6,0-8.3,2.5-10.4s8.2-2.3,12.5-2.4c11.8-.4,23.5-.2,35.9-.2h0Z"/>
        <path fill="#231f20" d="M1616.7,285.5c9.9,2.8,14.8,8.5,14.8,17.2v1.8c0,9.7,0,10-11.3,12.2-9.2,1.7-18.6,2.5-28.2,3.7-1.7-5.9-3.2-10.9-4.7-16.5-6,6.8-13.4,11.4-22.7,13.6-10.2,2.4-20.4,3.2-30.7.9-20.7-4.5-33.5-20.6-31.8-39.8,1.9-22.2,17.5-34.6,44-35.1,10.7-.2,21.4,0,33.1,0-.5-7.2-.4-13.9-1.6-20.5-1.4-7.4-7.9-11.7-16.9-12.3-1.2,0-2.5-.1-3.7-.2-13-.2-13.5.1-15.1,10.6-.8,5.4-4.3,8.1-10.6,8.1s-9.5-.1-14.3,0c-2.7,0-4.6-.4-4.9-2.8-1.1-9.3-2.2-18.7-3.1-28,0-.9,1.4-2.3,2.6-2.8,22.7-10.4,46.8-14.5,72.3-10.3,18.8,3.1,30.8,15.5,31.7,33.6,1.1,20.6.7,41.3,1,62,0,1.6,0,3.1,0,4.7h0ZM1578.8,263.2c-6.7,0-12.8,0-19,0-2.1,0-4.2.3-6.3.7-8.5,1.4-13.1,6.8-12.7,14.6.4,8,5.6,13.2,14.3,14,7.8.7,15.6-1.4,21.4-5.9,1.2-1,2-2.3,2.1-3.7.3-6.3.2-12.7.2-19.7h0Z"/>
        <path fill="#231f20" d="M1781.6,260.2c2.2,6.6,3.3,12.8,6.2,18.4,4.6,9,14.6,11.4,25.2,11.7,12.6.4,24.3-2.3,35.7-8.3,2.6,6.9,5.3,13.5,7.6,20.2.3.9-1,2.4-2,3.3-6.9,6-15.3,9.7-24.8,11.9-13.5,3.2-27.7,3.3-41.3.4-19.9-4.2-32.9-15.2-38.9-31.3-8.7-23.5-8.6-47.2,1.9-70.3,13.8-30.7,49.2-36.8,77.5-29.9,14,3.4,21.8,12.4,26,23.7,4.3,11.4,5.4,23.2,4.4,35-.8,10.6-7.2,15.4-19.8,15.4-18.6,0-37.3,0-57.9,0h0ZM1825.2,236.5c0-4.1.5-7.7,0-11.1-1.1-6.5-4.5-11.9-12.6-13.9-7.8-1.9-15.3-1.2-20.9,4-6.7,6.3-8,14.2-8.7,22.6l42.3-1.7Z"/>
        <path fill="#4f7155" d="M969.5,257.5c.9,4.5,1.3,8.3,2.4,12,3.4,11.1,11.6,16.6,25.2,17.4,13.5.9,26.9-1.9,38.3-8,2.6,6.6,5.3,13,7.4,19.4.4,1.1-1.1,3-2.2,4-10.5,8.8-23.7,12.5-38.1,13.4-20,1.2-38.8-1.5-53.3-14.5-9.4-8.4-14-18.7-16.1-29.8-3.6-18.8-3.3-37.4,4.5-55.5,14.4-33.8,52-37.8,78-31.5,10.7,2.6,18.3,8.7,23,17.2,7.2,13.2,8.9,27.3,7.4,41.6-1.1,10.2-7.4,14.3-19.9,14.3-13.9,0-27.8,0-41.8,0h-14.8s0,0,0,0ZM968.8,235.8c11.6-.4,21.3-.8,30.9-1.1,13.8-.4,14.9-1.7,12-13.2-1.8-7.2-7.2-11.7-14.8-12.6-9.8-1.1-17.5,1.5-21.2,8.4-2.9,5.6-4.4,11.6-6.9,18.5h0Z"/>
        <path fill="#231f20" d="M1689.7,183.3v15.5c12.3-10.8,25.5-17.9,43.5-14.6v33.7c-9,.6-17.3,1-25.7,1.6-1.7.2-3.4.6-5.1,1.2-8.1,2.5-9.3,4-9.3,11.2v52.6c9.1,3.3,17.4,6.3,25.7,9.4,3.2,1.2,4.4,3.3,3.8,6.5-1.1,5.3-1.6,10.8-2.4,16.4h-76.7c-.6-4.4-1.1-8.6-1.8-12.8-1.3-7.9-.7-9.8,7.8-13.4,5.1-2.2,6.2-4.8,6.2-9.3-.3-20.8-.2-41.7,0-62.5,0-2.7-.7-4.5-3.9-5.4-1.6-.6-3.1-1.4-4.5-2.3-4.9-2.4-7.1-5.7-5.9-10.6,1-3.6,1.5-7.3,1.6-11,0-3.6,2-4.3,5.7-4.9,13.6-2.2,27.2-3,41.2-1.5h0Z"/>
        <path fill="#4f7155" d="M759.7,313.7h-61.3c-.8-6.3-2.2-12.4-2.1-18.6,0-2.1,3-5.3,5.6-6.1,8.1-2.7,8.8-7.6,8.6-13.9-.5-19.3-.2-38.7,0-58,0-3.1-.4-5.5-4.4-6.4-1-.4-1.9-.8-2.7-1.4-5.3-2.7-8.7-6-6.9-11.9,1-3.6,1.5-7.3,1.5-11,.2-2.7,1.7-3.5,4.5-3.9,15-2.3,30.3-2.9,45.5-1.7v5.1c0,31.6,0,63.2,0,94.8,0,3,.8,5,4.3,6.1,1.8.5,3.3,1.7,4.9,2.6,3.9,2.1,5.8,4.7,4.9,8.9-1.1,5.1-1.5,10.2-2.3,15.5h0Z"/>
        <path fill="#4f7155" d="M728.7,165.5c-15.5,0-22.4-6-22.4-19.6,0-13.4,7.2-19.9,22.2-20s22.4,6.5,22.6,19.8c.2,13.3-7.1,19.7-22.4,19.8h0Z"/>
      </g>
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
      No price data available for this selection
    </div>
  );

  const maxVal = Math.max(...allVals);
  const minVal = Math.min(...allVals);
  // Use a range with a fallback so flat-fare cities (all same value) still render
  const range = maxVal - minVal || maxVal || 1;
  // Add 10% padding above and below so lines don't sit right on the axis edges
  const chartMin = Math.max(0, minVal - range * 0.1);
  const chartMax = maxVal + range * 0.1;
  const chartRange = chartMax - chartMin || 1;

  const activeYears = YEARS.filter(y => series.some(s => s.points.find(pt => pt.year === y)));
  const W=600, H=240, PL=72, PR=20, PT=20, PB=44;
  const iW=W-PL-PR, iH=H-PT-PB;

  const xOf = y => PL + (activeYears.indexOf(y) / Math.max(activeYears.length - 1, 1)) * iW;
  const yOf = v => PT + iH * (1 - (v - chartMin) / chartRange);

  // Y-axis: 5 evenly-spaced gridlines between chartMin and chartMax
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PT + iH * (1 - t),
    val: chartMin + chartRange * t,
  }));

  const fmtVal = v => v >= 1000 ? v.toLocaleString(undefined, {maximumFractionDigits:0})
    : v >= 10 ? v.toFixed(1) : v.toFixed(2);

  const metricLabel = { fare:"Local fare", ppp:"USD (PPP)", min_wage:"Min wage (mins)", avg_wage:"Avg wage (mins)" }[metric];

  // Pre-compute pixel coordinates as numbers (avoids string-split issues)
  const seriesWithCoords = series.map(s => ({
    ...s,
    coords: s.points.map(pt => ({ x: xOf(pt.year), y: yOf(pt.val) })),
  }));

  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={H} style={{ fontFamily:"inherit", display:"block" }}>
        {gridLines.map(({ y, val }) => (
          <g key={val}>
            <line x1={PL} y1={y} x2={PL+iW} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4"/>
            <text x={PL-6} y={y+4} textAnchor="end" fontSize="10" fill="#9ca3af">
              {fmtVal(val)}
            </text>
          </g>
        ))}
        <text x={18} y={PT+iH/2} textAnchor="middle" fontSize="10" fill="#64748b"
          transform={`rotate(-90,18,${PT+iH/2})`}>{metricLabel}</text>
        {activeYears.map(y => (
          <text key={y} x={xOf(y)} y={H-8} textAnchor="middle" fontSize="10" fill="#6b7280">
            {YEAR_LABELS[y]}
          </text>
        ))}
        {seriesWithCoords.map(s => (
          <g key={s.label}>
            {s.coords.length > 1 && (
              <polyline
                points={s.coords.map(c => `${c.x},${c.y}`).join(" ")}
                fill="none" stroke={s.colour} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            )}
            {s.coords.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={s.colour}/>
            ))}
          </g>
        ))}
      </svg>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:10 }}>
        {series.map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#4b5563" }}>
            <div style={{ width:18, height:2.5, background:s.colour, borderRadius:1 }}/>
            <span style={{ maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</span>
          </div>
        ))}

        {/* ═══ ABOUT THE DATA ═══ */}
        {mainTab==="about" && (
          <div style={{maxWidth:820}}>
            <div style={{...S.tabWrap, marginBottom:20}}>
              {[
                ["methodology","Methodology"],
                ["affordability","Affordability metrics"],
                ["collection","Data collection"],
                ["coverage","Coverage & limitations"],
              ].map(([k,l])=>(
                <button key={k} style={S.tab(aboutSection===k)} onClick={()=>setAboutSection(k)}>{l}</button>
              ))}
            </div>

            {aboutSection==="methodology" && (
              <div style={S.card}>
                <div style={S.cardTitle}>How the data is collected and structured</div>
                <p style={aboutStyle.p}>
                  The NineSquared Global Fares Database is an annual dataset tracking public transport fare products
                  across 47 countries and 116 cities. Data is collected each financial year (July to June,
                  following the Australian convention) from official transit authority sources, published fare schedules,
                  and government transport reports.
                </p>
                <p style={aboutStyle.p}>
                  Each <strong>fare product</strong> is a unique combination of attributes: city, transit system, fare
                  system (e.g. zonal or flat), ticket category (e.g. single, pass, cap), passenger type
                  (e.g. adult, concession), zone, peak/off-peak status, and payment media. A stable{" "}
                  <strong>product ID</strong> allows the same fare product to be tracked across all eight years of data
                  (2018–19 to 2025–26), enabling genuine time-series comparison.
                </p>
                <p style={aboutStyle.p}>
                  Fares are recorded in <strong>local currency</strong> as published by the transit authority.
                  To enable cross-country comparison, each fare is also expressed in purchasing power parity (PPP)
                  terms and as a proportion of local wage rates — see the Affordability Metrics section for details.
                </p>
                <div style={aboutStyle.infoBox}>
                  <strong>Financial year convention:</strong> A fare recorded as "2024–25" was the published fare
                  in effect during the period 1 July 2024 to 30 June 2025. Data is collected and updated annually
                  around the end of June each year.
                </div>
              </div>
            )}

            {aboutSection==="affordability" && (
              <div style={S.card}>
                <div style={S.cardTitle}>Understanding the affordability metrics</div>
                <p style={aboutStyle.p}>
                  Raw fare prices in local currency are not directly comparable across countries — a fare of $3.50
                  means something very different in Sydney than in Mumbai. NineSquared expresses every fare using
                  three additional metrics that allow meaningful cross-city comparison.
                </p>
                <div style={aboutStyle.metricCard}>
                  <div style={aboutStyle.metricTitle}>Local fare (local currency)</div>
                  <p style={aboutStyle.metricDesc}>
                    The published fare as recorded in the local currency of the country. Use this for
                    within-country comparisons or to understand absolute fare levels. <em>Not suitable
                    for direct comparison across countries with different currencies.</em>
                  </p>
                </div>
                <div style={aboutStyle.metricCard}>
                  <div style={aboutStyle.metricTitle}>USD (PPP) — Purchasing Power Parity</div>
                  <p style={aboutStyle.metricDesc}>
                    The fare expressed in US dollars, adjusted for purchasing power parity. PPP adjustment
                    accounts for differences in price levels between countries, so that a "dollar" represents
                    the same real purchasing power in each city. PPP rates are sourced from the OECD and
                    World Bank. This is the <strong>recommended metric for cross-country fare comparisons</strong>.
                  </p>
                </div>
                <div style={aboutStyle.metricCard}>
                  <div style={aboutStyle.metricTitle}>Minimum wage minutes</div>
                  <p style={aboutStyle.metricDesc}>
                    How many minutes of work at the statutory minimum wage are required to earn enough to
                    pay for this fare. This metric contextualises affordability for lower-income workers
                    and is particularly useful for assessing equity implications of fare levels.
                  </p>
                </div>
                <div style={aboutStyle.metricCard}>
                  <div style={aboutStyle.metricTitle}>Average wage minutes</div>
                  <p style={aboutStyle.metricDesc}>
                    How many minutes of work at the mean wage are required to pay for this fare. This
                    provides a complementary affordability measure for the broader working population.
                    Average wage data is sourced from the OECD and national statistical agencies.
                  </p>
                </div>
                <div style={aboutStyle.infoBox}>
                  <strong>Colour coding in affordability views:</strong> Green indicates a fare that is
                  relatively affordable compared to others in the same result set; amber is moderate; red
                  indicates the fare is relatively expensive. Colours are relative to the current result
                  set — they are not absolute benchmarks.
                </div>
              </div>
            )}

            {aboutSection==="collection" && (
              <div style={S.card}>
                <div style={S.cardTitle}>Data collection process</div>
                <p style={aboutStyle.p}>
                  Fare data is collected annually by the NineSquared research team from primary sources:
                  official transit authority websites, published fare schedules, and government transport
                  reports. Where fares are published in multiple locations, the most authoritative source
                  (typically the transit authority's own published schedule) is used.
                </p>
                <p style={aboutStyle.p}>
                  Data collection occurs around the end of each financial year (June), capturing the fare
                  structure in effect at that time. Mid-year fare changes are not typically captured unless
                  they represent a significant restructure.
                </p>
                <p style={aboutStyle.p}>
                  <strong>Unified passenger types</strong> and <strong>unified ticket types</strong> are
                  NineSquared classifications applied to harmonise the wide variety of naming conventions
                  used by different transit authorities. For example, what one system calls "Concession"
                  another may call "Pensioner", "Senior", or "Reduced" — these are mapped to a common
                  classification to enable cross-system comparison.
                </p>
                <p style={aboutStyle.p}>
                  <strong>Report fares</strong> are the subset of fare products selected by NineSquared
                  as representative benchmarks for each city — typically the most commonly used adult
                  single fare, concession fare, and pass products. These are used in the annual
                  NineSquared Fares Benchmarking Report.
                </p>
                <div style={aboutStyle.infoBox}>
                  <strong>Questions or corrections?</strong> If you identify a discrepancy or have access
                  to more current fare data, please contact the NineSquared team. We welcome feedback from
                  transport authorities with direct knowledge of their own systems.
                </div>
              </div>
            )}

            {aboutSection==="coverage" && (
              <div style={S.card}>
                <div style={S.cardTitle}>Coverage & known limitations</div>
                <p style={aboutStyle.p}>
                  The database currently covers <strong>47 countries, 116 cities, and approximately 140 transit
                  systems</strong>, with data from 2018–19 through 2025–26. Coverage is strongest in OECD member
                  countries; some lower-income countries have partial coverage due to limited availability of
                  published fare schedules in accessible formats.
                </p>
                <div style={aboutStyle.sectionHead}>Known limitations</div>
                <ul style={aboutStyle.ul}>
                  <li style={aboutStyle.li}>
                    <strong>Local currency:</strong> Fares are recorded in the local currency at the time of
                    collection. Use the PPP metric for cross-country comparisons rather than converting local
                    fares at spot rates.
                  </li>
                  <li style={aboutStyle.li}>
                    <strong>Payment media combinations:</strong> Some transit systems price differently by
                    payment method (e.g. cash vs. smartcard). Where this occurs, separate fare products are
                    recorded. Filtering by payment media returns all products that include that payment type.
                  </li>
                  <li style={aboutStyle.li}>
                    <strong>Discontinued products:</strong> Fare products no longer offered are retained with
                    historical pricing and marked as discontinued. They can be excluded using the filter.
                  </li>
                  <li style={aboutStyle.li}>
                    <strong>PPP and wage data:</strong> PPP conversion factors and wage data are updated
                    annually but may lag the most recent OECD or World Bank releases by one year.
                  </li>
                  <li style={aboutStyle.li}>
                    <strong>Mid-year changes:</strong> Fares changed outside the annual June collection
                    window may not be captured until the following year's data update.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
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
  // Payment media uses contains search since values are comma-separated combinations
  if (f.payment_media?.length === 1) p["payment_media"] = 'ilike.*' + f.payment_media[0] + '*';
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
  const [paymentMediaOptions, setPaymentMediaOptions] = useState([]);

  const [filters, setFilters] = useState({
    country:[], city:[], unified_passenger_type:[], ticket_category:[],
    peak_period:[], payment_media:[], financial_year:[], is_active_only:false,
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
  const [aboutSection, setAboutSection] = useState("methodology");

  // Compare state
  const [compareA, setCompareA]       = useState("");
  const [compareB, setCompareB]       = useState("");
  const [compareC, setCompareC]       = useState("");
  const [comparePT, setComparePT]     = useState([]);
  const [compareCat, setCompareCat]   = useState([]);
  const [compareYears, setCompareYears] = useState([]);
  const [compareProducts, setCompareProducts] = useState([]);
  const [compareLoading, setCompareLoading]   = useState(false);

  // Load filter options — fetch all pages to avoid row limits
  useEffect(() => {
    apiFetch("countries", { select:"id,name", order:"name.asc", limit:500 })
      .then(data => setCountries(data.map(d=>d.name).filter(Boolean)))
      .catch(()=>{});

    // Fetch all products in pages to get all distinct values
    const fetchAllProducts = async () => {
      let allRows = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const page = await apiFetch("products", {
          select:"unified_passenger_type,ticket_category,peak_period,payment_media",
          limit:PAGE, offset
        });
        allRows = allRows.concat(page);
        if (page.length < PAGE) break;
        offset += PAGE;
      }
      setPassengerTypes([...new Set(allRows.map(d=>d.unified_passenger_type))].filter(Boolean).sort());
      setTicketCategories([...new Set(allRows.map(d=>d.ticket_category))].filter(Boolean).sort());
      setPeakOptions([...new Set(allRows.map(d=>d.peak_period))].filter(Boolean).sort());
      // Extract individual payment media types from comma-separated values
      const pmSet = new Set();
      allRows.forEach(d => {
        if (d.payment_media) {
          d.payment_media.split(",").forEach(p => {
            const t = p.trim();
            if (t && !['na','n/a','n.a.','NA','Monday to Saturday','Sunday and National Holidays','Transfer','Pass','Basic tariff'].includes(t)) {
              pmSet.add(t);
            }
          });
        }
      });
      setPaymentMediaOptions([...pmSet].sort());
    };
    fetchAllProducts().catch(()=>{});

    Promise.all([
      apiFetch("countries", { select:"id,name", limit:500 }),
      apiFetch("cities", { select:"country_id,name", limit:1000 }),
    ]).then(([countryData, cityData]) => {
      const countryById = {};
      countryData.forEach(c => { countryById[c.id] = c.name; });
      const cityMap = {};
      cityData.forEach(c => {
        const countryName = countryById[c.country_id];
        if (countryName && c.name) {
          const k = `${countryName}||${c.name}`;
          cityMap[k] = { key:k, country:countryName, city:c.name };
        }
      });
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
    // Determine currencies in result set
    const uniqueCountries = [...new Set(prods.map(p=>p.country))].filter(Boolean);
    const currencies = [...new Set(uniqueCountries.map(c => COUNTRY_CURRENCIES[c]?.code).filter(Boolean))];
    const currencyNote = uniqueCountries.length === 1 && COUNTRY_CURRENCIES[uniqueCountries[0]]
      ? `Fares shown in ${COUNTRY_CURRENCIES[uniqueCountries[0]].name} (${COUNTRY_CURRENCIES[uniqueCountries[0]].code}). Use USD (PPP) for cross-country comparison.`
      : currencies.length > 1
        ? `Fares shown in local currencies (${currencies.join(", ")}). Use USD (PPP) metric for cross-country comparison.`
        : "Fares shown in local currency. Use USD (PPP) metric for cross-country comparison.";
    return (
      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <div style={{padding:"8px 14px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",
          fontSize:12,color:"#64748b",display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:"#94a3b8"}}>ⓘ</span> {currencyNote}
        </div>
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
                <th style={S.th}>Payment media</th>
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
                  <React.Fragment key={p.product_id}>
                  <tr
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
                    <td style={S.tdMuted}>{p.payment_media||"—"}</td>
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
                  {PRODUCT_NOTES[p.product_id] && (
                    <tr>
                      <td colSpan={99} style={{padding:"5px 14px 8px",background:"#fffbeb",
                        borderBottom:"1px solid #fde68a",fontSize:11.5,color:"#78350f"}}>
                        <span style={{fontWeight:700,marginRight:6}}>ⓘ Note:</span>
                        {PRODUCT_NOTES[p.product_id]}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <N2Logo height={28}/>
          <span style={{color:"#475569",fontSize:11,marginLeft:2}}>/ Global Fares Platform</span>
        </div>
        <div style={{color:"#475569",fontSize:12}}>
          {products.length>0 && `${products.length.toLocaleString()} products · ${rawResults.length.toLocaleString()} observations`}
        </div>
      </div>

      <div style={S.main}>
        {/* Top tabs */}
        <div style={{display:"flex",marginBottom:16}}>
          <div style={S.tabWrap}>
            {[["browse","Browse & Search"],["compare","Compare Cities"],["about","About the Data"]].map(([t,l])=>(
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
                <MultiSelect label="Payment media" options={paymentMediaOptions}
                  selected={filters.payment_media} onChange={v=>setF("payment_media",v)}/>
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
                    peak_period:[],payment_media:[],financial_year:[],is_active_only:false,report_fare_only:false,exclude_discontinued:false});
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
                <N2LogoDark height={36}/>
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
                {/* Metric selector — drives all compare views */}
                <div style={{...S.card, padding:"14px 20px", marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>
                      Compare metric:
                    </span>
                    {[
                      ["fare","Local fare","Show fares in local currency"],
                      ["ppp","USD (PPP)","Purchasing power parity — comparable across currencies"],
                      ["min_wage","Min wage (mins)","Minutes of minimum wage work to afford the fare"],
                      ["avg_wage","Avg wage (mins)","Minutes of average wage work to afford the fare"],
                    ].map(([k,l,desc])=>(
                      <button key={k}
                        title={desc}
                        onClick={()=>setTrendMetric(k)}
                        style={{
                          padding:"8px 16px", borderRadius:6, fontSize:13, fontWeight:600,
                          cursor:"pointer", border:"2px solid",
                          borderColor: trendMetric===k ? "#2563eb" : "#e2e8f0",
                          background: trendMetric===k ? "#2563eb" : "#fff",
                          color: trendMetric===k ? "#fff" : "#64748b",
                          transition:"all 0.1s",
                        }}>{l}</button>
                    ))}
                    <span style={{fontSize:11,color:"#94a3b8",marginLeft:4}}>
                      {trendMetric==="fare" && "Local currency — not directly comparable across countries"}
                      {trendMetric==="ppp" && "PPP-adjusted USD — comparable across all cities"}
                      {trendMetric==="min_wage" && "How many minutes of minimum wage work buys this fare"}
                      {trendMetric==="avg_wage" && "How many minutes of average wage work buys this fare"}
                    </span>
                  </div>
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={S.tabWrap}>
                    {[["table","Year-by-year table"],["trends","Trend chart"],["econ","Latest affordability"]].map(([t,l])=>(
                      <button key={t} style={S.tab(compareTab===t)} onClick={()=>setCompareTab(t)}>{l}</button>
                    ))}
                  </div>
                  <button style={S.btnExport} onClick={()=>exportCSV(compareProducts)}>⬇ Export CSV</button>
                </div>

                {/* Year-by-year table — shows selected metric across all years */}
                {compareTab==="table" && (() => {
                  const metricKey = { fare:"fare", ppp:"ppp", min_wage:"min_wage_mins", avg_wage:"avg_wage_mins" }[trendMetric];
                  const metricFmt = (v) => {
                    if (v==null) return null;
                    if (trendMetric==="fare") return v<1000 ? v.toFixed(2) : v.toLocaleString();
                    if (trendMetric==="ppp") return v.toFixed(4);
                    return v.toFixed(1);
                  };
                  const activeYears = YEARS.filter(y => compareProducts.some(p => p.observations[y]?.[metricKey] != null));
                  // Colour code values within each year column
                  const yearVals = {};
                  activeYears.forEach(y => {
                    yearVals[y] = compareProducts.map(p=>p.observations[y]?.[metricKey]).filter(v=>v!=null);
                  });
                  return (
                    <div style={{...S.card, padding:0, overflow:"hidden"}}>
                      <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#64748b"}}>
                        Showing <strong>{({fare:"local fare",ppp:"USD (PPP)",min_wage:"minimum wage minutes",avg_wage:"average wage minutes"})[trendMetric]}</strong> by year.
                        {trendMetric!=="fare" && " Colour: green = most affordable, red = least affordable within each year."}
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={S.table}>
                          <thead><tr>
                            <th style={S.th}>City</th>
                            <th style={S.th}>System</th>
                            <th style={S.th}>Category</th>
                            <th style={S.th}>Ticket type</th>
                            <th style={S.th}>Passenger</th>
                            <th style={S.th}>Zone</th>
                            {activeYears.map(y=><th key={y} style={{...S.th,textAlign:"right"}}>{YEAR_LABELS[y]}</th>)}
                            <th style={S.th}>Trend</th>
                          </tr></thead>
                          <tbody>
                            {compareProducts.map(p => {
                              const sparkPoints = {};
                              activeYears.forEach(y => {
                                const v = p.observations[y]?.[metricKey];
                                if (v!=null) sparkPoints[y]=v;
                              });
                              return (
                                <tr key={p.product_id}
                                  style={{opacity:p.product_discontinued?0.65:1}}
                                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                                  <td style={{...S.td,fontWeight:600}}>{p.city}</td>
                                  <td style={S.tdMuted}>{p.transit_system}</td>
                                  <td style={S.td}><CategoryBadge cat={p.ticket_category}/></td>
                                  <td style={S.td}>
                                    {p.unified_ticket_type}
                                    {p.product_discontinued && <DiscontinuedBadge/>}
                                  </td>
                                  <td style={S.tdMuted}>{p.unified_passenger_type}</td>
                                  <td style={S.tdMuted}>{p.zone||"—"}</td>
                                  {activeYears.map(y => {
                                    const v = p.observations[y]?.[metricKey];
                                    const colour = trendMetric!=="fare" ? S.econColour(v, yearVals[y]) : "#374151";
                                    return (
                                      <td key={y} style={{...S.tdNum, color:colour, fontWeight: v!=null&&trendMetric!=="fare"?600:400}}>
                                        {v!=null ? metricFmt(v) : <span style={{color:"#e2e8f0"}}>—</span>}
                                      </td>
                                    );
                                  })}
                                  <td style={{...S.td,paddingRight:12}}><Sparkline points={sparkPoints}/></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {compareProducts.length>=500&&(
                        <div style={{padding:"9px 14px",background:"#fffbeb",borderTop:"1px solid #fde68a",fontSize:12,color:"#92400e"}}>
                          Showing first 500 results — refine your filters for a more specific view.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Trend chart */}
                {compareTab==="trends" && (
                  <div style={S.card}>
                    <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>
                      Showing <strong>{({fare:"local fare",ppp:"USD (PPP)",min_wage:"minimum wage minutes",avg_wage:"average wage minutes"})[trendMetric]}</strong> over time.
                      Use the metric selector above to switch. Showing up to 8 products.
                    </div>
                    <TrendChart
                      products={compareProducts.slice(0,8).map(p=>({
                        ...p, label:`${p.city} — ${p.unified_ticket_type} (${p.unified_passenger_type})`
                      }))}
                      metric={trendMetric}/>
                  </div>
                )}

                {/* Latest affordability snapshot */}
                {compareTab==="econ" && <AffordabilityTable prods={compareProducts}/>}
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

// ── About page styles ─────────────────────────────────────────────────────────
const aboutStyle = {
  p: { fontSize:14, color:"#374151", lineHeight:1.8, marginBottom:14, marginTop:0 },
  infoBox: { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8,
    padding:"12px 16px", fontSize:13, color:"#1e40af", lineHeight:1.7, marginTop:16 },
  metricCard: { borderLeft:"3px solid #2563eb", paddingLeft:14, marginBottom:18 },
  metricTitle: { fontSize:13, fontWeight:700, color:"#0f172a", marginBottom:6 },
  metricDesc: { fontSize:13, color:"#4b5563", lineHeight:1.75, margin:0 },
  sectionHead: { fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase",
    letterSpacing:"0.06em", marginBottom:12, marginTop:20 },
  ul: { paddingLeft:0, listStyle:"none", margin:0 },
  li: { fontSize:13, color:"#374151", lineHeight:1.75, marginBottom:12, paddingLeft:0 },
};
