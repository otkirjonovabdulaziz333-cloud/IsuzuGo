# IsuzuGo — O'zbekiston Yuk Logistika Platformasi (Real rejim)

O'zbekistondagi **yuk brokerlari (dispetcherlar)** va **Isuzu hamda yengil tijorat yuk mashinalari haydovchilarini** to'g'ridan-to'g'ri bog'laydigan zamonaviy, xavfsiz va to'liq avtomatlashtirilgan veb-platforma.

---

## 🚀 Ishga tushirish

`start.bat` faylini ikki marta bosing yoki terminalda:
```bash
node server/index.js
```
Sayt: **http://localhost:5000**

---

## 🔐 1. Admin Paroli va 100% Maxfiylik

Admin paroli sayt kodida yoki bazada ochiq turmaydi! U faqat `.env` faylida saqlanadi:
```env
ADMIN_SECRET="IsuzuGo2026_SuperAdminSecret_X7788"
```
- **Timing attack himoyasi:** `crypto.timingSafeEqual` orqali taqqoslanadi.
- **Brute-force (parol terish) himoyasi:** 5 marta xato kiritilsa, shu IP manzil avtomatik **15 daqiqaga bloklanadi**.
- Parolni xohlagan paytingizda `.env` faylidan o'zingizga yoqqan istalgan kuchli parolga o'zgartirishingiz mumkin.

---

## 💳 2. Karta orqali Avtomatik Pul Yechish (SMS Kod bilan)

Mashhur to'lov tizimlari (Click, Payme, Uzum) kabi ishlaydi:
1. Haydovchi kerakli paketni tanlaydi (masalan: 10 ta Key = 100 000 so'm).
2. **Karta raqami** (16 xonali Uzcard / Humo) va **amal qilish muddati (MM/YY)** ni kiritadi.
3. Bank orqali telefoniga **6 xonali SMS tasdiqlash kodi** yuboriladi.
4. SMS kod kiritilib "Pulni to'lash va Key olish" bosilishi bilan:
   - Pul avtomatik yechiladi.
   - Balansga darhol **Keylar (jumladan +1 ta bepul bonus)** qo'shiladi!
   - Hech qanday adminni soatlab kutish yoki chek rasmiga qarab o'tirish shart emas.

---

## ✉️ 3. Gmail OTP Tasdiqlash

Foydalanuvchi ro'yxatdan o'tayotganda yoki kirayotganda ekranda hech qanday maxfiy kod ko'rinmaydi. Kod to'g'ridan-to'g'ri foydalanuvchining **Gmail** manziliga boradi.

Haqiqiy Gmail orqali yuborish uchun `.env` faylini ochib, o'z ma'lumotlaringizni kiriting:
```env
GMAIL_USER=sizning_email@gmail.com
GMAIL_PASS=xxxx xxxx xxxx xxxx  # Google App Passwords 16 xonali kodi
```

> **Eslatma:** Agar Gmail kiritilmagan bo'lsa (ishlab chiqish/test rejimi), kod server terminalida xavfsiz ko'rinadi.

---

## 🔑 Key Paketlari va Narxlar

| Paket | Narx | Kalitlar | Bonus |
|-------|------|----------|-------|
| 1 ta Key | 10 000 so'm | 1 | — |
| 5 ta Key | 50 000 so'm | 5 | — |
| **10 ta Key (Eng ommabop)** | **100 000 so'm** | **11** | **+1 ta bepul** |
| 20 ta Key | 200 000 so'm | 22 | +2 ta bepul |
| 50 ta Key (Eng manfaatli) | 450 000 so'm | 58 | +8 ta bepul |
