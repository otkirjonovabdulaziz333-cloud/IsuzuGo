import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { BuyKeysModal } from './components/BuyKeysModal';
import { CarrierCabinet } from './components/CarrierCabinet';
import { BrokerCabinet } from './components/BrokerCabinet';
import { AdminPanel } from './components/AdminPanel';
import { 
  Truck, ShieldCheck, PhoneCall, Sparkles, Key, 
  MapPin, CheckCircle2, ChevronRight, HelpCircle 
} from 'lucide-react';

const MainContent = () => {
  const { user, loading } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [buyKeysModalOpen, setBuyKeysModalOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'admin'

  const openAuth = (mode = 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const openBuyKeys = () => {
    if (!user) {
      openAuth('login');
      return;
    }
    setBuyKeysModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">IsuzuGo yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <Navbar
          onOpenAuth={openAuth}
          onOpenBuyKeys={openBuyKeys}
          currentView={view}
          setView={setView}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {view === 'admin' && user?.role === 'admin' ? (
            <AdminPanel />
          ) : user?.role === 'broker' ? (
            <BrokerCabinet />
          ) : (
            <CarrierCabinet onOpenBuyKeys={openBuyKeys} onOpenAuth={openAuth} />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800 text-xs">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-lg font-black text-white tracking-tight">Isuzu<span className="text-blue-500">Go</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                O‘zbekistondagi yuk brokerlari va Isuzu hamda yengil tijorat yuk mashinalari haydovchilarini to‘g‘ridan-to‘g‘ri bog‘laydigan mustaqil logistika platformasi.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Haydovchilar uchun</p>
              <ul className="space-y-1.5">
                <li>• Barcha viloyatlar bo‘yicha yangi yuklar</li>
                <li>• 2 ta bepul bonus Key ro‘yxatdan o‘tganda</li>
                <li>• Click, Payme, Paynet orqali oson to‘lov</li>
                <li>• Har 10 ta Key ga +1 ta bepul bonus</li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Brokerlar uchun</p>
              <ul className="space-y-1.5">
                <li>• Cheklovlarsiz bepul e’lon joylashtirish</li>
                <li>• Real vaqtda "Yuk olindi" holatini boshqarish</li>
                <li>• Boshqa brokerlar narxlarini monitoring qilish</li>
                <li>• Ishonchli Isuzu haydovchilari tarmog‘i</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-2">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Qo‘llab-quvvatlash</p>
              <p className="text-slate-300 font-mono text-sm font-bold">+998 71 200 45 45</p>
              <p className="text-slate-400">Har kuni 08:00 dan 22:00 gacha xizmatingizdamiz</p>
              <div className="pt-2 flex items-center gap-2 text-slate-300">
                <span className="bg-slate-800 px-2 py-1 rounded text-[10px] font-bold">CLICK</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-[10px] font-bold">PAYME</span>
                <span className="bg-slate-800 px-2 py-1 rounded text-[10px] font-bold">PAYNET</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} IsuzuGo. Barcha huquqlar himoyalangan.</p>
            <p>O‘zbekiston logistika va yuk tashuvchilari platformasi</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <BuyKeysModal
        isOpen={buyKeysModalOpen}
        onClose={() => setBuyKeysModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
