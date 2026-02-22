const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');

/**
 * SCRAPER LOGIC - Remove Background (Fix 500)
 * Author: Ranzz
 */
async function removeBgScraper(imageUrl) {
    try {
        // 1. Ambil gambar dari URL sebagai Buffer
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' } // Agar tidak di-block saat ambil source
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        // 2. Siapkan Form Data dengan spesifikasi filename yang jelas
        const form = new FormData();
        form.append("file", imageBuffer, {
            filename: 'image.png',
            contentType: 'image/png', // Penting agar API tidak bingung
        });

        // 3. Kirim ke API Predict
        const upload = await axios.post("https://removebg.one/api/predict/v2", form, {
            headers: {
                ...form.getHeaders(),
                "accept": "application/json, text/plain, */*",
                "product": "REMOVEBG",
                "origin": "https://removebg.one",
                "referer": "https://removebg.one/upload?trigger=yes",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });

        const resultUrl = upload.data?.data?.cutoutUrl;
        
        // Proteksi jika data tidak ditemukan (Penyebab utama 500)
        if (!resultUrl) {
            console.log("Response API:", upload.data); // Debug di console
            throw new Error("Gagal: API tidak mengembalikan URL gambar.");
        }

        // 4. Ambil hasil gambarnya
        const finalImage = await axios.get(resultUrl, { responseType: 'arraybuffer' });
        
        return {
            buffer: Buffer.from(finalImage.data, 'binary'),
            mimetype: finalImage.headers['content-type'] || 'image/png'
        };

    } catch (error) {
        // Berikan info detail error di log server
        const msg = error.response?.data?.message || error.message;
        throw new Error(msg);
    }
}

/**
 * ENDPOINT API
 */
router.get('/', async (req, res) => {
    const text = req.query.text;

    if (!text) return res.status(400).json({ 
        creator: "Ranzz", 
        error: "Masukkan parameter 'text' berisi URL gambar." 
    });

    try {
        const result = await removeBgScraper(text);

        res.set('Content-Type', result.mimetype);
        res.send(result.buffer);

    } catch (e) {
        // Jika gagal, kirim JSON error, bukan crash 500
        console.error("ERROR LOG:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: "Internal Server Error: " + e.message 
        });
    }
});

module.exports = router;
