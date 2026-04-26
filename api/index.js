const express = require('express');
const path = require('path');
const moment = require('moment-timezone');

const app = express();
app.use(express.json());

// Dashboard serve karo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Status API
app.get('/api/status', (req, res) => {
    const uptime = Math.floor((Date.now() - (global.startTime || Date.now())) / 1000);
    
    res.json({
        bot: {
            name: 'RDX Bot',
            status: 'active',
            prefix: '.',
            owner: 'Ahmad RDX',
            uptime: `${Math.floor(uptime/86400)}d ${Math.floor((uptime%86400)/3600)}h ${Math.floor((uptime%3600)/60)}m`
        },
        stats: {
            totalUsers: 0,
            allowedUsers: 0,
            bannedUsers: 0
        },
        time: new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
    });
});

// Vercel ke liye export
module.exports = app;
