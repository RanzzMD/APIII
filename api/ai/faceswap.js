const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: os.tmpdir() });

/**
 * Helper untuk mendapatkan Buffer/Stream dari URL atau File
 */
async function getFileSource(input) {
    if (typeof input === 'string' && input.startsWith('http')) {
        // Jika input adalah URL, download dulu gambarnya
        const response = await axios.get(input, { responseType: 'stream' });
        return response.data;
    } else if (input && input.path) {
        // Jika input adalah file dari Multer
        return fs.createReadStream(input.path);
    }
    throw new Error("Input gambar tidak valid.");
}

async function createJob(sourceInput, targetInput) {
    const form = new FormData();
    
    // Ambil stream gambar baik dari URL maupun File upload
    const sourceStream = await getFileSource(sourceInput);
    const targetStream = await getFileSource(targetInput);

    form.append('source_image', sourceStream, { filename: 'source.jpg' });
    form.append('target_image', targetStream, { filename: 'target.jpg' });

    const res = await axios.post('https://api.lovefaceswap.com/api/face-swap/create-poll', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0',
            'origin': 'https://lovefaceswap.com',
            'referer': 'https://lovefaceswap.com/'
        }
    });

    if (!res.data?.data?.task_id) throw new Error("Gagal membuat task Face Swap.");
    return res.data.data.task_id;
}

// ... (fungsi checkJob tetap sama seperti sebelumnya)

/**
 * ENDPOINT API - Mendukung URL (?source=...&target=...) ATAU Upload
 */
router.all('/', upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'target', maxCount: 1 }
]), async (req, res) => {
    
    // 1. Ambil input (Cek URL query dulu, kalau tidak ada cek file upload)
    const source = req.query.source || req.body.source || (req.files?.source ? req.files.source[0] : null);
    const target = req.query.target || req.body.target || (req.files?.target ? req.files.target[0] : null);

    if (!source || !target) {
        return res.status(400).json({ 
            creator: "Ranzz", 
            error: "Harap masukkan URL gambar (query ?source=...&target=...) atau unggah file." 
        });
    }

    try {
        const jobId = await createJob(source, target);

        let result;
        let attempts = 0;
        do {
            await new Promise(r => setTimeout(r, 3000));
            result = await checkJob(jobId);
            attempts++;
        } while ((!result.image_url || result.image_url.length === 0) && attempts < 15);

        // Cleanup file temp jika ada
        if (req.files?.source) fs.unlinkSync(req.files.source[0].path);
        if (req.files?.target) fs.unlinkSync(req.files.target[0].path);

        return res.json({
            status: true,
            creator: "Ranzz",
            result: { job_id: jobId, image: result.image_url[0] }
        });

    } catch (e) {
        if (req.files?.source) fs.unlinkSync(req.files.source[0].path);
        if (req.files?.target) fs.unlinkSync(req.files.target[0].path);
        return res.status(500).json({ status: false, creator: "Ranzz", error: e.message });
    }
});

module.exports = router;
