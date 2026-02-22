const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// --- CONFIG & CONSTANTS ---
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API = 'https://api.unblurimage.ai/api/upscaler';

// Konfigurasi Multer untuk penyimpanan sementara
const upload = multer({ dest: 'temp/' });

/**
 * UTILS - Generate Serial Produk
 */
function productserial() {
    const raw = [UA, process.platform, process.arch, Date.now(), Math.random()].join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
}
const product = productserial();

/**
 * SCRAPER LOGIC - AI Video Enhancer
 */

// 1. Inisialisasi Upload
async function uploadvid(filePath) {
    const form = new FormData();
    form.append('video_file_name', path.basename(filePath));

    const res = await axios.post(`${API}/v1/ai-video-enhancer/upload-video`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': UA,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/'
        }
    });
    return res.data.result;
}

// 2. Kirim Stream ke OSS
async function putoOss(uploadUrl, filePath) {
    const stream = fs.createReadStream(filePath);
    await axios.put(uploadUrl, stream, {
        headers: { 'content-type': 'video/mp4' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
}

// 3. Buat Job Processing
async function createJob(originalVideoUrl, resolution = '4k', preview = false) {
    const form = new FormData();
    form.append('original_video_file', originalVideoUrl);
    form.append('resolution', resolution);
    form.append('is_preview', preview ? 'true' : 'false');

    const res = await axios.post(`${API}/v2/ai-video-enhancer/create-job`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': UA,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/',
            'product-serial': product
        }
    });

    if (res.data?.code !== 100000) throw new Error(JSON.stringify(res.data));
    return res.data.result.job_id;
}

// 4. Cek Status Job (Polling)
async function pollJob(jobId, interval = 5000) {
    let attempts = 0;
    while (attempts < 100) { // Max polling sekitar 8-10 menit
        const res = await axios.get(`${API}/v2/ai-video-enhancer/get-job/${jobId}`, {
            headers: {
                'user-agent': UA,
                origin: 'https://unblurimage.ai',
                referer: 'https://unblurimage.ai/',
                'product-serial': product
            }
        });

        if (res.data.code === 100000 && res.data.result?.output_url) {
            return res.data.result;
        }

        if (res.data.code !== 300010) { // 300010 biasanya kode "masih diproses"
            throw new Error(JSON.stringify(res.data));
        }

        await new Promise(r => setTimeout(r, interval));
        attempts++;
    }
    throw new Error('Proses Timeout');
}

/**
 * ENDPOINT - METHOD POST (Upload Video)
 * Field Name: video
 */
router.post('/', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            creator: "Ranzz", 
            error: "Tidak ada file video yang diunggah (Gunakan field: video)" 
        });
    }

    const videoPath = req.file.path;
    const resolution = req.query.resolution || '4k';

    try {
        // Step 1: Upload Init
        const uploadData = await uploadvid(videoPath);

        // Step 2: Upload Real File ke OSS
        await putoOss(uploadData.url, videoPath);

        // Step 3: Jalankan AI Job
        const cdnUrl = 'https://cdn.unblurimage.ai/' + uploadData.object_name;
        const jobId = await createJob(cdnUrl, resolution);

        // Step 4: Tunggu Hasil (Polling)
        const finalResult = await pollJob(jobId);

        // Hapus file sementara setelah selesai
        fs.unlinkSync(videoPath);

        return res.json({
            status: true,
            creator: "Ranzz",
            result: {
                job_id: jobId,
                input_url: finalResult.input_url,
                output_url: finalResult.output_url
            }
        });

    } catch (e) {
        // Pastikan file temp terhapus meski terjadi error
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        
        console.error("Enhancer Error:", e.message);
        return res.status(500).json({ 
            status: false, 
            creator: "Ranzz", 
            error: e.message 
        });
    }
});

module.exports = router;
