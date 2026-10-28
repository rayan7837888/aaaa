import { useState, useEffect } from 'react';
import { Hash, Copy, Check, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { calculateDigest, isWebCryptoAvailable } from '../utils/crypto';

interface HashChecksumProps {
  lang: Language;
  addToast: (msg: string, type?: 'info' | 'err' | 'success') => void;
}

export function HashChecksum({ lang, addToast }: HashChecksumProps) {
  const [inputText, setInputText] = useState('x7 security toolkit client-side encryption payload');
  const [algorithm, setAlgorithm] = useState<'SHA-256' | 'SHA-512' | 'SHA-384'>('SHA-256');
  const [hashOutput, setHashOutput] = useState<string>('');
  const [expectedHash, setExpectedHash] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  useEffect(() => {
    if (!inputText) {
      setHashOutput('');
      return;
    }
    if (!isWebCryptoAvailable()) return;

    calculateDigest(inputText, algorithm)
      .then(setHashOutput)
      .catch(() => setHashOutput(''));
  }, [inputText, algorithm]);

  const handleCopy = async () => {
    if (!hashOutput) {
      addToast(t('nothingCopy'), 'err');
      return;
    }
    try {
      await navigator.clipboard.writeText(hashOutput);
      setCopied(true);
      addToast(t('copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast(t('copyFail'), 'err');
    }
  };

  const isMatching = expectedHash.trim()
    ? expectedHash.trim().toLowerCase() === hashOutput.toLowerCase()
    : null;

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/90 transition-all">
      <div className="space-y-5">
        {/* Input Text & Algorithm selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 w-full">
            <label
              htmlFor="hashInput"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
            >
              {t('hashInputLabel')}
            </label>
            <textarea
              id="hashInput"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('hashInputPlaceholder')}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="w-full sm:w-48">
            <label
              htmlFor="algoSelect"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
            >
              {t('algoLabel')}
            </label>
            <div className="flex sm:flex-col gap-2">
              {(['SHA-256', 'SHA-512', 'SHA-384'] as const).map((algo) => (
                <button
                  key={algo}
                  type="button"
                  onClick={() => setAlgorithm(algo)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all text-left flex items-center justify-between border cursor-pointer ${
                    algorithm === algo
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                  }`}
                >
                  <span>{algo}</span>
                  {algorithm === algo && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculated Hash Result */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              <span>{algorithm} DIGEST ({hashOutput ? `${hashOutput.length * 4} BITS` : '0 BITS'})</span>
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">{t('copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[11px]">{t('btnCopyHash')}</span>
                </>
              )}
            </button>
          </div>
          <div
            dir="ltr"
            className="font-mono text-xs text-emerald-400 break-all leading-relaxed select-all py-1 min-h-[2.5rem]"
          >
            {hashOutput || t('waitingOutput')}
          </div>
        </div>

        {/* Verification / Match against expected hash */}
        <div>
          <label
            htmlFor="expectedHash"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono"
          >
            {t('verifyLabel')}
          </label>
          <div className="relative">
            <input
              type="text"
              id="expectedHash"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              placeholder={t('verifyPlaceholder')}
              dir="ltr"
              className="w-full p-3 pe-10 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none"
            />
            {isMatching !== null && (
              <div className="absolute end-3 top-1/2 -translate-y-1/2">
                {isMatching ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
            )}
          </div>

          {isMatching !== null && (
            <div
              className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                isMatching
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {isMatching ? t('hashMatch') : t('hashMismatch')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
