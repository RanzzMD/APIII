const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * SCRAPER LOGIC - MediaFire Downloader
 * Mengambil informasi file dan direct link dari URL MediaFire
 * Author: Ranzz
 */

const mfHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.mediafire.com/',
    'Upgrade-Insecure-Requests': '1'
};

async function mediafiredlScraper(url) {
    try {
        const res = await axios.get(url, { headers: mfHeaders, maxRedirects: 5 });
        const $ = cheerio.load(res.data);

        const download = $('#download_link > a.input.popsok').attr('href') || null;
        const filename = $('.dl-btn-label').first().text().trim() || null;
        const filesize = $('#download_link > a.input.popsok')
            .text()
            .match(/\(([^)]+)\)/)?.[1] || null;
        const filetype = $('.dl-info .filetype span')
            .first()
            .text()
            .trim() || null;
        const uploaded = $('.details li')
            .eq(1)
            .find('span')
            .text()
            .trim() || null;

        if (!download) throw new Error("Link download tidak ditemukan. Pastikan URL benar atau file tidak diproteksi.");

        return {
            filename,
            filetype,
            filesize,
            uploaded,
            download
        };
    } catch (error) {
        throw new Error("MediaFire Scraper Error: " + error.message);
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/mediafire?text=URL_MEDIAFIRE
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // URL Mediafire dari parameter ?text=

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "Masukkan parameter 'text' berisi URL MediaFire." 
        });
    }

    if (!text.includes("mediafire.com")) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "URL tidak valid. Harap masukkan link MediaFire." 
        });
    }

    try {
        const result = await mediafiredlScraper(text);
        
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });

    } catch (e) {
        console.error("MF ERROR:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
