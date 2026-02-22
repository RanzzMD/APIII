const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');

// Gunakan os.tmpdir() agar lancar di Vercel
const upload = multer({ dest: os.tmpdir() });

/**
 * Helper untuk mengambil Stream Gambar
 * Bisa dari URL (Download) atau Path Lokal (Upload)
 */
async function getFileStream(input) {
    if (typeof input === 'string' && input.startsWith('http')) {
        const response = await axios.get(input, { responseType: 'stream' });
        return response.data;
    } else if (input && input.path) {
        return fs.createReadStream(input.path);
    }
    throw new Error("Input gambar tidak valid (Gunakan URL atau Upload File).");
}

async function createJob(sourceInput, targetInput) {
    const form = new FormData();
    
    // Proses kedua input secara paralel
    const [sourceStream, targetStream] = await Promise.all([
        getFileStream(sourceInput),
        getFileStream(targetInput)
    ]);

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

async function checkJob(jobId) {
    const res = await axios.get(`https://api.lovefaceswap.com/api/common/get?job_id=${jobId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'origin': 'https://lovefaceswap.com',
            'referer': 'https://lovefaceswap.com/'
        }
    });
    return res.data.data;
}

/**
 * ENDPOINT HYBRID (GET/POST)
 * Bisa panggil: /api/faceswap?source=URL&target=URL
 */
router.all('/', upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'target', maxCount: 1 }
]), async (req, res) => {
    
    // Ambil input dari Query (GET), Body (POST Text), atau Files (POST Upload)
    const source = req.query.source || req.body.source || (req.files?.source ? req.files.source[0] : null);
    const target = req.query.target || req.body.target || (req.files?.target ? req.files.target[0] : null);

    if (!source || !target) {
        return res.status(400).json({ 
            creator: "Ranzz", 
            error: "Harap masukkan parameter 'source' dan 'target' (URL atau Upload)." 
        });
    }

    try {
        const jobId = await createJob(source, target);

        let result;
        let attempts = 0;
        // Polling hasil (maksimal 15x percobaan / ~45 detik)
        do {
            await new Promise(r => setTimeout(r, 3000));
            result = await checkJob(jobId);
            attempts++;
        } while ((!result.image_url || result.image_url.length === 0) && attempts < 15);

        // Hapus file sisa di folder /tmp jika ada (Cleanup)
        if (req.files?.source) fs.unlinkSync(req.files.source[0].path);
        if (req.files?.target) fs.unlinkSync(req.files.target[0].path);

        if (attempts >= 15 && (!result.image_url || result.image_url.length === 0)) {
            throw new Error("Proses terlalu lama, silakan coba lagi.");
        }

        return res.json({
            status: true,
            creator: "Ranzz",
            result: {
                job_id: jobId,
                image: result.image_url[0]
            }
        });

    } catch (e) {
        // Pastikan cleanup tetap jalan walau error
        if (req.files?.source && fs.existsSync(req.files.source[0].path)) fs.unlinkSync(req.files.source[0].path);
        if (req.files?.target && fs.existsSync(req.files.target[0].path)) fs.unlinkSync(req.files.target[0].path);
        
        console.error("FaceSwap Error:", e.message);
        return res.status(500).json({ 
            status: false, 
            creator: "Ranzz", 
            error: e.message 
        });
    }
});

module.exports = router;
