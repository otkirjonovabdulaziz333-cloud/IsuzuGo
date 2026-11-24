import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { REGIONS_DATA, BODY_TYPES_FILTER } from '../data/regions';
import confetti from 'canvas-confetti';
import { 
  Truck, MapPin, ArrowRight, Eye, Phone, PhoneCall, Key, 
  Filter, RotateCcw, Calendar, CheckCircle2, AlertTriangle, 
  Sparkles, ShieldCheck, Search, Info 
} from 'lucide-react';

export const CarrierCabinet = ({ onOpenBuyKeys, onOpenAuth }) => {
  const { user, token, updateKeysBalance } = useAuth();

  const [orders, setOrders] = useState([]);
  const [unlockedOrders, setUnlockedOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unlocked'
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromRegion, setFromRegion] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [bodyType, setBodyType] = useState('Barchasi');
  const [searchQuery, setSearchQuery] = useState('');

  // Unlocking modal / state
  const [unlockTargetOrder, setUnlockTargetOrder] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const regionNames = Object.keys(REGIONS_DATA);

  // Fetch all orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/orders?status=active`;
      if (fromRegion) url += `&from_region=${encodeURIComponent(fromRegion)}`;
      if (toRegion) url += `&to_region=${encodeURIComponent(toRegion)}`;
      if (bodyType && bodyType !== 'Barchasi') url += `&body_type=${encodeURIComponent(bodyType)}`;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unlocked orders for carrier
  const loadUnlockedOrders = async () => {
    if (!token || !user || user.role !== 'carrier') return;
    try {
      const res = await fetch('/api/carrier/unlocked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnlockedOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrders();
    if (token && user?.role === 'carrier') {
      loadUnlockedOrders();
    }
  }, [fromRegion, toRegion, bodyType, token]);

  const handleResetFilters = () => {
    setFromRegion('');
    setToRegion('');
    setBodyType('Barchasi');
    setSearchQuery('');
  };

  // Prompt to unlock
  const handleRequestUnlock = (order) => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    if (user.role !== 'carrier') {
      alert('Faqat haydovchi (Isuzu) hisoblari raqamni ko‘rishi mumkin');
      return;
    }

    if (user.keys_balance < 1) {
      onOpenBuyKeys();
      return;
    }

    setUnlockTargetOrder(order);
  };

  // Perform unlock (spend 1 key)
  const confirmUnlock = async () => {
    if (!unlockTargetOrder) return;
    setUnlocking(true);

    try {
      const res = await fetch(`/api/orders/${unlockTargetOrder.id}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needs_recharge) {
          setUnlockTargetOrder(null);
          onOpenBuyKeys();
          return;
        }
        throw new Error(data.error || 'Raqamni ochishda xatolik');
      }

      // Update keys balance
      updateKeysBalance(data.keys_balance);

      // Update local orders list
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === unlockTargetOrder.id
            ? { ...ord, contact_phone: data.contact_phone, is_unlocked: true, full_phone_available: true }
            : ord
        )
      );

      // Refresh unlocked list
      loadUnlockedOrders();

      // Confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      setToastMsg({
        type: 'success',
        text: `Raqam muvaffaqiyatli ochildi! 1 Key sarflandi. Qolgan balans: ${data.keys_balance} ta Key`,
      });
      setTimeout(() => setToastMsg(null), 4000);

      setUnlockTargetOrder(null);
    } catch (err) {
      setToastMsg({ type: 'error', text: err.message });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setUnlocking(false);
    }
  };

  // Filtered by search query if any
  const displayedOrders = (activeTab === 'all' ? orders : unlockedOrders).filter((ord) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.cargo_title?.toLowerCase().includes(q) ||
      ord.from_region?.toLowerCase().includes(q) ||
      ord.to_region?.toLowerCase().includes(q) ||
      ord.body_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-sm text-white font-semibold animate-in slide-in-from-bottom duration-300 ${
          toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Banner / Balance Callout for Carriers */}
      {user && user.role === 'carrier' && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-blue-200 backdrop-blur-xs">
              <Truck className="w-3.5 h-3.5" />
              <span>Isuzu va Yengil tijorat haydovchilari uchun</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              O‘zbekiston bo‘ylab eng so‘nggi yuklar
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              O‘zingizga ma’qul yukni tanlang va 1 ta Key bilan broker telefonini oching!
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-white/20">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xl shadow-md">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-blue-200 font-medium">Joriy hisobingiz:</p>
              <p className="text-xl font-black text-white">{user.keys_balance} ta Key</p>
            </div>
            <button
              onClick={onOpenBuyKeys}
              className="ml-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-amber-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              + Key olish
            </button>
          </div>
        </div>
      )}

      {/* Filters Box */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Qidiruv va Tez filtrlar</h3>
          </div>
          {(fromRegion || toRegion || bodyType !== 'Barchasi' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tozalash
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Qayerdan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Qayerdan (Viloyat):
            </label>
            <select
              value={fromRegion}
              onChange={(e) => setFromRegion(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Barcha viloyatlar</option>
              {regionNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Qayerga */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Qayerga (Viloyat):
            </label>
            <select
              value={toRegion}
              onChange={(e) => setToRegion(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Barcha viloyatlar</option>
              {regionNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Kuzov turi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Kuzov turi:
            </label>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {BODY_TYPES_FILTER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Search text */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Yuk nomi yoki kalit so‘z:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masalan: Go‘sht, meva..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tab switchers if carrier is logged in */}
        {user && user.role === 'carrier' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Barcha faol yuklar ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('unlocked')}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unlocked'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ochilgan yuklarim ({unlockedOrders.length})
            </button>
          </div>
        )}
      </div>

      {/* Orders List Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Yuklar yuklanmoqda...</p>
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Truck className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-700">Yuklar topilmadi</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tanlangan parametrlar bo‘yicha hozircha e’lon mavjud emas. Filtrlarni tozalab ko‘ring yoki keyinroq kiring.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Barcha yuklarni ko‘rsatish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOrders.map((ord) => {
            const isUnlocked = ord.is_unlocked;

            return (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top: Route */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-block bg-blue-100 text-blue-800 font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                      {ord.body_type}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      {ord.created_at ? new Date(ord.created_at).toLocaleDateString('uz-UZ') : 'Bugun'}
                    </span>
                  </div>

                  {/* Route Visual */}
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs text-slate-400 block font-medium">Qayerdan:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {ord.from_region} {ord.from_district && `(${ord.from_district})`}
                        </span>
                      </div>
                    </div>

                    <div className="w-0.5 h-3 bg-slate-300 ml-1" />

                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs text-slate-400 block font-medium">Qayerga:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {ord.to_region} {ord.to_district && `(${ord.to_district})`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Middle: Cargo details */}
                <div className="p-4 sm:p-5 space-y-3 grow">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-800 line-clamp-2">
                      {ord.cargo_title}
                    </h4>
                    {ord.notes && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{ord.notes}"
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Vazni:</span>
                      <span className="font-bold text-slate-700">{ord.cargo_weight}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Taklif narxi:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">
                        {ord.price}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Broker: <span className="font-bold text-slate-700">{ord.broker_name || 'Dispetcher'}</span>
                  </div>
                </div>

                {/* Card Bottom: Phone / Unlock Button */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                  {isUnlocked ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                        <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Raqam ochiq:
                        </span>
                        <span className="font-mono text-sm font-extrabold text-emerald-900">
                          {ord.contact_phone}
                        </span>
                      </div>
                      <a
                        href={`tel:${ord.contact_phone}`}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Qo‘ng‘iroq qilish</span>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Blurred Phone representation */}
                      <div className="relative overflow-hidden bg-slate-200/70 border border-slate-300 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Telefon:</span>
                        <span className="font-mono text-sm font-black tracking-widest text-slate-600 select-none blur-[4px]">
                          {ord.contact_phone || '+998 90 123 45 67'}
                        </span>
                        <div className="absolute inset-0 bg-slate-400/10 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded shadow-2xs">
                            🔒 Yashirilgan
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRequestUnlock(ord)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-amber-300" />
                        <span>Raqamni ko‘rish (1 Key)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal to Spend 1 Key */}
      {unlockTargetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <Key className="w-7 h-7 text-amber-500" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Broker raqamini ochish
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hisobingizdan <b>1 ta Key</b> yechiladi va brokerning to‘liq raqami ochiladi. Keyinchalik ushbu raqam qayta kalitsiz ko‘rinadi.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <div><b>Yuk:</b> {unlockTargetOrder.cargo_title}</div>
              <div><b>Yo‘nalish:</b> {unlockTargetOrder.from_region} → {unlockTargetOrder.to_region}</div>
              <div><b>Narxi:</b> {unlockTargetOrder.price}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnlockTargetOrder(null)}
                className="py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={unlocking}
                onClick={confirmUnlock}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                {unlocking ? 'Ochilmoqda...' : '1 Key bilan ochish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
