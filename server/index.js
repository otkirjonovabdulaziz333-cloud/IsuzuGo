const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
require('dotenv').config();

const { query, run, get, initDB } = require('./db');
const { sendOtpEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// ===== XAVFSIZLIK: Admin paroli faqat .env dan o'qiladi, hech qachon default bo'lmaydi =====
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.error('\n❌ XATO: .env faylida ADMIN_SECRET ko\'rsatilmagan! Server to\'xtatildi.');
  process.exit(1);
}

// Brute-force himoyasi uchun: ip → {count, lastAttempt}
const adminLoginAttempts = new Map();
const MAX_ADMIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 daqiqa

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Uploads directory
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pay-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    if (user.is_blocked) return res.status(403).json({ error: 'Hisobingiz bloklangan' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Yaroqsiz yoki muddati tugagan token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      const user = await get('SELECT * FROM users WHERE id = ?', [decoded.id]);
      if (user && !user.is_blocked) req.user = user;
    } catch { /* silent */ }
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  next();
};

// ============================================================
// AUTH ROUTES
// ============================================================

// Send OTP (ro'yxatdan o'tish / kirish)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { full_name, phone, email, role, is_login } = req.body;
    if (!phone || !email) {
      return res.status(400).json({ error: 'Telefon va Gmail manzil talab qilinadi' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);

    if (!is_login && existingUser) {
      return res.status(400).json({
        error: 'Bu telefon raqam allaqachon ro‘yxatdan o‘tgan. Iltimos, "Kirish" bo‘limidan foydalaning.',
        is_registered: true,
      });
    }

    if (is_login && !existingUser) {
      return res.status(400).json({
        error: 'Bu raqam bilan ro‘yxatdan o‘tilgan akkaunt topilmadi. Avval ro‘yxatdan o‘ting.',
        not_registered: true,
      });
    }

    // Kirishda (Login) ushbu telefon raqamiga tegishli Gmail to'g'ri kiritilganini qat'iy tekshirish:
    if (is_login && existingUser) {
      if (existingUser.email.toLowerCase() !== cleanEmail) {
        return res.status(400).json({
          error: `Ushbu telefon raqamiga bu Gmail manzil bog‘lanmagan! Ro‘yxatdan o‘tgan asl Gmail manzilingizni kiriting.`,
        });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const targetName = is_login && existingUser ? existingUser.full_name : (full_name || 'Foydalanuvchi');
    const targetRole = is_login && existingUser ? existingUser.role : (role || 'carrier');

    await run(
      'INSERT INTO otp_codes (email, phone, code, role, full_name, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanEmail, cleanPhone, code, targetRole, targetName, expiresAt]
    );

    const emailRes = await sendOtpEmail(cleanEmail, code, targetName);

    res.json({
      success: true,
      message: `Tasdiqlash kodi ${cleanEmail} manziliga yuborildi`,
    });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Telefon va kod talab qilinadi' });

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanCode = code.trim();

    const otpRecord = await get(
      'SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND is_used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1',
      [cleanPhone, cleanCode, Date.now()]
    );

    if (!otpRecord) {
      return res.status(400).json({ error: 'Kod noto\'g\'ri yoki muddati tugagan' });
    }

    await run('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);

    let user = await get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);

    if (!user) {
      const initialKeys = otpRecord.role === 'carrier' ? 2 : 0;
      const result = await run(
        'INSERT INTO users (full_name, phone, email, role, keys_balance, is_verified) VALUES (?, ?, ?, ?, ?, 1)',
        [otpRecord.full_name, cleanPhone, otpRecord.email, otpRecord.role, initialKeys]
      );
      user = await get('SELECT * FROM users WHERE id = ?', [result.id]);
    } else {
      await run('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
      user = await get('SELECT * FROM users WHERE id = ?', [user.id]);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        keys_balance: user.keys_balance,
      },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================================
// ADMIN LOGIN — Brute-force himoyali, kuchli parol
// ============================================================
app.post('/api/auth/admin-login', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // Brute-force tekshiruvi
  const attempts = adminLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (attempts.lockedUntil > now) {
    const remaining = Math.ceil((attempts.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Juda ko'p urinish. ${remaining} daqiqadan keyin qayta urining.`,
    });
  }

  try {
    const { password } = req.body;

    const bufA = Buffer.from(String(password || ''));
    const bufB = Buffer.from(String(ADMIN_SECRET || ''));
    const isValid = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    if (!isValid) {
      attempts.count = (attempts.count || 0) + 1;

      if (attempts.count >= MAX_ADMIN_ATTEMPTS) {
        attempts.lockedUntil = now + LOCKOUT_MS;
        attempts.count = 0;
        adminLoginAttempts.set(ip, attempts);
        return res.status(429).json({
          error: 'Juda ko\'p noto\'g\'ri urinish. 15 daqiqa kutishingiz kerak.',
        });
      }

      adminLoginAttempts.set(ip, attempts);
      // Qancha urinish qolganini ham aytmaymiz — xabar doimiy
      return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }

    // Muvaffaqiyatli kirish — urinishlarni tozalash
    adminLoginAttempts.delete(ip);

    const admin = await get('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (!admin) return res.status(404).json({ error: 'Admin akkaunt topilmadi' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });

    res.json({ success: true, token, user: admin });
  } catch (err) {
    // Buffer sizes teng bo'lmasa xato chiqishi mumkin — umumiy xato qaytaramiz
    adminLoginAttempts.set(ip, { ...attempts, count: (attempts.count || 0) + 1 });
    return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      full_name: req.user.full_name,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      keys_balance: req.user.keys_balance,
      created_at: req.user.created_at,
    },
  });
});

// ============================================================
// ORDERS
// ============================================================
app.get('/api/orders', optionalAuth, async (req, res) => {
  try {
    const { from_region, to_region, body_type, status, my_only } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?'; params.push(status);
    } else {
      sql += " AND status = 'active'";
    }

    if (from_region) { sql += ' AND from_region LIKE ?'; params.push(`%${from_region}%`); }
    if (to_region) { sql += ' AND to_region LIKE ?'; params.push(`%${to_region}%`); }
    if (body_type && body_type !== 'Barchasi') {
      sql += " AND (body_type LIKE ? OR body_type = 'Farqi yo'q')";
      params.push(`%${body_type}%`);
    }

    if (my_only === 'true' && req.user) {
      sql += ' AND broker_id = ?'; params.push(req.user.id);
    }

    sql += ' ORDER BY id DESC';
    const orders = await query(sql, params);

    let unlockedSet = new Set();
    if (req.user?.role === 'carrier') {
      const unlocked = await query('SELECT order_id FROM unlocked_orders WHERE user_id = ?', [req.user.id]);
      unlocked.forEach(u => unlockedSet.add(u.order_id));
    }

    const result = orders.map(ord => {
      const isOwner = req.user && req.user.id === ord.broker_id;
      const isAdmin = req.user?.role === 'admin';
      const isUnlocked = unlockedSet.has(ord.id);
      const canSee = isOwner || isAdmin || isUnlocked;

      let masked = '+998 9* *** ** **';
      if (ord.contact_phone?.length >= 7) {
        const p = ord.contact_phone;
        masked = p.substring(0, 7) + ' *** ** ' + p.slice(-2);
      }

      return {
        ...ord,
        is_unlocked: canSee,
        is_owner: isOwner,
        contact_phone: canSee ? ord.contact_phone : masked,
        full_phone_available: canSee,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('get-orders error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.post('/api/orders', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'broker' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faqat brokerlar e\'lon qo\'sha oladi' });
    }
    const { from_region, from_district, to_region, to_district, cargo_title, cargo_weight, body_type, price, contact_phone, notes } = req.body;

    if (!from_region || !to_region || !cargo_title || !body_type) {
      return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmagan' });
    }

    const result = await run(
      `INSERT INTO orders (broker_id, broker_name, from_region, from_district, to_region, to_district, cargo_title, cargo_weight, body_type, price, contact_phone, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [req.user.id, req.user.full_name, from_region, from_district || '', to_region, to_district || '',
        cargo_title, cargo_weight || 'Kelishiladi', body_type, price || 'Kelishiladi',
        contact_phone || req.user.phone, notes || '']
    );

    res.json({ success: true, message: 'E\'lon muvaffaqiyatli joylashtirildi!', order: await get('SELECT * FROM orders WHERE id = ?', [result.id]) });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.put('/api/orders/:id/status', authenticate, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    if (order.broker_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    await run('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.delete('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Topilmadi' });
    if (order.broker_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }
    await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
    await run('DELETE FROM unlocked_orders WHERE order_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================================
// UNLOCK PHONE (1 KEY)
// ============================================================
app.post('/api/orders/:id/unlock', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'carrier' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faqat haydovchilar raqam ocha oladi' });
    }

    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    const already = await get('SELECT * FROM unlocked_orders WHERE user_id = ? AND order_id = ?', [req.user.id, req.params.id]);
    if (already) {
      return res.json({ success: true, already_unlocked: true, contact_phone: order.contact_phone, keys_balance: req.user.keys_balance });
    }

    if (req.user.keys_balance < 1) {
      return res.status(400).json({ error: 'Balansingizda yetarli Key yo\'q!', needs_recharge: true, keys_balance: 0 });
    }

    await run('UPDATE users SET keys_balance = keys_balance - 1 WHERE id = ?', [req.user.id]);
    await run('INSERT INTO unlocked_orders (user_id, order_id, cost_keys) VALUES (?, ?, 1)', [req.user.id, req.params.id]);

    const updated = await get('SELECT keys_balance FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, contact_phone: order.contact_phone, keys_balance: updated.keys_balance });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.get('/api/carrier/unlocked', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'carrier') return res.status(403).json({ error: 'Ruxsat yo\'q' });
    const rows = await query(
      'SELECT o.*, u.unlocked_at, 1 as is_unlocked FROM unlocked_orders u JOIN orders o ON u.order_id = o.id WHERE u.user_id = ? ORDER BY u.id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================================
// KEY PACKAGES
// ============================================================
const PACKAGES = [
  { id: 'p1',  keys: 1,  bonus: 0, total: 1,  price: 10000,  label: '1 ta Key' },
  { id: 'p5',  keys: 5,  bonus: 0, total: 5,  price: 50000,  label: '5 ta Key' },
  { id: 'p10', keys: 10, bonus: 1, total: 11, price: 100000, label: '10 ta Key (+1 Bonus)', popular: true },
  { id: 'p20', keys: 20, bonus: 2, total: 22, price: 200000, label: '20 ta Key (+2 Bonus)' },
  { id: 'p50', keys: 50, bonus: 8, total: 58, price: 450000, label: '50 ta Key (+8 Bonus)', bestValue: true },
];

app.get('/api/payments/packages', (req, res) => res.json(PACKAGES));

// ============================================================
// TO'LOV: Karta + SMS OTP orqali avtomatik to'lash
// ============================================================

// Faol to'lov sessiyalari (xotirada saqlanadi, production'da Redis ishlatiladi)
const paymentSessions = new Map();

// Qadam 1: Karta ma'lumotlarini tekshirish va SMS OTP yuborish
app.post('/api/payments/init', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'carrier') {
      return res.status(403).json({ error: 'Faqat haydovchilar to\'lov qila oladi' });
    }

    const { card_number, card_expiry, package_id } = req.body;

    if (!card_number || !card_expiry || !package_id) {
      return res.status(400).json({ error: 'Karta ma\'lumotlari to\'liq kiritilmagan' });
    }

    const pkg = PACKAGES.find(p => p.id === package_id);
    if (!pkg) return res.status(400).json({ error: 'Noto\'g\'ri paket' });

    // Karta raqamini tozalash
    const cleanCard = card_number.replace(/\D/g, '');
    if (cleanCard.length !== 16) {
      return res.status(400).json({ error: 'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak' });
    }

    // Muddatni tekshirish (MM/YY)
    const expiryMatch = card_expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch) {
      return res.status(400).json({ error: 'Karta muddati noto\'g\'ri formatda (MM/YY)' });
    }

    const [, mm, yy] = expiryMatch;
    const expMonth = parseInt(mm);
    const expYear = parseInt('20' + yy);
    const now = new Date();

    if (expMonth < 1 || expMonth > 12 ||
        expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      return res.status(400).json({ error: 'Karta muddati tugagan yoki noto\'g\'ri' });
    }

    // SMS OTP kodi yaratish va yuborish (real tizimda bank API ga so'rov ketadi)
    const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 3 * 60 * 1000; // 3 daqiqa

    // Foydalanuvchi telefon raqamiga SMS OTP yuborish
    // Real tizimda: bank API → karta egasining telefon raqamiga SMS
    // Hozir: Foydalanuvchining o'z Gmail manziliga yuboramiz
    const userForEmail = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    await sendOtpEmail(
      userForEmail.email,
      smsCode,
      userForEmail.full_name,
      'payment' // payment OTP
    );

    // Sessiyani saqlash (karta raqamini niqoblab saqlaymiz)
    paymentSessions.set(sessionId, {
      userId: req.user.id,
      card_last4: cleanCard.slice(-4),
      card_first6: cleanCard.slice(0, 6),
      package_id,
      amount: pkg.price,
      total_keys: pkg.total,
      bonus_keys: pkg.bonus,
      package_keys: pkg.keys,
      smsCode,
      expiresAt,
    });

    // Eski sessiyalarni tozalash
    setTimeout(() => paymentSessions.delete(sessionId), 3 * 60 * 1000);

    res.json({
      success: true,
      session_id: sessionId,
      card_masked: `**** **** **** ${cleanCard.slice(-4)}`,
      amount: pkg.price,
      total_keys: pkg.total,
      package_label: pkg.label,
      message: `Tasdiqlash kodi Gmail pochtangizga yuborildi`,
    });
  } catch (err) {
    console.error('payment-init error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Qadam 2: SMS OTP kodni tasdiqlash — pul yechish
app.post('/api/payments/confirm', authenticate, async (req, res) => {
  try {
    const { session_id, sms_code } = req.body;

    if (!session_id || !sms_code) {
      return res.status(400).json({ error: 'Sessiya yoki kod mavjud emas' });
    }

    const session = paymentSessions.get(session_id);

    if (!session) {
      return res.status(400).json({ error: 'Sessiya topilmadi yoki muddati tugagan. Qaytadan to\'lov boshlang.' });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    if (Date.now() > session.expiresAt) {
      paymentSessions.delete(session_id);
      return res.status(400).json({ error: 'SMS kodi muddati tugagan. Qaytadan to\'lov boshlang.' });
    }

    const cleanCode = String(sms_code || '').trim();
    if (cleanCode !== session.smsCode) {
      return res.status(400).json({ error: 'Tasdiqlash kodi noto‘g‘ri kiritildi!' });
    }

    // ✅ Tasdiqlandi — Kalitlarni balansgaa qo'shish
    paymentSessions.delete(session_id);

    await run('UPDATE users SET keys_balance = keys_balance + ? WHERE id = ?', [session.total_keys, req.user.id]);

    // To'lov tarixiga yozish
    await run(
      `INSERT INTO payments (user_id, user_name, user_phone, provider, package_keys, bonus_keys, total_keys, amount, receipt_note, status)
       VALUES (?, ?, ?, 'click', ?, ?, ?, ?, ?, 'approved')`,
      [req.user.id, req.user.full_name, req.user.phone, session.package_keys, session.bonus_keys,
        session.total_keys, session.amount, `Avtomatik karta to‘lovi (SMS): **** **** **** ${session.card_last4}`]
    );

    const updated = await get('SELECT keys_balance FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: `To‘lov muvaffaqiyatli! Balansingizga +${session.total_keys} ta Key qo‘shildi.`,
      keys_balance: updated.keys_balance,
      added_keys: session.total_keys,
    });
  } catch (err) {
    console.error('payment-confirm error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Qo'lda to'lov so'rovi (Admin kartasiga o'tkazganda)
app.post('/api/payments/create', authenticate, upload.single('receipt_image'), async (req, res) => {
  try {
    const { package_id, provider, receipt_note } = req.body;
    const pkg = PACKAGES.find((p) => p.id === package_id);
    if (!pkg) {
      return res.status(400).json({ error: 'Noto‘g‘ri paket tanlandi' });
    }

    const receiptImage = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(
      `INSERT INTO payments 
      (user_id, user_name, user_phone, provider, package_keys, bonus_keys, total_keys, amount, receipt_note, receipt_image, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        req.user.full_name,
        req.user.phone,
        provider || 'click',
        pkg.keys,
        pkg.bonus,
        pkg.total,
        pkg.price,
        receipt_note || 'Karta orqali o‘tkazildi',
        receiptImage,
      ]
    );

    res.json({
      success: true,
      message: 'To‘lov so‘rovi qabul qilindi. Administrator tekshirgach, kalitlar balansingizga avtomatik qo‘shiladi!',
      payment_id: result.id,
    });
  } catch (err) {
    console.error('create payment error:', err);
    res.status(500).json({ error: 'To‘lov so‘rovini yaratishda xatolik' });
  }
});

// To'lovlar tarixi (foydalanuvchi)
app.get('/api/payments/my', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================================
// SETTINGS (umumiy — karta raqami va boshqalar)
// ============================================================
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await query('SELECT key, value FROM settings WHERE key != \'admin_password\'');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================================
// ADMIN ROUTES
// ============================================================
app.get('/api/admin/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json(await query('SELECT * FROM payments ORDER BY id DESC'));
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json(await query(
      'SELECT id, full_name, phone, email, role, keys_balance, is_verified, is_blocked, created_at FROM users ORDER BY id DESC'
    ));
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.put('/api/admin/users/:id/keys', authenticate, requireAdmin, async (req, res) => {
  try {
    await run('UPDATE users SET keys_balance = ? WHERE id = ?', [parseInt(req.body.keys_balance) || 0, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.put('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const { card_number, card_holder, support_phone } = req.body;
    if (card_number) await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['card_number', card_number]);
    if (card_holder) await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['card_holder', card_holder]);
    if (support_phone) await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['support_phone', support_phone]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Health check (UptimeRobot / Cron ping uchun)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'alive', time: new Date().toISOString() });
});

// ============================================================
// FRONTEND
// ============================================================
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start
const start = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n🚛 IsuzuGo server: http://localhost:${PORT}`);
    console.log(`🔐 Admin paroli: .env → ADMIN_SECRET\n`);
  });
};

start();
