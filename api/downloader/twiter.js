const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fungsi Scraper Twitter (ssstwitter)
 * @param {string} tweetUrl - URL Tweet dari X/Twitter
 */
async function ssstwitterDownloader(tweetUrl) {
  const client = axios.create({
    headers: {
      "user-agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    },
    withCredentials: true,
  });

  // Step 1: Ambil token awal (tt & ts)
  const res = await client.get("https://ssstwitter.com/");
  const $ = cheerio.load(res.data);

  const includeVals = $("form.hide-after-request").attr("include-vals");
  if (!includeVals) throw new Error("Gagal mengambil konfigurasi 'include-vals'");

  const tt = includeVals.match(/tt:'([^']+)'/)?.[1];
  const ts = includeVals.match(/ts:(\d+)/)?.[1];

  if (!tt || !ts) throw new Error("Gagal mengekstrak token tt/ts");

  // Step 2: Kirim permintaan POST untuk fetch media
  const postRes = await client.post(
    "https://ssstwitter.com/",
    new URLSearchParams({
      id: tweetUrl,
      locale: "en",
      tt,
      ts,
      source: "form",
    }).toString(),
    {
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "hx-current-url": "https://ssstwitter.com/",
        "hx-request": "true",
        "hx-target": "target",
        origin: "https://ssstwitter.com",
        referer: "https://ssstwitter.com/",
      },
    }
  );

  const $$ = cheerio.load(postRes.data);
  const links = [];

  // Step 3: Parsing link download
  $$("a.download-btn").each((_, el) => {
    const quality = $$(el).text().trim().replace(/\s+/g, " ");
    const url = $$(el).attr("data-directurl") || $$(el).attr("href");

    if (url) {
      links.push({ quality, url });
    }
  });

  const jwtToken = $$("input[name='url0']").attr("value");
  let parsedData = null;

  if (jwtToken) {
    try {
      const decoded = Buffer.from(jwtToken, "base64").toString("utf8");
      parsedData = JSON.parse(decoded);
    } catch {
      parsedData = null;
    }
  }

  return {
    desc: $$("p.maintext").text().trim() || null,
    links,
    metadata: {
      token: jwtToken || null,
      parsed: parsedData
    }
  };
}

// --- API Route ---

router.get('/', async (req, res) => {
  const text = req.query.text; // URL: https://example.com/api/twitter?text=LINK_TWEET

  if (!text) {
    return res.status(400).json({ 
      status: false, 
      error: "Masukkan parameter 'text' berisi link Twitter/X." 
    });
  }

  try {
    const result = await ssstwitterDownloader(text);
    
    // Struktur data sesuai permintaan
    const data = {
      status: true,
      result: result
    };

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ 
      status: false, 
      error: e.message 
    });
  }
});

module.exports = router;
