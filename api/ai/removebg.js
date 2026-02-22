const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');

/**
 * SCRAPER LOGIC - Remove Background
 * Mengambil gambar dari URL, menghapus background, dan mengembalikan Buffer
 * Author: Ranzz
 */
async function removeBgScraper(imageUrl) {
    try {
        // 1. Ambil gambar dari URL input terlebih dahulu untuk dijadikan buffer
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        // 2. Siapkan Form Data untuk API RemoveBG
        const form = new FormData();
        form.append("file", imageBuffer, {
            filename: 'image.png',
            contentType: 'image/png',
        });

        // 3. Kirim ke API RemoveBG
        const upload = await axios.post("https://removebg.one/api/predict/v2", form, {
            headers: {
                ...form.getHeaders(),
                "accept": "application/json, text/plain, */*",
                "locale": "en-US",
                "platform": "PC",
                "product": "REMOVEBG",
                "origin": "https://removebg.one",
                "referer": "https://removebg.one/upload?trigger=yes",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const resultUrl = upload.data?.data?.cutoutUrl;
        if (!resultUrl) throw new Error("Gagal mendapatkan URL hasil cutout.");

        // 4. Ambil hasil gambar akhirnya sebagai buffer
        const finalImage = await axios.get(resultUrl, { responseType: 'arraybuffer' });
        
        return {
            buffer: Buffer.from(finalImage.data, 'binary'),
            mimetype: finalImage.headers['content-type'] || 'image/png'
        };

    } catch (error) {
        throw new Error("RemoveBG Error: " + (error.response?.data?.message || error.message));
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/removebg?text=URL_GAMBAR
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // URL Gambar yang akan dihapus BG-nya

    if (!text) {
        return res.status(400).json({ 
            creator: "Ranzz",
            error: "Missing 'text' parameter (URL Gambar)" 
        });
    }

    try {
        const result = await removeBgScraper(text);

        // Mengirimkan hasil langsung sebagai file gambar
        res.writeHead(200, {
            'Content-Type': result.mimetype,
            'Content-Length': result.buffer.length,
            'x-creator': 'Ranzz'
        });
        
        res.end(result.buffer);

    } catch (e) {
        console.error("API ERROR:", e.message);
        return res.status(500).json({ 
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
