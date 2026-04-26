const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const qrcode = require('qrcode-terminal');

// =========== CONFIG ===========
const CONFIG = {
    BOT_NAME: 'RDX Bot',
    OWNER_NAME: 'Ahmad RDX',
    DASHBOARD_USER: 'admin',
    DASHBOARD_PASS: 'ahmadrdx123',
    SESSION_DIR: path.join(__dirname, 'session'),
    DATA_DIR: path.join(__dirname, 'data')
};

// =========== GLOBAL STATE ===========
global.botConnection = 'disconnected';
global.sock = null;
global.startTime = Date.now();

// Default settings - Admin panel se change honge
let botConfig = {
    prefix: '.',
    ownerNumber: '', // Admin panel se set hoga
    ownerName: 'Ahmad RDX',
    botName: 'RDX Bot',
    loginMethod: 'pairing', // 'pairing' ya 'qr'
    allowedUsers: [],
    adminNumbers: [],
    autoReply: true,
    welcomeMessage: 'Welcome to RDX Bot! 🤖',
    bannedUsers: []
};

let botStats = {
    users: {},
    messages: [],
    commandsUsed: {},
    totalMessages: 0,
    startTime: Date.now()
};

// Load saved data
try {
    const configPath = path.join(CONFIG.DATA_DIR, 'config.json');
    const statsPath = path.join(CONFIG.DATA_DIR, 'stats.json');
    
    if (fs.existsSync(configPath)) {
        botConfig = { ...botConfig, ...JSON.parse(fs.readFileSync(configPath)) };
    }
    if (fs.existsSync(statsPath)) {
        botStats = { ...botStats, ...JSON.parse(fs.readFileSync(statsPath)) };
    }
} catch (e) {
    console.error('Load error:', e.message);
}

// Save function
function saveData() {
    fs.ensureDirSync(CONFIG.DATA_DIR);
    fs.writeFileSync(path.join(CONFIG.DATA_DIR, 'config.json'), JSON.stringify(botConfig, null, 2));
    fs.writeFileSync(path.join(CONFIG.DATA_DIR, 'stats.json'), JSON.stringify(botStats, null, 2));
}

// =========== EXPRESS SERVER ===========
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Auth middleware
function checkAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) {
        res.set('WWW-Authenticate', 'Basic realm="RDX Admin"');
        return res.status(401).json({ error: 'Auth required' });
    }
    try {
        const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        if (user === CONFIG.DASHBOARD_USER && pass === CONFIG.DASHBOARD_PASS) {
            return next();
        }
    } catch (e) {}
    return res.status(403).json({ error: 'Access denied' });
}

// =========== API ROUTES ===========

// Status API (Public)
app.get('/api/status', (req, res) => {
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    const mem = process.memoryUsage();
    
    res.json({
        bot: {
            name: botConfig.botName,
            status: global.botConnection,
            prefix: botConfig.prefix,
            owner: botConfig.ownerName,
            ownerNumber: botConfig.ownerNumber,
            uptime: `${d}d ${h}h ${m}m ${s}s`,
            loginMethod: botConfig.loginMethod
        },
        stats: {
            totalUsers: Object.keys(botStats.users).length,
            allowedUsers: botConfig.allowedUsers.length,
            bannedUsers: botConfig.bannedUsers.length,
            totalMessages: botStats.totalMessages,
            commandsUsed: Object.keys(botStats.commandsUsed).length
        },
        system: {
            memory: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
            platform: process.platform,
            pid: process.pid
        },
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

// Get Config (Admin)
app.get('/api/config', checkAuth, (req, res) => {
    const { dashboardUser, dashboardPass, ...safeConfig } = { ...botConfig, dashboardUser: CONFIG.DASHBOARD_USER };
    res.json(safeConfig);
});

// Update Config (Admin)
app.post('/api/config', checkAuth, (req, res) => {
    const { prefix, ownerNumber, ownerName, botName, loginMethod, autoReply, welcomeMessage } = req.body;
    
    if (prefix) botConfig.prefix = prefix;
    if (ownerNumber) botConfig.ownerNumber = ownerNumber;
    if (ownerName) botConfig.ownerName = ownerName;
    if (botName) botConfig.botName = botName;
    if (loginMethod) botConfig.loginMethod = loginMethod;
    if (typeof autoReply === 'boolean') botConfig.autoReply = autoReply;
    if (welcomeMessage) botConfig.welcomeMessage = welcomeMessage;
    
    saveData();
    res.json({ success: true, message: '✅ Config updated!', config: botConfig });
});

// Get Users (Admin)
app.get('/api/users', checkAuth, (req, res) => {
    const users = Object.entries(botStats.users).map(([jid, data]) => {
        const number = jid.split('@')[0];
        return {
            jid,
            number,
            name: data.name || 'Unknown',
            isAllowed: botConfig.allowedUsers.includes(number),
            isAdmin: botConfig.adminNumbers.includes(number),
            isBanned: botConfig.bannedUsers.includes(number),
            messageCount: data.messageCount || 0,
            firstSeen: data.firstSeen || 'N/A',
            lastSeen: data.lastSeen || 'N/A'
        };
    });
    res.json({ success: true, users });
});

// Add Allowed Number (Admin)
app.post('/api/users/add', checkAuth, (req, res) => {
    const { number } = req.body;
    if (!number) return res.json({ success: false, message: '❌ Number required!' });
    
    if (!botConfig.allowedUsers.includes(number)) {
        botConfig.allowedUsers.push(number);
        saveData();
        return res.json({ success: true, message: `✅ ${number} added!` });
    }
    res.json({ success: false, message: '⚠️ Already exists!' });
});

// Remove Number (Admin)
app.post('/api/users/remove', checkAuth, (req, res) => {
    const { number } = req.body;
    botConfig.allowedUsers = botConfig.allowedUsers.filter(n => n !== number);
    saveData();
    res.json({ success: true, message: `🗑️ ${number} removed!` });
});

// Ban Number (Admin)
app.post('/api/users/ban', checkAuth, (req, res) => {
    const { number } = req.body;
    if (!botConfig.bannedUsers.includes(number)) {
        botConfig.bannedUsers.push(number);
        saveData();
        return res.json({ success: true, message: `🚫 ${number} banned!` });
    }
    res.json({ success: false, message: 'Already banned!' });
});

// Unban Number (Admin)
app.post('/api/users/unban', checkAuth, (req, res) => {
    const { number } = req.body;
    botConfig.bannedUsers = botConfig.bannedUsers.filter(n => n !== number);
    saveData();
    res.json({ success: true, message: `✅ ${number} unbanned!` });
});

// Add Admin Number (Admin)
app.post('/api/users/add-admin', checkAuth, (req, res) => {
    const { number } = req.body;
    if (!botConfig.adminNumbers.includes(number)) {
        botConfig.adminNumbers.push(number);
        saveData();
        return res.json({ success: true, message: `👑 ${number} is now admin!` });
    }
    res.json({ success: false, message: 'Already admin!' });
});

// Get Logs (Admin)
app.get('/api/logs', checkAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = botStats.messages.slice(-limit).reverse();
    res.json({ success: true, logs });
});

// Broadcast (Admin)
app.post('/api/broadcast', checkAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.json({ success: false, message: 'Message required!' });
    if (!global.sock) return res.json({ success: false, message: 'Bot not connected!' });
    
    let sent = 0;
    for (const number of botConfig.allowedUsers) {
        if (!botConfig.bannedUsers.includes(number)) {
            try {
                const jid = `${number}@s.whatsapp.net`;
                await global.sock.sendMessage(jid, { 
                    text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━\n🤖 ${botConfig.botName}\n👑 ${botConfig.ownerName}` 
                });
                sent++;
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {}
        }
    }
    res.json({ success: true, message: `✅ Sent to ${sent} users!` });
});

// Restart Bot (Admin)
app.post('/api/restart', checkAuth, async (req, res) => {
    res.json({ success: true, message: '🔄 Restarting bot...' });
    if (global.sock) {
        try { global.sock.end(); } catch (e) {}
    }
    setTimeout(startBot, 2000);
});

// Connect Bot with Number (Admin)
app.post('/api/connect', checkAuth, async (req, res) => {
    const { number, method } = req.body;
    if (!number) return res.json({ success: false, message: 'Number required!' });
    
    botConfig.ownerNumber = number;
    botConfig.loginMethod = method || 'pairing';
    saveData();
    
    res.json({ success: true, message: `🔄 Connecting to ${number}... Check logs for pairing code!` });
    
    // Restart bot with new number
    if (global.sock) {
        try { global.sock.end(); } catch (e) {}
    }
    setTimeout(startBot, 2000);
});

// =========== WHATSAPP BOT ===========
const commands = {
    prefix: async (sock, msg) => {
        const reply = `╔══════════════════════╗
║   ✦ RDX PREFIX ✦   ║
╚══════════════════════╝

👑 Owner: ${botConfig.ownerName}
🤖 Bot: ${botConfig.botName}
⚡ Prefix: [ ${botConfig.prefix} ]

💡 ${botConfig.prefix}help | ${botConfig.prefix}menu`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    },
    
    info: async (sock, msg) => {
        const uptime = Math.floor((Date.now() - global.startTime) / 1000);
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        
        const reply = `╔══════════════════════╗
║   ✦ RDX BOT ✦   ║
╚══════════════════════╝

👑 Owner: ${botConfig.ownerName}
🤖 Bot: ${botConfig.botName}
⚡ Prefix: ${botConfig.prefix}
⏱️ Uptime: ${d}d ${h}h ${m}m
👥 Users: ${Object.keys(botStats.users).length}
🟢 Status: ${global.botConnection}`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    },
    
    help: async (sock, msg) => {
        const reply = `╔══════════════════════╗
║   ✦ RDX MENU ✦   ║
╚══════════════════════╝

⚡ ${botConfig.prefix}prefix - Bot prefix
⚡ ${botConfig.prefix}info - Bot info
⚡ ${botConfig.prefix}help - Commands list
⚡ ${botConfig.prefix}ping - Check latency
⚡ ${botConfig.prefix}owner - Owner contact

🔥 ${botConfig.ownerName}`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    },
    
    ping: async (sock, msg) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
        const latency = Date.now() - start;
        await sock.sendMessage(msg.key.remoteJid, { text: `⚡ Latency: ${latency}ms\n🟢 Status: ${global.botConnection}` });
    },
    
    owner: async (sock, msg) => {
        const reply = `╔══════════════════════╗
║  👑 OWNER CONTACT  ║
╚══════════════════════╝

👤 Name: ${botConfig.ownerName}
📱 Number: ${botConfig.ownerNumber || 'N/A'}
🤖 Bot: ${botConfig.botName}
📍 Pakistan

🔥 ${botConfig.ownerName}`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
};

// Message Handler
async function handleMessage(sock, msg) {
    const { key, message } = msg;
    const remoteJid = key.remoteJid;
    
    if (remoteJid === 'status@broadcast' || key.fromMe) return;
    
    const number = remoteJid.split('@')[0];
    
    // Check banned
    if (botConfig.bannedUsers.includes(number)) return;
    
    // Check allowed (agar list khali nahi hai)
    if (botConfig.allowedUsers.length > 0 && !botConfig.allowedUsers.includes(number) && !botConfig.adminNumbers.includes(number)) {
        return;
    }
    
    // Track user
    if (!botStats.users[remoteJid]) {
        botStats.users[remoteJid] = { firstSeen: moment().format(), messageCount: 0, name: '' };
    }
    botStats.users[remoteJid].lastSeen = moment().format();
    botStats.users[remoteJid].messageCount++;
    botStats.totalMessages++;
    
    // Extract text
    let text = '';
    if (message?.conversation) text = message.conversation;
    else if (message?.extendedTextMessage?.text) text = message.extendedTextMessage.text;
    else if (message?.imageMessage?.caption) text = message.imageMessage.caption;
    
    if (!text) return;
    
    // Log
    botStats.messages.push({ from: number, text: text.substring(0, 100), time: moment().format() });
    if (botStats.messages.length > 200) botStats.messages = botStats.messages.slice(-200);
    
    // Auto-save every 50 messages
    if (botStats.totalMessages % 50 === 0) saveData();
    
    // "prefix" without prefix
    if (text.trim().toLowerCase() === 'prefix') {
        return commands.prefix(sock, msg);
    }
    
    // Command handling
    if (!text.startsWith(botConfig.prefix)) return;
    
    const args = text.slice(botConfig.prefix.length).trim().split(/ +/);
    const cmdName = args.shift()?.toLowerCase();
    
    if (commands[cmdName]) {
        try {
            await commands[cmdName](sock, msg, args);
            botStats.commandsUsed[cmdName] = (botStats.commandsUsed[cmdName] || 0) + 1;
            console.log(`✅ Command: ${cmdName} | ${number}`);
        } catch (e) {
            console.error(`❌ Error in ${cmdName}:`, e.message);
        }
    }
}

// =========== START BOT ===========
async function startBot() {
    console.log('\n╔══════════════════════════════╗');
    console.log('║   🤖 RDX WHATSAPP BOT      ║');
    console.log('║   🔥 Ahmad RDX Premium     ║');
    console.log('╚══════════════════════════════╝\n');
    
    fs.ensureDirSync(CONFIG.SESSION_DIR);
    
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu(botConfig.botName)
    });
    
    global.sock = sock;
    
    // Pairing code ya QR
    if (!sock.authState.creds.registered) {
        if (botConfig.loginMethod === 'pairing' && botConfig.ownerNumber) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(botConfig.ownerNumber);
                    console.log('\n╔══════════════════════════╗');
                    console.log('║   🔑 PAIRING CODE       ║');
                    console.log(`║   📱 ${botConfig.ownerNumber}     ║`);
                    console.log(`║   🔢 ${code}              ║`);
                    console.log('╚══════════════════════════╝');
                    console.log('\n📱 WhatsApp → Linked Devices → Link with phone number → Code enter karo!\n');
                } catch (e) {
                    console.error('❌ Pairing error:', e.message);
                    console.log('📱 QR Code se connect karo ya Admin Panel se number update karo!\n');
                }
            }, 3000);
        } else {
            console.log('📱 Admin Panel mein jao → Settings → Owner Number add karo → Connect karo!\n');
        }
    }
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 QR Code scan karo:\n');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'connecting') {
            global.botConnection = 'connecting';
            console.log('🔄 Connecting...');
        }
        
        if (connection === 'open') {
            global.botConnection = 'connected';
            console.log('✅ Connected!');
            saveData();
        }
        
        if (connection === 'close') {
            global.botConnection = 'disconnected';
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('🚫 Logged out! Admin Panel se reconnect karo.');
                fs.removeSync(CONFIG.SESSION_DIR);
            } else {
                console.log('🔄 Reconnecting in 5s...');
                setTimeout(startBot, 5000);
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || m.type !== 'notify') return;
        await handleMessage(sock, msg);
    });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 Admin Panel: http://0.0.0.0:${PORT}`);
    console.log(`👤 Username: ${CONFIG.DASHBOARD_USER}`);
    console.log(`🔑 Password: ${CONFIG.DASHBOARD_PASS}\n`);
});

// Start bot
startBot().catch(err => {
    console.error('❌ Bot error:', err);
});
