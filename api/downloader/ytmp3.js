const express = require('express');
const router = express.Router();
const axios = require('axios');

// --- SCRAPER INTERNAL ---
const ytdl = {
  api: {
    base: 'https://embed.dlsrv.online',
    jina: 'https://r.jina.ai/',
    endpoint: { info: '/api/info', downloadMp3: '/api/download/mp3', full: '/v1/full' }
  },
  _extractId: (url) => {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : url.length === 11 ? url : null;
  },
  _req: (method, url, data, head = {}) => axios({ method, url, headers: { 'Content-Type': 'application/json', ...head }, data }).then(r => r.data),
  
  _getMp3: async function(videoId) {
    try {
      const url = `${this.api.jina}${this.api.base}${this.api.endpoint.full}?videoId=${videoId}`;
      const data = await this._req('GET', url, null);
      const rows = data.match(/\|\s*(\d+kbps)\s*\|\s*mp3\s*\|[^|]+\|/g) || [];
      const res = await Promise.all(rows.map(async row => {
        const q = row.match(/(\d+kbps)/)?.[1];
        const dl = await this._req('POST', `${this.api.base}${this.api.endpoint.downloadMp3}`, { videoId, format: 'mp3', quality: q.replace('kbps', '') });
        return dl.status === 'tunnel' ? { quality: q, url: dl.url, filename: dl.filename } : null;
      }));
      return res.filter(Boolean);
    } catch { return []; }
  },

  download: async function(url) {
    const videoId = this._extractId(url);
    if (!videoId) return null;
    try {
      const info = await this._req('POST', `${this.api.base}${this.api.endpoint.info}`, { videoId });
      const mp3s = await this._getMp3(videoId);
      return { info: info.info, mp3: mp3s };
    } catch { return null; }
  }
};

// --- ROUTE API ---
router.get('/', async (req, res) => {
  const text = req.query.text; // URL YouTube
  if (!text) return res.status(400).json({ error: "Mana link YouTube-nya?" });

  try {
    const data = await ytdl.download(text);
    if (!data) return res.status(404).json({ error: "Video tidak ditemukan" });

    // Ambil kualitas tertinggi (biasanya 320kbps)
    const result = data.mp3[data.mp3.length - 1];

    return res.json({
      status: true,
      result: {
        title: data.info.title,
        quality: result.quality,
        download: result.url,
        filename: result.filename
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
