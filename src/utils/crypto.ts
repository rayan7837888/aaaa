import { PasswordAnalysis, UrlInspectionResult, UrlFinding } from '../types';

export const KDF_ITERATIONS = 600000;
export const PREFIX_V2 = 'x7v2.';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function isWebCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.crypto && window.crypto.subtle);
}

/**
 * Normalizes email addresses, with special handling for Gmail/Googlemail:
 * - Case-insensitive
 * - Removes dots (.) from Gmail usernames
 * - Strips '+' plus aliases from Gmail usernames
 * - Maps googlemail.com to gmail.com
 * Ensures duplicate registrations with equivalent Gmail addresses cannot occur.
 */
export function normalizeEmail(rawEmail: string): string {
  const clean = rawEmail.trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1) return clean;

  let user = clean.slice(0, atIndex);
  let domain = clean.slice(atIndex + 1);

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  if (domain === 'gmail.com') {
    user = user.replace(/\./g, '');
    const plusIndex = user.indexOf('+');
    if (plusIndex !== -1) {
      user = user.slice(0, plusIndex);
    }
  }

  return `${user}@${domain}`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPasswordForAuth(pw: string, salt: Uint8Array, iter: number = KDF_ITERATIONS): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pw),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: iter,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(derivedBits);
}

async function deriveAesKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAesGcm(plaintext: string, passphrase: string): Promise<string> {
  if (!isWebCryptoAvailable()) {
    throw new Error('WebCrypto API is not supported in this environment');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt, KDF_ITERATIONS);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext)
  );

  const ct = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(16 + 12 + ct.length);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(ct, 28);

  return PREFIX_V2 + bytesToBase64(combined);
}

export async function decryptAesGcm(ciphertextRaw: string, passphrase: string): Promise<string> {
  if (!isWebCryptoAvailable()) {
    throw new Error('WebCrypto API is not supported in this environment');
  }
  const clean = ciphertextRaw.trim().replace(/\s+/g, '');
  if (!clean) {
    throw new Error('Empty ciphertext');
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let data: Uint8Array;
  let iterations: number;

  if (clean.startsWith(PREFIX_V2)) {
    const rawBytes = base64ToBytes(clean.slice(PREFIX_V2.length));
    if (rawBytes.length < 28) throw new Error('Corrupted ciphertext');
    salt = rawBytes.slice(0, 16);
    iv = rawBytes.slice(16, 28);
    data = rawBytes.slice(28);
    iterations = KDF_ITERATIONS;
  } else {
    // Legacy v1 fallback (static salt, 100k iter)
    const rawBytes = base64ToBytes(clean);
    if (rawBytes.length < 12) throw new Error('Corrupted ciphertext');
    salt = enc.encode('x7-static-salt');
    iv = rawBytes.slice(0, 12);
    data = rawBytes.slice(12);
    iterations = 100000;
  }

  const key = await deriveAesKey(passphrase, salt, iterations);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );

  return dec.decode(decryptedBuffer);
}

export async function calculateDigest(text: string, algorithm: 'SHA-256' | 'SHA-512' | 'SHA-384' = 'SHA-256'): Promise<string> {
  if (!isWebCryptoAvailable()) {
    throw new Error('WebCrypto API unavailable');
  }
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ------------------- Password Strength & Entropy -------------------

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'abc123', '111111', '000000',
  'letmein', 'welcome', 'admin', 'administrator', 'iloveyou',
  'monkey', 'dragon', 'master', 'login', 'passw0rd',
  'football', 'baseball', 'sunshine', 'princess', 'trustno1',
  'superman', 'whatever', 'zaq12wsx', '1q2w3e4r', 'changeme',
  'secret', 'p@ssw0rd', 'x7', 'root', 'toor', 'test', 'guest'
]);

const leetTransform = (s: string) =>
  s.replace(/[@4]/g, 'a')
   .replace(/0/g, 'o')
   .replace(/[1!|]/g, 'i')
   .replace(/3/g, 'e')
   .replace(/[$5]/g, 's')
   .replace(/7/g, 't');

export function formatCrackTime(seconds: number, lang: 'en' | 'ar'): string {
  if (seconds < 1) return lang === 'ar' ? 'فوري' : 'Instant';
  if (seconds < 60) return `${Math.round(seconds)} ${lang === 'ar' ? 'ثوانٍ' : 'sec'}`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} ${lang === 'ar' ? 'دقيقة' : 'min'}`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ${lang === 'ar' ? 'ساعة' : 'hours'}`;
  const days = seconds / 86400;
  if (days < 365) return `${Math.round(days)} ${lang === 'ar' ? 'يوم' : 'days'}`;
  const years = days / 365.25;
  if (years < 1e3) return `${Math.round(years).toLocaleString()} ${lang === 'ar' ? 'سنة' : 'years'}`;
  if (years < 1e6) return `${Math.round(years / 1e3).toLocaleString()} ${lang === 'ar' ? 'ألف سنة' : 'thousand years'}`;
  if (years < 1e9) return `${Math.round(years / 1e6).toLocaleString()} ${lang === 'ar' ? 'مليون سنة' : 'million years'}`;
  if (years < 1e12) return `${Math.round(years / 1e9).toLocaleString()} ${lang === 'ar' ? 'مليار سنة' : 'billion years'}`;
  return lang === 'ar' ? '> تريليون سنة' : '> 1 trillion years';
}

export function analyzePasswordEntropy(pwd: string, lang: 'en' | 'ar'): PasswordAnalysis {
  if (!pwd) {
    return {
      bits: 0,
      poolSize: 0,
      quality: 'q1',
      qualityColor: '#e11d48',
      percent: 0,
      crackTimeStr: lang === 'ar' ? 'فوري' : 'Instant',
      warnings: []
    };
  }

  const chars = Array.from(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigits = /[0-9]/.test(pwd);
  const hasSymbols = /[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(pwd);
  const hasUnicode = chars.some(c => (c.codePointAt(0) ?? 0) > 127);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigits) pool += 10;
  if (hasSymbols) pool += 33;
  if (hasUnicode) pool += 100;

  const perCharEntropy = Math.log2(Math.max(pool, 2));
  let bits = 0;
  let predictable = 0;

  chars.forEach((c, i) => {
    if (i > 0) {
      const diff = (c.codePointAt(0) ?? 0) - (chars[i - 1].codePointAt(0) ?? 0);
      if (diff === 0 || Math.abs(diff) === 1) {
        predictable++;
        bits += 1; // penalized
        return;
      }
    }
    bits += perCharEntropy;
  });

  const lower = pwd.toLowerCase();
  const candidates = [
    lower,
    lower.replace(/[\d\W_]+$/, ''),
    leetTransform(lower),
    leetTransform(lower).replace(/[^a-z]+$/, '')
  ];
  const isCommon = candidates.some(c => COMMON_PASSWORDS.has(c));
  if (isCommon) {
    bits = Math.min(bits, 12);
  }

  const classesCount = [hasLower, hasUpper, hasDigits, hasSymbols, hasUnicode].filter(Boolean).length;
  const warnings: string[] = [];

  if (isCommon) warnings.push('wCommon');
  if (chars.length < 12) warnings.push('wShort');
  if (predictable >= 3) warnings.push('wPattern');
  if (classesCount === 1) warnings.push('wOne');

  let quality: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' = 'q1';
  let qualityColor = '#e11d48';
  let percent = 15;

  if (bits < 28) {
    quality = 'q1';
    qualityColor = '#e11d48';
    percent = 15;
  } else if (bits < 36) {
    quality = 'q2';
    qualityColor = '#f97316';
    percent = 35;
  } else if (bits < 60) {
    quality = 'q3';
    qualityColor = '#eab308';
    percent = 60;
  } else if (bits < 80) {
    quality = 'q4';
    qualityColor = '#22c55e';
    percent = 82;
  } else {
    quality = 'q5';
    qualityColor = '#059669';
    percent = 100;
  }

  // Average time to crack at 10^10 fast offline guesses per second
  const log2Seconds = (bits - 1) - Math.log2(1e10);
  const crackTimeStr = formatCrackTime(Math.pow(2, Math.min(log2Seconds, 200)), lang);

  return {
    bits: Math.round(bits * 10) / 10,
    poolSize: pool,
    quality,
    qualityColor,
    percent,
    crackTimeStr,
    warnings
  };
}

function getSecureRandomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const array = new Uint32Array(1);
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);
  return array[0] % max;
}

export function generateSecurePassword(length: number = 20, includeSymbols: boolean = true): string {
  if (!isWebCryptoAvailable()) {
    throw new Error('WebCrypto API unavailable');
  }
  const sets = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789'
  ];
  if (includeSymbols) {
    sets.push('!@#$%^&*()-_=+[]{};:,.?/');
  }
  const allChars = sets.join('');

  // Guarantee at least 1 character from each chosen character class
  const result: string[] = sets.map(s => s[getSecureRandomInt(s.length)]);

  while (result.length < length) {
    result.push(allChars[getSecureRandomInt(allChars.length)]);
  }

  // Fisher-Yates unbiased shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

// ------------------- URL Inspector -------------------

const RISKY_PORTS = new Set([
  '21', '22', '23', '25', '135', '139', '445', '1433', '1521',
  '3306', '3389', '5432', '5900', '6379', '9200', '11211', '27017'
]);

const SUSPICIOUS_TLDS = new Set([
  'zip', 'mov', 'tk', 'top', 'xyz', 'click', 'gq', 'ml', 'cf', 'ga', 'work', 'country', 'kim'
]);

const BAD_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:', 'file:', 'blob:']);
const SENSITIVE_QUERY_KEY = /token|secret|passw|pwd|api[_-]?key|auth|session|sid|signature|credential/i;

export function inspectUrlSecurity(rawInput: string): UrlInspectionResult {
  const raw = rawInput.trim();
  if (!raw) {
    throw new Error('Empty URL');
  }

  let parsed: URL;
  let assumedScheme = false;
  const hasExplicitScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /^(javascript|data|file|mailto|vbscript|blob):/i.test(raw);

  try {
    parsed = new URL(hasExplicitScheme ? raw : `https://${raw}`);
    assumedScheme = !hasExplicitScheme;
  } catch {
    throw new Error('Invalid URL format');
  }

  const findings: UrlFinding[] = [];
  if (assumedScheme) {
    findings.push({ severity: 'info', key: 'f_assumed' });
  }

  const proto = parsed.protocol;
  const host = parsed.hostname;

  if (proto === 'https:') {
    findings.push({ severity: 'ok', key: 'f_https' });
  } else if (proto === 'http:') {
    findings.push({ severity: 'warn', key: 'f_http' });
  } else if (BAD_SCHEMES.has(proto)) {
    findings.push({ severity: 'danger', key: 'f_badScheme', param: proto });
  } else {
    findings.push({ severity: 'info', key: 'f_otherScheme', param: proto });
  }

  if (parsed.username || parsed.password) {
    findings.push({ severity: 'danger', key: 'f_userinfo' });
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
    findings.push({ severity: 'warn', key: 'f_ip' });
  }

  if (host.split('.').some(label => label.startsWith('xn--'))) {
    findings.push({ severity: 'warn', key: 'f_puny' });
  }

  if (parsed.port) {
    findings.push({ severity: 'info', key: 'f_port', param: parsed.port });
    if (RISKY_PORTS.has(parsed.port)) {
      findings.push({ severity: 'warn', key: 'f_riskyPort', param: parsed.port });
    }
  }

  const keys = Array.from(new Set(Array.from(parsed.searchParams.keys())));
  const sensitiveKeys = keys.filter(k => SENSITIVE_QUERY_KEY.test(k));
  if (sensitiveKeys.length > 0) {
    findings.push({ severity: 'warn', key: 'f_sens', param: sensitiveKeys.slice(0, 4).join(', ') });
  }

  const labels = host.split('.');
  const tld = labels[labels.length - 1];
  if (labels.length > 1 && SUSPICIOUS_TLDS.has(tld)) {
    findings.push({ severity: 'info', key: 'f_tld', param: tld });
  }

  if (labels.length > 5) {
    findings.push({ severity: 'info', key: 'f_subs' });
  }

  if (raw.length > 200) {
    findings.push({ severity: 'info', key: 'f_long' });
  }

  if (host === 'localhost' || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    findings.push({ severity: 'info', key: 'f_local' });
  }

  const dangerCount = findings.filter(f => f.severity === 'danger').length;
  const warnCount = findings.filter(f => f.severity === 'warn').length;

  let risk: 'low' | 'med' | 'high' = 'low';
  if (dangerCount > 0 || warnCount >= 3) {
    risk = 'high';
  } else if (warnCount > 0) {
    risk = 'med';
  }

  const defaultPort = proto === 'https:' ? '443' : proto === 'http:' ? '80' : '';
  const portDisplay = parsed.port || (defaultPort ? `${defaultPort} (default)` : '—');

  return {
    protocol: proto.replace(':', '').toUpperCase(),
    host: host || '—',
    port: portDisplay,
    transport: proto === 'https:' ? 'tls' : proto === 'http:' ? 'plain' : null,
    path: parsed.pathname + (parsed.hash || ''),
    paramsCount: keys.length,
    risk,
    findings
  };
}
