const express = require('express');
const router = express.Router();

/**
 * Fungsi Scraper TikTok (Lovetik API)
 * @param {string} url - URL Video atau Slide TikTok
 */
async function tiktok(url) {
  const res = await fetch('https://lovetik.com/api/ajax/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'origin': 'https://lovetik.com',
      'referer': 'https://lovetik.com/id',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'x-requested-with': 'XMLHttpRequest',
    },
    body: `query=${encodeURIComponent(url)}`,
  });

  const data = await res.json();
  
  if (data.status !== 'ok') throw new Error('Gagal mengambil data dari TikTok');

  const isSlide = Array.isArray(data.images) && data.images.length > 0;
  const cleanText = str => str.replace(/<[^>]+>/g, '').replace(/[^\w\s]/g, '').trim();
  
  const audio = data.links.find(l => l.ft == 3 && l.a);
  const downloads = data.links
    .filter(l => l.ft != 3 && l.a)
    .map(l => ({
      quality: l.s.replace(/\[.*?\]/g, '').trim() || cleanText(l.t),
      url: l.a,
    }));

  return {
    type: isSlide ? 'slide' : 'video',
    desc: data.desc,
    author: {
      username: data.author,
      name: data.author_name,
      avatar: data.author_a,
    },
    cover: data.cover,
    ...(isSlide ? { images: data.images } : { downloads }),
    audio: audio ? audio.a : null,
  };
}

// --- API Route ---

router.get('/', async (req, res) => {
  const text = req.query.text; // Contoh: https://example.com/api?text=URL_TIKTOK

  if (!text) {
    return res.status(400).json({ 
      status: false, 
      error: "Mana URL-nya? Masukkan parameter 'text' berisi link TikTok." 
    });
  }

  try {
    const result = await tiktok(text);
    
    // Mengikuti struktur data yang diminta
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
