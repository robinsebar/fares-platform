# NineSquared Fares Platform

A web interface for querying the NineSquared global fares database — 5,100 fare records across 47 countries, 94 cities, and 5 years of pricing history.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and paste your Supabase anon key:
```
VITE_SUPABASE_URL=https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:5173

## Deploy to Vercel (free)

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```
When prompted, add your environment variables.

### Option B — GitHub + Vercel dashboard

1. Push this folder to a GitHub repository
2. Go to vercel.com → New Project → Import your repo
3. In the Environment Variables section add:
   - `VITE_SUPABASE_URL` = `https://dlvjrgubjpslhvwdvtfr.supabase.co/rest/v1`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click Deploy

Vercel will give you a public URL like `https://fares-platform.vercel.app`.

## Features

- Filter by country, city, passenger type, ticket category
- Browse all five years of fare prices side by side
- Sparkline trend indicators per fare record
- Price trend chart across 2018–2023
- CSV export of current results

## Security

- The `anon` key is safe to use in a public frontend — it only has read access
- Row Level Security is enabled on the database
- Never use the `service_role` key in a frontend application
