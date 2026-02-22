const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const os = require('os');

// Konfigurasi Multer untuk penyimpanan sementara di Vercel
const upload = multer({ dest: os.tmpdir() });

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API = 'https://api.unblurimage.ai/api/upscaler';

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

async function createJob(originalVideoUrl, resolution = '4k') {
    const form = new FormData();
    form.append('original_video_file', originalVideoUrl);
    form.append('resolution', resolution);
    form.append('is_preview', 'false');

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

async function pollJob(jobId) {
    let attempts = 0;
    while (attempts < 60) {
        const res = await axios.get(`${API}/v2/ai-video-enhancer/get-job/${jobId}`, {
            headers: { 'user-agent': UA, 'product-serial': product }
        });

        if (res.data.code === 100000 && res.data.result?.output_url) return res.data.result;
        if (res.data.code !== 300010) throw new Error(JSON.stringify(res.data));

        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }
    throw new Error('Proses Timeout');
}

/**
 * ENDPOINT API - Hybrid (GET/POST)
 */
router.all('/', upload.single('video'), async (req, res) => {
    // Ambil input dari URL query (?video=...) atau File Upload
    const videoInput = req.query.video || req.body.video || (req.file ? req.file.path : null);
    const resolution = req.query.resolution || '4k';

    if (!videoInput) {
        return res.status(400).json({ 
            creator: "RANZZ", 
            error: "Harap masukkan URL video atau unggah file." 
        });
    }

    const tempPath = path.join(os.tmpdir(), `enhance_${Date.now()}.mp4`);
    let activePath = req.file ? req.file.path : tempPath;

    try {
        // Jika input berupa URL, download dulu ke /tmp
        if (typeof videoInput === 'string' && videoInput.startsWith('http')) {
            const response = await axios.get(videoInput, { responseType: 'stream' });
            const writer = fs.createWriteStream(tempPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        }

        const uploadData = await uploadvid(activePath);
        await putoOss(uploadData.url, activePath);
        
        const cdnUrl = 'https://cdn.unblurimage.ai/' + uploadData.object_name;
        const jobId = await createJob(cdnUrl, resolution);
        const finalResult = await pollJob(jobId);

        // Cleanup: Hapus file temporary agar /tmp Vercel tidak penuh
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        return res.json({
            status: true,
            creator: "RANZZ",
            result: {
                job_id: jobId,
                input_url: finalResult.input_url,
                output_url: finalResult.output_url
            }
        });

    } catch (e) {
        // Cleanup di blok catch untuk mencegah kebocoran storage
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        
        return res.status(500).json({ status: false, creator: "RANZZ", error: e.message });
    }
});

module.exports = router;
