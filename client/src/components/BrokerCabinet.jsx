import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { REGIONS_DATA, BODY_TYPES } from '../data/regions';
import { 
  PlusCircle, ListOrdered, Globe2, Truck, MapPin, 
  CheckCircle, XCircle, Trash2, Calendar, Phone, 
  RotateCw, CheckCircle2, AlertCircle, EyeOff 
} from 'lucide-react';

export const BrokerCabinet = () => {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState('my_orders'); // 'add_order' | 'my_orders' | 'other_brokers'

  // Form states for creating order
  const [fromRegion, setFromRegion] = useState('');
  const [fromDistrict, setFromDistrict] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toDistrict, setToDistrict] = useState('');
  const [cargoTitle, setCargoTitle] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [bodyType, setBodyType] = useState('Tentli');
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+998 ');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  // Lists
  const [myOrders, setMyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const regionNames = Object.keys(REGIONS_DATA);

  // Fetch my orders
  const loadMyOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orders?my_only=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch other brokers orders
  const loadOtherOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // Exclude my own
        setAllOrders(data.filter((o) => o.broker_id !== user?.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_orders') {
      loadMyOrders();
    } else if (activeTab === 'other_brokers') {
      loadOtherOrders();
    }
  }, [activeTab]);

  // Create Order Submit
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_region: fromRegion,
          from_district: fromDistrict,
          to_region: toRegion,
          to_district: toDistrict,
          cargo_title: cargoTitle,
          cargo_weight: cargoWeight,
          body_type: bodyType,
          price: price || 'Kelishiladi',
          contact_phone: contactPhone || user.phone,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Buyurtma qo‘shishda xatolik');
      }

      setFormMsg({ type: 'success', text: 'E’lon muvaffaqiyatli joylashtirildi!' });
      
      // Reset form
      setCargoTitle('');
      setCargoWeight('');
      setPrice('');
      setNotes('');

      setTimeout(() => {
        setActiveTab('my_orders');
        loadMyOrders();
        setFormMsg(null);
      }, 1500);
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Change status (Faol <-> Yuk olindi / Yopildi)
  const handleToggleStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setMyOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Haqiqatdan ham ushbu e’lonni o‘chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMyOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Broker Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('my_orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'my_orders'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Mening buyurtmalarim ({myOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('add_order')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'add_order'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Yangi yuk qo‘shish</span>
        </button>

        <button
          onClick={() => setActiveTab('other_brokers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'other_brokers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>Boshqa brokerlar e’lonlari</span>
        </button>
      </div>

      {/* 1. ADD ORDER FORM */}
      {activeTab === 'add_order' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Yangi yuk e’loni berish</h3>
              <p className="text-xs text-slate-500">Isuzu va yuk tashuvchilar darhol ko‘rishi uchun ma’lumotlarni to‘ldiring</p>
            </div>
          </div>

          {formMsg && (
            <div className={`p-4 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              formMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {formMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
              <span>{formMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateOrder} className="space-y-4">
            {/* Route from & to */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              {/* Qayerdan */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Qayerdan (Yuklash manzili):
                </span>
                <select
                  required
                  value={fromRegion}
                  onChange={(e) => {
                    setFromRegion(e.target.value);
                    setFromDistrict('');
                  }}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium"
                >
                  <option value="">Viloyatni tanlang *</option>
                  {regionNames.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <select
                  value={fromDistrict}
                  onChange={(e) => setFromDistrict(e.target.value)}
                  disabled={!fromRegion}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium disabled:opacity-50"
                >
                  <option value="">Tuman / Shahar (ixtiyoriy)</option>
                  {fromRegion &&
                    REGIONS_DATA[fromRegion]?.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                </select>
              </div>

              {/* Qayerga */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Qayerga (Yetkazish manzili):
                </span>
                <select
                  required
                  value={toRegion}
                  onChange={(e) => {
                    setToRegion(e.target.value);
                    setToDistrict('');
                  }}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium"
                >
                  <option value="">Viloyatni tanlang *</option>
                  {regionNames.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <select
                  value={toDistrict}
                  onChange={(e) => setToDistrict(e.target.value)}
                  disabled={!toRegion}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium disabled:opacity-50"
                >
                  <option value="">Tuman / Shahar (ixtiyoriy)</option>
                  {toRegion &&
                    REGIONS_DATA[toRegion]?.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Cargo description & weight */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Yuk haqida ma’lumot *:
                </label>
                <input
                  type="text"
                  required
                  value={cargoTitle}
                  onChange={(e) => setCargoTitle(e.target.value)}
                  placeholder="Masalan: Go‘sht, Sabzavotlar, Qurilish mollari..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Og‘irligi (vazni) *:
                </label>
                <input
                  type="text"
                  required
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  placeholder="Masalan: 5t, 3.5t"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Body type & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kerakli kuzov turi *:
                </label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white font-medium"
                >
                  {BODY_TYPES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taklif qilingan narx:
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Masalan: 3 000 000 so‘m yoki Kelishiladi"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Contact phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bog‘lanish uchun telefon raqam (Haydovchi kalit sarflaganda ochiladi):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Qo‘shimcha izoh yoki talablar:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masalan: Bugun soat 18:00 gacha yuklash kerak, tushirish joyi markazda..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {submitting ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>E’lonni saytga joylashtirish</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. MY ORDERS LIST */}
      {activeTab === 'my_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Siz joylashtirgan yuklar ({myOrders.length})
            </h3>
            <button
              onClick={() => setActiveTab('add_order')}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Yangi qo‘shish
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Buyurtmalar yuklanmoqda...</p>
            </div>
          ) : myOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-sm font-bold text-slate-700">Sizda hali yuk e’lonlari yo‘q</p>
              <p className="text-xs text-slate-400 mt-1">
                Yangi yuk qo‘shing va Isuzu haydovchilari siz bilan bog‘lanishadi.
              </p>
              <button
                onClick={() => setActiveTab('add_order')}
                className="mt-3 text-xs bg-blue-600 text-white font-bold px-4 py-2 rounded-xl"
              >
                + Birinchi yukni qo‘shish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myOrders.map((ord) => {
                const isActive = ord.status === 'active';

                return (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                      isActive ? 'border-slate-200 shadow-xs' : 'border-slate-200 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Status badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isActive ? '● Faol (Yuk ochiq)' : '✓ Yuk olindi (Yopilgan)'}
                        </span>
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="E’lonni o‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Route */}
                      <div className="font-extrabold text-slate-900 text-sm mb-2">
                        {ord.from_region} → {ord.to_region}
                      </div>

                      <div className="text-xs font-semibold text-slate-700">
                        {ord.cargo_title} ({ord.cargo_weight})
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kuzov: <span className="font-medium text-slate-800">{ord.body_type}</span>
                      </div>
                      <div className="text-xs text-blue-600 font-bold mt-1">
                        Narx: {ord.price}
                      </div>

                      <div className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Tel: <span className="font-mono font-bold text-slate-800">{ord.contact_phone}</span>
                      </div>
                    </div>

                    {/* Change Status Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleToggleStatus(ord.id, ord.status)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-800 hover:bg-slate-900 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>"Yuk olindi" ga o‘tkazish (Yopish)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Qaytadan faollashtirish</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. OTHER BROKERS ORDERS */}
      {activeTab === 'other_brokers' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-800">
            <Globe2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Boshqa brokerlar e’lonlari va bozor narxlari:</span>
              <p className="mt-0.5 text-blue-700">
                Ushbu bo‘limda boshqa dispetcherlar qo‘ygan yuklarni va yo‘nalishlar bo‘yicha narxlarni kuzatishingiz mumkin. Brokerlar bir-birlarining telefon raqamlarini to‘g‘ridan-to‘g‘ri ko‘rmaydi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                      {ord.body_type}
                    </span>
                    <span>{ord.created_at ? new Date(ord.created_at).toLocaleDateString('uz-UZ') : 'Bugun'}</span>
                  </div>

                  <div className="font-extrabold text-slate-900 text-sm mb-1">
                    {ord.from_region} → {ord.to_region}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">{ord.cargo_title} ({ord.cargo_weight})</div>
                  <div className="text-xs font-bold text-emerald-600 mt-2">
                    Taklif narxi: {ord.price}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[11px] text-slate-500 font-medium">Telefon raqam:</span>
                  <span className="text-xs font-mono font-bold text-slate-500 blur-[3px]">
                    +998 90 *** ** **
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                    <EyeOff className="w-3 h-3" /> Yopiq
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
