const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * SCRAPER LOGIC - All In One Downloader
 * Support: Instagram, FB, TikTok, etc. (Multi-Platform)
 * Author: Ranzz
 */

async function AIODownloaderScraper(url) {
    try {
        // Step 1: Ambil Token dan Path dari Halaman Utama
        const res = await axios.get("https://allinonedownloader.com", {
            headers: { "user-agent": "Mozilla/5.0" }
        });
        
        const $ = cheerio.load(res.data);
        const token = $("#token").val();
        const pos = $("#scc").val();
        
        if (!token || !pos) throw new Error("Gagal mengambil token halaman. Website mungkin berubah.");

        // Step 2: Persiapan Enkripsi AES-256-CBC
        const key = Buffer.from(token, "hex");
        const iv = Buffer.from("afc4e290725a3bf0ac4d3ff826c43c10", "hex");

        let data = Buffer.from(url, "utf8");
        const block = 16;
        const mod = data.length % block;
        const pad = mod === 0 ? block : block - mod;
        
        // Padding Data
        data = Buffer.concat([data, Buffer.alloc(pad, 0x00)]);

        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        cipher.setAutoPadding(false);

        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);

        const urlhash = encrypted.toString("base64");
        const cookie = res.headers["set-cookie"]?.[0];

        // Step 3: Kirim Request POST untuk dapet Link Download
        const response = await axios.post(
            "https://allinonedownloader.com" + pos,
            new URLSearchParams({
                url,
                token,
                urlhash,
                pos
            }),
            {
                headers: {
                    "accept": "*/*",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "origin": "https://allinonedownloader.com",
                    "referer": "https://allinonedownloader.com/in/",
                    "cookie": cookie,
                    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
                    "x-requested-with": "XMLHttpRequest"
                }
            }
        );

        return response.data;
    } catch (error) {
        throw new Error("AIO Scraper Error: " + error.message);
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/aio?text=URL_SOSMED
 */
router.get('/', async (req, res) => {
    const text = req.query.text;

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "Masukkan parameter 'text' berisi URL sosial media (IG/FB/TikTok)." 
        });
    }

    try {
        const result = await AIODownloaderScraper(text);
        
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });

    } catch (e) {
        console.error("AIO Error:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
