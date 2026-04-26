const express = require('express');
const moment = require('moment-timezone');

const app = express();
app.use(express.json());

// Simple dashboard
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>RDX Bot</title>
<style>body{background:#0a0e17;color:#fff;font-family:sans-serif;text-align:center;padding:50px}h1{color:#22c55e;font-size:48px}p{color:#9ca3af}</style>
</head><body><h1>🤖 RDX BOT</h1><p>Admin Panel Coming Soon...</p><p style="color:#22c55e">⚡ Ahmad RDX</p></body></html>`);
});

// Status API
app.get('/api/status', (req, res) => {
    res.json({
        bot: { name: 'RDX Bot', status: 'active', prefix: '.', owner: 'Ahmad RDX' },
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

module.exports = app;
