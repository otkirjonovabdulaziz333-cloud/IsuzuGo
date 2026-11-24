const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass || user === 'sizning_email@gmail.com') return null;
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
};

/**
 * OTP yuborish — login yoki to'lov uchun
 * @param {string} toEmail
 * @param {string} code
 * @param {string} fullName
 * @param {'auth'|'payment'} type
 */
const sendOtpEmail = async (toEmail, code, fullName, type = 'auth') => {
  const transporter = createTransporter();

  const isPayment = type === 'payment';
  const subject = isPayment
    ? `${code} — IsuzuGo to'lov tasdiqlash kodi`
    : `${code} — IsuzuGo kirish tasdiqlash kodi`;

  const headerText = isPayment ? 'To\'lov Tasdiqlash' : 'Kirish Tasdiqlash';
  const headerColor = isPayment ? '#059669' : '#1d4ed8';
  const bodyText = isPayment
    ? 'IsuzuGo platformasida <strong>Key sotib olish</strong> uchun to\'lovni tasdiqlashingiz kerak.'
    : 'IsuzuGo platformasiga kirish yoki ro\'yxatdan o\'tish tasdiqlovi.';
  const warningText = isPayment
    ? '⚠️ Agar siz to\'lov qilmagan bo\'lsangiz, darhol bizga xabar bering!'
    : '⚠️ Bu kodni hech kimga bermang — hatto IsuzuGo xodimlariga ham.';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,${headerColor},${isPayment ? '#065f46' : '#4f46e5'});padding:28px 24px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">
          Isuzu<span style="color:${isPayment ? '#a7f3d0' : '#93c5fd'}">Go</span>
        </div>
        <div style="font-size:11px;color:${isPayment ? '#d1fae5' : '#bfdbfe'};margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:1px">
          ${headerText}
        </div>
      </div>

      <div style="padding:28px 24px">
        <p style="font-size:15px;color:#1e293b;margin:0 0 8px">
          Assalomu alaykum, <strong>${fullName || 'Foydalanuvchi'}</strong>!
        </p>
        <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 24px">
          ${bodyText} Quyidagi kodni kiritishingiz kerak.
          Kod <strong>3 daqiqa</strong> amal qiladi.
        </p>

        <div style="background:#f1f5f9;border:2px dashed ${headerColor};border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">
            ${isPayment ? 'To\'lov kodi' : 'Tasdiqlash kodi'}
          </div>
          <div style="font-size:38px;font-weight:900;letter-spacing:14px;color:${headerColor};font-family:monospace">
            ${code}
          </div>
        </div>

        <div style="background:#fef9ec;border:1px solid #fbbf24;border-radius:10px;padding:12px 16px;font-size:12px;color:#92400e">
          ${warningText}
        </div>
      </div>

      <div style="background:#f8fafc;padding:14px 24px;text-align:center;border-top:1px solid #f1f5f9">
        <div style="font-size:11px;color:#94a3b8">
          © ${new Date().getFullYear()} IsuzuGo — O'zbekiston yuk tashish platformasi
        </div>
      </div>
    </div>
  `;

  if (!transporter) {
    const label = isPayment ? 'TO\'LOV OTP' : 'KIRISH OTP';
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⚡ [${label}] Gmail sozlanmagan — kodni server terminaldan o'qing:`);
    console.log(`   Gmail : ${toEmail}`);
    console.log(`   Kod   : [ ${code} ]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return { success: true, mode: 'console' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"IsuzuGo Logistika" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
    });
    console.log(`[EMAIL] ✓ Yuborildi → ${toEmail} | ${info.messageId}`);
    return { success: true, mode: 'smtp' };
  } catch (err) {
    console.error(`[EMAIL] ✗ Xato:`, err.message);
    console.log(`[EMAIL FALLBACK] Kod: [ ${code} ] → ${toEmail}`);
    return { success: false, mode: 'failed', error: err.message };
  }
};

module.exports = { sendOtpEmail };
