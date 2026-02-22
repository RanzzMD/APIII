const express = require('express');
const router = express.Router();
import { ytdl } from './path-to-your-scraper';

router.get('/ytmp4', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ 
      status: false, 
      error: "Missing 'url' parameter" 
    });
  }

  try {
    const data = await ytdl.download(url);

    if (!data.success) {
      return res.status(400).json({ status: false, message: data.message });
    }

    // Cari format video mp4
    const videoFiles = data.results.formats.filter(f => f.type === 'video' && f.format === 'mp4');
    
    // Ambil kualitas tertinggi (misal: 1080p atau 720p)
    const result = videoFiles[0]; 

    return res.status(200).json({
      status: true,
      result: {
        title: data.results.info.title,
        quality: result.quality,
        metadata: data.results.info,
        download: result.url,
        filename: result.filename
      }
    });

  } catch (e) {
    return res.status(500).json({ 
      status: false, 
      error: e.message 
    });
  }
});

module.exports = router;
