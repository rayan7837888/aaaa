import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, User, Mail, KeyRound, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language, StoredAccounts, UserAccount } from '../types';
import { getTranslation } from '../i18n/translations';
import {
  isWebCryptoAvailable,
  hashPasswordForAuth,
  bytesToBase64,
  base64ToBytes,
  constantTimeEqual,
  normalizeEmail,
  KDF_ITERATIONS,
} from '../utils/crypto';

interface AuthModalProps {
  isOpen: boolean;
  lang: Language;
  onSuccess: (account: UserAccount) => void;
  addToast: (msg: string, type?: 'info' | 'err' | 'success') => void;
}

export function AuthModal({ isOpen, lang, onSuccess, addToast }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasDuplicateEmail, setHasDuplicateEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  // Lockout countdown timer
  useEffect(() => {
    if (lockedUntil <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(0);
        setLockCountdown(0);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  if (!isOpen) return null;

  const loadAccounts = (): StoredAccounts => {
    try {
      const stored = localStorage.getItem('x7_accounts');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setHasDuplicateEmail(false);

    if (!isWebCryptoAvailable()) {
      setErrorMsg(t('engineNo'));
      return;
    }

    if (Date.now() < lockedUntil) {
      setErrorMsg(t('errLock', { n: lockCountdown }));
      return;
    }

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg(t('errEmail'));
      return;
    }

    const normalizedInput = normalizeEmail(cleanEmail);
    setIsSubmitting(true);

    try {
      const accounts = loadAccounts();

      if (tab === 'signup') {
        if (password.length < 10) {
          setErrorMsg(t('errShort'));
          setIsSubmitting(false);
          return;
        }

        // Strict duplicate check against normalized email and all stored variants
        const existingAccount =
          accounts[normalizedInput] ||
          Object.values(accounts).find(
            (acc) =>
              acc.normalizedEmail === normalizedInput ||
              normalizeEmail(acc.email) === normalizedInput
          );

        if (existingAccount) {
          const isGmail = normalizedInput.endsWith('@gmail.com');
          setErrorMsg(isGmail ? t('errExistsGmail') : t('errExists'));
          setHasDuplicateEmail(true);
          setIsSubmitting(false);
          return;
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const derivedHash = await hashPasswordForAuth(password, salt, KDF_ITERATIONS);
        const displayName = name.trim() || cleanEmail.split('@')[0];
        const now = Date.now();

        const newAccount: UserAccount = {
          name: displayName,
          email: cleanEmail,
          normalizedEmail: normalizedInput,
          salt: bytesToBase64(salt),
          hash: bytesToBase64(derivedHash),
          iter: KDF_ITERATIONS,
          createdAt: now,
          lastLoginAt: now,
        };

        accounts[normalizedInput] = newAccount;

        try {
          localStorage.setItem('x7_accounts', JSON.stringify(accounts));
        } catch {
          setErrorMsg('Local storage is full or disabled');
          setIsSubmitting(false);
          return;
        }

        addToast(t('authUp'), 'success');
        setPassword('');
        onSuccess(newAccount);
      } else {
        // Sign-in mode with normalized email resolution
        const existingAccount =
          accounts[normalizedInput] ||
          Object.values(accounts).find(
            (acc) =>
              acc.normalizedEmail === normalizedInput ||
              normalizeEmail(acc.email) === normalizedInput
          );

        const salt = existingAccount
          ? base64ToBytes(existingAccount.salt)
          : crypto.getRandomValues(new Uint8Array(16));
        const iterations = existingAccount ? existingAccount.iter : KDF_ITERATIONS;

        const candidateHash = await hashPasswordForAuth(password, salt, iterations);

        if (
          existingAccount &&
          constantTimeEqual(candidateHash, base64ToBytes(existingAccount.hash))
        ) {
          setFailedAttempts(0);
          setPassword('');
          // Update lastLoginAt
          existingAccount.lastLoginAt = Date.now();
          accounts[normalizedInput] = existingAccount;
          try {
            localStorage.setItem('x7_accounts', JSON.stringify(accounts));
          } catch {
            // ignore
          }
          onSuccess(existingAccount);
        } else {
          const nextFailed = failedAttempts + 1;
          setFailedAttempts(nextFailed);
          if (nextFailed >= 5) {
            const lockTime = Date.now() + 30000;
            setLockedUntil(lockTime);
            setLockCountdown(30);
            setFailedAttempts(0);
            setErrorMsg(t('errLock', { n: 30 }));
          } else {
            setErrorMsg(t('errCreds'));
          }
        }
      }
    } catch {
      setErrorMsg(t('errCreds'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="authTitle"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md transition-all duration-300"
    >
      <div className="glass-auth w-full max-w-md p-7 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow behind modal */}
        <div
          className="absolute -top-16 -right-16 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white font-syne text-2xl font-bold shadow-xl mb-3 border border-slate-800">
            x7
          </div>
          <h2
            id="authTitle"
            className="font-jakarta text-2xl font-bold text-slate-900 tracking-tight"
          >
            {tab === 'signup' ? t('authUp') : t('authIn')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider">
            {t('unlockSubtitle')}
          </p>
        </div>

        {/* Tab switches */}
        <div
          className="flex p-1 bg-slate-100/90 rounded-xl mb-5 relative z-10 border border-slate-200/90"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signin'}
            onClick={() => {
              setTab('signin');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              tab === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('tabSignIn')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => {
              setTab('signup');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('tabSignUp')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10" noValidate>
          {tab === 'signup' && (
            <div>
              <label
                htmlFor="authName"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {t('nameLabel')}
              </label>
              <div className="relative">
                <User
                  className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  id="authName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder={t('namePlaceholder')}
                  className="w-full ps-9 pe-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="authEmail"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="email"
                id="authEmail"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                dir="ltr"
                placeholder={t('emailPlaceholder')}
                className="w-full ps-9 pe-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="authPassword"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <KeyRound
                className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                id="authPassword"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                dir="ltr"
                placeholder="••••••••••••"
                className="w-full ps-9 pe-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              {hasDuplicateEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMsg('');
                    setHasDuplicateEmail(false);
                  }}
                  className="self-start text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 transition-colors cursor-pointer mt-1"
                >
                  <span>{t('btnGoToSignIn')}</span>
                  {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || lockCountdown > 0}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>
              {lockCountdown > 0
                ? t('errLock', { n: lockCountdown })
                : tab === 'signup'
                ? t('btnSignUp')
                : t('btnSignIn')}
            </span>
            <Shield className="w-3.5 h-3.5" />
          </button>

          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            {t('authDisclaimer')}
          </p>
        </form>
      </div>
    </div>
  );
}
