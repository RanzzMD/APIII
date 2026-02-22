const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');

// Konfigurasi Multer untuk Vercel (Simpan di folder /tmp)
const upload = multer({ dest: os.tmpdir() });

/**
 * SCRAPER LOGIC - Face Swap
 * Website: lovefaceswap.com
 * Author: Ranzz
 */

async function createJob(sourcePath, targetPath) {
    const form = new FormData();
    form.append('source_image', fs.createReadStream(sourcePath), {
        filename: 'source.jpg',
        contentType: 'image/jpeg'
    });

    form.append('target_image', fs.createReadStream(targetPath), {
        filename: 'target.jpg',
        contentType: 'image/jpeg'
    });

    const res = await axios.post('https://api.lovefaceswap.com/api/face-swap/create-poll', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
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
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
            'origin': 'https://lovefaceswap.com',
            'referer': 'https://lovefaceswap.com/'
        }
    });
    return res.data.data;
}

/**
 * ENDPOINT API
 * Field Name: source (Gambar Muka), target (Gambar Tujuan)
 */
router.post('/', upload.fields([
    { name: 'source', maxCount: 1 },
    { name: 'target', maxCount: 1 }
]), async (req, res) => {
    
    if (!req.files || !req.files.source || !req.files.target) {
        return res.status(400).json({ 
            creator: "Ranzz", 
            error: "Harap unggah kedua file (field: source & target)." 
        });
    }

    const sourcePath = req.files.source[0].path;
    const targetPath = req.files.target[0].path;

    try {
        // Step 1: Buat Job
        const jobId = await createJob(sourcePath, targetPath);

        // Step 2: Polling (Mengecek status berkala)
        let result;
        let attempts = 0;
        const maxAttempts = 20; // Max 1 menit (3s * 20)

        do {
            await new Promise(r => setTimeout(r, 3000));
            result = await checkJob(jobId);
            attempts++;
        } while ((!result.image_url || result.image_url.length === 0) && attempts < maxAttempts);

        // Hapus file sementara dari /tmp
        if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);

        if (attempts >= maxAttempts) throw new Error("Proses Face Swap timeout.");

        return res.json({
            status: true,
            creator: "Ranzz",
            result: {
                job_id: jobId,
                image: result.image_url[0]
            }
        });

    } catch (e) {
        // Bersihkan file jika error
        if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        
        console.error("FaceSwap Error:", e.message);
        return res.status(500).json({ 
            status: false, 
            creator: "Ranzz", 
            error: e.message 
        });
    }
});

module.exports = router;
