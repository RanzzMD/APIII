const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const fs = require('fs');

// Konfigurasi penyimpanan sementara
const upload = multer({ dest: 'temp/' });

/**
 * SCRAPER LOGIC
 */
async function removeBgScraper(fileBuffer, fileName) {
    try {
        const form = new FormData();
        form.append("file", fileBuffer, { filename: fileName, contentType: 'image/png' });

        const uploadRes = await axios.post("https://removebg.one/api/predict/v2", form, {
            headers: {
                ...form.getHeaders(),
                "product": "REMOVEBG",
                "user-agent": "Mozilla/5.0"
            }
        });

        const resultUrl = uploadRes.data?.data?.cutoutUrl;
        if (!resultUrl) throw new Error("Gagal mendapatkan URL hasil.");

        const finalImage = await axios.get(resultUrl, { responseType: 'arraybuffer' });
        return {
            buffer: Buffer.from(finalImage.data, 'binary'),
            mimetype: finalImage.headers['content-type'] || 'image/png'
        };
    } catch (error) {
        throw error;
    }
}

/**
 * ENDPOINT - Pakai method POST untuk upload
 */
router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ creator: "Ranzz", error: "Tidak ada file yang diunggah (field: image)" });

    try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const result = await removeBgScraper(fileBuffer, req.file.originalname);

        // Hapus file temp setelah dibaca
        fs.unlinkSync(req.file.path);

        res.set('Content-Type', result.mimetype);
        res.send(result.buffer);
    } catch (e) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ creator: "Ranzz", error: e.message });
    }
});

module.exports = router;
