const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// Dashboard HTML
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RDX Bot</title>
    <style>
        body{background:#0a0e17;color:#fff;font-family:sans-serif;text-align:center;padding:50px}
        h1{color:#22c55e;font-size:60px}
        p{color:#9ca3af;font-size:20px}
        .card{background:#111827;border:2px solid #22c55e;border-radius:20px;padding:40px;max-width:500px;margin:20px auto}
        .btn{background:#22c55e;color:#000;padding:12px 30px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;margin:10px}
    </style>
</head>
<body>
    <h1>🤖 RDX BOT</h1>
    <div class="card">
        <p>✅ Bot Status: <span style="color:#22c55e">Online</span></p>
        <p>👑 Owner: Ahmad RDX</p>
        <p>⚡ Prefix: .</p>
        <a href="/api/status" class="btn">📊 API Status</a>
    </div>
</body>
</html>`);
});

// Status API
app.get('/api/status', (req, res) => {
    res.json({
        bot: { name: 'RDX Bot', status: 'online', prefix: '.', owner: 'Ahmad RDX' },
        system: { platform: process.platform, memory: process.memoryUsage().heapUsed },
        time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});
