const express = require('express');
const router = express.Router();
import { igDL } from './path-to-your-ig-scraper'; // Sesuaikan path-nya

router.get('/igdl', async (req, res) => {
  const url = req.query.url; // Contoh: /api/igdl?url=https://www.instagram.com/reel/...

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
        message: data.error || "Failed to fetch Instagram media" 
      });
    }

    // Jika user memasukkan link profil, scraper akan mengembalikan type: 'profile-picture'
    // Jika link post/reel, akan mengembalikan list video/photo
    return res.status(200).json({
      status: true,
      author: "RANZZ",
      count: data.count,
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
