const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const os = require('os'); // Penting untuk Vercel

// --- CONFIG & CONSTANTS ---
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API = 'https://api.unblurimage.ai/api/upscaler';

// Konfigurasi Multer khusus Vercel (Simpan di /tmp)
const upload = multer({ dest: os.tmpdir() });

/**
 * UTILS - Generate Serial Produk
 */
function productserial() {
    const raw = [UA, process.platform, process.arch, Date.now(), Math.random()].join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
}
const product = productserial();

/**
 * SCRAPER FUNCTIONS
 */
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

async function putoOss(uploadUrl, filePath) {
    const stream = fs.createReadStream(filePath);
    await axios.put(uploadUrl, stream, {
        headers: { 'content-type': 'video/mp4' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
}

async function createJob(originalVideoUrl, resolution = '4k', preview = false) {
    const form = new FormData();
    form.append('original_video_file', originalVideoUrl);
    form.append('resolution', resolution);
    form.append('is_preview', preview ? 'true' : 'false');

    const res = await axios.post(`${API}/v2/ai-video-enhancer/create-job`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': UA,
            'product-serial': product,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/'
        }
    });

    if (res.data?.code !== 100000) throw new Error(JSON.stringify(res.data));
    return res.data.result.job_id;
}

async function pollJob(jobId, interval = 5000) {
    let attempts = 0;
    while (attempts < 60) {
        const res = await axios.get(`${API}/v2/ai-video-enhancer/get-job/${jobId}`, {
            headers: {
                'user-agent': UA,
                'product-serial': product,
                origin: 'https://unblurimage.ai',
                referer: 'https://unblurimage.ai/'
            }
        });

        if (res.data.code === 100000 && res.data.result?.output_url) {
            return res.data.result;
        }
        if (res.data.code !== 300010) throw new Error(JSON.stringify(res.data));

        await new Promise(r => setTimeout(r, interval));
        attempts++;
    }
    throw new Error('Proses Timeout');
}

/**
 * ENDPOINT API
 */
router.post('/', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            creator: "Ranzz", 
            error: "Gunakan field 'video' untuk upload file." 
        });
    }

    const videoPath = req.file.path; // Ini akan mengarah ke /tmp/xxxx
    const resolution = req.query.resolution || '4k';

    try {
        const uploadData = await uploadvid(videoPath);
        await putoOss(uploadData.url, videoPath);

        const cdnUrl = 'https://cdn.unblurimage.ai/' + uploadData.object_name;
        const jobId = await createJob(cdnUrl, resolution);
        const finalResult = await pollJob(jobId);

        // Hapus file di /tmp setelah selesai
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

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
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        return res.status(500).json({ status: false, creator: "Ranzz", error: e.message });
    }
});

module.exports = router;
