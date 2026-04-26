const express = require('express');
const moment = require('moment-timezone');

const app = express();
app.use(express.json());

// Default config - Memory mein store (Vercel friendly)
let botConfig = {
    prefix: '.',
    ownerName: 'Ahmad RDX',
    botName: 'RDX Bot',
    loginMethod: 'pairing',
    allowedUsers: [],
    adminNumbers: ['923156894148'],
    bannedUsers: []
};

// =========== DASHBOARD ===========
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RDX Bot • Admin Panel</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;background:#0a0e17;color:#fff;min-height:100vh}
        .header{background:#111827;border-bottom:2px solid #22c55e;padding:20px 30px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px}
        .logo h1{font-size:24px}.logo h1 span{color:#22c55e}.logo p{color:#9ca3af;font-size:11px;letter-spacing:3px}
        .status{background:rgba(34,197,94,0.15);border:1px solid #22c55e;padding:8px 20px;border-radius:50px;color:#22c55e;font-weight:600}
        .container{max-width:1200px;margin:0 auto;padding:30px}
        .nav{display:flex;gap:10px;margin-bottom:25px}
        .nav-btn{background:#111827;border:1px solid #374151;color:#d1d5db;padding:12px 25px;border-radius:50px;cursor:pointer;font-weight:600;font-size:14px}
        .nav-btn:hover,.nav-btn.active{background:#22c55e;color:#000;border-color:#22c55e}
        .panel{background:#111827;border:1px solid #1f2937;border-radius:20px;padding:30px;display:none}
        .panel.active{display:block}
        .panel h2{color:#22c55e;margin-bottom:20px}
        .form-group{margin-bottom:15px}
        .form-group label{display:block;color:#9ca3af;margin-bottom:5px;font-size:14px;font-weight:600}
        .form-group input{width:100%;max-width:400px;background:#1f2937;border:1px solid #374151;color:#fff;padding:12px;border-radius:10px;font-size:14px}
        .form-group input:focus{outline:none;border-color:#22c55e}
        .btn{background:#22c55e;color:#000;border:none;padding:10px 25px;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;margin:3px}
        .btn:hover{opacity:0.9}.btn-red{background:#ef4444;color:#fff}.btn-yellow{background:#fbbf24;color:#000}
        table{width:100%;border-collapse:collapse;margin-top:15px}
        th{text-align:left;padding:12px;color:#22c55e;font-size:12px;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid rgba(34,197,94,0.3)}
        td{padding:12px;border-bottom:1px solid #1f2937;font-size:14px}
        .badge{padding:4px 12px;border-radius:30px;font-size:11px;font-weight:700}
        .badge-green{background:rgba(34,197,94,0.2);color:#22c55e}
        .badge-red{background:rgba(239,68,68,0.2);color:#ef4444}
        .badge-yellow{background:rgba(251,191,36,0.2);color:#fbbf24}
        .flex{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:15px}
        .alert{padding:15px;border-radius:10px;margin-bottom:15px;font-weight:600}
        .alert-success{background:rgba(34,197,94,0.1);border:1px solid #22c55e;color:#22c55e}
        .footer{text-align:center;padding:20px;color:#6b7280;font-size:13px;border-top:1px solid #1f2937;margin-top:30px}
    </style>
</head>
<body>
    <div class="header">
        <div class="logo"><h1><span>RDX</span> BOT</h1><p>PREMIUM ADMIN PANEL</p></div>
        <div class="status">⚡ Vercel Live</div>
    </div>
    <div class="container">
        <div class="nav">
            <button class="nav-btn active" onclick="showTab('settings')">⚙️ Settings</button>
            <button class="nav-btn" onclick="showTab('users')">👥 Users</button>
        </div>
        
        <div class="panel active" id="tab-settings">
            <h2>⚙️ Bot Settings</h2>
            <div id="alertSettings"></div>
            <div class="form-group"><label>Bot Prefix</label><input type="text" id="prefix" placeholder="."></div>
            <div class="form-group"><label>Owner Name</label><input type="text" id="ownerName" placeholder="Ahmad RDX"></div>
            <div class="form-group"><label>Bot Name</label><input type="text" id="botName" placeholder="RDX Bot"></div>
            <button class="btn" onclick="saveSettings()">💾 Save Settings</button>
        </div>
        
        <div class="panel" id="tab-users">
            <h2>👥 User Management</h2>
            <div class="flex">
                <input type="text" id="newNumber" placeholder="Number (92300xxxxxxx)" style="max-width:250px">
                <button class="btn" onclick="addUser()">➕ Add</button>
            </div>
            <table><thead><tr><th>Number</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody id="usersTable"></tbody></table>
        </div>
    </div>
    <div class="footer">⚡ RDX Premium • Ahmad RDX • Vercel ⚡</div>
<script>
const API='/api/config';
function showTab(t){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.getElementById('tab-'+t).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    event.target.classList.add('active');
    if(t==='users') loadUsers();
    if(t==='settings') loadSettings();
}
async function loadSettings(){
    try{
        const r=await fetch(API);
        const d=await r.json();
        document.getElementById('prefix').value=d.prefix||'.';
        document.getElementById('ownerName').value=d.ownerName||'Ahmad RDX';
        document.getElementById('botName').value=d.botName||'RDX Bot';
    }catch(e){console.error(e)}
}
async function saveSettings(){
    const data={
        prefix:document.getElementById('prefix').value,
        ownerName:document.getElementById('ownerName').value,
        botName:document.getElementById('botName').value
    };
    try{
        await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        document.getElementById('alertSettings').innerHTML='<div class="alert alert-success">✅ Settings saved!</div>';
        setTimeout(()=>document.getElementById('alertSettings').innerHTML='',3000);
    }catch(e){
        document.getElementById('alertSettings').innerHTML='<div class="alert alert-success" style="background:rgba(239,68,68,0.1);border-color:#ef4444;color:#ef4444">❌ Error!</div>';
    }
}
async function loadUsers(){
    try{
        const r=await fetch('/api/users');
        const d=await r.json();
        const tb=document.getElementById('usersTable');
        tb.innerHTML=d.users.map(u=>`<tr>
            <td>${u.number}</td>
            <td>${u.isAdmin?'<span class="badge badge-yellow">ADMIN</span>':'<span class="badge badge-green">USER</span>'}</td>
            <td>${u.isBanned?'<span class="badge badge-red">BANNED</span>':'<span class="badge badge-green">ACTIVE</span>'}</td>
            <td>
                ${u.isBanned?`<button class="btn" onclick="unban('${u.number}')">✅</button>`:`<button class="btn btn-red" onclick="ban('${u.number}')">🚫</button>`}
                <button class="btn btn-yellow" onclick="makeAdmin('${u.number}')">👑</button>
                <button class="btn btn-red" onclick="remove('${u.number}')">🗑️</button>
            </td></tr>`).join('');
    }catch(e){console.error(e)}
}
async function addUser(){
    const n=document.getElementById('newNumber').value.trim();
    if(!n)return alert('Number required');
    await fetch('/api/users/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
    document.getElementById('newNumber').value='';loadUsers();
}
async function remove(n){
    await fetch('/api/users/remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
    loadUsers();
}
async function ban(n){
    await fetch('/api/users/ban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
    loadUsers();
}
async function unban(n){
    await fetch('/api/users/unban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
    loadUsers();
}
async function makeAdmin(n){
    await fetch('/api/users/add-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number:n})});
    loadUsers();
}
loadSettings();loadUsers();
</script>
</body>
</html>`);
});

// =========== API ROUTES ===========
app.get('/api/status', (req, res) => {
    res.json({
        bot: { name: botConfig.botName, prefix: botConfig.prefix, owner: botConfig.ownerName },
        stats: { allowedUsers: botConfig.allowedUsers.length, admins: botConfig.adminNumbers.length, banned: botConfig.bannedUsers.length },
        time: moment().tz('Asia/Karachi').format('hh:mm:ss A | DD/MM/YYYY')
    });
});

app.get('/api/config', (req, res) => res.json(botConfig));

app.post('/api/config', (req, res) => {
    const { prefix, ownerName, botName } = req.body;
    if (prefix) botConfig.prefix = prefix;
    if (ownerName) botConfig.ownerName = ownerName;
    if (botName) botConfig.botName = botName;
    res.json({ success: true, config: botConfig });
});

app.get('/api/users', (req, res) => {
    const allNumbers = [...new Set([...botConfig.allowedUsers, ...botConfig.adminNumbers])];
    const users = allNumbers.map(number => ({
        number,
        isAdmin: botConfig.adminNumbers.includes(number),
        isAllowed: botConfig.allowedUsers.includes(number),
        isBanned: botConfig.bannedUsers.includes(number)
    }));
    res.json({ success: true, users });
});

app.post('/api/users/add', (req, res) => {
    const { number } = req.body;
    if (!number) return res.json({ success: false });
    if (!botConfig.allowedUsers.includes(number)) {
        botConfig.allowedUsers.push(number);
    }
    res.json({ success: true });
});

app.post('/api/users/remove', (req, res) => {
    const { number } = req.body;
    botConfig.allowedUsers = botConfig.allowedUsers.filter(n => n !== number);
    botConfig.adminNumbers = botConfig.adminNumbers.filter(n => n !== number);
    res.json({ success: true });
});

app.post('/api/users/ban', (req, res) => {
    const { number } = req.body;
    if (!botConfig.bannedUsers.includes(number)) botConfig.bannedUsers.push(number);
    res.json({ success: true });
});

app.post('/api/users/unban', (req, res) => {
    const { number } = req.body;
    botConfig.bannedUsers = botConfig.bannedUsers.filter(n => n !== number);
    res.json({ success: true });
});

app.post('/api/users/add-admin', (req, res) => {
    const { number } = req.body;
    if (!botConfig.adminNumbers.includes(number)) botConfig.adminNumbers.push(number);
    res.json({ success: true });
});

module.exports = app;
