const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the Frontend directory
// In root structure, Frontend is a subdirectory
app.use(express.static(path.join(__dirname, 'Frontend')));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const initializeFiles = () => {
    ['lost.json', 'found.json'].forEach(f => {
        const p = path.join(dataDir, f);
        if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
    });
};
initializeFiles();

const logMatchAlert = (toEmail, itemName, matchType) => {
    console.log(`\n🎉 [MATCH ALERT] Item: ${itemName} | Registered for: ${toEmail} | Info: ${matchType}\n`);
};

const isValidItemName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const n = name.trim().toLowerCase();
    if (n.length < 3 || n.length > 50) return false;
    if (!/^[a-z0-9\s\-_.,()]+$/.test(n)) return false;
    if (!/[a-z]/.test(n)) return false;

    // Ultra-Strict
    const vowels = (n.match(/[aeiou]/gi) || []).length;
    const letters = (n.match(/[a-z]/gi) || []).length;

    if (letters > 5 && vowels / letters < 0.28) return false;
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(n)) return false;
    if (/[zskj]{3,}/i.test(n)) return false;

    const blacklist = ['test', 'abc', 'xyz', 'something', 'nothing', 'junk', 'qwe', 'asd'];
    if (blacklist.some(b => n.includes(b))) return false;
    if (/(.)\1{2,}/.test(n)) return false;
    return true;
};

const ALLOWED_DOMAINS = [
    'mmu.org', 'mmumullana.org', 'gmail.com', 'yahoo.com', 'outlook.com',
    'hotmail.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com',
    'zoho.com', 'yandex.com', 'mail.com', 'gmx.com', 'yahoo.in',
    'rediffmail.com', 'live.com', 'msn.com', 'mac.com', 'me.com',
    'gov.in', 'nic.in', 'edu.in', 'ac.in', 'org.in', 'co.in',
    'googlemail.com', 'hey.com', 'fastmail.com', 'tutanota.com',
    'pm.me', 'apple.com', 'microsoft.com', 'amazon.com', 'ibm.com',
    'oracle.com', 'cisco.com', 'hubspot.com', 'salesforce.com', 'github.com'
];

// email validation helper
const validateEmailWithDNS = async (email) => {
    if (!email) return { isValid: false, message: 'Email is required.' };
    
    // Robust Regex (Match with Frontend)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const domain = email.split('@')[1]?.toLowerCase();

    if (!emailRegex.test(email) || email.startsWith('@') || !ALLOWED_DOMAINS.includes(domain)) {
        return { isValid: false, message: 'Invalid or Unrecognized Email Domain. Please provide a legal email address.' };
    }

    return { isValid: true };
};

// API Routes

// 1. REPORT LOST ITEM
app.post('/api/report-lost', async (req, res) => {
    try {
        const { email, phone, itemName, category, location, date, time, description, pin } = req.body;
        if (!email || !phone || !itemName || !category || !location || !date || !time) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const emailValidation = await validateEmailWithDNS(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ success: false, message: emailValidation.message });
        }

        const phoneRegex = /^\+?\d{7,15}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }

        if (!isValidItemName(itemName)) return res.status(400).json({ success: false, message: 'Invalid Item Name.' });

        const newItem = { id: Date.now().toString(), status: 'Pending', email, phone, itemName, category, location, date, time, pin: pin || '0000', description: description || '' };
        const file = path.join(dataDir, 'lost.json');
        const items = JSON.parse(fs.readFileSync(file, 'utf8'));

        const foundItems = JSON.parse(fs.readFileSync(path.join(dataDir, 'found.json'), 'utf8'));
        const matchIdx = foundItems.findIndex(f =>
            f.category === category && (f.itemName.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(f.itemName.toLowerCase()))
        );

        if (matchIdx !== -1) {
            newItem.status = 'Matched';
            newItem.matchFound = true;

            // Update the existing Found item's status as well
            foundItems[matchIdx].status = 'Matched';
            fs.writeFileSync(path.join(dataDir, 'found.json'), JSON.stringify(foundItems, null, 2));

            logMatchAlert(foundItems[matchIdx].email, itemName, 'Matched with your Found report');
            logMatchAlert(email, itemName, 'Matching item located');
        }

        items.push(newItem);
        fs.writeFileSync(file, JSON.stringify(items, null, 2));
        res.json({ success: true, message: 'Lost item reported successfully!', matchFound: !!newItem.matchFound, data: newItem });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 2. REPORT FOUND ITEM
app.post('/api/report-found', async (req, res) => {
    try {
        const { email, phone, itemName, category, location, date, time, description, pin } = req.body;
        if (!email || !phone || !itemName || !category || !location || !date || !time) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const emailValidation = await validateEmailWithDNS(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ success: false, message: emailValidation.message });
        }

        const phoneRegex = /^\+?\d{7,15}$/;
        if (!phoneRegex.test(phone)) return res.status(400).json({ success: false, message: 'Invalid phone format.' });

        const newItem = { id: Date.now().toString(), status: 'Pending', email, phone, itemName, category, location, date, time, pin: pin || '0000', description: description || '' };
        const file = path.join(dataDir, 'found.json');
        const items = JSON.parse(fs.readFileSync(file, 'utf8'));

        const lostItems = JSON.parse(fs.readFileSync(path.join(dataDir, 'lost.json'), 'utf8'));
        const matchIdx = lostItems.findIndex(l =>
            l.category === category && (l.itemName.toLowerCase().includes(itemName.toLowerCase()) || itemName.toLowerCase().includes(l.itemName.toLowerCase()))
        );

        if (matchIdx !== -1) {
            newItem.status = 'Matched';
            newItem.matchFound = true;

            // Update the existing Lost item's status to notify the owner
            lostItems[matchIdx].status = 'Matched';
            fs.writeFileSync(path.join(dataDir, 'lost.json'), JSON.stringify(lostItems, null, 2));

            logMatchAlert(lostItems[matchIdx].email, itemName, 'Your lost item has been FOUND');
            logMatchAlert(email, itemName, 'Match found!');
        }

        items.push(newItem);
        fs.writeFileSync(file, JSON.stringify(items, null, 2));
        res.json({ success: true, message: 'Found item reported successfully!', matchFound: !!newItem.matchFound, data: newItem });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/items/:type', (req, res) => {
    const { type } = req.params;
    try {
        if (type === 'all') {
            const lost = JSON.parse(fs.readFileSync(path.join(dataDir, 'lost.json'), 'utf8')).map(i => ({ ...i, type: 'lost' }));
            const found = JSON.parse(fs.readFileSync(path.join(dataDir, 'found.json'), 'utf8')).map(i => ({ ...i, type: 'found' }));
            return res.json({ success: true, items: [...lost, ...found] });
        }
        const items = JSON.parse(fs.readFileSync(path.join(dataDir, `${type}.json`), 'utf8'));
        res.json({ success: true, items });
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/admin/stats', (req, res) => {
    try {
        const lostFile = path.join(dataDir, 'lost.json');
        const lostItems = JSON.parse(fs.readFileSync(lostFile, 'utf8'));
        const stats = lostItems.reduce((acc, item) => {
            const loc = item.location || 'Unknown';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {});
        res.json({ success: true, stats });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/search', (req, res) => {
    try {
        const { q = '', category = '', location = '', from = '', to = '' } = req.query;
        const lost = JSON.parse(fs.readFileSync(path.join(dataDir, 'lost.json'), 'utf8')).map(i => ({ ...i, type: 'lost' }));
        const found = JSON.parse(fs.readFileSync(path.join(dataDir, 'found.json'), 'utf8')).map(i => ({ ...i, type: 'found' }));
        const results = [...lost, ...found].filter(item => {
            const matchQ = !q || Object.values(item).join(' ').toLowerCase().includes(q.toLowerCase());
            const matchC = !category || item.category.toLowerCase().includes(category.toLowerCase());
            const matchL = !location || item.location.toLowerCase().includes(location.toLowerCase());

            let matchDate = true;
            if (from && item.date < from) matchDate = false;
            if (to && item.date > to) matchDate = false;

            return matchQ && matchC && matchL && matchDate;
        });
        res.json({ success: true, results });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/my-items', (req, res) => {
    const { email, pin } = req.body;
    try {
        const lost = JSON.parse(fs.readFileSync(path.join(dataDir, 'lost.json'), 'utf8')).map(i => ({ ...i, type: 'lost' }));
        const found = JSON.parse(fs.readFileSync(path.join(dataDir, 'found.json'), 'utf8')).map(i => ({ ...i, type: 'found' }));
        const userItems = [...lost, ...found].filter(i => i.email === email && i.pin === pin);

        res.json({ success: true, results: userItems });
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/api/items/:type/:id/status', (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;

    try {
        const file = path.join(dataDir, `${type}.json`);
        let items = JSON.parse(fs.readFileSync(file, 'utf8'));
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            items[idx].status = status;
            fs.writeFileSync(file, JSON.stringify(items, null, 2));
            res.json({ success: true, message: 'Status updated' });
        } else res.status(404).send("Not found");
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/api/items/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const { email, pin, ...updateData } = req.body;
    try {
        const file = path.join(dataDir, `${type}.json`);
        let items = JSON.parse(fs.readFileSync(file, 'utf8'));
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1 && items[idx].email === email && items[idx].pin === pin) {
            items[idx] = { ...items[idx], ...updateData };
            fs.writeFileSync(file, JSON.stringify(items, null, 2));
            res.json({ success: true, message: 'Item updated' });
        } else res.status(401).send("Unauthorized");
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/api/items/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const { email, pin } = req.body;
    try {
        const file = path.join(dataDir, `${type}.json`);
        let items = JSON.parse(fs.readFileSync(file, 'utf8'));
        const item = items.find(i => i.id === id);
        if (item && item.email === email && item.pin === pin) {
            items = items.filter(i => i.id !== id);
            fs.writeFileSync(file, JSON.stringify(items, null, 2));
            res.json({ success: true, message: 'Deleted' });
        } else res.status(401).send("Unauthorized");
    } catch (e) { res.status(500).send(e.message); }
});

// Catch-all to serve the frontend (for any non-API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend/index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
