const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

/**
 * Class FBDown Scraper
 */
class FBDown {
  constructor() {
    this.baseURL = 'https://y2date.com';
    this.headers = {
      'accept': '*/*',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'origin': 'https://y2date.com',
      'referer': 'https://y2date.com/facebook-video-downloader/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded'
    };
  }

  async getVideo(url) {
    // Catatan: Token ini didapat dari source code y2date
    const token = '3ecace38ab99d0aa20f9560f0c9703787d4957d34d2a2d42bfe5b447f397e03c';
    
    const payload = qs.stringify({
      url: url,
      token: token
    });

    const response = await axios.post(`${this.baseURL}/wp-json/aio-dl/video-data/`, payload, {
      headers: this.headers
    });

    return response.data;
  }
}

// Inisialisasi Scraper
const scraper = new FBDown();

// --- API Route ---

router.get('/', async (req, res) => {
  const text = req.query.text; // URL Facebook: https://example.com/api/fb?text=URL_FB

  if (!text) {
    return res.status(400).json({ 
      status: false, 
      error: "Masukkan parameter 'text' berisi link video Facebook atau Reels." 
    });
  }

  try {
    const result = await scraper.getVideo(text);
    
    // Validasi jika data kosong atau error dari server scraper
    if (!result || result.error) {
      return res.status(404).json({
        status: false,
        error: result.error || "Gagal mendapatkan data video. Pastikan link publik."
      });
    }

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
