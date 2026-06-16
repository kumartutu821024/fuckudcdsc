# TestPass — PHP Website Setup Guide

## 📁 Project Structure
```
testpass/
├── public/                  ← Web root (point server here)
│   ├── index.php            ← Main app (HTML + splash + security)
│   ├── .htaccess            ← Apache routing + security rules
│   ├── api/
│   │   └── index.php        ← API router / proxy
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── security.js  ← DevTools detection + anti-scrape
│           ├── exam.js      ← Exam engine
│           └── app.js       ← Navigation + splash screen
├── includes/
│   └── config.example.php   ← Config template
└── render.yaml              ← Render deploy config
```

---

## 🚀 Render.com Deploy Karne Ka Tarika

### Step 1 — Config Setup
```bash
cp includes/config.example.php includes/config.php
```
`includes/config.php` open karo aur fill karo:
```php
define('UPSTREAM_BASE', 'https://thestudyspark.site');  // tumhara backend URL
```

### Step 2 — Render Dashboard
1. **New Web Service** banao
2. **Environment**: PHP
3. **Root Directory**: `/` (default)
4. **Build Command**: `cp includes/config.example.php includes/config.php`
5. **Start Command**: `php -S 0.0.0.0:$PORT -t public`
6. **Environment Variables** mein add karo:
   - `UPSTREAM_BASE` = `https://thestudyspark.site`

### Step 3 — Deploy
Push to GitHub/GitLab → Render auto-deploy karega.

---

## 🔒 Security Features

| Feature | Status |
|---|---|
| DevTools Detection (PC + Mobile) | ✅ Har 800ms check |
| Right-click Block | ✅ |
| F12 / Ctrl+Shift+I Block | ✅ |
| View Source (Ctrl+U) Block | ✅ |
| Text Select / Copy Block | ✅ |
| Drag Block | ✅ |
| iframe Embedding Block | ✅ |
| Bot/Scraper UA Block | ✅ PHP + .htaccess |
| API CSRF Protection | ✅ X-Requested-With header |
| Rate Limiting | ✅ 120 req/min per IP |
| Referer Validation | ✅ Same-origin only |
| fetch() Override | ✅ Blocks external API calls |
| Overlay on DevTools | ✅ Blur + block screen |

---

## ⚙️ PHP Requirements
- PHP 7.4+
- `curl` extension enabled
- `mod_rewrite` enabled (Apache)

---

## 🛠️ Local Testing
```bash
cd testpass
cp includes/config.example.php includes/config.php
# Edit config.php with your UPSTREAM_BASE
php -S localhost:8080 -t public
# Open http://localhost:8080
```

---

## 📝 Notes
- `.gitignore` mein `includes/config.php` zaroor add karo
- `ALLOWED_IMG_HOSTS` config mein apne CDN domains add karo
- Production mein HTTPS compulsory hai (security features HTTPS par better kaam karti hain)
