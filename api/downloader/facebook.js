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

const scraper = new FBDown();

// --- API Route ---

router.get('/', async (req, res) => {
  // Parameter 'text' dihapus, diganti menjadi 'url'
  const url = req.query.url; 

  if (!url) {
    return res.status(400).json({ 
      status: false, 
      error: "Mana link-nya? Masukkan parameter 'url'." 
    });
  }

  try {
    const result = await scraper.getVideo(url);
    
    // Validasi hasil
    if (!result || result.error) {
      return res.status(404).json({
        status: false,
        error: result.error || "Data tidak ditemukan."
      });
    }

    const data = {
      status: true,
      result: result // Output scraper langsung masuk ke sini
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
