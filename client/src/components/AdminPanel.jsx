import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, Check, X, Users, CreditCard, Key, 
  Settings, Clock, CheckCircle2, XCircle, RotateCw, 
  Phone, ArrowUpRight, DollarSign, Edit3, Trash2 
} from 'lucide-react';

export const AdminPanel = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'users' | 'settings'

  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    card_number: '',
    card_holder: '',
    support_phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Edit user key balance
  const [editUserId, setEditUserId] = useState(null);
  const [newKeyBalance, setNewKeyBalance] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Payments
      const resP = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataP = await resP.json();
      setPayments(Array.isArray(dataP) ? dataP : []);

      // Load Users
      const resU = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataU = await resU.json();
      setUsers(Array.isArray(dataU) ? dataU : []);

      // Load Settings
      const resS = await fetch('/api/settings');
      const dataS = await resS.json();
      setSettings(dataS);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Approve Payment
  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: data.message });
      setTimeout(() => setMsg(null), 3500);
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setTimeout(() => setMsg(null), 3500);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Payment
  const handleReject = async (id) => {
    const reason = prompt('Rad etish sababini yozing (ixtiyoriy):');
    if (reason === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ admin_note: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: 'To‘lov rad etildi' });
      setTimeout(() => setMsg(null), 3500);
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      setTimeout(() => setMsg(null), 3500);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ type: 'success', text: 'Sozlamalar yangilandi' });
      setTimeout(() => setMsg(null), 3500);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Update user key balance manually
  const handleSaveUserKeys = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/keys`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keys_balance: parseInt(newKeyBalance) || 0 }),
      });
      if (res.ok) {
        setEditUserId(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-200">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black">IsuzuGo Administrator Paneli</h2>
            <p className="text-xs text-purple-200">To‘lovlarni tasdiqlash, foydalanuvchilar va sayt sozlamalari</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingPayments.length > 0 && (
            <span className="bg-amber-400 text-amber-950 text-xs font-black px-3 py-1.5 rounded-full animate-pulse shadow-md">
              {pendingPayments.length} ta kutilayotgan to‘lov!
            </span>
          )}
        </div>
      </div>

      {/* Global alert */}
      {msg && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm ${
          msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-purple-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>To‘lov so‘rovlari ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Foydalanuvchilar ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-purple-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Karta va Sozlamalar</span>
        </button>
      </div>

      {/* 1. PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Kutilayotgan va barcha to‘lovlar tarixi
            </h3>
            <button
              onClick={loadData}
              className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" /> Yangilash
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500">
              Hozircha hech qanday to‘lov so‘rovi yo‘q
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-3.5">Foydalanuvchi</th>
                      <th className="p-3.5">Tizim</th>
                      <th className="p-3.5">Summa</th>
                      <th className="p-3.5">Kalitlar (Key)</th>
                      <th className="p-3.5">Chek ma’lumoti</th>
                      <th className="p-3.5">Holati</th>
                      <th className="p-3.5 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => {
                      const isPending = p.status === 'pending';

                      return (
                        <tr key={p.id} className={isPending ? 'bg-amber-50/40' : ''}>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{p.user_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{p.user_phone}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                              {p.provider}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            {p.amount.toLocaleString()} so‘m
                          </td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs">
                              {p.total_keys} ta Key
                            </span>
                            {p.bonus_keys > 0 && (
                              <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
                                (+{p.bonus_keys} bonus)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-xs">
                            <div className="truncate font-mono">{p.receipt_note || '—'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(p.created_at).toLocaleString('uz-UZ')}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {p.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Tasdiqlandi
                              </span>
                            )}
                            {p.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Kutilmoqda
                              </span>
                            )}
                            {p.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                <X className="w-3 h-3" /> Rad etildi
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isPending && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApprove(p.id)}
                                  disabled={actionLoading}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Tasdiqlash</span>
                                </button>
                                <button
                                  onClick={() => handleReject(p.id)}
                                  disabled={actionLoading}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">
            Ro‘yxatdan o‘tgan barcha foydalanuvchilar ({users.length})
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">F.I.SH</th>
                    <th className="p-3.5">Telefon</th>
                    <th className="p-3.5">Gmail</th>
                    <th className="p-3.5">Rol</th>
                    <th className="p-3.5">Key Balansi</th>
                    <th className="p-3.5 text-right">Tahrirlash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="p-3.5 font-bold text-slate-800">{u.full_name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{u.phone}</td>
                      <td className="p-3.5 text-slate-500">{u.email}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[11px] px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-700">
                          {u.role === 'carrier' ? 'Haydovchi' : u.role === 'broker' ? 'Broker' : 'Admin'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {editUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={newKeyBalance}
                              onChange={(e) => setNewKeyBalance(e.target.value)}
                              className="w-16 border border-slate-300 rounded px-1.5 py-1 text-xs"
                            />
                            <button
                              onClick={() => handleSaveUserKeys(u.id)}
                              className="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-bold"
                            >
                              Saqlash
                            </button>
                            <button
                              onClick={() => setEditUserId(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                            {u.keys_balance} ta Key
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {editUserId !== u.id && (
                          <button
                            onClick={() => {
                              setEditUserId(u.id);
                              setNewKeyBalance(u.keys_balance);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs cursor-pointer"
                          >
                            Kalitni o‘zgartirish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 max-w-lg mx-auto shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">To‘lov kartasi va sozlamalar</h3>
              <p className="text-xs text-slate-500">Haydovchilar to‘lov qiladigan karta ma’lumotlarini o‘zgartirish</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Karta raqami (Uzcard / Humo):
              </label>
              <input
                type="text"
                required
                value={settings.card_number || ''}
                onChange={(e) => setSettings({ ...settings, card_number: e.target.value })}
                placeholder="9860 3501 4452 7890"
                className="w-full font-mono text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Karta egasining ismi / Korxona nomi:
              </label>
              <input
                type="text"
                required
                value={settings.card_holder || ''}
                onChange={(e) => setSettings({ ...settings, card_holder: e.target.value })}
                placeholder="ISUZUGO LOGISTIKA MCHJ"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Qo‘llab-quvvatlash telefon raqami:
              </label>
              <input
                type="text"
                value={settings.support_phone || ''}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                placeholder="+998 71 200 45 45"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl text-sm shadow-md cursor-pointer transition-all"
            >
              {actionLoading ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
