import { useState, useRef, useEffect } from 'react';
import { Lock, Gauge, Globe, Hash, Power, User, LogOut, CheckCircle2 } from 'lucide-react';
import { Language, ActiveSession } from '../types';
import { getTranslation } from '../i18n/translations';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isEngineReady: boolean;
  activeSession: ActiveSession | null;
  onLock: () => void;
  onSignOut: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function Header({
  lang,
  onToggleLang,
  isEngineReady,
  activeSession,
  onLock,
  onSignOut,
  activeTab,
  onSelectTab,
}: HeaderProps) {
  const pillRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // Swipe-to-lock logic
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !pillRef.current || !thumbRef.current) return;
    const travel = pillRef.current.clientWidth - thumbRef.current.clientWidth - 20;
    const maxDrag = lang === 'ar' ? travel : -travel;
    let delta = e.clientX - startXRef.current;

    if (lang === 'ar') {
      delta = Math.max(0, Math.min(delta, maxDrag));
    } else {
      delta = Math.min(0, Math.max(delta, maxDrag));
    }
    setDragOffset(delta);

    if (Math.abs(delta) >= Math.abs(maxDrag) * 0.88) {
      isDraggingRef.current = false;
      setDragOffset(0);
      onLock();
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setDragOffset(0);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-nav px-5 sm:px-7 py-2.5 rounded-full shadow-lg shadow-slate-900/5 transition-all">
        {/* Brand Zone */}
        <a
          href="#top"
          className="flex items-center gap-3 group whitespace-nowrap shrink-0"
          aria-label="x7 home"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-syne font-bold text-base flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            x7
          </div>
          <div className="flex flex-col">
            <span className="font-syne text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              x7
            </span>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-bold -mt-1">
              {t('brandSubtitle')}
            </span>
          </div>
        </a>

        {/* Navigation links (4 concise tools) */}
        <nav
          className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-full border border-slate-200/90 text-xs font-medium text-slate-600"
          aria-label="Security Tools"
        >
          <button
            onClick={() => onSelectTab('crypto')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'crypto'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navCrypto')}</span>
          </button>
          <button
            onClick={() => onSelectTab('entropy')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'entropy'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navEntropy')}</span>
          </button>
          <button
            onClick={() => onSelectTab('inspector')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'inspector'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navInspector')}</span>
          </button>
          <button
            onClick={() => onSelectTab('hash')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'hash'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('navHash')}</span>
          </button>
        </nav>

        {/* Action Zone: Lang toggle + Engine status + Session Lock & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            title={lang === 'en' ? 'تغيير اللغة إلى العربية' : 'Switch to English'}
            aria-label="Switch language"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200/90 text-slate-800 text-xs font-extrabold flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                isEngineReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{isEngineReady ? t('engineReady') : t('engineNo')}</span>
          </div>

          {activeSession && (
            <div className="relative" ref={dropdownRef}>
              <div
                ref={pillRef}
                className="relative bg-slate-100 border border-slate-200/90 rounded-full h-[36px] flex items-center justify-between user-select-none overflow-hidden min-w-[160px] sm:min-w-[180px] px-2.5 shadow-inner"
              >
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 min-w-0 pr-1 text-left cursor-pointer hover:opacity-80 transition-opacity"
                  title={`${activeSession.name} (${activeSession.email})`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[80px] sm:max-w-[100px]">
                    {activeSession.name}
                  </span>
                </button>
                <div
                  ref={thumbRef}
                  role="button"
                  tabIndex={0}
                  aria-label={t('lockTitle')}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onClick={onLock}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLock();
                    }
                  }}
                  style={{
                    transform: `translateX(${dragOffset}px)`,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.25s ease',
                  }}
                  className="w-7 h-7 bg-white text-slate-600 hover:text-rose-600 border border-slate-200 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm z-10 transition-colors touch-none"
                >
                  <Power className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* User Session Dropdown */}
              {isDropdownOpen && (
                <div className="absolute end-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3 shadow-xl z-50 text-xs">
                  <div className="pb-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{activeSession.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{activeSession.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{t('sessionPersistedBadge')}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLock();
                      }}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('btnLock')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>{t('btnSignOut')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
