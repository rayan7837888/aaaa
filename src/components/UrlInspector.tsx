import { useState } from 'react';
import { Search, ShieldAlert, AlertTriangle, Info, CheckCircle2, Globe, ExternalLink } from 'lucide-react';
import { Language, UrlInspectionResult } from '../types';
import { getTranslation } from '../i18n/translations';
import { inspectUrlSecurity } from '../utils/crypto';

interface UrlInspectorProps {
  lang: Language;
  addToast: (msg: string, type?: 'info' | 'err' | 'success') => void;
}

export function UrlInspector({ lang, addToast }: UrlInspectorProps) {
  const [urlInput, setUrlInput] = useState(
    'https://x7.cybersecurity.enterprise:8443/api/v4/telemetry?token=sec_9082'
  );
  const [result, setResult] = useState<UrlInspectionResult | null>(() => {
    try {
      return inspectUrlSecurity(
        'https://x7.cybersecurity.enterprise:8443/api/v4/telemetry?token=sec_9082'
      );
    } catch {
      return null;
    }
  });

  const t = (k: string, p?: Record<string, string | number>) => getTranslation(lang, k, p);

  const handleInspect = (targetUrl?: string) => {
    const raw = (targetUrl !== undefined ? targetUrl : urlInput).trim();
    if (!raw) {
      addToast(t('urlInvalid'), 'err');
      return;
    }
    try {
      const inspected = inspectUrlSecurity(raw);
      setResult(inspected);
    } catch {
      addToast(t('urlInvalid'), 'err');
    }
  };

  const applyPreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
    handleInspect(presetUrl);
  };

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/90 transition-all">
      <div className="space-y-4">
        {/* URL Input and Action */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="urlInput"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInspect();
              }}
              dir="ltr"
              spellCheck={false}
              placeholder={t('urlPlaceholder')}
              className="w-full ps-10 pe-4 py-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-800 focus:bg-white transition-all outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleInspect()}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t('btnInspect')}</span>
          </button>
        </div>

        {/* Quick test presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-slate-400 font-mono text-[10px] uppercase font-bold">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto')}
            className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {t('quickTestSafe')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('http://192.168.1.100:5432/db_backup?auth_key=root_secret')}
            className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {t('quickTestRisky')}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('https://api.gateway.xyz/v1/auth?api_key=sk_live_99482710382&user=admin')}
            className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {t('quickTestToken')}
          </button>
        </div>

        {result && (
          <>
            {/* Grid Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 font-mono text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colProto')}
                </span>
                <span className="font-bold text-slate-900" dir="ltr">
                  {result.protocol}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colHost')}
                </span>
                <span className="font-bold text-slate-900 break-all" dir="ltr">
                  {result.host}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colPort')}
                </span>
                <span className="font-bold text-slate-900" dir="ltr">
                  {result.port}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colTransport')}
                </span>
                <span
                  className={`font-bold ${
                    result.transport === 'tls'
                      ? 'text-emerald-600'
                      : result.transport === 'plain'
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {result.transport === 'tls'
                    ? t('tls')
                    : result.transport === 'plain'
                    ? t('plain')
                    : '—'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 min-w-0">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colPath')}
                </span>
                <span className="font-bold text-slate-900 break-all" dir="ltr">
                  {result.path || '/'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colParams')}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {result.paramsCount}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1 font-bold">
                  {t('colRisk')}
                </span>
                <span
                  className={`font-bold text-xs ${
                    result.risk === 'high'
                      ? 'text-rose-600'
                      : result.risk === 'med'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {result.risk === 'high'
                    ? t('rHigh')
                    : result.risk === 'med'
                    ? t('rMed')
                    : t('rLow')}
                </span>
              </div>
            </div>

            {/* Findings List */}
            <ul className="space-y-2 pt-2 text-xs">
              {result.findings.map((finding, idx) => {
                let icon = <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />;
                let borderCls = 'border-slate-200 bg-slate-50';

                if (finding.severity === 'danger') {
                  icon = <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />;
                  borderCls = 'border-rose-200 bg-rose-50/50';
                } else if (finding.severity === 'warn') {
                  icon = <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />;
                  borderCls = 'border-amber-200 bg-amber-50/50';
                } else if (finding.severity === 'ok') {
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />;
                  borderCls = 'border-emerald-200 bg-emerald-50/50';
                }

                return (
                  <li
                    key={idx}
                    className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-2.5 ${borderCls}`}
                  >
                    {icon}
                    <span className="text-slate-700 leading-relaxed font-sans">
                      {t(finding.key, finding.param !== undefined ? { v: finding.param } : undefined)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="text-[11px] leading-relaxed text-slate-500 pt-2 font-mono">
          {t('urlFooterNote')}
        </p>
      </div>
    </div>
  );
}
