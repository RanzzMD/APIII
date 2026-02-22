const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * CORE LOGIC - Claila Unichat Scraper (FIXED)
 * Creator: RANZZ
 */

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";

async function getCsrfToken() {
    try {
        const res = await axios.get("https://app.claila.com/api/v2/getcsrftoken", {
            headers: {
                "authority": "app.claila.com",
                "accept": "*/*",
                "referer": "https://www.claila.com/",
                "user-agent": UA,
            },
        });
        return res.data;
    } catch (e) {
        throw new Error("Gagal mengambil CSRF Token");
    }
}

async function clailaScraper(model, message) {
    try {
        const csrfToken = await getCsrfToken();
        
        // Gunakan URLSearchParams agar format x-www-form-urlencoded sempurna
        const params = new URLSearchParams();
        params.append('calltype', 'completion');
        params.append('message', message);
        params.append('sessionId', Date.now().toString());

        const res = await axios.post(
            `https://app.claila.com/api/v2/unichat1/${model}`,
            params,
            {
                headers: {
                    "authority": "app.claila.com",
                    "accept": "*/*",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "origin": "https://app.claila.com",
                    "referer": "https://app.claila.com/chat",
                    "x-csrf-token": csrfToken,
                    "x-requested-with": "XMLHttpRequest",
                    "user-agent": UA,
                },
            }
        );

        // Jika res.data kosong, kita lempar error agar tertangkap di catch
        if (!res.data) throw new Error("API Claila memberikan respon kosong.");
        
        return res.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message);
    }
}

/**
 * ENDPOINT ROUTER
 */
router.get('/', async (req, res) => {
    const text = req.query.text;
    const model = req.query.model || "chatgpt";

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "RANZZ",
            error: "Masukkan parameter 'text'!" 
        });
    }

    try {
        const result = await clailaScraper(model, text);
        
        // Pastikan result bukan string kosong
        if (result === "") {
            throw new Error("Respon dari AI kosong. Coba gunakan model lain (gemini/claude).");
        }

        return res.json({
            status: true,
            creator: "RANZZ",
            model: model,
            result: result
        });
    } catch (e) {
        console.error("Claila Error:", e.message);
        return res.status(500).json({ 
            status: false, 
            creator: "RANZZ", 
            error: e.message 
        });
    }
});

module.exports = router;
