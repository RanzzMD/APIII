const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require('crypto-js');

/**
 * CORE LOGIC - WeatherMaster
 * Menggabungkan data dari Open-Meteo, WeatherAPI, dan TimeZoneDB
 * Author: RANZZ
 */
class WeatherMaster {
    constructor(options = {}) {
        // Menggunakan lokasi default Jakarta jika tidak diisi
        this.lat = options.lat || "-6.1818";
        this.lon = options.lon || "106.8223";

        this.secret = "U2FsdGVkX1+abcd12345==";
        this.encryptedKeyV1 = "U2FsdGVkX1+p9rpuXLFpvZ38oYgNYcOWp7jPyv//ABw=";
        this.encryptedKeyV2 = "U2FsdGVkX1+CQzjswYNymYH/fuGRQF5wttP0PVxhBLXfepyhHKbz/v4PaBwan5pt";

        this.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; 220333QAG Build/RKQ1.211001.001) AppleWebKit/537.36",
            "Referer": "file:///android_asset/index.html",
        };

        this.keyV1 = this.decrypt(this.encryptedKeyV1);
        this.keyV2 = this.decrypt(this.encryptedKeyV2);
    }

    decrypt(encrypted) {
        try {
            return CryptoJS.AES.decrypt(encrypted, this.secret).toString(CryptoJS.enc.Utf8);
        } catch (e) {
            return null;
        }
    }

    async getFullReport() {
        try {
            // Menjalankan semua request secara paralel agar cepat
            const [timezone, forecastMeteo, forecastApi, astronomy, alerts] = await Promise.allSettled([
                axios.get("https://api.timezonedb.com/v2.1/get-time-zone", {
                    params: { key: this.keyV1, format: "json", by: "position", lat: this.lat, lng: this.lon },
                    headers: this.headers
                }),
                axios.get("https://api.open-meteo.com/v1/forecast", {
                    params: {
                        latitude: this.lat, longitude: this.lon,
                        current: "temperature_2m,weather_code,wind_speed_10m",
                        daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
                        timezone: "Asia/Jakarta", forecast_days: 7
                    },
                    headers: this.headers
                }),
                axios.get("https://api.weatherapi.com/v1/forecast.json", {
                    params: { key: this.keyV2, q: `${this.lat},${this.lon}` },
                    headers: this.headers
                }),
                axios.get("https://api.weatherapi.com/v1/astronomy.json", {
                    params: { key: this.keyV2, q: `${this.lat},${this.lon}` },
                    headers: this.headers
                }),
                axios.get("https://api.weatherapi.com/v1/alerts.json", {
                    params: { key: this.keyV2, q: `${this.lat},${this.lon}` },
                    headers: this.headers
                })
            ]);

            return {
                timezone: timezone.value?.data || null,
                current_weather: forecastMeteo.value?.data || null,
                forecast: forecastApi.value?.data || null,
                astronomy: astronomy.value?.data || null,
                alerts: alerts.value?.data || null
            };
        } catch (error) {
            throw new Error("Gagal mengambil data cuaca: " + error.message);
        }
    }
}

/**
 * ENDPOINT ROUTER
 * Bisa dipanggil: /api/tools/weather?lat=-6.2&lon=106.8
 */
router.get('/', async (req, res) => {
    const { lat, lon } = req.query;
    
    // Inisialisasi WeatherMaster dengan koordinat dari query
    const wm = new WeatherMaster({ lat, lon });

    try {
        const result = await wm.getFullReport();

        return res.json({
            status: true,
            creator: "RANZZ",
            result: result
        });
    } catch (e) {
        console.error("Weather Error:", e.message);
        return res.status(500).json({
            status: false,
            creator: "RANZZ",
            error: e.message
        });
    }
});

module.exports = router;
