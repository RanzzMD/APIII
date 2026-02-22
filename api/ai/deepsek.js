const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const vm = require('vm');

// --- CONFIG & UTILS ---
const CONFIG = {
    BASE_URL: "https://chat.deepseek.com/api/v0",
    HEADERS: {
        'User-Agent': 'DeepSeek/1.6.4 Android/35',
        'Accept': 'application/json',
        'x-client-platform': 'android',
        'x-client-version': '1.6.4',
        'x-client-locale': 'id',
        'x-client-bundle-id': 'com.deepseek.chat',
        'x-rangers-id': '7392079989945982465',
        'accept-charset': 'UTF-8'
    }
};

const WORKER_URL = 'https://static.deepseek.com/chat/static/33614.25c7f8f220.js';
const WASM_URL = 'https://static.deepseek.com/chat/static/sha3_wasm_bg.7b9ca65ddd.wasm';
let workerCache = null;
let wasmCache = null;

const utils = {
    generateDeviceId: () => {
        const baseId = "BUelgEoBdkHyhwE8q/4YOodITQ1Ef99t7Y5KAR4CyHwdApr+lf4LJ+QAKXEUJ2lLtPQ+mmFtt6MpbWxpRmnWITA==";
        let chars = baseId.split('');
        const possibleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * 20) + 50;
            chars[randomIndex] = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
        }
        return chars.join('');
    },
    download: (url) => new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    })
};

// --- CORE DEEPSEEK ENGINE ---
async function solvePow(payload) {
    if (!workerCache) workerCache = (await utils.download(WORKER_URL)).toString();
    if (!wasmCache) wasmCache = await utils.download(WASM_URL);

    return new Promise((resolve, reject) => {
        const sandbox = {
            console: { log: () => {} },
            setTimeout, clearTimeout, TextEncoder, TextDecoder, URL,
            Response: class { 
                constructor(buf) { this.buf = buf; this.ok = true; }
                async arrayBuffer() { return this.buf; }
            },
            WebAssembly,
            fetch: async () => ({ ok: true, arrayBuffer: async () => wasmCache, headers: { get: () => 'application/wasm' } }),
            postMessage: (msg) => {
                if (msg?.type === 'pow-answer') {
                    const token = Buffer.from(JSON.stringify({
                        algorithm: payload.algorithm,
                        challenge: payload.challenge,
                        salt: payload.salt,
                        answer: msg.answer.answer,
                        signature: payload.signature,
                        target_path: payload.target_path
                    })).toString('base64');
                    resolve(token);
                }
            }
        };
        sandbox.self = sandbox;
        const context = vm.createContext(sandbox);
        vm.runInContext(workerCache, context);
        sandbox.onmessage({ data: { type: "pow-challenge", challenge: payload } });
    });
}

async function getDeepSeekResponse(prompt) {
    try {
        // 1. Login (Menggunakan kredensial statis sesuai scriptmu atau bisa dipindah ke query)
        const deviceId = utils.generateDeviceId();
        const loginRes = await axios.post(`${CONFIG.BASE_URL}/users/login`, {
            email: "shannmoderz@gmail.com", // Ganti jika perlu
            password: "Dhaav100", 
            device_id: deviceId, 
            os: 'android'
        }, { headers: CONFIG.HEADERS });

        const token = loginRes.data.data.biz_data.user.token;

        // 2. Create Session
        const sessionRes = await axios.post(`${CONFIG.BASE_URL}/chat_session/create`, {}, {
            headers: { ...CONFIG.HEADERS, 'Authorization': `Bearer ${token}` }
        });
        const sessionId = sessionRes.data.data.biz_data.id;

        // 3. PoW Challenge
        const challengeRes = await axios.post(`${CONFIG.BASE_URL}/chat/create_pow_challenge`, 
            { target_path: '/api/v0/chat/completion' }, 
            { headers: { ...CONFIG.HEADERS, 'Authorization': `Bearer ${token}` } }
        );
        const powToken = await solvePow(challengeRes.data.data.biz_data.challenge);

        // 4. Chat Completion (Non-streaming untuk API JSON)
        const chatRes = await axios.post(`${CONFIG.BASE_URL}/chat/completion`, {
            chat_session_id: sessionId,
            prompt: prompt,
            thinking_enabled: true 
        }, {
            headers: {
                ...CONFIG.HEADERS,
                'Authorization': `Bearer ${token}`,
                'x-ds-pow-response': powToken
            }
        });

        return chatRes.data; // Mengembalikan raw data untuk diproses di router
    } catch (error) {
        throw new Error("DeepSeek Error: " + error.message);
    }
}

// --- ROUTER API ---
router.get('/', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.status(400).json({ 
        creator: "Ranzz", 
        error: "Missing 'text' parameter" 
    });

    try {
        const result = await getDeepSeekResponse(text);
        
        // Response JSON standar
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });
    } catch (e) {
        return res.status(500).json({ 
            status: false, 
            creator: "Ranzz", 
            error: e.message 
        });
    }
});

module.exports = router;
