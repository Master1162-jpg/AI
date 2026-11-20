import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, UserPlus, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { Language, UserAccount } from '../types';

export type AuthMode = 'login' | 'register' | 'forgot';

interface AuthDrawerProps {
  open: boolean;
  mode: AuthMode;
  lang: Language;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: (token: string, user: UserAccount) => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({
  open,
  mode,
  lang,
  onClose,
  onSwitchMode,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!open) return null;

  const isVi = lang === 'vi';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError(isVi ? 'Vui lòng nhập địa chỉ email.' : 'Please enter your email.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        setInfoMsg(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, nickname, password, referralCode };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isVi ? 'Đăng nhập thất bại' : 'Authentication failed'));
      }
      onSuccess(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký' : 'Quên mật khẩu'}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col justify-between overflow-y-auto border-l border-[#27223B] bg-[#111118] p-6 sm:p-8 shadow-2xl shadow-black/80">
        <div>
          <div className="flex items-center justify-between">
            <BrandLogo size="md" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2F2947] bg-[#181625] text-[#C8C2DC] transition-colors hover:border-[#C4B5FD]/50 hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10">
            <h2 className="font-display text-2xl font-extrabold text-[#DDD6FE]">
              {mode === 'login' && (isVi ? 'Đăng nhập tài khoản của bạn' : 'Sign in to your account')}
              {mode === 'register' && (isVi ? 'Tạo tài khoản RaidenBO' : 'Create RaidenBO account')}
              {mode === 'forgot' && (isVi ? 'Khôi phục mật khẩu' : 'Reset your password')}
            </h2>
            <p className="mt-1.5 text-sm text-[#958CB3]">
              {mode === 'login' &&
                (isVi
                  ? 'Truy cập sàn BTC/USDT, Bot AI và ví USDT tức thì.'
                  : 'Access BTC/USDT terminal, AI Bot and instant USDT wallet.')}
              {mode === 'register' &&
                (isVi
                  ? 'Nhận ngay $1,000 tài khoản Demo miễn phí để trải nghiệm.'
                  : 'Get $1,000 Demo balance instantly upon registration.')}
              {mode === 'forgot' &&
                (isVi
                  ? 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'
                  : 'Enter your registered email to receive a reset link.')}
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-400/35 bg-rose-500/15 px-4 py-3 text-sm font-medium text-[#FB7185]">
              {error}
            </div>
          )}
          {infoMsg && (
            <div className="mt-5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-[#34D399]">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[#C8C2DC] mb-1.5">
                {mode === 'login'
                  ? isVi
                    ? 'Email hoặc Tài khoản *'
                    : 'Email or Username *'
                  : isVi
                  ? 'Địa chỉ Email *'
                  : 'Email Address *'}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
                <input
                  id="auth-email"
                  type={mode === 'login' ? 'text' : 'email'}
                  autoComplete={mode === 'login' ? 'username' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    mode === 'login'
                      ? isVi
                        ? 'Nhập email hoặc tài khoản'
                        : 'Enter email or username'
                      : isVi
                      ? 'Nhập email của bạn'
                      : 'Enter your email'
                  }
                  className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2.5 pl-10 pr-4 text-sm text-[#F5F3FF] placeholder-[#7E769C] outline-none transition-colors focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#C4B5FD]/20"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-nickname" className="block text-xs font-semibold text-[#C8C2DC] mb-1.5">
                  {isVi ? 'Biệt danh giao dịch *' : 'Trading Nickname *'}
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
                  <input
                    id="auth-nickname"
                    type="text"
                    required
                    minLength={3}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={isVi ? 'Ví dụ: MinhTrader99' : 'e.g. MinhTrader99'}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2.5 pl-10 pr-4 text-sm text-[#F5F3FF] placeholder-[#7E769C] outline-none transition-colors focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#C4B5FD]/20"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-[#C8C2DC] mb-1.5">
                  {isVi ? 'Mật khẩu *' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'register' ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isVi ? 'Nhập mật khẩu' : 'Enter password'}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2.5 pl-10 pr-10 text-sm text-[#F5F3FF] placeholder-[#7E769C] outline-none transition-colors focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#C4B5FD]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#958CB3] hover:text-[#F5F3FF] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-confirm" className="block text-xs font-semibold text-[#C8C2DC] mb-1.5">
                    {isVi ? 'Xác nhận mật khẩu *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={isVi ? 'Nhập lại mật khẩu' : 'Repeat password'}
                      className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2.5 pl-10 pr-4 text-sm text-[#F5F3FF] placeholder-[#7E769C] outline-none transition-colors focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#C4B5FD]/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-ref" className="block text-xs font-semibold text-[#C8C2DC] mb-1.5">
                    {isVi ? 'Mã giới thiệu (Tùy chọn)' : 'Referral Code (Optional)'}
                  </label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
                    <input
                      id="auth-ref"
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="RB8866"
                      className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2.5 pl-10 pr-4 text-sm text-[#F5F3FF] placeholder-[#7E769C] outline-none transition-colors focus:border-[#C4B5FD] focus:ring-2 focus:ring-[#C4B5FD]/20"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onSwitchMode('forgot')}
                  className="text-xs font-semibold text-[#C4B5FD] hover:text-[#DDD6FE] transition-colors cursor-pointer"
                >
                  {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3 text-sm font-extrabold text-[#140E24] shadow-lg shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] disabled:opacity-60 cursor-pointer"
            >
              {loading
                ? isVi
                  ? 'Đang xử lý...'
                  : 'Processing...'
                : mode === 'login'
                ? isVi
                  ? 'Đăng nhập'
                  : 'Sign In'
                : mode === 'register'
                ? isVi
                  ? 'Đăng ký & Nhận $1,000 Demo'
                  : 'Register & Claim $1,000 Demo'
                : isVi
                ? 'Gửi yêu cầu khôi phục'
                : 'Send Reset Request'}
            </button>
          </form>
        </div>

        <div className="mt-8 border-t border-[#27223B] pt-5 text-xs text-[#958CB3] space-y-2">
          {mode === 'login' ? (
            <p>
              {isVi ? 'Chưa có tài khoản RaidenBO?' : 'Need a RaidenBO account?'}{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('register')}
                className="font-bold text-[#C4B5FD] hover:text-[#DDD6FE] hover:underline cursor-pointer"
              >
                {isVi ? 'Đăng ký ngay' : 'Register now'}
              </button>
            </p>
          ) : (
            <p>
              {isVi ? 'Đã có tài khoản RaidenBO?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="font-bold text-[#C4B5FD] hover:text-[#DDD6FE] hover:underline cursor-pointer"
              >
                {isVi ? 'Đăng nhập' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </aside>
    </div>
  );
};
