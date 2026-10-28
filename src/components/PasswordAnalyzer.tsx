import { useState, useMemo } from 'react';
import { Eye, EyeOff, Sparkles, Copy, Check, ShieldAlert, Dice5 } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import {
  analyzePasswordEntropy,
  generateSecurePassword,
  isWebCryptoAvailable,
} from '../utils/crypto';

interface PasswordAnalyzerProps {
  lang: Language;
  addToast: (msg: string, type?: 'info' | 'err' | 'success') => void;
  passwordState: [string, (val: string) => void];
}

export function PasswordAnalyzer({
  lang,
  addToast,
  passwordState,
}: PasswordAnalyzerProps) {
  const [password, setPassword] = passwordState;
  const [showPassword, setShowPassword] = useState(false);
  const [genLength, setGenLength] = useState<number>(20);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  const analysis = useMemo(() => {
    return analyzePasswordEntropy(password, lang);
  }, [password, lang]);

  const handleGenerate = () => {
    if (!isWebCryptoAvailable()) {
      addToast(t('engineNo'), 'err');
      return;
    }
    const generated = generateSecurePassword(genLength, includeSymbols);
    setPassword(generated);
    setShowPassword(true);
    addToast(t('genTitle'), 'info');
  };

  const handleCopy = async () => {
    if (!password) {
      addToast(t('nothingCopy'), 'err');
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      addToast(t('copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(t('copyFail'), 'err');
    }
  };

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/90 transition-all">
      <div className="space-y-6">
        {/* Input box */}
        <div>
          <label
            htmlFor="entropyInput"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
          >
            {t('pwdLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="entropyInput"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('pwdPlaceholder')}
              autoComplete="off"
              dir="ltr"
              className="w-full p-3.5 pe-12 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength Bar */}
          <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${password ? analysis.percent : 0}%`,
                backgroundColor: analysis.qualityColor,
              }}
            />
          </div>

          {/* Warnings and weakness checklist */}
          <div className="mt-2 text-xs min-h-[1.25rem] flex items-center gap-1.5 text-slate-600">
            {analysis.warnings.length > 0 ? (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{analysis.warnings.map((w) => t(w)).join(' ')}</span>
              </div>
            ) : password ? (
              <span className="text-emerald-700 font-medium">{t('wGood')}</span>
            ) : (
              <span className="text-slate-400">{t('emptyInput')}</span>
            )}
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">
              {t('colEntropy')}
            </span>
            <div className="flex items-baseline gap-1" dir="ltr">
              <span className="font-syne text-2xl font-extrabold text-slate-900 tabular-nums">
                {analysis.bits.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-500">{t('bits')}</span>
            </div>
            <span
              className="block text-[11px] font-medium mt-1"
              style={{ color: analysis.qualityColor }}
            >
              {password ? t(analysis.quality) : t('emptyInput')}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">
              {t('colPool')}
            </span>
            <span className="font-syne text-2xl font-extrabold text-slate-900 tabular-nums">
              {analysis.poolSize}
            </span>
            <span className="block text-[11px] font-mono text-slate-500 mt-1">
              {t('poolSub')}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">
              {t('colCrack')}
            </span>
            <span className="font-syne text-xl font-extrabold text-slate-900 truncate block">
              {analysis.crackTimeStr}
            </span>
            <span className="block text-[11px] font-mono text-slate-500 mt-1 truncate">
              {t('crackSub')}
            </span>
          </div>
        </div>

        {/* Generator Section */}
        <div className="border-t border-slate-200/80 pt-6">
          <h3 className="font-jakarta text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Dice5 className="w-4 h-4 text-slate-600" />
            <span>{t('genTitle')}</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-3 text-xs text-slate-700 flex-1">
              <span className="whitespace-nowrap">{t('genLength')}</span>
              <input
                type="range"
                min={12}
                max={64}
                value={genLength}
                onChange={(e) => setGenLength(Number(e.target.value))}
                className="flex-1 accent-slate-900 cursor-pointer"
                aria-label={t('genLength')}
              />
              <span className="font-mono font-bold w-6 text-center tabular-nums text-slate-900">
                {genLength}
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{t('genSymbols')}</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>{t('btnGenerate')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                aria-label={t('btnCopy')}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('btnCopy')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500 font-mono">
            {t('genFooterNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
