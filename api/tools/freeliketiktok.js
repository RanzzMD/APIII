const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * SCRAPER LOGIC - Free TikTok Likes
 * Website: leofame.com
 * Author: Ranzz
 */

async function freeTikTokLikeScraper(url) {
    try {
        // Step 1: Kunjungi halaman untuk mendapatkan Token & Cookies
        const page = await axios.get('https://leofame.com/free-tiktok-likes', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
            }
        });
        
        const html = page.data;
        const tokenMatch = html.match(/var\s+token\s*=\s*'([^']+)'/);
        
        if (!tokenMatch) throw new Error("Gagal mengambil session token. Website mungkin sedang maintenance.");
        
        const token = tokenMatch[1];
        const cookies = page.headers['set-cookie']
            ? page.headers['set-cookie'].map(v => v.split(';')[0]).join('; ')
            : '';

        // Step 2: Kirim Request POST ke API Internal mereka
        const res = await axios.post('https://leofame.com/free-tiktok-likes?api=1',
            new URLSearchParams({
                token,
                timezone_offset: 'Asia/Jakarta',
                free_link: url
            }).toString(),
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://leofame.com',
                    'Referer': 'https://leofame.com/free-tiktok-likes',
                    'Cookie': cookies
                }
            }
        );

        return res.data;
    } catch (error) {
        throw new Error("TikTok Like Error: " + (error.response?.data?.message || error.message));
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/tiktok-like?text=URL_VIDEO_TIKTOK
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // URL Video TikTok dari parameter ?text=

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "Masukkan parameter 'text' berisi URL video TikTok." 
        });
    }

    try {
        const result = await freeTikTokLikeScraper(text);
        
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });

    } catch (e) {
        console.error("TikTok Like API Error:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
