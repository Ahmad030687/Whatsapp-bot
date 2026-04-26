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

// =========== ⚙️ CONFIGURATION ===========
const CONFIG = {
    BOT_NAME: 'RDX Bot',
    PREFIX: '.',
    OWNER_NAME: 'Ahmad RDX',
    OWNER_NUMBER: '923156894148',
    LOGIN_METHOD: 'pairing',
    
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'ahmadrdx123',
    
    ALLOWED_USERS: [],
    ADMIN_NUMBERS: ['923156894148'],
    
    SESSION_DIR: './session',
    DATA_DIR: './data'
};

// =========== 📦 GLOBAL VARIABLES ===========
global.botConnection = 'connecting';
global.sock = null;
global.startTime = Date.now();

let botSettings = {
    prefix: CONFIG.PREFIX,
    autoReply: true
};

let botData = {
    users: {},
    messages: [],
    commandsUsed: {},
    bannedUsers: [],
    allowedUsers: CONFIG.ALLOWED_USERS,
    adminNumbers: CONFIG.ADMIN_NUMBERS
};

// Load saved data
try {
    const dataPath = path.join(CONFIG.DATA_DIR, 'botData.json');
    if (fs.existsSync(dataPath)) {
        const saved = JSON.parse(fs.readFileSync(dataPath));
        botData = { ...botData, ...saved };
    }
} catch (e) {}

function saveData() {
    fs.ensureDirSync(CONFIG.DATA_DIR);
    fs.writeFileSync(path.join(CONFIG.DATA_DIR, 'botData.json'), JSON.stringify(botData, null, 2));
}

// =========== 🌐 EXPRESS SERVER ===========
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Auth check
function checkAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) {
        res.set('WWW-Authenticate', 'Basic realm="RDX Bot Dashboard"');
        return res.status(401).send('Authentication required');
    }
    const [username, password] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
        return next();
    }
    return res.status(403).send('Access Denied');
}

// =========== 📊 API ROUTES ===========

// Status API
app.get('/api/status', (req, res) => {
    const uptime = Math.floor((Date.now() - global.startTime) / 1000);
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    
    const mem = process.memoryUsage();
    
    res.json({
        success: true,
        bot: {
            name: CONFIG.BOT_NAME,
            status: global.botConnection,
            prefix: botSettings.prefix,
            owner: CONFIG.OWNER_NAME,
            uptime: `${d}d ${h}h ${m}m ${s}s`,
            startTime: moment(global.startTime).tz('Asia/Karachi').format('DD/MM/YYYY hh:mm A')
        },
        stats: {
            totalUsers: Object.keys(botData.users).length,
            allowedUsers: botData.allowedUsers.length,
            bannedUsers: botData.bannedUsers.length,
            totalMessages: botData.messages.length,
            commandsUsed: Object.keys(botData.commandsUsed).length,
            adminNumbers: botData.adminNumbers.length
        },
        system: {
            memoryUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
            memoryTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
            memoryPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
        },
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

// Users API
app.get('/api/users', checkAuth, (req, res) => {
    const users = Object.entries(botData.users).map(([jid, data]) => {
        const number = jid.split('@')[0];
        return {
            jid,
            number,
            name: data.name || 'Unknown',
            isAllowed: botData.allowedUsers.includes(jid),
            isAdmin: botData.adminNumbers.includes(number),
            isBanned: botData.bannedUsers.includes(jid),
            messageCount: data.messageCount || 0,
            firstSeen: data.firstSeen || 'N/A',
            lastSeen: data.lastSeen || 'N/A'
        };
    });
    res.json({ success: true, users });
});

// Add User
app.post('/api/users/add', checkAuth, (req, res) => {
    const { number } = req.body;
    if (!number) return res.json({ success: false, message: 'Number required' });
    
    const jid = `${number}@s.whatsapp.net`;
    if (!botData.allowedUsers.includes(jid)) {
        botData.allowedUsers.push(jid);
        saveData();
        return res.json({ success: true, message: `✅ User ${number} added successfully!` });
    }
    res.json({ success: false, message: '⚠️ User already exists!' });
});

// Remove User
app.post('/api/users/remove', checkAuth, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    botData.allowedUsers = botData.allowedUsers.filter(u => u !== jid);
    delete botData.users[jid];
    saveData();
    res.json({ success: true, message: `🗑️ User ${number} removed!` });
});

// Ban User
app.post('/api/users/ban', checkAuth, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    if (!botData.bannedUsers.includes(jid)) {
        botData.bannedUsers.push(jid);
        saveData();
        return res.json({ success: true, message: `🚫 User ${number} banned!` });
    }
    res.json({ success: false, message: 'Already banned!' });
});

// Unban User
app.post('/api/users/unban', checkAuth, (req, res) => {
    const { number } = req.body;
    const jid = `${number}@s.whatsapp.net`;
    botData.bannedUsers = botData.bannedUsers.filter(u => u !== jid);
    saveData();
    res.json({ success: true, message: `✅ User ${number} unbanned!` });
});

// Update Settings
app.post('/api/settings', checkAuth, (req, res) => {
    const { prefix, autoReply } = req.body;
    if (prefix) botSettings.prefix = prefix;
    if (typeof autoReply === 'boolean') botSettings.autoReply = autoReply;
    res.json({ success: true, message: '✅ Settings updated!', settings: botSettings });
});

// Get Logs
app.get('/api/logs', checkAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const logs = botData.messages.slice(-limit).reverse();
    res.json({ success: true, logs });
});

// Broadcast
app.post('/api/broadcast', checkAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.json({ success: false, message: 'Message required!' });
    if (!global.sock) return res.json({ success: false, message: 'Bot not connected!' });
    
    let sent = 0;
    let failed = 0;
    
    for (const jid of botData.allowedUsers) {
        if (!botData.bannedUsers.includes(jid)) {
            try {
                await global.sock.sendMessage(jid, { 
                    text: `📢 *BROADCAST*\n\n${message}\n\n━━━━━━━━━━━━━━━\n🤖 ${CONFIG.BOT_NAME}\n👑 ${CONFIG.OWNER_NAME}` 
                });
                sent++;
                await new Promise(r => setTimeout(r, 1500));
            } catch (e) {
                failed++;
            }
        }
    }
    
    res.json({ success: true, message: `📤 Sent to ${sent} users! (${failed} failed)` });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 Dashboard: http://0.0.0.0:${PORT}`);
    console.log(`👤 Username: ${CONFIG.ADMIN_USERNAME}`);
    console.log(`🔑 Password: ${CONFIG.ADMIN_PASSWORD}\n`);
});

// =========== 🤖 WHATSAPP COMMANDS ===========
const commands = new Map();

commands.set('prefix', {
    name: 'prefix',
    aliases: ['px', 'pf'],
    execute: async (sock, msg) => {
        const reply = `╔══════════════════════╗
║   ✦ RDX PREFIX ✦   ║
╚══════════════════════╝

👑 Owner: ${CONFIG.OWNER_NAME}
🤖 Bot: ${CONFIG.BOT_NAME}
⚡ Prefix: [ ${botSettings.prefix} ]

💡 ${botSettings.prefix}help | ${botSettings.prefix}menu`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

commands.set('info', {
    name: 'info',
    aliases: ['botinfo', 'status'],
    execute: async (sock, msg) => {
        const uptime = Math.floor((Date.now() - global.startTime) / 1000);
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        
        const reply = `╔══════════════════════╗
║   ✦ RDX BOT INFO ✦  ║
╚══════════════════════╝

👑 Owner: ${CONFIG.OWNER_NAME}
🤖 Bot: ${CONFIG.BOT_NAME}
⚡ Prefix: ${botSettings.prefix}
⏱️ Uptime: ${d}d ${h}h ${m}m ${s}s
💾 RAM: ${mem}MB
👥 Users: ${Object.keys(botData.users).length}
📊 Commands: ${commands.size}
🟢 Status: ${global.botConnection}`;
        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

commands.set('help', {
    name: 'help',
    aliases: ['menu', 'cmds'],
    execute: async (sock, msg) => {
        let text = `╔══════════════════════╗
║   ✦ RDX MENU ✦    ║
╚══════════════════════╝\n\n`;
        commands.forEach(cmd => {
            text += `⚡ ${botSettings.prefix}${cmd.name}\n   ${cmd.aliases ? 'Aliases: ' + cmd.aliases.join(', ') : ''}\n\n`;
        });
        text += `🔥 ${CONFIG.OWNER_NAME}`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    }
});

// =========== MESSAGE HANDLER ===========
async function handleMessage(sock, msg) {
    const { key, message } = msg;
    const remoteJid = key.remoteJid;
    
    if (remoteJid === 'status@broadcast' || key.fromMe) return;
    if (botData.bannedUsers.includes(remoteJid)) return;
    
    const number = remoteJid.split('@')[0];
    const isAdmin = botData.adminNumbers.includes(number);
    const isAllowed = botData.allowedUsers.includes(remoteJid);
    
    if (!isAdmin && !isAllowed && botData.allowedUsers.length > 0) return;
    
    // Track user
    if (!botData.users[remoteJid]) {
        botData.users[remoteJid] = { firstSeen: moment().format(), messageCount: 0, name: '' };
    }
    botData.users[remoteJid].lastSeen = moment().format();
    botData.users[remoteJid].messageCount++;
    
    let text = '';
    if (message?.conversation) text = message.conversation;
    else if (message?.extendedTextMessage?.text) text = message.extendedTextMessage.text;
    else if (message?.imageMessage?.caption) text = message.imageMessage.caption;
    
    if (!text) return;
    
    // Log
    botData.messages.push({ from: number, text: text.substring(0, 100), time: moment().format() });
    if (botData.messages.length > 200) botData.messages = botData.messages.slice(-200);
    if (Math.random() < 0.1) saveData();
    
    // "prefix" without prefix
    if (text.trim().toLowerCase() === 'prefix') {
        return commands.get('prefix').execute(sock, msg);
    }
    
    if (!text.startsWith(botSettings.prefix)) return;
    
    const args = text.slice(botSettings.prefix.length).trim().split(/ +/);
    const cmdName = args.shift()?.toLowerCase();
    
    let command = commands.get(cmdName);
    if (!command) {
        for (const [k, v] of commands) {
            if (v.aliases?.includes(cmdName)) { command = v; break; }
        }
    }
    
    if (command) {
        try {
            await command.execute(sock, msg, args);
            botData.commandsUsed[cmdName] = (botData.commandsUsed[cmdName] || 0) + 1;
        } catch (e) {
            console.error('Command error:', e);
        }
    }
}

// =========== 🚀 START BOT ===========
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
        browser: Browsers.ubuntu('RDX Bot'),
        logger: require('pino')({ level: 'silent' })
    });
    
    global.sock = sock;
    
    if (CONFIG.LOGIN_METHOD === 'pairing' && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(CONFIG.OWNER_NUMBER);
                console.log('╔══════════════════════════╗');
                console.log('║   🔑 PAIRING CODE       ║');
                console.log(`║   🔢 ${code}              ║`);
                console.log('╚══════════════════════════╝');
                console.log('\n📱 WhatsApp → Linked Devices → Link with phone number → Code enter karo!\n');
            } catch (e) {
                console.error('Pairing error:', e.message);
            }
        }, 3000);
    }
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) { qrcode.generate(qr, { small: true }); }
        if (connection === 'open') {
            global.botConnection = 'connected';
            console.log('✅ Connected!');
        }
        if (connection === 'close') {
            global.botConnection = 'disconnected';
            if (update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
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

startBot().catch(console.error);
