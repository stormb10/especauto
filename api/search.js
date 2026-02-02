// Vercel Serverless Function: /api/search
// Uses Brave Search API + pulls og:image for photo-forward tiles
// Keeps API key private (stored in Vercel env var)

import * as cheerio from "cheerio";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function inferYear(text) {
  const m = String(text || "").match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  if (!m) return null;
  const y = Number(m[1]);
  if (y < 1950 || y > new Date().getFullYear() + 1) return null;
  return y;
}

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function eligibilityFromYear(year, soonMonths) {
  const today = new Date();

  if (!year) {
    return {
      status: "uncertain",
      confidence: "low",
      reason: "Year not found in listing title/snippet. Needs build/registration date.",
      eligibleOn: null
    };
  }

  const assumedBuild = new Date(year, 0, 1);
  const eligibleDate = new Date(assumedBuild.getFullYear() + 25, assumedBuild.getMonth(), assumedBuild.getDate());

  if (eligibleDate <= today) {
    return {
      status: "eligible_now",
      confidence: "medium",
      reason: `Eligible under the 25-year rule based on inferred year (${year}). Confirm build month for high confidence.`,
      eligibleOn: null
    };
  }

  const m = monthsBetween(today, eligibleDate);
  if (m <= soonMonths) {
    return {
      status: "eligible_soon",
      confidence: "medium",
      reason: `Likely eligible on ${eligibleDate.toLocaleString("en-US", { month: "short", year: "numeric" })} (25-year rule) based on inferred year (${year}).`,
      eligibleOn: eligibleDate.toISOString().slice(0, 10)
    };
  }

  return {
    status: "not_eligible",
    confidence: "medium",
    reason: `Not yet eligible under the 25-year rule based on inferred year (${year}).`,
    eligibleOn: eligibleDate.toISOString().slice(0, 10)
  };
}

function shouldInclude(status, filter) {
  if (filter === "all") return status !== "not_eligible";
  if (filter === "now") return status === "eligible_now";
  if (filter === "soon") return status === "eligible_now" || status === "eligible_soon";
  if (filter === "uncertain") return status === "eligible_now" || status === "eligible_soon" || status === "uncertain";
  return false;
}

// lightweight HTML fetch to pull preview image tags
async function fetchPreviewImage(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ESpecBot/1.0; +https://www.especauto.com/)",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    let img =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      null;

    if (img && img.startsWith("/")) {
      const u = new URL(url);
      img = `${u.origin}${img}`;
    }
    return img;
  } catch {
    return null;
  }
}

// crude price extraction (optional, best-effort only)
function inferPrice(text) {
  const t = String(text || "");
  // looks for "€12,345" or "EUR 12.345" etc
  const m = t.match(/(?:€|EUR)\s?([0-9][0-9\.,\s]{2,})/i);
  if (!m) return null;
  const raw = m[1].replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  try {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing BRAVE_SEARCH_API_KEY in Vercel env vars." });
    }

    const q = String(req.query.q || "").trim();
    const eligible = String(req.query.eligible || "now");
    const soonMonths = clamp(Number(req.query.soonMonths || 12), 1, 36);
    const limit = clamp(Number(req.query.limit || 24), 1, 30);

    if (!q) return res.status(400).json({ error: "Missing q" });

// --- Source + listing URL hints ---
// We are specifically trying to pull *individual listing pages*.
const sourceQuery =
  `site:mobile.de OR site:autoscout24 OR site:marktplaats.nl OR site:leboncoin.fr OR site:subito.it OR site:autotrader.co.uk`;

// Listing page URL patterns / words that tend to appear on real ads
const listingUrlHints = `("details.html?id=" OR "fahrzeuge/details" OR "Anzeige" OR "ad id" OR "ref:" OR "immatriculation" OR "kenteken")`;

// Pricing/mileage hints also help avoid brand pages
const listingValueHints = `("€" OR "EUR" OR "km" OR "miles")`;

// Exclude known directory hosts/pages
const excludeDirs = `-suchen.mobile.de -/marke/ -/modell/ -/auto/`;

// Final query
const query = `${q} ${listingUrlHints} ${listingValueHints} ${sourceQuery} ${excludeDirs}`;



    const braveUrl = new URL("https://api.search.brave.com/res/v1/web/search");
    braveUrl.searchParams.set("q", query);
    braveUrl.searchParams.set("count", String(Math.min(limit, 20)));

    const braveRes = await fetch(braveUrl.toString(), {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": apiKey
      }
    });

    if (!braveRes.ok) {
      const txt = await braveRes.text().catch(() => "");
      return res.status(502).json({ error: "Brave API error", status: braveRes.status, details: txt.slice(0, 500) });
    }

    const data = await braveRes.json();
    const resultsRaw = (data?.web?.results || []);

    // Build output
    const out = [];

    for (const r of resultsRaw) {
      const title = r.title || "";
      const url = r.url || "";
      const desc = r.description || "";

      if (!url) continue;
     
const domain = new URL(url).hostname.replace(/^www\./, "");

// mobile.de + suchen.mobile.de:
// Keep ONLY actual vehicle detail pages, drop category/search pages.
if (domain === "mobile.de" || domain === "suchen.mobile.de") {
  const isListing =
    url.includes("details.html") ||
    url.includes("fahrzeuge/details") ||
    url.includes("id=");

  if (!isListing) continue;
}


// leboncoin.fr: drop category pages
if (domain === "leboncoin.fr") {
  if (url.includes("/ck/")) continue;
}


      const year = inferYear(title + " " + desc);
      const elig = eligibilityFromYear(year, soonMonths);
      if (!shouldInclude(elig.status, eligible)) continue;

      const image = await fetchPreviewImage(url);

      out.push({
        id: Buffer.from(url).toString("base64url").slice(0, 22),
        title_raw: title,
        title_normalized: title,
        source_url: url,
        source_domain: new URL(url).hostname.replace(/^www\./, ""),
        snippet: desc,
        image_url: image,
        inferred_year: year,

        // optional best-effort fields
        price_value: inferPrice(title + " " + desc),
        price_currency: "EUR",
        location_raw: null,

        eligibility_status: elig.status,
        eligible_on: elig.eligibleOn,
        confidence: elig.confidence,
        eligibility_reason: elig.reason
      });
    }

 return res.status(200).json({
  query: q,
  filters: { eligible, soonMonths, limit },
  results: out,
  debug: {
    braveCount: resultsRaw.length,
    braveSample: resultsRaw.slice(0, 3).map(r => ({ title: r.title, url: r.url }))
  },
  fetched_at: new Date().toISOString()
});

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

