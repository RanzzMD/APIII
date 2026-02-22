const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * CORE LOGIC - Claila Unichat Scraper (Ultra Stable)
 * Creator: RANZZ
 */

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36";

async function getClailaResponse(model, message) {
    try {
        // 1. Ambil CSRF Token dan Cookie sekaligus
        const session = await axios.get("https://app.claila.com/api/v2/getcsrftoken", {
            headers: { "user-agent": UA, "referer": "https://www.claila.com/" }
        });

        const csrfToken = session.data;
        const cookie = session.headers['set-cookie']?.join('; ');

        if (!csrfToken) throw new Error("Gagal mendapatkan CSRF Token.");

        // 2. Kirim Pesan dengan Payload yang lebih lengkap
        const params = new URLSearchParams();
        params.append('calltype', 'completion');
        params.append('message', message);
        params.append('sessionId', `sess_${Date.now()}`); // Format session yang lebih unik

        const res = await axios.post(
            `https://app.claila.com/api/v2/unichat1/${model}`,
            params,
            {
                headers: {
                    "authority": "app.claila.com",
                    "accept": "*/*",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-csrf-token": csrfToken,
                    "x-requested-with": "XMLHttpRequest",
                    "cookie": cookie, // Sertakan cookie dari step 1
                    "origin": "https://app.claila.com",
                    "referer": "https://app.claila.com/chat",
                    "user-agent": UA
                }
            }
        );

        // Jika respon masih kosong, lempar error untuk memicu Retry
        if (!res.data || res.data === "") throw new Error("Empty Response");
        
        return res.data;
    } catch (error) {
        throw error;
    }
}

/**
 * ENDPOINT ROUTER - Dengan Sistem Auto-Fallback
 */
router.get('/', async (req, res) => {
    const text = req.query.text;
    const modelPrioritas = req.query.model || "chatgpt";

    if (!text) return res.status(400).json({ status: false, creator: "RANZZ", error: "Teks wajib diisi!" });

    try {
        let result;
        try {
            // Coba model pilihan user dulu
            result = await getClailaResponse(modelPrioritas, text);
        } catch (err) {
            // Jika gagal/kosong, otomatis coba pakai Gemini sebagai cadangan
            console.log(`Fallback: ${modelPrioritas} gagal, mencoba Gemini...`);
            result = await getClailaResponse("gemini", text);
        }

        return res.json({
            status: true,
            creator: "RANZZ",
            model_used: result.includes("Gemini") ? "gemini (fallback)" : modelPrioritas,
            result: result
        });
    } catch (e) {
        return res.status(500).json({ 
            status: false, 
            creator: "RANZZ",
            error: "Semua model AI sedang sibuk. Silakan coba beberapa saat lagi." 
        });
    }
});

module.exports = router;
