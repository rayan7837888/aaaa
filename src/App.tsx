/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Calculator,
  Lock,
  Gauge,
  Globe,
  Hash,
  Github,
  Twitter,
  MessageSquare,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { Language, Toast, ActiveSession, UserAccount } from './types';
import { getTranslation } from './i18n/translations';
import { isWebCryptoAvailable, normalizeEmail } from './utils/crypto';
import { ConstellationCanvas } from './components/ConstellationCanvas';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { AesEncryptor } from './components/AesEncryptor';
import { PasswordAnalyzer } from './components/PasswordAnalyzer';
import { UrlInspector } from './components/UrlInspector';
import { HashChecksum } from './components/HashChecksum';
import { ToastHost } from './components/ToastHost';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('x7_lang');
      return saved === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });

  // Persistent active user session stored in localStorage so it survives closing tabs/browser
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() => {
    try {
      const stored = localStorage.getItem('x7_active_user');
      if (!stored) return null;
      const parsed: ActiveSession = JSON.parse(stored);
      // Validate that account actually exists in x7_accounts
      const accountsRaw = localStorage.getItem('x7_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const norm = parsed.normalizedEmail || normalizeEmail(parsed.email);
      if (accounts[norm] || accounts[parsed.email]) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // If a valid active session exists in localStorage, unlock automatically on load
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('x7_active_user');
      if (!stored) return true;
      const parsed: ActiveSession = JSON.parse(stored);
      const accountsRaw = localStorage.getItem('x7_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const norm = parsed.normalizedEmail || normalizeEmail(parsed.email);
      return !(accounts[norm] || accounts[parsed.email]);
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('crypto');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isEngineReady = isWebCryptoAvailable();

  // Shared state for crypto sensitive inputs so they can be wiped on lock/signout
  const passphraseState = useState<string>('');
  const cryptoInputState = useState<string>('');
  const entropyInputState = useState<string>('');

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  // Sync HTML lang and dir attributes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('x7_lang', lang);
    } catch {
      // storage unavailable
    }
  }, [lang]);

  const addToast = (message: string, type: 'info' | 'err' | 'success' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  // Called when user creates an account or signs in
  const handleAuthSuccess = (account: UserAccount) => {
    const session: ActiveSession = {
      name: account.name,
      email: account.email,
      normalizedEmail: account.normalizedEmail,
      signedInAt: Date.now(),
      lastSeen: Date.now(),
    };
    setActiveSession(session);
    try {
      // Persist to localStorage so the user remains logged in even after closing and returning
      localStorage.setItem('x7_active_user', JSON.stringify(session));
      // Update account lastLoginAt
      const accountsRaw = localStorage.getItem('x7_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      if (accounts[account.normalizedEmail]) {
        accounts[account.normalizedEmail].lastLoginAt = Date.now();
        localStorage.setItem('x7_accounts', JSON.stringify(accounts));
      }
    } catch {
      // ignore
    }
    setIsAuthOpen(false);
    addToast(`${t('activeUserWelcome')} ${account.name}`, 'success');
  };

  // Lock session temporarily (keeps user account in localStorage, wipes sensitive memory, requests password unlock)
  const handleLock = () => {
    // Wipe sensitive cryptographic keys and passwords from memory
    passphraseState[1]('');
    cryptoInputState[1]('');
    entropyInputState[1]('');

    setIsAuthOpen(true);
    addToast(t('lockTitle'), 'info');
  };

  // Sign out completely (clears active session so another user can sign in)
  const handleSignOut = () => {
    try {
      localStorage.removeItem('x7_active_user');
    } catch {
      // ignore
    }
    passphraseState[1]('');
    cryptoInputState[1]('');
    entropyInputState[1]('');
    setActiveSession(null);
    setIsAuthOpen(true);
    addToast(t('btnSignOut'), 'info');
  };

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen text-slate-800 antialiased selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Dynamic Background */}
      <ConstellationCanvas />

      {/* Floating Notifications */}
      <ToastHost toasts={toasts} />

      {/* Auth Gate (convenience session lock & account creator) */}
      <AuthModal
        isOpen={isAuthOpen}
        lang={lang}
        onSuccess={handleAuthSuccess}
        addToast={addToast}
      />

      {/* Main Workspace */}
      <div
        className={`transition-all duration-500 min-h-screen flex flex-col justify-between relative z-10 ${
          isAuthOpen ? 'filter blur-md pointer-events-none select-none' : ''
        }`}
        aria-hidden={isAuthOpen}
      >
        {/* Navigation Bar */}
        <Header
          lang={lang}
          onToggleLang={handleToggleLang}
          isEngineReady={isEngineReady}
          activeSession={activeSession}
          onLock={handleLock}
          onSignOut={handleSignOut}
          activeTab={activeTab}
          onSelectTab={scrollToSection}
        />

        <main className="flex-1">
          {/* Hero Section */}
          <section id="top" className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 text-center lg:text-start space-y-6">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200/90 text-slate-800 text-xs font-semibold tracking-wide font-mono">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('heroTag')}</span>
                  </div>

                  {activeSession && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{t('sessionPersistedBadge')}</span>
                    </div>
                  )}
                </div>

                <h1 className="font-syne text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.08] text-balance">
                  <span>{t('heroH1Part1')}</span> <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-800 bg-clip-text text-transparent">
                    {t('heroH1Part2')}
                  </span>
                </h1>

                <p className="font-sans text-slate-600 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  {t('heroSubtitle')}
                </p>

                {/* Account & Persistent Data Assurance Card */}
                {activeSession && (
                  <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-sm text-xs space-y-2 text-start">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>{activeSession.name}</span>
                        <span className="text-slate-400 font-normal">({activeSession.email})</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-semibold">
                        SAVED
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-sans">
                      {t('persistedInfoDesc')}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection('crypto')}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-8 py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-blue-400" />
                    <span>{t('btnLaunchAes')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('entropy')}
                    className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs px-7 py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    <Calculator className="w-4 h-4 text-slate-600" />
                    <span>{t('btnLaunchAnalyzer')}</span>
                  </button>
                </div>
              </div>

              {/* Engine Radar Card */}
              <div className="lg:col-span-5 relative">
                <div className="glass-card p-6 rounded-3xl relative overflow-hidden shadow-2xl border border-slate-200/90">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isEngineReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                        {t('engineTitle')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">
                      {isEngineReady ? t('engineReady') : t('engineNo')}
                    </span>
                  </div>

                  <div
                    className="relative w-full aspect-square max-w-[280px] sm:max-w-[300px] mx-auto rounded-full border border-slate-200 bg-slate-950 p-2 overflow-hidden flex items-center justify-center shadow-inner"
                    aria-hidden="true"
                  >
                    <div className="absolute inset-4 rounded-full border border-slate-800" />
                    <div className="absolute inset-14 rounded-full border border-slate-800" />
                    <div className="absolute inset-24 rounded-full border border-slate-800" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-[1px] bg-slate-800/80" />
                      <div className="h-full w-[1px] bg-slate-800/80 absolute" />
                    </div>
                    <div className="absolute inset-0 radar-beam animate-radar-sweep rounded-full" />
                    <div className="relative z-10 w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-lg shadow-blue-500/30">
                      x7
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-[11px]">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 block mb-0.5 text-[10px]">
                        {t('cipherLabel')}
                      </span>
                      <span className="text-slate-900 font-bold text-xs" dir="ltr">
                        AES-256-GCM
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-slate-400 block mb-0.5 text-[10px]">
                        {t('kdfLabel')}
                      </span>
                      <span className="text-emerald-700 font-bold text-xs" dir="ltr">
                        PBKDF2 · 600k
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: AES-256 Cryptography */}
          <section id="crypto" className="scroll-mt-28 py-20 bg-white/70 backdrop-blur-md border-y border-slate-200/80 px-4 sm:px-6 relative">
            <div className="max-w-5xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <span className="text-xs font-mono font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {t('aesTag')}
                </span>
                <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  {t('aesTitle')}
                </h2>
                <p className="text-slate-600 text-sm mt-2">
                  {t('aesDesc')}
                </p>
              </div>

              <AesEncryptor
                lang={lang}
                addToast={addToast}
                passphraseState={passphraseState}
                inputState={cryptoInputState}
              />
            </div>
          </section>

          {/* Section 2: Password Strength Analyzer & Generator */}
          <section id="entropy" className="scroll-mt-28 py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {t('entropyTag')}
              </span>
              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                {t('entropyTitle')}
              </h2>
              <p className="text-slate-600 text-sm mt-2">
                {t('entropyDesc')}
              </p>
            </div>

            <PasswordAnalyzer
              lang={lang}
              addToast={addToast}
              passwordState={entropyInputState}
            />
          </section>

          {/* Section 3: URL Security Inspector */}
          <section id="inspector" className="scroll-mt-28 py-20 bg-white/70 backdrop-blur-md border-t border-slate-200/80 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <span className="text-xs font-mono font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {t('urlTag')}
                </span>
                <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                  {t('urlTitle')}
                </h2>
                <p className="text-slate-600 text-sm mt-2">
                  {t('urlDesc')}
                </p>
              </div>

              <UrlInspector lang={lang} addToast={addToast} />
            </div>
          </section>

          {/* Section 4: Hash & Checksum Tool */}
          <section id="hash" className="scroll-mt-28 py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {t('hashTag')}
              </span>
              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                {t('hashTitle')}
              </h2>
              <p className="text-slate-600 text-sm mt-2">
                {t('hashDesc')}
              </p>
            </div>

            <HashChecksum lang={lang} addToast={addToast} />
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-10 pb-24 md:pb-10 px-4 sm:px-6 relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-syne font-bold flex items-center justify-center text-sm shadow-sm">
                x7
              </div>
              <span className="font-syne font-bold text-slate-900 text-base">
                x7 Security Toolkit
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono text-center">
              {t('footerCopyright')}
            </p>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-900 transition-colors"
                aria-label="Discord"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>
        </footer>

        {/* Mobile quick bottom tab navigation */}
        <nav
          className="md:hidden fixed bottom-3 inset-x-4 z-40 glass-nav rounded-full shadow-lg flex items-center justify-around py-2.5 text-slate-600"
          aria-label="Mobile Navigation"
        >
          <button
            type="button"
            onClick={() => scrollToSection('crypto')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              activeTab === 'crypto' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900'
            }`}
            aria-label={t('navCrypto')}
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('entropy')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              activeTab === 'entropy' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900'
            }`}
            aria-label={t('navEntropy')}
          >
            <Gauge className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('inspector')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              activeTab === 'inspector' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900'
            }`}
            aria-label={t('navInspector')}
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('hash')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              activeTab === 'hash' ? 'text-blue-600 bg-blue-50' : 'hover:text-slate-900'
            }`}
            aria-label={t('navHash')}
          >
            <Hash className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
