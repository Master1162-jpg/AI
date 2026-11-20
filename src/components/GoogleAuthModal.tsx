import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Eye, EyeOff, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { buildOtpAuthUri } from '../lib/totp';
import type { Language, UserAccount } from '../types';

interface GoogleAuthModalProps {
  open: boolean;
  mode: 'enable' | 'disable';
  lang: Language;
  token: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: (updatedUser: UserAccount, message: string) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  open,
  mode,
  lang,
  token,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const isVi = lang === 'vi';

  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRandomSecret = useCallback(async () => {
    setSetupLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể khởi tạo khóa 2FA.');
      setSecret(String(data.secret || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khởi tạo khóa 2FA.');
    } finally {
      setSetupLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setShowPassword(false);
    setTotpCode('');
    setError(null);
    setCopied(false);

    if (mode === 'enable') {
      fetchRandomSecret();
    } else {
      setSecret('');
      setQrDataUrl('');
    }
  }, [open, mode, fetchRandomSecret]);

  useEffect(() => {
    if (!open || mode !== 'enable' || !secret) {
      setQrDataUrl('');
      return;
    }
    const otpauthUri = buildOtpAuthUri(userEmail, secret, 'RaidenBO');
    QRCode.toDataURL(otpauthUri, {
      width: 240,
      margin: 2,
      color: {
        dark: '#09090D',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [open, mode, secret, userEmail]);

  if (!open) return null;

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard restriction in sandboxed iframe
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits) setTotpCode(digits);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError(isVi ? 'Vui lòng nhập mật khẩu đăng nhập.' : 'Please enter your login password.');
      return;
    }
    const cleanCode = totpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError(
        isVi
          ? 'Vui lòng nhập đầy đủ mã 2FA gồm 6 chữ số từ Google Authenticator.'
          : 'Please enter the 6-digit 2FA code from Google Authenticator.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'enable' ? '/api/account/2fa/enable' : '/api/account/2fa/disable';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password,
          totpCode: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || (isVi ? 'Xác thực 2FA thất bại.' : '2FA verification failed.')
        );
      }

      const successText =
        mode === 'enable'
          ? isVi
            ? 'Đã bật Xác Thực Google (2FA) thành công!'
            : 'Google Authenticator (2FA) enabled successfully!'
          : isVi
          ? 'Đã tắt Xác Thực Google (2FA).'
          : 'Google Authenticator (2FA) disabled.';

      onSuccess(data.user, successText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác thực 2FA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-modal-title"
      data-testid="google-auth-modal"
    >
      <div className="relative my-auto w-full max-w-[420px] rounded-2xl border border-[#2F2947] bg-[#14131E] px-6 pb-7 pt-6 shadow-2xl shadow-black/80">
        {/* Close X button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={isVi ? 'Đóng cửa sổ Xác Thực Google' : 'Close Google Authenticator modal'}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] transition-colors hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Centered Title */}
        <h2
          id="google-auth-modal-title"
          className="pt-1 text-center font-display text-2xl font-extrabold tracking-tight text-[#F5F3FF]"
        >
          {mode === 'enable'
            ? isVi
              ? 'Xác Thực Google'
              : 'Google Authenticator'
            : isVi
            ? 'Tắt Xác Thực Google'
            : 'Disable Google Authenticator'}
        </h2>

        {/* Warning Copy */}
        {mode === 'enable' ? (
          <p className="mt-3 text-center text-[13px] font-medium leading-relaxed text-[#FB7185]">
            {isVi
              ? 'Mở ứng dụng Google Authenticator của bạn và quét mã QR bên dưới hoặc nhập khóa được cung cấp vào ứng dụng. Khóa này được sử dụng để khôi phục Google Authenticator của bạn khi bạn thay đổi hoặc mất điện thoại. Vui lòng sao lưu khóa trước khi kích hoạt Google Authenticator.'
              : 'Open your Google Authenticator app and scan the QR code below or enter the provided key. This key recovers your authenticator if you change or lose your device. Please back up the key before enabling.'}
          </p>
        ) : (
          <p className="mt-3 text-center text-[13px] font-medium leading-relaxed text-[#C8C2DC]">
            {isVi
              ? 'Nhập mật khẩu đăng nhập và mã 2FA gồm 6 chữ số từ ứng dụng Google Authenticator để tắt xác thực hai lớp.'
              : 'Enter your login password and 6-digit code from Google Authenticator to disable two-factor authentication.'}
          </p>
        )}

        {/* Auto-Generated QR Code from Random 2FA Key (crisp white backing for reliable camera scan) */}
        {mode === 'enable' && (
          <div className="mt-5 flex flex-col items-center">
            <div className="flex h-[176px] w-[176px] items-center justify-center rounded-xl border border-[#2F2947] bg-white p-2 shadow-lg shadow-black/50">
              {setupLoading || !qrDataUrl ? (
                <div className="flex flex-col items-center gap-2 text-xs font-medium text-[#4B3E72]">
                  <ShieldCheck className="h-6 w-6 animate-pulse text-[#7C3AED]" />
                  <span>{isVi ? 'Đang tạo QR...' : 'Generating QR...'}</span>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={isVi ? 'Mã QR Xác Thực Google 2FA' : 'Google Authenticator 2FA QR Code'}
                  data-testid="google-auth-qr"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            data-testid="google-auth-error"
            className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-[#FB7185]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Random 2FA Backup Key field */}
          {mode === 'enable' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="google-auth-secret-input"
                  className="text-xs font-bold text-[#C8C2DC]"
                >
                  {isVi ? 'Mã sao lưu' : 'Backup Key'}
                </label>
                <button
                  type="button"
                  disabled={setupLoading}
                  onClick={fetchRandomSecret}
                  data-testid="google-auth-regenerate"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${setupLoading ? 'animate-spin' : ''}`} />
                  <span>{isVi ? 'Tạo key ngẫu nhiên' : 'New random key'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#181625] px-3.5 py-3">
                <input
                  id="google-auth-secret-input"
                  type="text"
                  readOnly
                  value={secret}
                  data-testid="google-auth-secret"
                  className="w-full bg-transparent font-mono text-sm font-bold tracking-wider text-[#DDD6FE] outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  data-testid="google-auth-copy"
                  aria-label={isVi ? 'Sao chép mã sao lưu 2FA' : 'Copy 2FA backup key'}
                  className="shrink-0 text-[#C4B5FD] transition-colors hover:text-[#F5F3FF] cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#34D399]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Login Password input */}
          <div>
            <label
              htmlFor="google-auth-password"
              className="mb-1.5 block text-xs font-bold text-[#C8C2DC]"
            >
              {isVi ? 'Mật khẩu đăng nhập' : 'Login Password'}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 focus-within:border-[#C4B5FD] focus-within:ring-2 focus-within:ring-[#C4B5FD]/25">
              <input
                id="google-auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isVi ? 'Nhập mật khẩu đăng nhập' : 'Enter login password'}
                data-testid="google-auth-password"
                className="w-full bg-transparent text-sm font-medium text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="shrink-0 text-[#958CB3] hover:text-[#F5F3FF] cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 6-digit 2FA Code input */}
          <div>
            <label
              htmlFor="google-auth-code"
              className="mb-1.5 block text-xs font-bold text-[#C8C2DC]"
            >
              {isVi ? 'Mã 2FA' : '2FA Code'}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 focus-within:border-[#C4B5FD] focus-within:ring-2 focus-within:ring-[#C4B5FD]/25">
              <input
                id="google-auth-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={isVi ? 'Nhập mã 6 chữ số' : 'Enter 6-digit code'}
                data-testid="google-auth-code"
                className="w-full bg-transparent font-mono text-sm font-bold tracking-[0.2em] text-[#F5F3FF] outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#7E769C]"
              />
              <button
                type="button"
                onClick={handlePasteCode}
                className="shrink-0 text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer"
              >
                {isVi ? 'Dán' : 'Paste'}
              </button>
            </div>
          </div>

          {/* Full-width Primary CTA Button */}
          <button
            type="submit"
            disabled={submitting || (mode === 'enable' && setupLoading)}
            data-testid="google-auth-submit"
            className={`mt-2 w-full rounded-lg py-3 text-sm font-extrabold shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-60 ${
              mode === 'enable'
                ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD]'
                : 'bg-[#E11D48] text-white shadow-rose-500/25 hover:bg-[#F43F5E]'
            }`}
          >
            {submitting
              ? isVi
                ? 'Đang xác thực...'
                : 'Verifying...'
              : mode === 'enable'
              ? isVi
                ? 'Bật'
                : 'Enable'
              : isVi
              ? 'Tắt Xác Thực Google'
              : 'Disable 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
};
