const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// --- Helper Scraper Classes ---

class TempMailScraper {
    constructor() {
        this.baseUrl = 'https://akunlama.com';
        this.headers = {
            'accept': 'application/json, text/plain, */*',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        };
        this.recipient = crypto.randomBytes(8).toString('hex').substring(0, 10);
        this.domain = 'clout.wiki'; // Domain default dari akunlama
        this.lastCount = 0;
    }

    async getEmail() {
        // Mengembalikan email lengkap untuk dikirim OTP
        return `${this.recipient}@${this.domain}`;
    }

    async waitForCode() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = setInterval(async () => {
                try {
                    attempts++;
                    if (attempts > 20) { // Timeout setelah ~100 detik
                        clearInterval(interval);
                        reject(new Error("Timeout menunggu kode OTP"));
                    }
                    const inbox = await this.checkInbox();
                    if (inbox && inbox.length > this.lastCount) {
                        for (const msg of inbox.slice(this.lastCount)) {
                            const html = await this.getMessageContent(msg);
                            const code = this.extractCode(html);
                            if (code) {
                                clearInterval(interval);
                                resolve(code);
                            }
                        }
                        this.lastCount = inbox.length;
                    }
                } catch (e) { /* silent error */ }
            }, 5000);
        });
    }

    async checkInbox() {
        const response = await axios.get(`${this.baseUrl}/api/list`, {
            params: { recipient: this.recipient },
            headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/list` }
        });
        return response.data;
    }

    async getMessageContent(msg) {
        const response = await axios.get(`${this.baseUrl}/api/getHtml`, {
            params: { region: msg.storage.region, key: msg.storage.key },
            headers: { ...this.headers, referer: `https://akunlama.com/inbox/${this.recipient}/message/${msg.storage.region}/${msg.storage.key}` }
        });
        return response.data;
    }

    extractCode(html) {
        const match = html.match(/(\d{6})/);
        return match ? match[1] : null;
    }
}

class Nanana {
    constructor() {
        this.baseUrl = 'https://nanana.app';
        this.tempMail = new TempMailScraper();
        this.sessionToken = '';
        this.cookieString = '';
        this.defaultHeaders = {
            'accept': '*/*',
            'origin': this.baseUrl,
            'referer': `${this.baseUrl}/en`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        };
    }

    async initialize() {
        const email = await this.tempMail.getEmail();
        await this.sendOtp(email);
        const code = await this.tempMail.waitForCode();
        await this.verifyOtp(email, code);
    }

    async sendOtp(email) {
        await axios.post(`${this.baseUrl}/api/auth/email-otp/send-verification-otp`, 
            { email, type: 'sign-in' }, { headers: this.defaultHeaders });
    }

    async verifyOtp(email, otp) {
        const response = await axios.post(`${this.baseUrl}/api/auth/sign-in/email-otp`, 
            { email, otp }, { headers: this.defaultHeaders });
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            const sessionCookie = setCookie.find(c => c.includes('__Secure-better-auth.session_token'));
            if (sessionCookie) {
                this.sessionToken = sessionCookie.split(';')[0];
                this.cookieString = this.sessionToken;
            }
        }
    }

    generateFpId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async processImage(imageSource, prompt) {
        let imagePath = imageSource;
        let isTempFile = false;

        // Jika input adalah URL, download dulu ke lokal
        if (imageSource.startsWith('http')) {
            const tempName = `temp_${Date.now()}.png`;
            const writer = fs.createWriteStream(tempName);
            const response = await axios.get(imageSource, { responseType: 'stream' });
            response.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));
            imagePath = tempName;
            isTempFile = true;
        }

        try {
            // Step 1: Upload
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));
            const upRes = await axios.post(`${this.baseUrl}/api/upload-img`, form, {
                headers: { ...this.defaultHeaders, ...form.getHeaders(), 'Cookie': this.cookieString, 'x-fp-id': this.generateFpId() }
            });

            // Step 2: Generate
            const genRes = await axios.post(`${this.baseUrl}/api/image-to-image`, 
                { prompt, image_urls: [upRes.data.url] }, 
                { headers: { ...this.defaultHeaders, 'content-type': 'application/json', 'Cookie': this.cookieString, 'x-fp-id': this.generateFpId() } }
            );

            // Step 3: Polling
            while (true) {
                const res = await axios.post(`${this.baseUrl}/api/get-result`, 
                    { requestId: genRes.data.request_id, type: 'image-to-image' },
                    { headers: { ...this.defaultHeaders, 'content-type': 'application/json', 'Cookie': this.cookieString, 'x-fp-id': this.generateFpId() } }
                );
                if (res.data.completed) return res.data;
                await new Promise(r => setTimeout(r, 3000));
            }
        } finally {
            if (isTempFile && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
    }
}

// --- API Router ---

router.get('/', async (req, res) => {
    const prompt = req.query.text; // Prompt teks
    const imageUrl = req.query.url; // URL Gambar (Wajib karena ini Image-to-Image)

    if (!prompt || !imageUrl) {
        return res.status(400).json({ 
            error: "Missing parameters. Need 'text' (prompt) and 'url' (image url)." 
        });
    }

    try {
        const ai = new Nanana();
        
        // Proses ini memakan waktu (Login OTP -> Upload -> AI Processing)
        // Pastikan timeout server Anda cukup panjang.
        await ai.initialize();
        const result = await ai.processImage(imageUrl, prompt);

        const data = {
            status: true,
            result: result
        };
        
        return res.json(data);
    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});

module.exports = router;
