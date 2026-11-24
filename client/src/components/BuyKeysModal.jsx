import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  X, ShieldCheck, CreditCard, Sparkles, CheckCircle2, 
  RotateCw, AlertCircle, Lock, Smartphone, ArrowRight 
} from 'lucide-react';

export const BuyKeysModal = ({ isOpen, onClose }) => {
  const { user, token, updateKeysBalance } = useAuth();
  
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Karta ma'lumotlari
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  
  // Tasdiqlash qadami
  const [step, setStep] = useState(1); // 1: karta kiritish, 2: kod kiritish
  const [paymentSession, setPaymentSession] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  const [maskedCard, setMaskedCard] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setSuccess(false);
      setSmsCode('');
      setCardNumber('');
      setCardExpiry('');

      // Fetch packages
      fetch('/api/payments/packages')
        .then((res) => res.json())
        .then((data) => {
          setPackages(data);
          const pop = data.find((p) => p.popular) || data[0];
          setSelectedPkg(pop);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Karta raqamini formatlash: 8600 1234 5678 9012
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  // Karta muddatini formatlash: MM/YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // 1-bosqich: Karta kiritib kod so'rash
  const handleInitCardPayment = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          card_number: cardNumber.replace(/\s+/g, ''),
          card_expiry: cardExpiry,
          package_id: selectedPkg.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'To‘lovni boshlashda xatolik');

      setPaymentSession(data.session_id);
      setMaskedCard(data.card_masked);
      setStep(2); // Tasdiqlash oynasiga o'tish
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2-bosqich: Kod kiritib pul yechish va kalitlarni olish
  const handleConfirmSmsPayment = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: paymentSession,
          sms_code: smsCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod noto‘g‘ri kiritildi');

      // Balansni darhol yangilash!
      updateKeysBalance(data.keys_balance);

      // Quvonchli confetti!
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      setSuccessMessage(data.message);
      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Key (Kalit) sotib olish</h2>
              <p className="text-xs text-blue-200">Karta orqali avtomatik to‘lash va darhol kalitlarni olish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800">To‘lov muvaffaqiyatli amalga oshirildi!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                {successMessage}
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-xl inline-block">
                ✓ Yangi kalitlaringiz faollashtirildi!
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Paket tanlash */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Kalitlar paketini tanlang:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {packages.map((pkg) => {
                    const isSelected = selectedPkg?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            🔥 Eng ommabop
                          </span>
                        )}
                        {pkg.bestValue && (
                          <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                            💎 Eng manfaatli
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{pkg.label}</span>
                          <span className="text-sm font-black text-blue-700">
                            {pkg.price.toLocaleString()} so‘m
                          </span>
                        </div>
                        {pkg.bonus > 0 && (
                          <div className="mt-1 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            +{pkg.bonus} ta bepul bonus kalit!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KARTA BILAN AVTOMATIK TO'LOV */}
              {step === 1 ? (
                <form onSubmit={handleInitCardPayment} className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Karta ma’lumotlarini kiriting:
                  </label>

                  <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                        Uzcard / Humo
                      </span>
                      <Lock className="w-4 h-4 text-emerald-400" />
                    </div>

                    {/* Karta raqami input */}
                    <div className="space-y-1 mb-4">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Karta raqami (16 xonali):
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="8600 0000 0000 0000"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-base sm:text-lg font-mono font-bold tracking-widest text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {/* Amal qilish muddati */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Amal qilish muddati:
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY (Masalan: 12/28)"
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-sm font-mono font-bold tracking-wider text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>

                      <div className="text-right flex flex-col justify-end">
                        <span className="text-[11px] text-slate-400">Yechiladigan summa:</span>
                        <span className="text-base font-black text-amber-400">
                          {selectedPkg?.price.toLocaleString()} so‘m
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Karta ma’lumotlari xavfsiz shifrlanadi. Tasdiqlash kodi pochtangizga yuboriladi.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cardNumber.replace(/\s+/g, '').length !== 16 || cardExpiry.length < 5}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {loading ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Davom etish (Tasdiqlash kodini olish)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* 2-bosqich: Kod kiritish */
                <form onSubmit={handleConfirmSmsPayment} className="space-y-4">
                  <div className="text-center p-4 bg-blue-50/80 rounded-2xl border border-blue-200">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-sm text-slate-900">Tasdiqlash kodini kiriting</h4>
                    <p className="text-xs text-blue-800 font-bold mt-1 bg-white/70 py-1 px-3 rounded-lg inline-block border border-blue-100">
                      📩 Kod <span className="underline">{user?.email}</span> pochtangizga yuborildi!
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Karta: <b>{maskedCard}</b> • Summa: <b className="text-slate-800">{selectedPkg?.price.toLocaleString()} so‘m</b>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                      6 xonali tasdiqlash kodi:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full tracking-[0.6em] text-center font-mono text-2xl font-bold py-3 border-2 border-emerald-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-emerald-50/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || smsCode.length < 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {loading ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pulni to‘lash va Key olish (+{selectedPkg?.total} Key)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ← Boshqa karta kiritish
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
