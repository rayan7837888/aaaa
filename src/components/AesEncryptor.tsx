import { useState } from 'react';
import { Lock, Unlock, Eraser, Copy, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import {
  isWebCryptoAvailable,
  encryptAesGcm,
  decryptAesGcm,
} from '../utils/crypto';

interface AesEncryptorProps {
  lang: Language;
  addToast: (msg: string, type?: 'info' | 'err' | 'success') => void;
  passphraseState: [string, (val: string) => void];
  inputState: [string, (val: string) => void];
}

export function AesEncryptor({
  lang,
  addToast,
  passphraseState,
  inputState,
}: AesEncryptorProps) {
  const [passphrase, setPassphrase] = passphraseState;
  const [inputText, setInputText] = inputState;
  const [showPass, setShowPass] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [statusBadge, setStatusBadge] = useState<'bReady' | 'bEnc' | 'bDec' | 'bBusy'>('bReady');
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  const handleEncrypt = async () => {
    if (!isWebCryptoAvailable()) {
      addToast(t('engineNo'), 'err');
      return;
    }
    if (!passphrase.trim()) {
      addToast(t('enterPass'), 'err');
      return;
    }
    if (!inputText.trim()) {
      addToast(t('enterPlain'), 'err');
      return;
    }

    setIsBusy(true);
    setStatusBadge('bBusy');

    // Slight delay to allow DOM to paint the working state
    setTimeout(async () => {
      try {
        const cipher = await encryptAesGcm(inputText, passphrase);
        setOutput(cipher);
        setStatusBadge('bEnc');
        addToast(t('encSuccess'), 'success');
      } catch (err) {
        setOutput(t('encErr'));
        setStatusBadge('bReady');
        addToast(t('encErr'), 'err');
      } finally {
        setIsBusy(false);
      }
    }, 40);
  };

  const handleDecrypt = async () => {
    if (!isWebCryptoAvailable()) {
      addToast(t('engineNo'), 'err');
      return;
    }
    if (!passphrase.trim()) {
      addToast(t('enterPass'), 'err');
      return;
    }
    const targetText = inputText.trim() || output;
    if (!targetText || targetText.startsWith('[SYSTEM]')) {
      addToast(t('needCipher'), 'err');
      return;
    }

    setIsBusy(true);
    setStatusBadge('bBusy');

    setTimeout(async () => {
      try {
        const plain = await decryptAesGcm(targetText, passphrase);
        setOutput(plain);
        setStatusBadge('bDec');
        addToast(t('decSuccess'), 'success');
      } catch {
        setOutput(t('decErr'));
        setStatusBadge('bReady');
        addToast(t('decErr'), 'err');
      } finally {
        setIsBusy(false);
      }
    }, 40);
  };

  const handleCopy = async () => {
    if (!output || output === t('waitingOutput')) {
      addToast(t('nothingCopy'), 'err');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      addToast(t('copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(t('copyFail'), 'err');
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutput('');
    setStatusBadge('bReady');
  };

  const badgeText = t(statusBadge);

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/90 transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <label
              htmlFor="cryptoPassphrase"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
            >
              {t('passphraseLabel')}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                id="cryptoPassphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="off"
                dir="ltr"
                placeholder={t('passphrasePlaceholder')}
                className="w-full ps-4 pe-11 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 text-xs p-1"
                aria-label="Toggle passphrase visibility"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="cryptoInput"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
            >
              {t('inputLabel')}
            </label>
            <textarea
              id="cryptoInput"
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('inputPlaceholder')}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleEncrypt}
              disabled={isBusy}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('btnEncrypt')}</span>
            </button>
            <button
              type="button"
              onClick={handleDecrypt}
              disabled={isBusy}
              className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 disabled:opacity-60 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('btnDecrypt')}</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              title={t('btnClear')}
              aria-label={t('btnClear')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: High-Tech Output Console */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                {t('outputLabel')}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  statusBadge === 'bEnc'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : statusBadge === 'bDec'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : statusBadge === 'bBusy'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {badgeText}
              </span>
            </div>

            <div
              dir="ltr"
              aria-live="polite"
              className="font-mono text-xs text-emerald-400 break-all h-44 overflow-y-auto leading-relaxed select-all"
            >
              {output || t('waitingOutput')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono rounded-xl transition-colors border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('btnCopyOutput')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>{t('aesFooterNote')}</p>
      </div>
    </div>
  );
}
