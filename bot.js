const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const express = require('express');
const readline = require('readline');

// =========== CONFIGURATION (SAB KUCH CODE MEIN) ===========
const CONFIG = {
    // Bot Settings
    BOT_NAME: 'RDX Bot',
    PREFIX: '.',
    OWNER_NAME: 'Ahmad RDX',
    OWNER_NUMBER: '923000000000', // Apna WhatsApp number
    
    // Login Settings
    LOGIN_METHOD: 'pairing', // 'pairing' ya 'qr'
    
    // Dashboard Settings
    DASHBOARD_PORT: 3000,
    DASHBOARD_USERNAME: 'admin',
    DASHBOARD_PASSWORD: 'ahmadrdx123',
    
    // Allowed Users (Bot jin numbers par lagega)
    ALLOWED_USERS: [
        '923000000000@s.whatsapp.net', // Number 1
        '923000000001@s.whatsapp.net', // Number 2
        // Aur numbers add karo
    ],
    
    // Admin Numbers (Dashboard access + Bot control)
    ADMIN_NUMBERS: [
        '923000000000', // Admin 1
    ],
    
    SESSION_DIR: './session',
    DATA_DIR: './data',
    CACHE_DIR: './cache'
};

// Bot settings (runtime changeable)
let botSettings = {
    prefix: CONFIG.PREFIX,
    allowedUsers: [...CONFIG.ALLOWED_USERS],
    adminNumbers: [...CONFIG.ADMIN_NUMBERS],
    autoReply: true,
    welcomeNewUsers: true
};

// =========== DATA STORAGE ===========
let botData = {
    users: {},         // User info store
    messages: [],      // Message logs
    commandsUsed: {},  // Command statistics
    bannedUsers: [],   // Banned users
    pairs: {}          // User pairs
};

// Load existing data
try {
    const dataPath = path.join(CONFIG.DATA_DIR, 'botData.json');
    if (fs.existsSync(dataPath)) {
        botData = JSON.parse(fs.readFileSync(dataPath));
    }
} catch (e) {}

// Save data function
function saveData() {
    fs.ensureDirSync(CONFIG.DATA_DIR);
    fs.writeFileSync(
        path.join(CONFIG.DATA_DIR, 'botData.json'),
        JSON.stringify(botData, null, 2)
    );
}

// =========== EXPRESS DASHBOARD ===========
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Basic ${Buffer.from(`${CONFIG.DASHBOARD_USERNAME}:${CONFIG.DASHBOARD_PASSWORD}`).toString('base64')}`) {
        res.set('WWW-Authenticate', 'Basic realm="RDX Bot Dashboard"');
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// =========== DASHBOARD ROUTES ===========

// Dashboard Login Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API: Bot Status
app.get('/api/status', (req, res) => {
    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    
    const memUsage = process.memoryUsage();
    
    res.json({
        bot: {
            name: CONFIG.BOT_NAME,
            status: global.botConnection || 'disconnected',
            prefix: botSettings.prefix,
            uptime: `${d}d ${h}h ${m}m`,
            owner: CONFIG.OWNER_NAME
        },
        stats: {
            totalUsers: Object.keys(botData.users).length,
            totalMessages: botData.messages.length,
            commandsUsed: botData.commandsUsed,
            allowedUsers: botSettings.allowedUsers.length,
            bannedUsers: botData.bannedUsers.length,
            totalPairs: Object.keys(botData.pairs).length
        },
        system: {
            memory: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            platform: process.platform,
            nodeVersion: process.version
        },
        timestamp: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

// API: All Users List
app.get('/api/users', authMiddleware, (req, res) => {
    const usersList = Object.entries(botData.users).map(([jid, user]) => ({
        jid: jid,
        number: jid.split('@')[0],
        name: user.name || 'Unknown',
        role: botSettings.adminNumbers.includes(jid.split('@')[0]) ? 'admin' : 'user',
        allowed: botSettings.allowedUsers.includes(jid),
        banned: botData.bannedUsers.includes(jid),
        messageCount: user.messageCount || 0,
        lastSeen: user.lastSeen || 'Never',
        firstSeen: user.firstSeen || 'Never'
    }));
    res.json(usersList);
});

// API: Add User
app.post('/api/users/add', authMiddleware, (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Number required' });
    
    const jid = `${number}@s.whatsapp.net`;
    if (!botSettings.allowedUsers.includes(jid)) {
        botSettings.allowedUsers.push(jid);
        res.json({ success: true, message: `User ${number} added!` });
    } else {
        res.json({ success: false, message: 'User already exists!' });
    }
});

// API: Remove User
app.post('/api/users/remove', authMiddleware, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    botSettings.allowedUsers = botSettings.allowedUsers.filter(u => u !== jid);
    res.json({ success: true, message: `User ${number} removed!` });
});

// API: Ban User
app.post('/api/users/ban', authMiddleware, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    if (!botData.bannedUsers.includes(jid)) {
        botData.bannedUsers.push(jid);
        saveData();
    }
    res.json({ success: true, message: `User ${number} banned!` });
});

// API: Unban User
app.post('/api/users/unban', authMiddleware, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    botData.bannedUsers = botData.bannedUsers.filter(u => u !== jid);
    saveData();
    res.json({ success: true, message: `User ${number} unbanned!` });
});

// API: Update Settings
app.post('/api/settings', authMiddleware, (req, res) => {
    const { prefix, autoReply, welcomeNewUsers } = req.body;
    
    if (prefix) botSettings.prefix = prefix;
    if (typeof autoReply === 'boolean') botSettings.autoReply = autoReply;
    if (typeof welcomeNewUsers === 'boolean') botSettings.welcomeNewUsers = welcomeNewUsers;
    
    res.json({ success: true, settings: botSettings });
});

// API: Message Logs
app.get('/api/logs', authMiddleware, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = botData.messages.slice(-limit).reverse();
    res.json(logs);
});

// API: Send Broadcast
app.post('/api/broadcast', authMiddleware, async (req, res) => {
    const { message } = req.body;
    if (!message || !global.sock) return res.status(400).json({ error: 'Message required or bot not ready' });
    
    let sentCount = 0;
    for (const user of botSettings.allowedUsers) {
        if (!botData.bannedUsers.includes(user)) {
            try {
                await global.sock.sendMessage(user, { text: `📢 *Broadcast:*\n\n${message}` });
                sentCount++;
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {}
        }
    }
    
    res.json({ success: true, sentTo: sentCount });
});

// Start Dashboard Server
app.listen(CONFIG.DASHBOARD_PORT, '0.0.0.0', () => {
    console.log(`\n🌐 Dashboard: http://0.0.0.0:${CONFIG.DASHBOARD_PORT}`);
    console.log(`👤 Username: ${CONFIG.DASHBOARD_USERNAME}`);
    console.log(`🔑 Password: ${CONFIG.DASHBOARD_PASSWORD}`);
});

// =========== COMMANDS ===========
const commands = new Map();

commands.set('prefix', {
    name: 'prefix',
    aliases: ['px'],
    execute: async (sock, msg, args) => {
        const reply = `╔══════════════════╗
║  ✦ RDX PREFIX ✦  ║
╚══════════════════╝

👑 Owner: ${CONFIG.OWNER_NAME}
🤖 Bot: ${CONFIG.BOT_NAME}
⚡ Prefix: [ ${botSettings.prefix} ]

💡 ${botSettings.prefix}help | ${botSettings.prefix}menu`;
        
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

commands.set('info', {
    name: 'info',
    aliases: ['botinfo'],
    execute: async (sock, msg, args) => {
        const uptime = process.uptime();
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        
        const reply = `╔══════════════════╗
║   ✦ RDX BOT ✦   ║
╚══════════════════╝

👑 Owner: ${CONFIG.OWNER_NAME}
🤖 Bot: ${CONFIG.BOT_NAME}
⚡ Prefix: [ ${botSettings.prefix} ]
⏱️ Uptime: ${d}d ${h}h ${m}m
👥 Users: ${Object.keys(botData.users).length}
📊 Commands: ${commands.size}

💡 ${botSettings.prefix}help`;
        
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

commands.set('help', {
    name: 'help',
    aliases: ['menu'],
    execute: async (sock, msg, args) => {
        let help = `╔══════════════════╗
║  ✦ RDX MENU ✦  ║
╚══════════════════╝\n\n`;
        
        commands.forEach(cmd => {
            help += `⚡ ${botSettings.prefix}${cmd.name}\n`;
        });
        
        help += `\n🔥 Powered by ${CONFIG.OWNER_NAME}`;
        await sock.sendMessage(msg.key.remoteJid, { text: help });
    }
});

// =========== MESSAGE HANDLER ===========
async function handleMessage(sock, msg) {
    const { key, message } = msg;
    const remoteJid = key.remoteJid;
    
    if (remoteJid === 'status@broadcast' || key.fromMe) return;
    
    // Check banned
    if (botData.bannedUsers.includes(remoteJid)) return;
    
    // Check allowed (agar allowed users list mein hai)
    const number = remoteJid.split('@')[0];
    if (botSettings.allowedUsers.length > 0 && !botSettings.allowedUsers.includes(remoteJid)) {
        if (!botSettings.adminNumbers.includes(number)) {
            return; // Not allowed user
        }
    }
    
    // Track user
    if (!botData.users[remoteJid]) {
        botData.users[remoteJid] = {
            firstSeen: moment().format(),
            messageCount: 0,
            name: ''
        };
    }
    botData.users[remoteJid].lastSeen = moment().format();
    botData.users[remoteJid].messageCount = (botData.users[remoteJid].messageCount || 0) + 1;
    
    // Extract text
    let text = '';
    if (message?.conversation) text = message.conversation;
    else if (message?.extendedTextMessage?.text) text = message.extendedTextMessage.text;
    else if (message?.imageMessage?.caption) text = message.imageMessage.caption;
    
    // Log message
    botData.messages.push({
        from: remoteJid,
        text: text.substring(0, 100),
        time: moment().format()
    });
    if (botData.messages.length > 500) botData.messages.shift();
    saveData();
    
    // Handle "prefix" without prefix
    if (text.trim().toLowerCase() === 'prefix') {
        const cmd = commands.get('prefix');
        return cmd.execute(sock, msg, []);
    }
    
    // Prefix check
    if (!text.startsWith(botSettings.prefix)) return;
    
    const args = text.slice(botSettings.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    
    let command = commands.get(commandName);
    if (!command) {
        for (const [key, cmd] of commands) {
            if (cmd.aliases?.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }
    
    if (command) {
        try {
            await command.execute(sock, msg, args);
            
            botData.commandsUsed[commandName] = (botData.commandsUsed[commandName] || 0) + 1;
            console.log(`✅ ${commandName} | ${remoteJid}`);
        } catch (error) {
            console.error(`❌ Error:`, error);
        }
    }
}

// =========== START BOT ===========
async function startBot() {
    console.log('╔══════════════════════════════╗');
    console.log('║   🤖 RDX WHATSAPP BOT      ║');
    console.log('║   🔥 Ahmad RDX Premium     ║');
    console.log('╚══════════════════════════════╝\n');
    
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('RDX Bot')
    });
    
    global.sock = sock;
    
    // Pairing code request
    if (CONFIG.LOGIN_METHOD === 'pairing' && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(CONFIG.OWNER_NUMBER);
                console.log('\n╔══════════════════════════╗');
                console.log('║   🔑 PAIRING CODE       ║');
                console.log(`║   🔢 ${code}              ║`);
                console.log('╚══════════════════════════╝');
            } catch (error) {
                console.error('Pairing error:', error.message);
            }
        }, 3000);
    }
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr && CONFIG.LOGIN_METHOD === 'qr') {
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            global.botConnection = 'connected';
            console.log('\n✅ Bot Connected!');
        }
        
        if (connection === 'close') {
            global.botConnection = 'disconnected';
            const code = update.lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
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

// Start Everything
startBot().catch(console.error);
