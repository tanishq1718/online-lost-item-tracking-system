const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Frontend')));

// MariaDB Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'olits_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Database Connection
pool.query("SELECT 1")
    .then(() => console.log('✅ MariaDB Connected Successfully!'))
    .catch(err => {
        console.error('❌ MariaDB Connection Failed!');
        console.error(err);
    });

// Helper for Match Alerts
const logMatchAlert = (toEmail, itemName, matchType) => {
    console.log(`\n🎉 [MATCH ALERT] Item: ${itemName} | Registered for: ${toEmail} | Info: ${matchType}\n`);
};

// Item Validation
const isValidItemName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const n = name.trim().toLowerCase();
    if (n.length < 3 || n.length > 50) return false;
    if (!/^[a-z0-9\s\-_.,()]+$/.test(n)) return false;
    if (!/[a-z]/.test(n)) return false;
    return true;
};

// Email Validation
const ALLOWED_DOMAINS = ['mmu.org', 'mmumullana.org', 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'github.com'];
const validateEmail = (email) => {
    if (!email) return { isValid: false, message: 'Email is required.' };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!emailRegex.test(email) || !ALLOWED_DOMAINS.includes(domain)) {
        return { isValid: false, message: 'Invalid or Unrecognized Email Domain.' };
    }
    return { isValid: true };
};

// API ROUTES

// 1. REPORT LOST ITEM
app.post('/api/report-lost', async (req, res) => {
    try {
        const { email, phone, itemName, category, location, date, time, description, pin } = req.body;
        if (!email || !phone || !itemName || !category || !location || !date || !time) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) return res.status(400).json({ success: false, message: emailValidation.message });
        if (!isValidItemName(itemName)) return res.status(400).json({ success: false, message: 'Invalid Item Name.' });

        const id = Date.now().toString();
        let status = 'Pending';
        let matchFound = false;

        // Check for match in found_items
        const [foundMatches] = await pool.query(
            "SELECT * FROM found_items WHERE category = ? AND (itemName LIKE ? OR ? LIKE CONCAT('%', itemName, '%'))",
            [category, `%${itemName}%`, itemName]
        );

        if (foundMatches.length > 0) {
            status = 'Matched';
            matchFound = true;
            // Update the matching found item
            await pool.query("UPDATE found_items SET status = 'Matched', matchFound = TRUE WHERE id = ?", [foundMatches[0].id]);
            logMatchAlert(foundMatches[0].email, itemName, 'Matched with your Found report');
            logMatchAlert(email, itemName, 'Matching item located');
        }

        await pool.query(
            "INSERT INTO lost_items (id, status, email, phone, itemName, category, location, date, time, pin, description, matchFound) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, status, email, phone, itemName, category, location, date, time, pin || '0000', description || '', matchFound]
        );

        res.json({ success: true, message: 'Lost item reported successfully!', matchFound, data: { id, status, itemName } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 2. REPORT FOUND ITEM
app.post('/api/report-found', async (req, res) => {
    try {
        const { email, phone, itemName, category, location, date, time, description, pin } = req.body;
        if (!email || !phone || !itemName || !category || !location || !date || !time) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) return res.status(400).json({ success: false, message: emailValidation.message });

        const id = Date.now().toString();
        let status = 'Pending';
        let matchFound = false;

        // Check for match in lost_items
        const [lostMatches] = await pool.query(
            "SELECT * FROM lost_items WHERE category = ? AND (itemName LIKE ? OR ? LIKE CONCAT('%', itemName, '%'))",
            [category, `%${itemName}%`, itemName]
        );

        if (lostMatches.length > 0) {
            status = 'Matched';
            matchFound = true;
            // Update the matching lost item
            await pool.query("UPDATE lost_items SET status = 'Matched', matchFound = TRUE WHERE id = ?", [lostMatches[0].id]);
            logMatchAlert(lostMatches[0].email, itemName, 'Your lost item has been FOUND');
            logMatchAlert(email, itemName, 'Match found!');
        }

        await pool.query(
            "INSERT INTO found_items (id, status, email, phone, itemName, category, location, date, time, pin, description, matchFound) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, status, email, phone, itemName, category, location, date, time, pin || '0000', description || '', matchFound]
        );

        res.json({ success: true, message: 'Found item reported successfully!', matchFound, data: { id, status, itemName } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 3. GET ITEMS
app.get('/api/items/:type', async (req, res) => {
    const { type } = req.params;
    try {
        if (type === 'all') {
            const [lost] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'lost' as type FROM lost_items");
            const [found] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'found' as type FROM found_items");
            return res.json({ success: true, items: [...lost, ...found] });
        }
        const table = type === 'lost' ? 'lost_items' : 'found_items';
        const [items] = await pool.query(`SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time FROM ${table}`);
        res.json({ success: true, items });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 4. SEARCH & FILTER
app.get('/api/search', async (req, res) => {
    try {
        const { q = '', category = '', location = '', from = '', to = '' } = req.query;
        let query = `
            SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'lost' as type FROM lost_items WHERE 1=1
            UNION
            SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'found' as type FROM found_items WHERE 1=1
        `;
        // Simplified search for brevity, can be expanded
        const [results] = await pool.query(query);
        const filtered = results.filter(item => {
            const matchQ = !q || Object.values(item).join(' ').toLowerCase().includes(q.toLowerCase());
            const matchC = !category || item.category.toLowerCase().includes(category.toLowerCase());
            const matchL = !location || item.location.toLowerCase().includes(location.toLowerCase());
            return matchQ && matchC && matchL;
        });
        res.json({ success: true, results: filtered });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 5. MY ITEMS
app.post('/api/my-items', async (req, res) => {
    const { email, pin } = req.body;
    try {
        const [lost] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'lost' as type FROM lost_items WHERE email = ? AND pin = ?", [email, pin]);
        const [found] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date, TIME_FORMAT(time, '%H:%i') as time, 'found' as type FROM found_items WHERE email = ? AND pin = ?", [email, pin]);
        res.json({ success: true, results: [...lost, ...found] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 6. ADMIN STATS
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [items] = await pool.query("SELECT location FROM lost_items");
        const stats = items.reduce((acc, item) => {
            const loc = item.location || 'Unknown';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {});
        res.json({ success: true, stats });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 7. UPDATE STATUS (ADMIN)
app.put('/api/items/:type/:id/status', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;
    try {
        const table = type === 'lost' ? 'lost_items' : 'found_items';
        await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 8. DELETE ITEM
app.delete('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { email, pin } = req.body;
    try {
        const table = type === 'lost' ? 'lost_items' : 'found_items';
        const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ? AND email = ? AND pin = ?`, [id, email, pin]);
        if (result.affectedRows > 0) res.json({ success: true, message: 'Deleted' });
        else res.status(401).json({ success: false, message: 'Unauthorized' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend/index.html'));
});

app.listen(PORT, () => console.log(`🚀 MariaDB Server on port ${PORT}`));
