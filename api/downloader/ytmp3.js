const express = require('express');
const router = express.Router();
import { ytdl } from './path-to-your-scraper'; // Sesuaikan path scraper kamu

router.get('/ytmp3', async (req, res) => {
  const url = req.query.url; // Format: /api/ytmp3?url=https://youtube.com/...

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

    // Cari format mp3 dengan kualitas tertinggi (biasanya 320kbps atau di akhir array)
    const audioFiles = data.results.formats.filter(f => f.format === 'mp3');
    const result = audioFiles.length > 0 ? audioFiles[audioFiles.length - 1] : data.results.formats.find(f => f.type === 'audio');

    return res.status(200).json({
      status: true,
      result: {
        title: data.results.info.title,
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
