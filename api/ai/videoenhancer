const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * SCRAPER LOGIC - AI Video Enhancer
 * Author: Ranzz
 */

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API = 'https://api.unblurimage.ai/api/upscaler';

function productserial() {
    const raw = [UA, process.platform, process.arch, Date.now(), Math.random()].join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
}

const product = productserial();

async function videoEnhancerScraper(videoPath, resolution = '4k') {
    try {
        // 1. Get Upload URL
        const formUpload = new FormData();
        formUpload.append('video_file_name', path.basename(videoPath));
        const upRes = await axios.post(`${API}/v1/ai-video-enhancer/upload-video`, formUpload, {
            headers: { ...formUpload.getHeaders(), 'user-agent': UA }
        });
        const uploadData = upRes.data.result;

        // 2. Put to OSS
        const stream = fs.createReadStream(videoPath);
        await axios.put(uploadData.url, stream, {
            headers: { 'content-type': 'video/mp4' },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        // 3. Create Job
        const cdnUrl = 'https://cdn.unblurimage.ai/' + uploadData.object_name;
        const formJob = new FormData();
        formJob.append('original_video_file', cdnUrl);
        formJob.append('resolution', resolution);
        formJob.append('is_preview', 'false');

        const jobRes = await axios.post(`${API}/v2/ai-video-enhancer/create-job`, formJob, {
            headers: { ...formJob.getHeaders(), 'user-agent': UA, 'product-serial': product }
        });

        if (jobRes.data?.code !== 100000) throw new Error("Gagal membuat job: " + JSON.stringify(jobRes.data));
        const jobId = jobRes.data.result.job_id;

        // 4. Polling Job (Max 5 menit)
        let attempts = 0;
        while (attempts < 60) {
            const check = await axios.get(`${API}/v2/ai-video-enhancer/get-job/${jobId}`, {
                headers: { 'user-agent': UA, 'product-serial': product }
            });

            if (check.data.code === 100000 && check.data.result?.output_url) {
                return { job_id: jobId, input_url: check.data.result.input_url, output_url: check.data.result.output_url };
            }
            if (check.data.code !== 300010) throw new Error("Job Error: " + JSON.stringify(check.data));

            await new Promise(r => setTimeout(r, 5000)); // Tunggu 5 detik
            attempts++;
        }
        throw new Error("Proses timeout (Terlalu lama)");
    } catch (error) {
        throw error;
    }
}

/**
 * ENDPOINT API
 * Base URL: /api/video-enhance?text=URL_VIDEO_MP4
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // URL Video Input
    if (!text) return res.status(400).json({ creator: "Ranzz", error: "Masukkan parameter 'text' (URL Video MP4)" });

    const tempPath = path.join(__dirname, `temp_${Date.now()}.mp4`);

    try {
        // Download video ke lokal sementara
        const response = await axios.get(text, { responseType: 'stream' });
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const result = await videoEnhancerScraper(tempPath);

        // Hapus file temp setelah selesai
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        return res.json({ status: true, creator: "Ranzz", result });

    } catch (e) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.error("Enhancer Error:", e.message);
        return res.status(500).json({ status: false, creator: "Ranzz", error: e.message });
    }
});

module.exports = router;
