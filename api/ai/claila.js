const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * CORE LOGIC - Claila Unichat Scraper
 * Mendukung berbagai model: chatgpt41mini, chatgpt, chatgpto1p, claude, gemini, mistral, grok
 * Author: RANZZ
 */

const models = [
    "chatgpt41mini", "chatgpt", "chatgpto1p", 
    "claude", "gemini", "mistral", "grok"
];

async function getCsrfToken() {
    const res = await axios.get("https://app.claila.com/api/v2/getcsrftoken", {
        headers: {
            "authority": "app.claila.com",
            "accept": "*/*",
            "origin": "https://www.claila.com",
            "referer": "https://www.claila.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
    });
    return res.data;
}

async function clailaScraper(model, message) {
    try {
        const csrfToken = await getCsrfToken();
        const res = await axios.post(
            `https://app.claila.com/api/v2/unichat1/${model}`,
            new URLSearchParams({
                calltype: "completion",
                message: message,
                sessionId: Date.now(),
            }),
            {
                headers: {
                    "authority": "app.claila.com",
                    "accept": "*/*",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-csrf-token": csrfToken,
                    "x-requested-with": "XMLHttpRequest",
                    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
                }
            }
        );
        return res.data;
    } catch (error) {
        throw new Error("Claila API Error: " + error.message);
    }
}

/**
 * ENDPOINT ROUTER
 * Contoh: /api/ai/claila?text=Halo&model=gemini
 */
router.get('/', async (req, res) => {
    const text = req.query.text;
    let model = req.query.model || "chatgpt"; // Default ke chatgpt jika tidak diisi

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "RANZZ",
            error: "Masukkan parameter 'text' untuk bertanya." 
        });
    }

    // Validasi apakah model tersedia
    if (!models.includes(model)) {
        model = "chatgpt"; 
    }

    try {
        const result = await clailaScraper(model, text);
        
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
