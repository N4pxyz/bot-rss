const express = require('express');
const pubSubHubbub = require('pubsubhubbub');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SERVER_URL = process.env.RENDER_EXTERNAL_URL; // Otomatis terisi oleh Render
const RSS_FEED_URL = process.env.RSS_FEED_URL; // URL RSS Target Anda

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// Inisialisasi Subscriber PubSubHubbub
const subscriber = pubSubHubbub.createServer({
    callbackUrl: `${SERVER_URL}/pubsubhubbub`,
    secret: "RahasiaBotRSS123"
});

// Jalankan server Express
app.use("/pubsubhubbub", subscriber.listener());

app.get('/', (req, res) => {
    res.send('Bot RSS berjalan aktif!');
});

app.listen(PORT, () => {
    console.log(`Server mendengarkan di port ${PORT}`);
    
    // Mendaftarkan RSS feed ke Hub Google (PubSubHubbub)
    const hubUrl = "http://appspot.com";
    
    subscriber.subscribe(RSS_FEED_URL, hubUrl, (err) => {
        if (err) console.error("Gagal subscribe:", err);
        else console.log(`Berhasil subscribe ke ${RSS_FEED_URL} secara real-time!`);
    });
});

// Deteksi jika ada artikel/update baru dari RSS
subscriber.on("feed", (data) => {
    try {
        // Parsing data sederhana
        const topic = data.topic;
        const feedData = data.feed.toString();
        
        // Mengambil judul dan link menggunakan regex sederhana dari XML feed
        const titleMatch = feedData.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const linkMatch = feedData.match(/<link href="([^"]+)"|<link>([^<]+)/);
        
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Artikel Baru';
        let link = '';
        if (linkMatch) {
            link = linkMatch[1] || linkMatch[2];
        }

        // Supaya tidak mengirim ulang feed kosong/setup awal
        if (title && link) {
            const pesan = `📰 *Artikel Baru!*\n\n*${title}*\n\n🔗 ${link}`;
            bot.telegram.sendMessage(CHANNEL_ID, pesan, { parse_mode: "Markdown" });
        }
    } catch (error) {
        console.error("Gagal memproses feed:", error);
    }
});
