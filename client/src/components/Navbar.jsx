import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Key, PlusCircle, LogOut, User, ShieldCheck, Menu, X, PhoneCall } from 'lucide-react';

export const Navbar = ({ onOpenAuth, onOpenBuyKeys, currentView, setView }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => setView('home')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-2xl font-black tracking-tight text-slate-900">Isuzu</span>
                <span className="text-2xl font-black tracking-tight text-blue-600">Go</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 -mt-1 tracking-wider uppercase">
                O‘zbekiston Yuk Portali
              </p>
            </div>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* Role Specific Views */}
                {user.role === 'carrier' && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-xs">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-800">Balans:</span>
                    <span className="text-sm font-black text-amber-700">
                      {user.keys_balance} ta Key
                    </span>
                    <button
                      onClick={onOpenBuyKeys}
                      className="ml-2 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Key sotib olish
                    </button>
                  </div>
                )}

                {user.role === 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      currentView === 'admin'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}

                {/* Profile Pill */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{user.full_name}</p>
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {user.role === 'carrier' ? 'Yuk tashuvchi (Isuzu)' : user.role === 'broker' ? 'Broker / Dispetcher' : 'Administrator'}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Chiqish"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Kirish
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  Ro‘yxatdan o‘tish
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {user && user.role === 'carrier' && (
              <button
                onClick={onOpenBuyKeys}
                className="flex items-center gap-1 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{user.keys_balance} Key</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top duration-200">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.phone}</p>
                  <span className="inline-block mt-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {user.role === 'carrier' ? 'Yuk tashuvchi (Isuzu)' : user.role === 'broker' ? 'Broker / Dispetcher' : 'Administrator'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Chiqish
                </button>
              </div>

              {user.role === 'carrier' && (
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-800 font-medium">Sizning balansingiz:</p>
                      <p className="text-base font-black text-amber-900">{user.keys_balance} ta Key</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onOpenBuyKeys();
                      setMobileMenuOpen(false);
                    }}
                    className="bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm"
                  >
                    + Key olish
                  </button>
                </div>
              )}

              {user.role === 'admin' && (
                <button
                  onClick={() => {
                    setView('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-medium py-2.5 rounded-xl text-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panelga o‘tish
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm"
              >
                Kirish
              </button>
              <button
                onClick={() => {
                  onOpenAuth('register');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-sm"
              >
                Ro‘yxatdan o‘tish
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
