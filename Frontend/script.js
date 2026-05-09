const API_URL = '/api';

// Gibberish Detection Helper
const isValidItemName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const n = name.trim().toLowerCase();

    // 1. Basic Filters
    if (n.length < 3 || n.length > 50) return false;
    if (!/^[a-z0-9\s\-_.,()]+$/.test(n)) return false;
    if (!/[a-z]/.test(n)) return false;

    // 2. Blacklist
    const blacklist = ['test', 'abc', 'xyz', 'qwe', 'asd', 'zxc', 'hlo', 'hii'];
    if (blacklist.some(b => n.includes(b))) return false;

    // 3. Repeated Chars
    if (/(.)\1{2,}/.test(n)) return false;
    if (/(..+)\1{1,}/.test(n) && n.length > 6) return false;

    // 4. Ultra-Strict Cluster & Vowel density
    const vowels = (n.match(/[aeiou]/gi) || []).length;
    const letters = (n.match(/[a-z]/gi) || []).length;

    // Catch pronounceable junk while allowing common items like "Wallet"
    if (letters > 5 && vowels / letters < 0.28) return false;

    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(n)) return false;
    if (/[zskj]{3,}/i.test(n)) return false;

    // 6. Proximity / QWERTY clusters
    const proximity = ['asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'qwer', 'wert', 'erty', 'rtyu', 'zxcv', 'xcvb', 'cvbn'];
    if (proximity.some(p => n.includes(p))) return false;

    return true;
};

// US28: Toggle 'Other' Input visibility
function toggleOtherInput(selectId, targetGroupId) {
    const selectElem = document.getElementById(selectId);
    const groupElem = document.getElementById(targetGroupId);
    if (selectElem && groupElem) {
        if (selectElem.value === 'Other') {
            groupElem.style.display = 'block';
            groupElem.querySelector('input').focus();
        } else {
            groupElem.style.display = 'none';
        }
    }
}

// --- Failsafe: Check for pending notifications on load ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Check for Pending Match (US15)
    const pendingMatch = localStorage.getItem('pendingMatch');
    if (pendingMatch) {
        try {
            const data = JSON.parse(pendingMatch);
            showMatchingNotification(data.type, data.item);
            localStorage.removeItem('pendingMatch');
        } catch (e) { console.error("Match Failsafe Error:", e); }
    }

    // 2. Check for Pending Success Message (US20 - Fix for Auto-Reload)
    const pendingSuccess = localStorage.getItem('pendingSuccess');
    if (pendingSuccess) {
        showSuccessModal(pendingSuccess);
        localStorage.removeItem('pendingSuccess');
    }
});

// ST-01/ST-02: Broadened Location Bounds
// Modified: Skip Location Check & Show Premium Loader (ST-28)
// Modified: Skip Location Check & Show Ultra-Premium Loader (ST-28)
function checkLocation() {
    const backdrop = document.createElement('div');
    backdrop.id = 'entry-loader-backdrop';
    backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
        z-index: 1000000; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        backdrop-filter: blur(15px);
        transition: all 0.5s ease;
    `;

    backdrop.innerHTML = `
        <div style="position: relative; width: 120px; height: 120px; margin-bottom: 30px;">
            <div class="premium-loader" style="
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                border: 2px solid rgba(0, 212, 255, 0.1);
                border-top: 2px solid #00d4ff; border-radius: 50%;
                animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            "></div>
            <div id="loader-percent" style="
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                color: #00d4ff; font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: bold;
                text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            ">0%</div>
        </div>
        <div id="loader-msg" style="
            color: rgba(255,255,255,0.7); font-family: 'Outfit', sans-serif; font-weight: 300;
            letter-spacing: 3px; font-size: 0.9rem; text-transform: uppercase;
            text-align: center; max-width: 80%; line-height: 1.5;
        ">Initializing System...</div>
        
        <div style="width: 200px; height: 2px; background: rgba(255,255,255,0.05); margin-top: 20px; border-radius: 2px; overflow: hidden;">
            <div id="loader-bar" style="width: 0%; height: 100%; background: #00d4ff; transition: width 0.3s ease; box-shadow: 0 0 10px #00d4ff;"></div>
        </div>

        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;

    document.body.appendChild(backdrop);

    const stages = [
        { p: 0, m: "Initializing OLITS Core..." },
        { p: 10, m: "Establishing Secure Connection..." },
        { p: 20, m: "Loading Campus Infrastructure Data..." },
        { p: 30, m: "Synchronizing Database Nodes..." },
        { p: 40, m: "Optimizing Retrieval Algorithms..." },
        { p: 50, m: "Verifying Security Protocols..." },
        { p: 60, m: "Loading Real-time Feed..." },
        { p: 70, m: "Connecting to Map Services..." },
        { p: 80, m: "Finalizing User Session..." },
        { p: 90, m: "Polishing Dashboard..." },
        { p: 100, m: "Access Granted." }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
        if (currentStage < stages.length) {
            const { p, m } = stages[currentStage];
            document.getElementById('loader-percent').innerText = `${p}%`;
            document.getElementById('loader-msg').innerText = m;
            document.getElementById('loader-bar').style.width = `${p}%`;
            currentStage++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 300);
        }
    }, 250); // Updates every 250ms for a total of ~2.7s
}

// Report Submission Logic
function getFormData() {
    let phoneNum = document.getElementById('phone')?.value || '';

    // Use intl-tel-input to get full international number
    const iti = window.itiLost || window.itiFound;
    if (iti) {
        phoneNum = iti.getNumber();
    }

    let catValue = document.getElementById('category')?.value || '';
    if (catValue === 'Other') {
        const otherEl = document.getElementById('otherCategory');
        catValue = otherEl?.value.trim() || '';
    }

    let locValue = document.getElementById('location')?.value || '';
    if (locValue === 'Other') {
        const otherEl = document.getElementById('otherLocation');
        locValue = otherEl?.value.trim() || '';
    }

    return {
        email: (document.getElementById('email')?.value || '').trim(),
        phone: phoneNum,
        itemName: document.getElementById('itemName')?.value.trim() || '',
        category: catValue,
        location: locValue,
        date: document.getElementById('date')?.value || '',
        time: document.getElementById('time')?.value || '',
        pin: document.getElementById('pin')?.value || '',
        description: document.getElementById('description')?.value || ''
    };
}
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

function validateData(data) {
    // 1. Robust Email Validation (Strict regex + Whitelist check)
    if (data.email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        const domain = data.email.split('@')[1]?.toLowerCase();
        
        if (!emailRegex.test(data.email) || data.email.startsWith('@') || !ALLOWED_DOMAINS.includes(domain)) {
            alert(`❌ Invalid or Unrecognized Email Domain.\n\nPlease use a legal email (like @gmail.com or @mmu.org).`);
            const emailEl = document.getElementById('email');
            if (emailEl) {
                emailEl.classList.add('shake');
                emailEl.focus();
                setTimeout(() => emailEl.classList.remove('shake'), 600);
            }
            return false;
        }
    }

    // 2. Missing required fields check (ST-24 Shake Effect)
    const requiredFields = ['email', 'phone', 'itemName', 'category', 'location', 'date', 'time', 'pin'];
    let firstMissing = null;

    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        const val = (id === 'category' || id === 'location') ? data[id] : el?.value;

        if (el && !val && !data[id]) {
            // Special handling for Other fields
            if ((id === 'category' || id === 'location') && el.value === 'Other') {
                const otherEl = document.getElementById(id === 'category' ? 'otherCategory' : 'otherLocation');
                if (otherEl) {
                    otherEl.classList.add('shake');
                    if (!firstMissing) firstMissing = otherEl;
                    setTimeout(() => otherEl.classList.remove('shake'), 600);
                }
            } else {
                el.classList.add('shake');
                if (!firstMissing) firstMissing = el;
                setTimeout(() => el.classList.remove('shake'), 600);
            }
        }
    });

    if (firstMissing) {
        firstMissing.focus();
        // Give browser 50ms to start animation before alert blocks it
        setTimeout(() => {
            alert('❌ Please fill all required fields (including specific Other details)!');
        }, 50);
        return false;
    }

    // Global International Validation via libphonenumber (through intl-tel-input)
    const iti = window.itiLost || window.itiFound;
    if (iti) {
        if (!iti.isValidNumber()) {
            alert('❌ Invalid phone number format.');
            return false;
        }

        // Custom Country Specific Validation
        const countryData = iti.getSelectedCountryData();
        const iso2 = countryData.iso2 ? countryData.iso2.toLowerCase() : '';
        const phoneInputElem = document.getElementById('phone');
        const inputNum = phoneInputElem ? phoneInputElem.value.replace(/\D/g, '') : '';

        const countryPhoneRules = {
            in: /^[6-9]\d{9}$/, np: /^9\d{9}$/, bt: /^7\d{7}$/, bd: /^1\d{10}$/, pk: /^3\d{9}$/, lk: /^7\d{8}$/,
            cn: /^(13|14|15|17|18|19)\d{9}$/, jp: /^(70|80|90)\d{8,9}$/, kr: /^10\d{8,9}$/, th: /^[689]\d{8}$/, vn: /^[35789]\d{8}$/,
            my: /^1\d{8,9}$/, sg: /^[89]\d{7}$/, id: /^8\d{9,11}$/, ph: /^9\d{9}$/, mm: /^9\d{6,9}$/, kh: /^[16789]\d{8}$/,
            la: /^2\d{7,8}$/, mn: /^[89]\d{7}$/, kz: /^7\d{9}$/, uz: /^9\d{8}$/, af: /^7\d{8}$/, ir: /^9\d{9}$/, iq: /^7\d{9}$/,
            sa: /^5\d{8}$/, ae: /^(50|52|54|55|56|58)\d{7}$/, qa: /^[3567]\d{7}$/, kw: /^[569]\d{7}$/, om: /^[79]\d{7}$/,
            ye: /^7\d{8}$/, jo: /^7\d{8}$/, il: /^5\d{8}$/, tr: /^5\d{9}$/, gb: /^0?7\d{9}$/, fr: /^[67]\d{8}$/,
            de: /^(15|16|17)\d{8,9}$/, es: /^[67]\d{8}$/, it: /^3\d{9}$/, nl: /^6\d{8}$/, be: /^4\d{8}$/, se: /^7\d{8}$/,
            no: /^[49]\d{7}$/, dk: /^[2-9]\d{7}$/, fi: /^[45]\d{8,9}$/, pl: /^[567]\d{8}$/, gr: /^69\d{8}$/, ro: /^7\d{8}$/,
            ua: /^[356789]\d{8}$/, ru: /^9\d{9}$/, za: /^[678]\d{8}$/, us: /^[2-9]\d{9}$/, ca: /^[2-9]\d{9}$/,
            mx: /^1?\d{9,10}$/, br: /^\d{2}9\d{8}$/, ar: /^9?\d{9,10}$/, cl: /^9\d{8}$/, co: /^3\d{9}$/, pe: /^9\d{8}$/,
            ve: /^4\d{9}$/, ec: /^9\d{8}$/, bo: /^[67]\d{7}$/, py: /^9\d{8}$/, uy: /^9\d{7}$/, cr: /^[678]\d{7}$/,
            pa: /^6\d{7}$/, gt: /^[45]\d{7}$/, hn: /^9\d{7}$/, sv: /^[67]\d{7}$/, ni: /^8\d{7}$/, cu: /^5\d{7}$/,
            do: /^8\d{9}$/, ht: /^[34]\d{7}$/, jm: /^8\d{9}$/, tt: /^8\d{9}$/, bb: /^8\d{9}$/, bs: /^8\d{9}$/,
            gy: /^6\d{6}$/, sr: /^7\d{6}$/, bz: /^6\d{6}$/, gl: /^[245]\d{5}$/, is: /^[678]\d{6}$/, ie: /^8\d{8}$/,
            lu: /^6\d{8}$/, mt: /^[79]\d{7}$/, cy: /^9\d{7}$/, ee: /^5\d{6,7}$/, lv: /^2\d{7}$/, lt: /^6\d{7}$/,
            by: /^[234]\d{8}$/, md: /^[67]\d{7}$/, al: /^6\d{8}$/, mk: /^7\d{7}$/, me: /^6\d{7}$/, ba: /^6\d{7}$/,
            rs: /^6\d{8}$/, hr: /^9\d{8}$/, si: /^[34567]\d{7}$/, sk: /^9\d{8}$/, cz: /^[67]\d{8}$/, ng: /^[789]\d{9}$/,
            gh: /^[257]\d{8}$/, ke: /^[17]\d{8}$/, ug: /^7\d{8}$/, tz: /^[67]\d{8}$/, et: /^9\d{8}$/, ss: /^9\d{8}$/,
            sd: /^9\d{8}$/, eg: /^(10|11|12|15)\d{8}$/, ma: /^[67]\d{8}$/, dz: /^[567]\d{8}$/, tn: /^[259]\d{7}$/,
            ly: /^9\d{8}$/, zw: /^7\d{8}$/, zm: /^9\d{8}$/, bw: /^7\d{7}$/, na: /^8\d{8}$/, mz: /^8\d{7}$/, mg: /^3\d{8}$/,
            mu: /^[57]\d{7}$/, sc: /^[25]\d{6}$/, rw: /^7\d{8}$/, bi: /^7\d{7}$/, mw: /^[89]\d{8}$/, ao: /^9\d{8}$/,
            cm: /^6\d{8}$/, ci: /^0\d{9}$/, sn: /^7\d{8}$/, ml: /^[67]\d{7}$/, ne: /^9\d{7}$/, bf: /^7\d{7}$/, tg: /^9\d{7}$/,
            bj: /^9\d{7}$/, gn: /^6\d{8}$/, sl: /^7\d{7}$/, lr: /^7\d{6,8}$/, ga: /^6\d{7}$/, cg: /^[56]\d{8}$/,
            cd: /^[89]\d{8}$/, gq: /^[235]\d{8}$/, cf: /^7\d{7}$/, td: /^6\d{7}$/, er: /^7\d{6}$/, dj: /^7\d{7}$/,
            so: /^6\d{6,8}$/, km: /^3\d{6}$/, cv: /^9\d{6}$/, st: /^9\d{6}$/, au: /^4\d{8}$/, nz: /^2\d{7,8}$/,
            fj: /^[79]\d{6}$/, pg: /^7\d{7}$/, sb: /^7\d{6}$/, vu: /^[57]\d{6}$/, ws: /^[67]\d{6}$/, to: /^7\d{4,6}$/,
            ki: /^7\d{4}$/, tv: /^9\d{4}$/, nr: /^5\d{6}$/, pw: /^7\d{6}$/, fm: /^9\d{6}$/, mh: /^[234]\d{6}$/,
            ck: /^[57]\d{4}$/, nu: /^7\d{3}$/, tk: /^7\d{3}$/, pf: /^[89]\d{5}$/, nc: /^[79]\d{5}$/, wf: /^8\d{5}$/,
            tl: /^7\d{7}$/, mv: /^[79]\d{6}$/, bn: /^[78]\d{6}$/, hk: /^[5679]\d{7}$/, mo: /^6\d{7}$/, tw: /^9\d{8}$/,
            am: /^9\d{7}$/, az: /^[567]\d{8}$/, ge: /^5\d{8}$/, lb: /^[37]\d{6,7}$/, sy: /^9\d{8}$/, ps: /^[59]\d{8}$/,
            fo: /^[257]\d{5}$/, ad: /^[36]\d{5}$/, mc: /^6\d{7}$/, sm: /^6\d{9}$/, li: /^[67]\d{6}$/, va: /^3\d{9}$/,
            xk: /^[45]\d{7}$/, eh: /^[67]\d{8}$/, sz: /^7\d{7}$/, ls: /^[56]\d{7}$/, gm: /^[379]\d{6}$/
        };

        if (countryPhoneRules[iso2]) {
            if (!countryPhoneRules[iso2].test(inputNum)) {
                alert(`❌ Invalid phone number format for ${countryData.name}. It does not match the required country rules.`);
                return false;
            }
        }
    }

    if (data.pin.length !== 4 || isNaN(data.pin)) {
        alert('❌ Security PIN must be exactly 4 digits.');
        return false;
    }
    if (!isValidItemName(data.itemName)) {
        alert('❌ Invalid Item Name.');
        return false;
    }
    return true;
}

async function submitLostItemForm(event) {
    if (event) event.preventDefault();
    const data = getFormData();
    if (!validateData(data)) return;

    if (!document.getElementById('terms').checked) {
        alert("Please agree to the terms before submitting.");
        return;
    }

            const btn = event?.target;
            if (btn) btn.disabled = true;
            try {
                const r = await fetch(API_URL + '/report-lost', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const res = await r.json();
                if (res.success) {
                    if (res.matchFound) {
                        localStorage.setItem('pendingMatch', JSON.stringify({ type: 'lost', item: res.data }));
                        showMatchingNotification('lost', res.data);
                    } else {
                        // Persist across reloads (in case of Live Server refresh)
                        localStorage.setItem('pendingSuccess', 'Your report has been saved successfully.');
                        showSuccessModal('Your report has been saved successfully.');
                    }
                } else {
                    alert('❌ Submission Failed: ' + res.message);
                    if (btn) btn.disabled = false;
                }
            } catch (e) { 
                alert("Server Error"); 
                if (btn) btn.disabled = false;
            }
}

async function submitFoundItemForm(event) {
    if (event) event.preventDefault();
    const data = getFormData();
    if (!validateData(data)) return;

    if (!document.getElementById('terms').checked) {
        alert("Please agree to the terms before submitting.");
        return;
    }

            const btn = event?.target;
            if (btn) btn.disabled = true;
            try {
                const r = await fetch(API_URL + '/report-found', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const res = await r.json();
                if (res.success) {
                    if (res.matchFound) {
                        localStorage.setItem('pendingMatch', JSON.stringify({ type: 'found', item: res.data }));
                        showMatchingNotification('found', res.data);
                    } else {
                        // Persist across reloads
                        localStorage.setItem('pendingSuccess', 'Thank you! Your report has been saved successfully.');
                        showSuccessModal('Thank you! Your report has been saved successfully.');
                    }
                } else {
                    alert('❌ Submission Failed: ' + res.message);
                    if (btn) btn.disabled = false;
                }
            } catch (e) { 
                alert("Server Error"); 
                if (btn) btn.disabled = false;
            }
}

// Matching Notification
function showMatchingNotification(type, item) {
    const existing = document.getElementById('match-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'match-modal-backdrop';
    backdrop.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px);`;

    const msg = type === 'lost' ? "BUMPER MATCH! An item matching yours was found!" : "BUMPER MATCH! Someone is looking for this item!";

    const modal = document.createElement('div');
    modal.style.cssText = `background:#1e1e1e; color:white; padding:40px; border-radius:20px; max-width:500px; width:90%; text-align:center; border:3px solid #2ed573; box-shadow: 0 0 50px rgba(46,213,115,0.4);`;
    modal.innerHTML = `
        <h2 style="color:#2ed573; margin-bottom:20px;">🎉 ${msg}</h2>
        <p style="font-size:1.3rem; margin-bottom:15px;">Item: <strong>${item.itemName}</strong></p>
        <p style="color:#888; margin-bottom:30px;">Please check the "View Items" section or contact the admin for further details.</p>
        <button onclick="localStorage.removeItem('pendingMatch'); window.location.href='dashboard.html'" style="background:#2ed573; color:white; border:none; padding:15px 40px; border-radius:10px; font-weight:bold; cursor:pointer;">Back to Dashboard</button>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

// SEARCH & FILTER
let currentView = 'all'; // all, lost, found, my-reports
let activeEmail = null;
let activePin = null;

function applyFilter(type, btn) {
    currentView = type;
    
    // Update Section Title
    const titleElem = document.getElementById('section-title');
    if (titleElem) {
        if (type === 'all') titleElem.innerHTML = '📦 All Items';
        else if (type === 'lost') titleElem.innerHTML = '🔎 Lost Items';
        else if (type === 'found') titleElem.innerHTML = '🎁 Found Items';
    }

    // Security: Clear session if moving away from reports
    if (type !== 'my-reports') {
        activeEmail = null;
        activePin = null;
    }

    document.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.remove('active');
        if (p.innerText.toLowerCase() === type || (type === 'all' && p.innerText.toLowerCase() === 'all items')) {
             p.classList.add('active');
        }
    });
    performSearch();
}

async function performSearch() {
    const q = document.getElementById('searchInput')?.value || '';
    const cat = document.getElementById('filterCategory')?.value || '';
    const loc = document.getElementById('filterLocation')?.value || '';
    const from = document.getElementById('dateFrom')?.value || '';
    const to = document.getElementById('dateTo')?.value || '';
    const resultsContainer = document.getElementById('unified-items');
    if (!resultsContainer) return;

    // ST-21: Loading Shimmer Effects
    resultsContainer.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-card shimmer"></div>
            <div class="skeleton-card shimmer"></div>
            <div class="skeleton-card shimmer"></div>
        </div>
    `;

    // ST-21: Loading Shimmer Effects (Wait a bit to show effect)
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const response = await fetch(`${API_URL}/search?q=${q}&category=${cat}&location=${loc}&from=${from}&to=${to}`);
        const res = await response.json();

        if (res.success) {
            let items = res.results;
            if (currentView !== 'all' && currentView !== 'my-reports') {
                items = items.filter(i => i.type === currentView);
            }

            if (items.length === 0) {
                resultsContainer.innerHTML = '<p class="placeholder">No items found.</p>';
                return;
            }

            const sortBy = document.getElementById('sortItems')?.value || 'newest';
            
            if (sortBy === 'newest') items.sort((a, b) => (b.id || '0').localeCompare(a.id || '0'));
            else if (sortBy === 'oldest') items.sort((a, b) => (a.id || '0').localeCompare(b.id || '0'));
            else if (sortBy === 'name') items.sort((a, b) => a.itemName.localeCompare(b.itemName));
            else if (sortBy === 'category') items.sort((a, b) => a.category.localeCompare(b.category));

            displaySearchResults(items);
        }
    } catch (e) { resultsContainer.innerHTML = '<p class="placeholder" style="color:red">Error loading items.</p>'; }
}

async function updateItem(type, id) {
    // We need to fetch the item details first or find it in the current results to pre-fill
    const response = await fetch(`${API_URL}/search?id=${id}`); // Assuming we can filter by ID
    const res = await response.json();
    let item = null;
    if (res.success && res.results) {
        item = res.results.find(i => i.id === id);
    }

    if (!item) {
        alert("Could not load item details.");
        return;
    }

    // Pre-fill Modal
    document.getElementById('update-item-id').value = id;
    document.getElementById('update-item-type').value = type;
    document.getElementById('update-itemName').value = item.itemName;
    document.getElementById('update-category').value = item.category;
    document.getElementById('update-location').value = item.location;
    document.getElementById('update-description').value = item.description || '';

    // Clear verification fields
    document.getElementById('update-email-confirm').value = '';
    document.getElementById('update-pin-confirm').value = '';

    document.getElementById('updateModal').style.display = 'block';
}

function closeUpdateModal() {
    document.getElementById('updateModal').style.display = 'none';
}

async function saveUpdatedItem() {
    const id = document.getElementById('update-item-id').value;
    const type = document.getElementById('update-item-type').value;
    const email = document.getElementById('update-email-confirm').value;
    const pin = document.getElementById('update-pin-confirm').value;

    if (!email || !pin) {
        alert("Please enter both Email and PIN to authorize the update.");
        return;
    }

    const updateData = {
        email,
        pin,
        itemName: document.getElementById('update-itemName').value,
        category: document.getElementById('update-category').value,
        location: document.getElementById('update-location').value,
        description: document.getElementById('update-description').value
    };

    try {
        const response = await fetch(`${API_URL}/items/${type}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const res = await response.json();
        if (res.success) {
            alert("✅ Item updated successfully!");
            closeUpdateModal();
            performSearch();
        } else {
            alert("❌ Update Failed: " + res.message);
        }
    } catch (e) {
        alert("Server error");
    }
}

async function deleteItem(type, id, isFoundAction = false) {
    const email = prompt("Verify Email:");
    if (!email) return;
    const pin = prompt("Enter 4-Digit Security PIN:");
    if (!pin) return;

    const confirmMsg = isFoundAction ? "🎉 Awesome! Mark as FOUND and delete?" : "🗑️ Delete this report permanently?";
    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(`${API_URL}/items/${type}/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });
        const res = await response.json();
        if (res.success) {
            if (isFoundAction) {
                alert("✅ We're glad you found your item! Report removed from the system.");
            } else {
                alert("🗑️ Report Deleted Successfully.");
            }
            performSearch();
        }
        else alert("❌ Verification Failed: " + res.message);
    } catch (e) { alert("Server error"); }
}

async function viewMyReports(emailArg, pinArg) {
    let email = emailArg || prompt("Enter your registered Email:");
    if (!email) return;
    let pin = pinArg || prompt("Enter your 4-Digit Security PIN:");
    if (!pin) return;

    const resultsContainer = document.getElementById('unified-items');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<p class="placeholder">Validating...</p>';

    try {
        const response = await fetch(`${API_URL}/my-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });
        const res = await response.json();
        if (res.success) {
            currentView = 'my-reports';
            sessionStorage.setItem('currentView', 'my-reports');
            document.querySelectorAll('.filter-pill').forEach(p => {
                p.classList.remove('active');
                if (p.innerText.includes('My Reports')) p.classList.add('active');
            });

            const title = document.getElementById('section-title');
            if (title) title.innerText = `👤 My Reports (${res.results.length})`;
            
            // Store session
            activeEmail = email;
            activePin = pin;

            displaySearchResults(res.results); 
        } else {
            alert("❌ Login Failed: " + res.message);
            activeEmail = null;
            activePin = null;
            performSearch();
        }
    } catch (e) { alert("Server error"); }
}

function displaySearchResults(items) {
    const resultsContainer = document.getElementById('unified-items');
    if (!resultsContainer) return;

    if (!items.length) {
        resultsContainer.innerHTML = '<p class="placeholder">No items found matching your search.</p>';
        return;
    }

    const query = document.getElementById('searchInput')?.value.trim() || '';

    resultsContainer.innerHTML = items.map(item => {
        const highlight = (text) => {
            if (!query || !text) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.toString().replace(regex, '<mark class="hlt">$1</mark>');
        };

        const isFound = item.type === 'found';
        const isArchived = item.status === 'Archived';
        const isResolved = item.status === 'Resolved';
        const borderColor = isFound ? '#2ed573' : '#ff4757';

        // US27: NEW Badge logic (last 24h)
        const isNew = (() => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            const now = new Date();
            const diff = (now - itemDate) / (1000 * 60 * 60);
            return diff <= 24 && diff >= 0;
        })();

        return `
            <div class="item-card ribbon-container" style="border-left: 5px solid ${borderColor}; opacity: ${isArchived || isResolved ? '0.6' : '1'}; background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                ${isNew ? '<div class="ribbon">NEW</div>' : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h4 style="margin:0; font-size: 1.2rem; color: #1e1e1e;">${highlight(item.itemName)} <span style="background:${borderColor}; color:white; padding:2px 8px; border-radius:5px; font-size:0.75rem; vertical-align:middle; margin-left:5px;">${item.type.toUpperCase()}</span></h4>
                </div>
                <p style="margin: 10px 0; font-size: 0.9rem; color: #555;">
                    <strong>Category:</strong> ${highlight(item.category)} | <strong>Location:</strong> ${highlight(item.location)}
                </p>
                <p style="margin: 5px 0; font-size: 0.9rem; color: #555;">
                    <strong>Date:</strong> ${item.date || 'N/A'} | <strong>Time:</strong> ${item.time || 'N/A'}
                </p>
                <p style="margin: 5px 0; font-size: 0.9rem; color: #555;">
                    <strong>Status:</strong> 
                    ${(() => {
                        let statusClass = 'status-pending';
                        if (item.status === 'Matched') statusClass = 'status-matched';
                        else if (item.status === 'Received by Admin') statusClass = 'status-received';
                        else if (item.status === 'Verified & Claimed') statusClass = 'status-verified';
                        else if (item.status === 'Rejected') statusClass = 'status-rejected';
                        return `<span class="status-badge ${statusClass}">${item.status || 'Pending'}</span>`;
                    })()}
                </p>
                ${item.status === 'Matched' ? `
                    <div style="background: #fff9db; border: 1px solid #fab005; padding: 12px; border-radius: 8px; margin: 10px 0; font-size: 0.85rem; color: #664d03; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                        <span style="font-size: 1.2rem;">${item.type === 'found' ? '🤝' : '⏳'}</span>
                        <strong>${item.type === 'found' ? 
                            'Match Found! Someone is looking for this item. Please visit the Admin office to hand it over safely for verification.' : 
                            'Match Found! A potential match was reported. Please wait for the finder to submit it to the Admin office before visiting.'}</strong>
                    </div>
                ` : ''}
                ${item.status === 'Received by Admin' ? `
                    <div style="background: #e3f2fd; border: 1px solid #3498db; padding: 12px; border-radius: 8px; margin: 10px 0; font-size: 0.85rem; color: #0d47a1; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                        <span style="font-size: 1.2rem;">📍</span>
                        <strong>Your item has been received by the Admin! Please visit the office now for verification and pickup.</strong>
                    </div>
                ` : ''}
                <p style="margin: 5px 0; font-size: 0.9rem; color: #555;">
                    <strong>Contact:</strong> ${highlight(item.email)} | ${highlight(item.phone || 'N/A')}
                </p>
                <p class="time-ago" style="margin: 5px 0; font-size: 0.8rem; font-style: italic;">
                    🕒 ${timeAgo(item.date, item.time)}
                </p>
                ${item.description ? `<p style="margin: 10px 0; font-size: 0.95rem; color: #333; border-left: 3px solid #ddd; padding-left: 10px;"><strong>Description:</strong> ${highlight(item.description)}</p>` : ''}
                
                <div style="margin-top:20px; display: flex; flex-direction: column; gap: 10px;">
                    ${!(isArchived || isResolved) ? `
                        <div style="display: flex; gap: 10px;">
                            <button onclick="updateItem('${item.type}', '${item.id}')" style="flex:1; background:#ffa502; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">Update</button>
                        </div>
                        <button onclick="deleteItem('${item.type}', '${item.id}', false)" style="width: 100%; background:#ff4757; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">🗑️ Delete</button>
                    ` : `<div style="text-align:center; color:#888; padding:10px;"><i>Report ${isResolved ? 'Resolved' : 'Archived'}</i></div>`}
                </div>
            </div>
        `;
    }).join('');
}

// ADMIN ANALYTICS: Heat Map Logic
async function loadAdminStats() {
    const mapContainer = document.getElementById('map-grid');
    if (!mapContainer) return;

    try {
        const response = await fetch(`${API_URL}/admin/stats`);
        const res = await response.json();
        if (res.success) {
            renderHeatMap(res.stats);
        }
    } catch (e) { console.error("Stats Error:", e); }
}

function renderHeatMap(stats) {
    const mapContainer = document.getElementById('map-grid');
    if (!mapContainer) return;

    const locations = [
        { id: 'Engineering Block 1', name: '🏢 Engineering Block 1' },
        { id: 'Engineering Block 3', name: '🏢 Engineering Block 3' },
        { id: 'Medical College', name: '🏥 Medical College' },
        { id: 'Dental College', name: '🦷 Dental College' },
        { id: 'Central Library', name: '📚 Central Library' },
        { id: 'Cafeteria/Food Court', name: '🍕 Cafeteria/Food Court' },
        { id: 'Hostel Area', name: '🏠 Hostel Area' },
        { id: 'MCA & BCA Department', name: '💻 MCA & BCA Department' },
        { id: 'Pharmacy College', name: '💊 Pharmacy College' },
        { id: 'Agriculture Department', name: '🌾 Agriculture Department' },
        { id: 'Law Department', name: '⚖️ Law Department' },
        { id: 'Admin Block', name: '🏛️ Admin Block' },
        { id: 'Other', name: '📍 Others' }
    ];

    const predefinedIds = locations.filter(l => l.id !== 'Other').map(l => l.id);

    mapContainer.innerHTML = locations.map(loc => {
        let count = 0;
        if (loc.id === 'Other') {
            // Aggregate everything that is not a predefined block
            Object.keys(stats).forEach(key => {
                if (!predefinedIds.includes(key)) {
                    count += stats[key];
                }
            });
        } else {
            count = stats[loc.id] || 0;
        }

        let color = '#f1f2f6';
        if (count > 0 && count <= 2) color = '#fff9db';
        if (count > 2 && count <= 5) color = '#ffec99';
        if (count > 5 && count <= 10) color = '#ffc078';
        if (count > 10) color = '#ff8787';

        return `
            <div class="map-tile" style="background: ${color}; padding: 30px; border-radius: 15px; text-align: center; border: 2px solid #ddd; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: transform 0.2s;">
                <h3 style="margin-bottom: 10px; font-size: 1.1rem;">${loc.name}</h3>
                <div style="font-size: 2.8rem; font-weight: bold; color: #1a1a2e;">${count}</div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 5px;">Lost Items</div>
            </div>
        `;
    }).join('');
}

// US20: Professional Success Popup (Same robust logic as Match Notification)
function showSuccessModal(message) {
    const existing = document.getElementById('success-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'success-modal-backdrop';
    backdrop.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px);`;

    const modal = document.createElement('div');
    modal.style.cssText = `background:#1e1e1e; color:white; padding:40px; border-radius:20px; max-width:500px; width:90%; text-align:center; border:3px solid #00d4ff; box-shadow: 0 0 50px rgba(0,212,255,0.3);`;
    
    modal.innerHTML = `
        <h1 style="color:#00d4ff; margin-bottom:15px;">✅ Report Filed Successfully!</h1>
        <p style="font-size:1.4rem; font-weight:bold; margin-bottom:10px;">Your report has been saved!</p>
        <p style="color:var(--secondary-text); font-size:1.1rem; margin-bottom:30px;">Your information has been securely saved. You can now track the status of your report on the dashboard.</p>
        
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button onclick="window.location.href='dashboard.html'" style="flex:1; background:#00d4ff; color:#1e1e1e; border:none; padding:15px; border-radius:10px; font-weight:bold; cursor:pointer;">Dashboard</button>
            <button onclick="document.getElementById('success-modal-backdrop').remove()" style="flex:1; background:var(--input-border); color:var(--text-color); border:none; padding:15px; border-radius:10px; font-weight:bold; cursor:pointer;">Stay Here</button>
        </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
}

// US21: PIN Masking Toggle
function togglePinVisibility(inputId) {
    const input = document.getElementById(inputId);
    const btn = event.currentTarget;
    if (input.type === "password") {
        input.type = "text";
        btn.innerText = "🔒";
    } else {
        input.type = "password";
        btn.innerText = "👁️";
    }
}

// US23: Clear All Filters
function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterLocation').value = '';
    document.getElementById('sortItems').value = 'newest';
    
    // Reset range search if exists (for US26)
    const dFrom = document.getElementById('dateFrom');
    const dTo = document.getElementById('dateTo');
    if (dFrom) dFrom.value = '';
    if (dTo) dTo.value = '';

    performSearch();
}

// US25: Terms & Conditions Modal
function openTermsModal() {
    const backdrop = document.createElement('div');
    backdrop.id = 'terms-modal-backdrop';
    backdrop.className = 'success-modal'; // Reuse modal styles
    backdrop.style.display = 'flex';
    
    backdrop.innerHTML = `
        <div class="success-content" style="max-width: 550px; text-align: left; padding: 30px; background: var(--card-bg); color: var(--text-color); border-radius: 20px;">
            <h2 style="color: var(--text-color); margin-bottom: 20px; text-align: center;">📜 Campus Guidelines & Terms</h2>
            <div style="font-size: 0.95rem; color: var(--text-color); line-height: 1.6; max-height: 350px; overflow-y: auto; margin-bottom: 25px; padding: 15px; border: 1.5px solid var(--input-border); border-radius: 12px; background: var(--bg-color);">
                <p style="margin-bottom: 12px;"><strong>1. Absolute Accuracy:</strong> You certify that all information provided is 100% true. Inaccurate reports hinder the recovery process.</p>
                <p style="margin-bottom: 12px;"><strong>2. Official Handover:</strong> ALL items MUST be submitted to the <strong>Campus Admin Office</strong> immediately after a match is confirmed.</p>
                <p style="margin-bottom: 12px;"><strong>3. Identity Verification:</strong> Owners must provide the <strong>Security PIN</strong> that was set during reporting to verify ownership and claim the item from the Admin.</p>
                <p style="margin-bottom: 12px;"><strong>4. Status Progression:</strong> A report is only marked as <span style="color:#00b894; font-weight:bold;">Verified & Claimed</span> after the Admin confirms the successful return of the item.</p>
                <p style="margin-bottom: 12px;"><strong>5. Privacy & Ethics:</strong> Contact details are strictly for recovery communication. Harassment or misuse of contact info will be reported to university authorities.</p>
                <p style="margin-bottom: 12px; color: #ff4757;"><strong>6. Zero Tolerance for Fraud:</strong> Filing false reports or attempting to claim items that don't belong to you is a serious offense and will lead to disciplinary action.</p>
            </div>
            <button class="success-btn" style="width: 100%; background: var(--btn-primary); color: white; padding: 15px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;" onclick="document.getElementById('terms-modal-backdrop').remove()">I Accept & Understand</button>
        </div>
    `;


    
    document.body.appendChild(backdrop);
}

// --- ST-27: Dark Mode Toggle ---
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        if (toggleSwitch) toggleSwitch.checked = true;
    }
}

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

if (toggleSwitch) {
    toggleSwitch.addEventListener('change', switchTheme, false);
}

// --- ST-22: Back to Top Button ---
window.onscroll = function() { scrollFunction() };

function scrollFunction() {
    const mybutton = document.getElementById("backToTop");
    if (!mybutton) return;
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

function topFunction() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ST-26: Time Ago Helper ---
function timeAgo(date, time) {
    if (!date) return "";
    const itemDate = new Date(`${date}T${time || '00:00'}`);
    const now = new Date();
    const seconds = Math.floor((now - itemDate) / 1000);

    if (seconds < 0) return "Just now"; // Future date safeguard

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
    return "Just now";
}

// ST-23: Character Counter Logic
function initCharCounter(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    if (textarea && counter) {
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            counter.innerText = `${length}/150 characters`;
            if (length > 150) {
                counter.style.color = '#ff4757';
            } else {
                counter.style.color = 'var(--secondary-text)';
            }
        });
    }
}





// --- Dashboard Recent Activity (ST-21 Shimmer) ---
async function loadRecentActivity() {
    const container = document.getElementById('recent-items-container');
    if (!container) return;

    // Show shimmer for at least 1 second for user visibility
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        const response = await fetch(`${API_URL}/search`);
        const res = await response.json();
        
        if (res.results && res.results.length > 0) {
            // Sort by newest and take top 3
            const recent = res.results.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 3);
            
            container.innerHTML = recent.map(item => `
                <div style="background: var(--card-bg); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid ${item.type === 'lost' ? '#ff4757' : '#2ed573'}; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div>
                        <strong style="color: var(--text-color);">${item.itemName}</strong>
                        <div style="font-size: 0.8rem; color: var(--secondary-text);">${item.location} • ${timeAgo(item.date, item.time)}</div>
                    </div>
                    <span class="item-type-tag ${item.type === 'lost' ? 'tag-lost' : 'tag-found'}">${item.type}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align:center; color: var(--secondary-text);">No recent activity found.</p>';
        }
    } catch (e) {
        console.error("Dashboard Load Error:", e);
        container.innerHTML = '<p style="text-align:center; color: #ff4757;">Failed to load recent activity.</p>';
    }
}

// Robust Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    if (document.getElementById('recent-items-container')) {
        loadRecentActivity();
    }
    
    if (document.getElementById('map-grid')) {
        if (typeof loadAdminStats === 'function') loadAdminStats();
    }

    // Initialize character counters
    const desc = document.getElementById('description');
    if (desc) {
        desc.addEventListener('input', () => {
            const count = document.getElementById('char-count');
            if (count) count.innerText = `${desc.value.length}/150 characters`;
        });
    }

    // Theme initialization
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const ts = document.querySelector('.theme-switch input[type="checkbox"]');
        if (ts) ts.checked = true;
    }

    // Scroll handler for Back to Top
    window.onscroll = function() {
        const btn = document.getElementById('backToTop');
        if (btn) {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                btn.style.display = "block";
            } else {
                btn.style.display = "none";
            }
        }
    };

    // Theme toggle handler
    const themeToggle = document.querySelector('#checkbox');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }
});