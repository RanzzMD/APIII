const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * SCRAPER LOGIC - ytmp4is
 * Support: URL YouTube & Search Query
 * Author: Ranzz
 */

function convertid(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed|watch|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function resolveid(input) {
    const direct = convertid(input);
    if (direct) return direct;

    const search = await axios.get(`https://test.flvto.online/search/?q=${encodeURIComponent(input)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            origin: 'https://v5.ytmp4.is',
            referer: 'https://v5.ytmp4.is/'
        }
    });

    if (!search.data.items || !search.data.items.length)
        throw new Error('Video tidak ditemukan.');

    return search.data.items[0].id;
}

async function ytmp4isScraper(input, format = 'mp4') {
    try {
        const youtube_id = await resolveid(input);
        if (!youtube_id) throw new Error('ID YouTube tidak valid.');

        const converter = await axios.post('https://ht.flvto.online/converter', { 
            id: youtube_id, 
            fileType: format 
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Content-Type': 'application/json',
                origin: 'https://ht.flvto.online',
                referer: `https://ht.flvto.online/button?url=https://www.youtube.com/watch?v=${youtube_id}&fileType=${format}`
            }
        });

        const data = converter.data;

        if (format === 'mp3') {
            return {
                title: data.title,
                type: 'mp3',
                filesize: data.filesize,
                duration: data.duration,
                download: data.link
            };
        }

        if (format === 'mp4') {
            if (!Array.isArray(data.formats) || !data.formats.length) 
                throw new Error('Format video tidak tersedia.');

            const sorted = data.formats.sort((a, b) => b.height - a.height);
            const selected = sorted.find(v => v.qualityLabel === '720p') || sorted[0];

            return {
                title: data.title,
                type: 'mp4',
                quality: selected.qualityLabel,
                download: selected.url
            };
        }
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message);
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/ytmp4is?text=JUDUL_ATAU_URL&type=mp4
 */
router.get('/', async (req, res) => {
    const text = req.query.text;
    const type = req.query.type || 'mp4'; // Default ke mp4 jika tidak diisi

    if (!text) return res.status(400).json({ 
        status: false,
        creator: "Ranzz",
        error: "Masukkan parameter 'text' (URL atau Judul Video)" 
    });

    try {
        const result = await ytmp4isScraper(text, type.toLowerCase());
        
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });
    } catch (e) {
        console.error("YT Error:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
