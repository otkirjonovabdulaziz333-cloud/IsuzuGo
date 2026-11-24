import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, Mail, Phone, User, Key, CheckCircle2, ShieldAlert, ArrowRight, 
  RotateCw, Truck, Briefcase, Lock, Sparkles, Eye, EyeOff 
} from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'register' }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('carrier');

  // Admin
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [emailConfigured, setEmailConfigured] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetAll = () => {
    setStep(1);
    setOtpCode('');
    setError('');
    setSuccessMsg('');
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+998')) val = '+998 ';
    setPhone(val);
  };

  // Step 1: OTP yuborish
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          role,
          is_login: mode === 'login',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      setEmailConfigured(data.email_configured);
      setSuccessMsg(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP tasdiqlash
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod noto\'g\'ri');

      login(data.token, data.user);
      onClose();
      resetAll();
    } catch (err) {
      setError(err.message);
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  // Admin kirish
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parol noto\'g\'ri');

      login(data.token, data.user);
      setAdminPassword('');
      onClose();
    } catch (err) {
      setError(err.message);
      setAdminPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
          <button
            onClick={() => { onClose(); resetAll(); }}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {mode === 'register' && 'IsuzuGo hisobini yaratish'}
            {mode === 'login' && 'Platformaga kirish'}
            {mode === 'admin' && 'Administrator kirish'}
          </h2>
        </div>

        <div className="p-6">
          {/* Xato / Muvaffaqiyat */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && step === 2 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
              <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Rejim almashtirish */}
          {step === 1 && mode !== 'admin' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
              {['register', 'login'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    mode === m ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'register' ? 'Ro\'yxatdan o\'tish' : 'Kirish'}
                </button>
              ))}
            </div>
          )}

          {/* ADMIN FORM */}
          {mode === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrator paroli:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="off"
                    placeholder="Maxfiy parolni kiriting"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !adminPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all cursor-pointer"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin mx-auto" /> : 'Kirish'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setAdminPassword(''); }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-1"
              >
                ← Oddiy foydalanuvchi sifatida kirish
              </button>
            </form>

          ) : step === 1 ? (
            /* STEP 1: Ma'lumotlarni kiritish */
            <form onSubmit={handleSendOtp} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ism va Familiya:
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Masalan: Jamshid Aliyev"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Rol tanlash */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Rol:</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: 'carrier',
                          icon: <Truck className="w-4 h-4" />,
                          title: 'Yuk tashuvchi',
                          sub: 'Isuzu / yuk mashinasi haydovchisi',
                          badge: '+2 bepul Key!',
                          badgeColor: 'text-amber-700 bg-amber-100',
                        },
                        {
                          value: 'broker',
                          icon: <Briefcase className="w-4 h-4" />,
                          title: 'Broker',
                          sub: 'Dispetcher / Yuk egasi',
                          badge: 'E\'lon bepul',
                          badgeColor: 'text-slate-600 bg-slate-100',
                        },
                      ].map((r) => (
                        <div
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            role === r.value
                              ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={role === r.value ? 'text-blue-600' : 'text-slate-500'}>
                              {r.icon}
                            </span>
                            <span className="text-xs font-black text-slate-900">{r.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">{r.sub}</p>
                          <span className={`mt-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${r.badgeColor}`}>
                            {r.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Telefon raqam:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gmail manzil (OTP kod shu yerga keladi):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="misol@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Tasdiqlash kodini yuborish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('admin'); setError(''); }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Administrator kirish
                </button>
              </div>
            </form>

          ) : (
            /* STEP 2: OTP kiritish */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Gmail manzilingizni tekshiring</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">{email}</span> ga 6 xonali kod yuborildi
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                  6 xonali kod:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full tracking-[0.6em] text-center font-mono text-2xl font-bold py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 bg-blue-50/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tasdiqlash va kirish</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setOtpCode(''); setError(''); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← Orqaga qaytish
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
