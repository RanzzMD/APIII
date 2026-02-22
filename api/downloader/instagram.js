const express = require('express');
const router = express.Router();
const axios = require('axios');

// --- SCRAPER START ---
const igDL = {
  api: {
    base: "https://snapinsta.to",
    endpoint: {
      verify: "/api/userverify",
      download: "/api/ajaxSearch",
    },
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; vivo 1901) AppleWebKit/537.36 Chrome/143.0.7499.192 Mobile Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  _req: async (url, data) => {
    const res = await axios.post(url, new URLSearchParams(data), { headers: igDL.headers });
    return res.data;
  },
  _extract: (data) => {
    const match = data.match(/decodeURIComponent\(r\)}\(\"([^\"]+)\"/);
    return match ? match[1] : null;
  },
  _decrypt: (h, n = 'abcdefghi', e = 2, t = 1) => {
    const B = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
    const toDec = (s, b) => [...s].reverse().reduce((a, c, i) => a + parseInt(c) * b ** i, 0);
    const fromDec = (n, b) => n ? [...Array(32)].reduce((a, _) => (n ? (a = B[n % b] + a, n = n / b | 0) : a, a), '') : '0';
    let r = '', i = 0;
    while (i < h.length) {
      let s = '';
      while (h[i] !== n[e]) s += h[i++];
      i++;
      for (let j = 0; j < n.length; j++) s = s.split(n[j]).join(j);
      r += String.fromCharCode(parseInt(fromDec(toDec(s, e), 10)) - t);
    }
    return decodeURIComponent(r);
  },
  _extractRealUrl: (tokenUrl) => {
    try {
      const urlObj = new URL(tokenUrl);
      const token = urlObj.searchParams.get('token');
      if (!token) return tokenUrl;
      const parts = token.split('.');
      if (parts.length < 2) return tokenUrl;
      const payload = parts[1];
      const padding = 4 - (payload.length % 4);
      const paddedPayload = padding !== 4 ? payload + '='.repeat(padding) : payload;
      const decoded = JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf-8'));
      return decoded.url || tokenUrl;
    } catch (e) { return tokenUrl; }
  },
  _parse: (html) => {
    const unescaped = html.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const results = [];
    const itemPattern = /<div class="download-items">(.*?)<\/div>\s*<\/div>\s*(?:<\/div>)?/gs;
    const items = [...unescaped.matchAll(itemPattern)];
    for (const itemMatch of items) {
      const itemHtml = itemMatch[1];
      const hasVideoIcon = itemHtml.includes('icon-dlvideo');
      const hasImageIcon = itemHtml.includes('icon-dlimage');
      if (!hasVideoIcon && !hasImageIcon) continue;
      const isAvatar = itemHtml.includes('title="Download Avatar"') || itemHtml.includes('>Unduh Avatar<');
      const type = isAvatar ? 'profile-picture' : (hasVideoIcon ? 'video' : 'photo');
      const thumbMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]*alt="SnapInsta"/i);
      const thumbnail = thumbMatch ? igDL._extractRealUrl(thumbMatch[1]) : null;
      let urlData;
      if (hasVideoIcon) {
        const dlMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*abutton[^"]*"/i);
        urlData = dlMatch ? igDL._extractRealUrl(dlMatch[1]) : null;
      } else {
        urlData = [];
        const optionPattern = /<option[^>]+value="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
        const options = [...itemHtml.matchAll(optionPattern)];
        if (options.length > 0) {
          for (const opt of options) {
            urlData.push({ resolution: opt[2].trim(), url: igDL._extractRealUrl(opt[1]) });
          }
        } else {
          const dlMatch = itemHtml.match(/<a[^>]+href="([^"]+)"[^>]*title="[^"]*"/i);
          if (dlMatch) urlData.push({ resolution: 'default', url: igDL._extractRealUrl(dlMatch[1]) });
        }
      }
      if (thumbnail && urlData && (Array.isArray(urlData) ? urlData.length > 0 : urlData)) {
        results.push({ type, thumbnail, url: urlData });
      }
    }
    return results;
  },
  download: async function(url) {
    try {
      const verifyRes = await this._req(this.api.base + this.api.endpoint.verify, { url });
      if (!verifyRes.success) throw new Error(`Verify failed`);
      const searchRes = await this._req(this.api.base + this.api.endpoint.download, {
        q: url, t: 'media', v: 'v2', lang: 'id', cftoken: verifyRes.token
      });
      if (searchRes.status !== 'ok') throw new Error(`Search failed`);
      let html = searchRes.v === 'v1' ? searchRes.data : this._decrypt(this._extract(searchRes.data));
      const results = this._parse(html);
      return { success: true, count: results.length, results };
    } catch (e) { return { success: false, error: e.message }; }
  }
};
// --- SCRAPER END ---

// --- ROUTER API ---
router.get('/', async (req, res) => {
  const url = req.query.url; // Penggunaan: /igdl?url=...

  if (!url) {
    return res.status(400).json({ 
      status: false, 
      error: "Missing 'url' parameter" 
    });
  }

  try {
    const data = await igDL.download(url);

    if (!data.success) {
      return res.status(400).json({ 
        status: false, 
        message: data.error 
      });
    }

    // Mengembalikan hasil sesuai struktur yang kamu inginkan
    return res.json({
      status: true,
      creator: "Ranzz aja",
      result: data.results
    });

  } catch (e) {
    return res.status(500).json({ 
      status: false, 
      error: e.message 
    });
  }
});

module.exports = router;
