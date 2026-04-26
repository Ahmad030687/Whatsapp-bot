const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    Browsers
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const readline = require('readline');
const pino = require('pino');

// =========== CONFIGURATION ===========
const CONFIG = {
    PREFIX: '.',
    BOT_NAME: 'RDX Bot',
    OWNER_NAME: 'Ahmad RDX',
    OWNER_NUMBER: '', // Apna WhatsApp number (without +, with country code)
    SESSION_DIR: './session',
    LOGIN_METHOD: 'pairing', // 'pairing' ya 'qr'
};

// =========== COMMANDS ===========
const commands = new Map();

// Prefix Command
commands.set('prefix', {
    name: 'prefix',
    aliases: ['px', 'pf'],
    description: 'Bot prefix dikhayen',
    category: 'system',
    execute: async (sock, msg, args) => {
        const time = moment().tz('Asia/Karachi').format('hh:mm:ss A');
        const date = moment().tz('Asia/Karachi').format('DD/MM/YYYY');
        
        const uptime = process.uptime();
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        
        let uptimeStr = '';
        if (d > 0) uptimeStr += `${d}d `;
        if (h > 0) uptimeStr += `${h}h `;
        uptimeStr += `${m}m ${s}s`;
        
        const reply = `╔══════════════════╗
║  ✦ RDX PREFIX ✦  ║
╚══════════════════╝

👑 Owner: Ahmad RDX
🤖 Bot: RDX Premium
⚡ Prefix: [ ${CONFIG.PREFIX} ]
🕐 ${time} | ${date}
⏱️ Uptime: ${uptimeStr}

💡 ${CONFIG.PREFIX}help | ${CONFIG.PREFIX}menu
📝 ${CONFIG.PREFIX}prefix bina . ke`;

        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

// Info Command
commands.set('info', {
    name: 'info',
    aliases: ['botinfo', 'bot'],
    description: 'Bot information',
    category: 'system',
    execute: async (sock, msg, args) => {
        const time = moment().tz('Asia/Karachi').format('hh:mm:ss A');
        const date = moment().tz('Asia/Karachi').format('DD/MM/YYYY');
        
        const uptime = process.uptime();
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        
        let uptimeStr = '';
        if (d > 0) uptimeStr += `${d}d `;
        if (h > 0) uptimeStr += `${h}h `;
        uptimeStr += `${m}m ${s}s`;
        
        const totalMem = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const reply = `╔══════════════════╗
║   ✦ RDX BOT ✦   ║
╚══════════════════╝

👑 Owner: Ahmad RDX
🤖 Bot: RDX Premium
📦 Version: 2.0.0
⚡ Prefix: [ ${CONFIG.PREFIX} ]
⏱️ Uptime: ${uptimeStr}
💾 RAM: ${usedMem}/${totalMem}MB
🕐 ${time} | ${date}
🌐 Host: Local Server

━━━━━━━━━━━━━━━━━
💡 ${CONFIG.PREFIX}help | ${CONFIG.PREFIX}menu
🔥 Powered by Ahmad RDX`;

        await sock.sendMessage(msg.key.remoteJid, { text: reply });
    }
});

// Help Command
commands.set('help', {
    name: 'help',
    aliases: ['menu', 'cmds', 'command'],
    description: 'All commands list',
    category: 'system',
    execute: async (sock, msg, args) => {
        const categories = {};
        
        commands.forEach((cmd, key) => {
            if (!categories[cmd.category]) {
                categories[cmd.category] = [];
            }
            categories[cmd.category].push(cmd);
        });
        
        let helpText = `╔══════════════════╗
║  ✦ RDX MENU ✦  ║
╚══════════════════╝\n\n`;
        
        for (const [category, cmds] of Object.entries(categories)) {
            helpText += `📂 *${category.toUpperCase()}*\n`;
            cmds.forEach(cmd => {
                const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
                helpText += `  ⚡ ${CONFIG.PREFIX}${cmd.name}${aliases}\n     ${cmd.description}\n`;
            });
            helpText += '\n';
        }
        
        helpText += `━━━━━━━━━━━━━━━━━\n🔥 Powered by Ahmad RDX`;
        
        await sock.sendMessage(msg.key.remoteJid, { text: helpText });
    }
});

// Sticker Command
commands.set('sticker', {
    name: 'sticker',
    aliases: ['st', 's'],
    description: 'Image/GIF/Video to sticker',
    category: 'tools',
    execute: async (sock, msg, args) => {
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = quoted?.quotedMessage;
            
            let mediaType = null;
            let mediaMessage = null;
            
            if (msg.message?.imageMessage) {
                mediaType = 'image';
                mediaMessage = msg.message.imageMessage;
            } else if (msg.message?.videoMessage) {
                mediaType = 'video';
                mediaMessage = msg.message.videoMessage;
            } else if (quotedMsg?.imageMessage) {
                mediaType = 'image';
                mediaMessage = quotedMsg.imageMessage;
            } else if (quotedMsg?.videoMessage) {
                mediaType = 'video';
                mediaMessage = quotedMsg.videoMessage;
            }
            
            if (mediaMessage && mediaType) {
                const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(
                    mediaMessage, 
                    mediaType
                );
                
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                await sock.sendMessage(msg.key.remoteJid, {
                    sticker: buffer,
                    stickerAuthor: 'RDX Bot',
                    stickerName: 'Ahmad RDX'
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Image/GIF/Video bhejo ya reply karo sticker banane ke liye!'
                });
            }
        } catch (error) {
            console.error('Sticker error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Sticker banane mein error!'
            });
        }
    }
});

// Ping Command
commands.set('ping', {
    name: 'ping',
    aliases: ['pong', 'speed'],
    description: 'Bot latency check',
    category: 'system',
    execute: async (sock, msg, args) => {
        const start = Date.now();
        const sent = await sock.sendMessage(msg.key.remoteJid, { text: '�測 Pinging...' });
        const latency = Date.now() - start;
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `⚡ *Response:* ${latency}ms\n🟢 *Status:* Online\n🔥 *Engine:* RDX Premium` 
        });
    }
});

// Owner Command
commands.set('owner', {
    name: 'owner',
    aliases: ['creator', 'dev', 'ahmad'],
    description: 'Owner contact info',
    category: 'system',
    execute: async (sock, msg, args) => {
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Ahmad RDX\nORG:RDX Bot\nTITLE:Bot Developer\nTEL;type=CELL;type=VOICE;waid=YOUR_NUMBER:+YOUR_NUMBER\nEND:VCARD`;
        
        await sock.sendMessage(msg.key.remoteJid, {
            contacts: {
                displayName: '👑 Ahmad RDX',
                contacts: [{ vcard }]
            }
        });
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👑 *Owner:* Ahmad RDX\n📍 *Location:* Toba Tek Singh, Pakistan\n🤖 *Bot:* RDX Premium v2.0\n🌐 *Host:* Self Hosted\n━━━━━━━━━━━━━━━━━\n🔥 Powered by Ahmad RDX`
        });
    }
});

// =========== MESSAGE HANDLER ===========
async function handleMessage(sock, msg) {
    const { key, message } = msg;
    const remoteJid = key.remoteJid;
    
    if (remoteJid === 'status@broadcast') return;
    if (key.fromMe) return;
    
    let text = '';
    if (message?.conversation) {
        text = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
        text = message.extendedTextMessage.text;
    } else if (message?.imageMessage?.caption) {
        text = message.imageMessage.caption;
    } else if (message?.videoMessage?.caption) {
        text = message.videoMessage.caption;
    }
    
    if (!text) return;
    
    // Bina prefix ke "prefix" command
    if (text.trim().toLowerCase() === 'prefix') {
        const cmd = commands.get('prefix');
        return cmd.execute(sock, msg, []);
    }
    
    // Prefix check
    if (!text.startsWith(CONFIG.PREFIX)) return;
    
    const args = text.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    let command = commands.get(commandName);
    
    if (!command) {
        for (const [key, cmd] of commands) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }
    
    if (command) {
        try {
            await command.execute(sock, msg, args);
            console.log(`✅ [${moment().format('HH:mm:ss')}] ${commandName} | ${remoteJid}`);
        } catch (error) {
            console.error(`❌ Error in ${commandName}:`, error);
            await sock.sendMessage(remoteJid, { text: '❌ Command execute karne mein error!' });
        }
    }
}

// =========== PAIRING CODE LOGIN ===========
async function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// =========== BOT START ===========
async function startBot() {
    console.log('╔══════════════════════════╗');
    console.log('║   🤖 RDX WHATSAPP BOT  ║');
    console.log('║   🔥 Ahmad RDX Premium ║');
    console.log('╚══════════════════════════╝\n');
    
    if (CONFIG.LOGIN_METHOD === 'pairing') {
        if (!CONFIG.OWNER_NUMBER) {
            CONFIG.OWNER_NUMBER = await askQuestion('📱 Apna WhatsApp number enter karo (with country code, without +): ');
        }
        console.log(`\n📱 Number: ${CONFIG.OWNER_NUMBER}`);
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.SESSION_DIR);
    
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`📦 Baileys Version: ${version}`);
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('RDX Bot'),
        logger: pino({ level: 'silent' })
    });
    
    // =========== PAIRING CODE REQUEST ===========
    if (CONFIG.LOGIN_METHOD === 'pairing' && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(CONFIG.OWNER_NUMBER);
                console.log('\n╔══════════════════════════╗');
                console.log('║   🔑 PAIRING CODE       ║');
                console.log(`║   📱 ${CONFIG.OWNER_NUMBER}   ║`);
                console.log(`║   🔢 ${code}              ║`);
                console.log('╚══════════════════════════╝');
                console.log('\n📝 WhatsApp open karo → Linked Devices → Link with phone number → Ye code enter karo!\n');
            } catch (error) {
                console.error('❌ Pairing code error:', error.message);
                console.log('🔄 QR Code se try karo...');
            }
        }, 3000);
    }
    
    // =========== CONNECTION HANDLER ===========
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && CONFIG.LOGIN_METHOD === 'qr') {
            console.log('\n📱 QR Code scan karo:\n');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'connecting') {
            console.log('🔄 Connecting...');
        }
        
        if (connection === 'open') {
            console.log('\n✅ Bot Connected Successfully!');
            console.log(`🤖 Bot Name: ${CONFIG.BOT_NAME}`);
            console.log(`👑 Owner: ${CONFIG.OWNER_NAME}`);
            console.log(`⚡ Prefix: ${CONFIG.PREFIX}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log('❌ Disconnected!');
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('🚫 Logged out! Session delete karo aur dobara start karo.');
            } else if (shouldReconnect) {
                console.log('🔄 Reconnecting in 5 seconds...');
                setTimeout(() => startBot(), 5000);
            }
        }
    });
    
    // Save credentials
    sock.ev.on('creds.update', saveCreds);
    
    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        if (m.type === 'notify') {
            await handleMessage(sock, msg);
        }
    });
    
    return sock;
}

// Error handling
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// Start bot
startBot().catch(err => {
    console.error('❌ Bot start error:', err);
    process.exit(1);
});
