const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * SCRAPER LOGIC - Y2Mate
 * Diintegrasikan langsung dalam satu file
 * Author: Ranzz
 */
async function y2mateScraper(url) {
    try {
        // Step 1: Ambil Sanity Key
        const sanity = await axios.get("https://cnv.cx/v2/sanity/key", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 EdgA/144.0.0.0",
                "Content-Type": "application/json",
                "Origin": "https://frame.y2meta-uk.com",
                "Referer": "https://frame.y2meta-uk.com/"
            }
        });

        const key = sanity.data.key;
        if (!key) throw new Error("Gagal mengambil sanity key");

        // Step 2: Request Conversion
        const body = new URLSearchParams({
            link: url,
            format: "mp3",
            audioBitrate: "128",
            videoQuality: "720",
            filenameStyle: "pretty",
            vCodec: "h264"
        }).toString();

        const res = await axios.post("https://cnv.cx/v2/converter", body, {
            headers: {
                "key": key,
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 EdgA/144.0.0.0",
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://frame.y2meta-uk.com",
                "Referer": "https://frame.y2meta-uk.com/"
            }
        });

        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message);
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/y2mate?text=URL_YOUTUBE
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // Mengambil URL dari parameter ?text=
    
    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "Masukkan parameter 'text' berupa URL YouTube" 
        });
    }

    // Validasi sederhana apakah itu URL
    if (!text.includes("youtu")) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "URL tidak valid. Pastikan itu link YouTube" 
        });
    }

    try {
        const result = await y2mateScraper(text);
        
        // Response Sukses
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });

    } catch (e) {
        // Menghindari HTTP 500 mentah, memberikan pesan error yang jelas
        console.error("Scraper Error:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
