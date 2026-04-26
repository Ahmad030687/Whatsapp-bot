const express = require('express');
const moment = require('moment-timezone');
const app = express();

app.get('/', (req, res) => {
    res.json({
        bot: 'RDX Bot',
        status: 'Active',
        owner: 'Ahmad RDX',
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A')
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        bot: { name: 'RDX Bot', status: 'active', prefix: '.', owner: 'Ahmad RDX' },
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

module.exports = app;
