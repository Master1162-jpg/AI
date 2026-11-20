import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Check, Copy, Eye, EyeOff, Lock, ShieldCheck, Wifi, X } from 'lucide-react';
import { validatePasswordChange } from '../lib/tradingEngine';
import { GoogleAuthModal } from './GoogleAuthModal';
import type { Language, UserAccount } from '../types';

interface ProfileVipViewProps {
  lang: Language;
  user: UserAccount;
  token: string;
  mode: 'profile' | 'vip';
  onUserUpdated: (user: UserAccount) => void;
}

interface RaidenSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  testId: string;
  onToggle: () => void;
}

const RaidenSwitch: React.FC<RaidenSwitchProps> = ({
  checked,
  disabled,
  label,
  testId,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    data-testid={testId}
    disabled={disabled}
    onClick={onToggle}
    className={`relative inline-flex h-[30px] w-[66px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] cursor-pointer disabled:opacity-60 ${
      checked ? 'bg-[#C4B5FD]' : 'bg-[#2B2542]'
    }`}
  >
    <span
      className={`pointer-events-none select-none text-[11px] font-bold tracking-tight transition-opacity duration-150 ${
        checked ? 'pl-2.5 text-left text-[#140E24]' : 'ml-auto pr-2.5 text-right text-[#958CB3]'
      }`}
    >
      {checked ? 'On' : 'Off'}
    </span>
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-[3px] top-[3px] h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[36px] bg-[#140E24]' : 'translate-x-0 bg-[#E5E0F5]'
      }`}
    />
  </button>
);

const DefaultAvatarSilhouette: React.FC = () => (
  <svg
    viewBox="0 0 96 96"
    className="h-full w-full"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="48" cy="48" r="48" fill="#1F1B33" />
    <path
      d="M48 20c-8.6 0-15.6 7-15.6 16.2 0 6.5 3.4 12.1 8.5 14.8v4.2c-12.1 2.7-21.5 11.4-24.1 22.7C24.9 88.2 35.8 96 48 96s23.1-7.8 31.2-18.1c-2.6-11.3-12-20-24.1-22.7V51c5.1-2.7 8.5-8.3 8.5-14.8C63.6 27 56.6 20 48 20Z"
      fill="#C4B5FD"
      opacity="0.6"
    />
  </svg>
);

async function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp hình ảnh không hợp lệ.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ProfileVipView: React.FC<ProfileVipViewProps> = ({
  lang,
  user,
  token,
  mode,
  onUserUpdated,
}) => {
  const isVi = lang === 'vi';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nickname, setNickname] = useState(user.nickname);
  const [kycFullName, setKycFullName] = useState(user.kycFullName || '');
  const [kycDocNumber, setKycDocNumber] = useState(user.kycDocNumber || '');
  const [copiedRef, setCopiedRef] = useState(false);
  const [referrals, setReferrals] = useState<
    Array<{ nickname: string; email: string; isVip: boolean; totalVolume: number; createdAt: string }>
  >([]);

  // Profile modals
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [twoFaModalMode, setTwoFaModalMode] = useState<'enable' | 'disable' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Real IP & Network Latency telemetry
  const [networkInfo, setNetworkInfo] = useState<{ ip: string; latencyMs: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [switchBusy, setSwitchBusy] = useState<'2fa' | 'sensitive' | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);

  useEffect(() => {
    setNickname(user.nickname);
    setKycFullName(user.kycFullName || '');
    setKycDocNumber(user.kycDocNumber || '');
  }, [user.nickname, user.kycFullName, user.kycDocNumber]);

  useEffect(() => {
    if (mode !== 'vip') return;
    fetch('/api/wallet/transactions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.referrals) setReferrals(d.referrals);
      })
      .catch(() => {});
  }, [token, mode]);

  const measureNetwork = useCallback(async () => {
    const t0 = performance.now();
    try {
      const res = await fetch('/api/account/network-info', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ip: string };
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      setNetworkInfo({ ip: data.ip, latencyMs });
    } catch {
      // ignore transient poll error
    }
  }, [token]);

  useEffect(() => {
    if (mode !== 'profile') return;
    measureNetwork();
    const settleTimer = setTimeout(measureNetwork, 700);
    const timer = setInterval(measureNetwork, 8000);
    return () => {
      clearTimeout(settleTimer);
      clearInterval(timer);
    };
  }, [mode, measureNetwork]);

  const patchProfile = async (
    payload: Record<string, unknown>,
    successMsg: string
  ): Promise<boolean> => {
    setMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật hồ sơ');
      onUserUpdated(data.user);
      setMsg({ type: 'ok', text: successMsg });
      return true;
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi cập nhật' });
      return false;
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({
        type: 'err',
        text: isVi ? 'Vui lòng chọn tệp ảnh hợp lệ (JPG, PNG, WEBP).' : 'Please choose a valid image file.',
      });
      return;
    }
    setAvatarBusy(true);
    setMsg(null);
    try {
      const compressed = await compressAvatarFile(file);
      await patchProfile(
        { avatarUrl: compressed },
        isVi ? 'Đã cập nhật ảnh đại diện thành công.' : 'Profile photo updated.'
      );
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Không thể xử lý ảnh.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nickname.trim();
    if (clean === user.nickname) return;
    setLoading(true);
    await patchProfile(
      { nickname: clean },
      isVi ? 'Đã cập nhật biệt danh thành công.' : 'Nickname updated.'
    );
    setLoading(false);
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErr(null);
    const full = kycFullName.trim();
    const doc = kycDocNumber.trim();
    if (full.length < 3 || doc.length < 5) {
      setModalErr(
        isVi
          ? 'Vui lòng nhập đầy đủ Họ tên và Số CCCD / Hộ chiếu hợp lệ.'
          : 'Please enter a valid full name and ID / passport number.'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kycFullName: full, kycDocNumber: doc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi gửi hồ sơ KYC');
      onUserUpdated(data.user);
      setKycModalOpen(false);
      setMsg({
        type: 'ok',
        text: isVi
          ? 'Đã gửi hồ sơ xác minh ID thành công. Quản trị viên sẽ xét duyệt sớm nhất.'
          : 'ID verification submitted for review.',
      });
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : 'Lỗi gửi KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = () => {
    setMsg(null);
    setTwoFaModalMode(user.twoFactorEnabled ? 'disable' : 'enable');
  };

  const handleToggleSensitiveData = async () => {
    setSwitchBusy('sensitive');
    const next = !Boolean(user.hideSensitiveData);
    await patchProfile(
      { hideSensitiveData: next },
      next
        ? isVi
          ? 'Đã bật chế độ ẩn dữ liệu nhạy cảm cho thống kê tài khoản.'
          : 'Sensitive account statistics are now hidden.'
        : isVi
        ? 'Đã tắt chế độ ẩn dữ liệu nhạy cảm.'
        : 'Account statistics are visible again.'
    );
    setSwitchBusy(null);
  };

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErr(null);
    const check = validatePasswordChange({
      twoFactorEnabled: user.twoFactorEnabled,
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!check.valid) {
      setModalErr(check.error || 'Thông tin mật khẩu không hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể đổi mật khẩu.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwModalOpen(false);
      setMsg({
        type: 'ok',
        text: isVi ? 'Đã thay đổi mật khẩu thành công.' : 'Password changed successfully.',
      });
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : 'Lỗi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeVip = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/upgrade-vip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi nâng cấp VIP');
      onUserUpdated(data.user);
      setMsg({ type: 'ok', text: 'Chúc mừng! Bạn đã kích hoạt thành viên VIP thành công.' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    } finally {
      setLoading(false);
    }
  };

  const refLink = `${window.location.origin}/?ref=${user.referralCode}`;
  const nicknameChanged = nickname.trim().length > 0 && nickname.trim() !== user.nickname;

  const latencyColor = !networkInfo
    ? 'text-[#958CB3]'
    : networkInfo.latencyMs < 150
    ? 'text-[#34D399]'
    : networkInfo.latencyMs < 350
    ? 'text-amber-300'
    : 'text-[#FB7185]';

  return (
    <div className={mode === 'profile' ? 'mx-auto w-full max-w-5xl space-y-4' : 'space-y-5'}>
      {msg && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            msg.type === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
              : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
          }`}
        >
          {msg.text}
        </div>
      )}

      {mode === 'vip' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#1D1914] via-[#14131E] to-[#1A152C] p-6 space-y-4 shadow-lg shadow-black/40">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold text-[#F5F3FF]">
                  {user.isVip
                    ? isVi
                      ? 'Thành viên VIP Đã kích hoạt'
                      : 'Active VIP Member'
                    : isVi
                    ? 'Nâng cấp Tài khoản VIP'
                    : 'Upgrade to VIP Affiliate'}
                </h2>
                <p className="text-xs text-[#958CB3]">
                  {isVi
                    ? 'Nhận hoa hồng giao dịch đa tầng từ hệ thống F1-F3'
                    : 'Earn multi-tier trading commissions'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#958CB3]">Mã giới thiệu của bạn:</span>
                <span className="font-mono font-bold text-[#C4B5FD]">{user.referralCode}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  readOnly
                  value={refLink}
                  aria-label="Liên kết giới thiệu"
                  className="flex-1 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-2.5 py-1.5 font-mono text-[11px] text-[#DDD6FE] outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(refLink);
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 1800);
                  }}
                  aria-label="Sao chép liên kết giới thiệu"
                  className="rounded-lg border border-[#2F2947] bg-[#181625] px-3 py-1.5 font-semibold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                >
                  {copiedRef ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {!user.isVip && (
              <button
                type="button"
                disabled={loading}
                onClick={handleUpgradeVip}
                className="w-full rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Đang kích hoạt...' : 'Kích hoạt VIP ngay (100 USDT)'}
              </button>
            )}
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-[#27223B] bg-[#111118] p-6 shadow-lg shadow-black/40">
            <h3 className="font-display text-base font-bold text-[#F5F3FF] border-b border-[#27223B] pb-3">
              {isVi ? 'Danh sách thành viên F1 đã giới thiệu' : 'Referred F1 Network'}
            </h3>
            {referrals.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#958CB3]">
                {isVi ? 'Chưa có thành viên nào đăng ký qua mã của bạn.' : 'No referrals yet.'}
              </div>
            ) : (
              <table className="mt-4 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27223B] text-[#958CB3]">
                    <th className="pb-2">Biệt danh</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Hạng</th>
                    <th className="pb-2 text-right">Khối lượng GD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#231F36]">
                  {referrals.map((r) => (
                    <tr key={r.email}>
                      <td className="py-3 font-semibold text-[#F5F3FF]">{r.nickname}</td>
                      <td className="py-3 text-[#958CB3]">{r.email}</td>
                      <td className="py-3 text-amber-300 font-bold">{r.isVip ? 'VIP' : 'Thành viên'}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#34D399] tabular-nums">
                        ${r.totalVolume.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ==============================================================
           HỒ SƠ CÁ NHÂN (4-card layout in Obsidian Black & Light Purple)
           ============================================================== */
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            {/* Left column on desktop (Cards 1 & 2 stacked vertically) */}
            <div className="space-y-4 lg:col-span-6">
              {/* CARD 1: Dữ liệu cá nhân */}
              <section
                aria-labelledby="profile-personal-heading"
                className="rounded-xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40"
              >
                <div className="border-b border-[#27223B] px-5 py-4">
                  <h2
                    id="profile-personal-heading"
                    className="font-display text-[19px] font-bold tracking-tight text-[#F5F3FF]"
                  >
                    {isVi ? 'Dữ liệu cá nhân' : 'Personal Information'}
                  </h2>
                </div>

                <form onSubmit={handleSaveNickname} className="px-5 py-5 space-y-5">
                  {/* Avatar + Light-Purple "Thay đổi ảnh" button */}
                  <div className="flex items-center gap-5">
                    <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-full border-2 border-[#C4B5FD]/45 bg-[#1F1B33]">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.nickname}
                          data-testid="profile-avatar-image"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <DefaultAvatarSilhouette />
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      data-testid="profile-avatar-input"
                      onChange={handleAvatarSelected}
                      className="sr-only"
                    />

                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[48px] rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-7 py-3 text-[15px] font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] active:scale-[0.99] whitespace-nowrap cursor-pointer disabled:opacity-60"
                    >
                      {avatarBusy
                        ? isVi
                          ? 'Đang tải...'
                          : 'Uploading...'
                        : isVi
                        ? 'Thay đổi ảnh'
                        : 'Change Photo'}
                    </button>
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label
                      htmlFor="prof-email"
                      className="mb-1.5 block text-xs font-semibold text-[#958CB3]"
                    >
                      Email
                    </label>
                    <input
                      id="prof-email"
                      type="email"
                      readOnly
                      value={user.email}
                      className="w-full rounded-lg border border-[#27223B] bg-[#161423] px-4 py-3 text-sm text-[#958CB3] outline-none"
                    />
                  </div>

                  {/* Biệt danh */}
                  <div>
                    <label
                      htmlFor="prof-nick"
                      className="mb-1.5 block text-xs font-semibold text-[#958CB3]"
                    >
                      {isVi ? 'Biệt danh' : 'Nickname'}
                    </label>
                    <input
                      id="prof-nick"
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-4 py-3 text-sm font-semibold text-[#F5F3FF] outline-none transition-colors focus:border-[#C4B5FD]"
                    />
                    {nicknameChanged && (
                      <div className="mt-3 flex items-center gap-2.5">
                        <button
                          type="submit"
                          disabled={loading}
                          className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-4 py-2 text-xs font-extrabold text-[#140E24] shadow-sm hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
                        >
                          {loading
                            ? isVi
                              ? 'Đang lưu...'
                              : 'Saving...'
                            : isVi
                            ? 'Lưu biệt danh'
                            : 'Save Nickname'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNickname(user.nickname)}
                          className="rounded-lg border border-[#2F2947] bg-[#181625] px-3.5 py-2 text-xs font-semibold text-[#C8C2DC] hover:bg-[#231F38] cursor-pointer"
                        >
                          {isVi ? 'Hủy' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </section>

              {/* CARD 2: Xác minh tài khoản */}
              <section
                aria-labelledby="profile-verify-heading"
                className="rounded-xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40"
              >
                <div className="border-b border-[#27223B] px-5 py-4">
                  <h2
                    id="profile-verify-heading"
                    className="font-display text-[19px] font-bold tracking-tight text-[#F5F3FF]"
                  >
                    {isVi ? 'Xác minh tài khoản' : 'Account Verification'}
                  </h2>
                </div>

                <div className="px-5 py-5">
                  <h3 className="text-sm font-bold text-[#F5F3FF]">
                    {isVi ? 'Xác minh ID' : 'ID Verification'}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#C8C2DC]">
                    {isVi
                      ? 'Để bảo vệ tài sản của bạn, chúng tôi phải xác minh danh tính của bạn.'
                      : 'To protect your assets, we must verify your identity.'}
                    <br />
                    {isVi
                      ? 'Vui lòng điền thông tin chính xác, không thể chỉnh sửa sau khi xác minh.'
                      : 'Please enter accurate information; it cannot be edited after verification.'}
                  </p>

                  {user.kycStatus === 'verified' ? (
                    <div
                      data-testid="profile-kyc-status"
                      className="mt-4 flex items-center gap-2 text-xs font-bold text-[#34D399]"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>
                        {isVi ? 'Đã xác minh danh tính' : 'Identity Verified'}
                        {user.kycFullName ? ` · ${user.kycFullName}` : ''}
                      </span>
                    </div>
                  ) : user.kycStatus === 'pending' ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span
                        data-testid="profile-kyc-status"
                        className="text-xs font-bold text-amber-300"
                      >
                        {isVi
                          ? 'Đang chờ xét duyệt · Hồ sơ KYC đã được gửi'
                          : 'Pending review · KYC submitted'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setModalErr(null);
                          setKycModalOpen(true);
                        }}
                        className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] hover:underline cursor-pointer"
                      >
                        {isVi ? 'Cập nhật hồ sơ' : 'Edit submission'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {user.kycStatus === 'rejected' && (
                        <p className="text-xs font-semibold text-[#FB7185]">
                          {isVi
                            ? 'Hồ sơ trước đó bị từ chối. Vui lòng gửi lại thông tin chính xác.'
                            : 'Previous submission was rejected. Please resubmit.'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setModalErr(null);
                          setKycModalOpen(true);
                        }}
                        className="min-h-[42px] rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-2.5 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] active:scale-[0.99] whitespace-nowrap cursor-pointer"
                      >
                        {isVi ? 'Xác minh ngay' : 'Verify Now'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right column on desktop (Cards 3 & 4 stacked vertically) */}
            <div className="space-y-4 lg:col-span-6">
              {/* CARD 3: Bảo mật */}
              <section
                aria-labelledby="profile-security-heading"
                className="rounded-xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40"
              >
                <div className="border-b border-[#27223B] px-5 py-4">
                  <h2
                    id="profile-security-heading"
                    className="font-display text-[19px] font-bold tracking-tight text-[#F5F3FF]"
                  >
                    {isVi ? 'Bảo mật' : 'Security'}
                  </h2>
                </div>

                <div className="px-5 py-5 space-y-7">
                  {/* Password Change block */}
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F3FF]">
                      {isVi ? 'Mật khẩu' : 'Password'}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#C8C2DC]">
                      {isVi
                        ? 'Bạn có muốn thay đổi mật khẩu không? Nhấn nút dưới đây và thay đổi nó.'
                        : 'Want to change your password? Press the button below to update it.'}
                    </p>
                    <button
                      type="button"
                      disabled={!user.twoFactorEnabled}
                      data-testid="profile-change-password-btn"
                      onClick={() => {
                        setModalErr(null);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPwModalOpen(true);
                      }}
                      className={`mt-4 min-h-[44px] w-full max-w-[265px] rounded-lg px-5 py-2.5 text-sm font-extrabold transition whitespace-nowrap ${
                        user.twoFactorEnabled
                          ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer'
                          : 'border border-[#2A243D] bg-[#1D1A2D] text-[#7D749B] cursor-not-allowed'
                      }`}
                    >
                      {isVi ? 'Thay đổi mật khẩu' : 'Change Password'}
                    </button>
                    {!user.twoFactorEnabled && (
                      <p
                        data-testid="profile-2fa-required-note"
                        className="mt-2.5 text-xs italic font-medium text-[#FB7185]"
                      >
                        {isVi
                          ? '* Bạn phải bật 2FA để chỉnh sửa trường này'
                          : '* You must enable 2FA to edit this field'}
                      </p>
                    )}
                  </div>

                  {/* Mã 2FA toggle row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#F5F3FF]">
                        {isVi ? 'Mã 2FA' : '2FA Code'}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#C8C2DC]">
                        {isVi
                          ? 'Yêu cầu cho rút tiền và cập nhật bảo mật.'
                          : 'Required for withdrawals and security updates.'}
                      </p>
                    </div>
                    <RaidenSwitch
                      checked={user.twoFactorEnabled}
                      disabled={switchBusy === '2fa'}
                      label={isVi ? 'Bật hoặc tắt Mã 2FA' : 'Toggle 2FA'}
                      testId="profile-2fa-switch"
                      onToggle={handleToggle2FA}
                    />
                  </div>

                  {/* Ẩn dữ liệu nhạy cảm toggle row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#F5F3FF]">
                        {isVi ? 'Ẩn dữ liệu nhạy cảm' : 'Hide Sensitive Data'}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#C8C2DC]">
                        {isVi
                          ? 'Bật chế độ này để ẩn thông tin thống kê tài khoản của bạn.'
                          : 'Enable this mode to mask your account statistics.'}
                      </p>
                    </div>
                    <RaidenSwitch
                      checked={Boolean(user.hideSensitiveData)}
                      disabled={switchBusy === 'sensitive'}
                      label={isVi ? 'Bật hoặc tắt ẩn dữ liệu nhạy cảm' : 'Toggle hide sensitive data'}
                      testId="profile-sensitive-switch"
                      onToggle={handleToggleSensitiveData}
                    />
                  </div>
                </div>
              </section>

              {/* CARD 4: Địa chỉ IP & Đường truyền */}
              <section
                aria-label={isVi ? 'Thông tin kết nối' : 'Network information'}
                className="rounded-xl border border-[#27223B] bg-[#111118] px-5 py-5 space-y-6 shadow-lg shadow-black/40"
              >
                <div>
                  <h3 className="text-sm font-bold text-[#F5F3FF]">
                    {isVi ? 'Địa chỉ IP' : 'IP Address'}
                  </h3>
                  <div
                    data-testid="profile-ip-address"
                    className="mt-2 font-mono text-sm text-[#C8C2DC] break-all"
                  >
                    {networkInfo ? networkInfo.ip : isVi ? 'Đang kiểm tra...' : 'Checking...'}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#F5F3FF]">
                    {isVi ? 'Đường truyền' : 'Connection'}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#DDD6FE]">
                    <Wifi className={`h-4 w-4 shrink-0 ${latencyColor}`} aria-hidden="true" />
                    <span
                      data-testid="profile-latency-ms"
                      className="font-mono font-semibold tabular-nums"
                    >
                      {networkInfo ? `${networkInfo.latencyMs} ms` : '...'}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* ==========================================================
              MODAL: Xác minh danh tính (KYC)
             ========================================================== */}
          {kycModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
              aria-labelledby="kyc-modal-title"
            >
              <form
                onSubmit={handleSubmitKyc}
                className="w-full max-w-md rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 space-y-4 shadow-2xl shadow-black/80"
              >
                <div className="flex items-center justify-between border-b border-[#27223B] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#C4B5FD]" />
                    <h3 id="kyc-modal-title" className="font-display text-base font-bold text-[#F5F3FF]">
                      {isVi ? 'Xác minh ID (KYC)' : 'ID Verification (KYC)'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKycModalOpen(false)}
                    aria-label="Đóng cửa sổ xác minh ID"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {modalErr && (
                  <div className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-[#FB7185]">
                    {modalErr}
                  </div>
                )}

                <div>
                  <label htmlFor="kyc-fullname" className="mb-1.5 block text-xs font-semibold text-[#C8C2DC]">
                    {isVi ? 'Họ và tên (theo giấy tờ tùy thân)' : 'Full Legal Name'}
                  </label>
                  <input
                    id="kyc-fullname"
                    type="text"
                    required
                    value={kycFullName}
                    onChange={(e) => setKycFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 text-sm text-[#F5F3FF] outline-none placeholder:text-[#7E769C] focus:border-[#C4B5FD]"
                  />
                </div>

                <div>
                  <label htmlFor="kyc-docnum" className="mb-1.5 block text-xs font-semibold text-[#C8C2DC]">
                    {isVi ? 'Số CCCD / Hộ chiếu' : 'ID Card / Passport Number'}
                  </label>
                  <input
                    id="kyc-docnum"
                    type="text"
                    required
                    value={kycDocNumber}
                    onChange={(e) => setKycDocNumber(e.target.value)}
                    placeholder="079095001234"
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 font-mono text-sm text-[#F5F3FF] outline-none placeholder:text-[#7E769C] focus:border-[#C4B5FD]"
                  />
                </div>

                <p className="text-[11px] leading-relaxed text-[#958CB3]">
                  {isVi
                    ? 'Vui lòng kiểm tra kỹ thông tin. Sau khi quản trị viên xác minh thành công, thông tin định danh không thể chỉnh sửa.'
                    : 'Please verify your details carefully. Verified identity details cannot be modified.'}
                </p>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setKycModalOpen(false)}
                    className="rounded-lg border border-[#2F2947] bg-[#181625] px-4 py-2.5 text-xs font-semibold text-[#C8C2DC] hover:bg-[#231F38] cursor-pointer"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
                  >
                    {loading
                      ? isVi
                        ? 'Đang gửi...'
                        : 'Submitting...'
                      : isVi
                      ? 'Gửi xác minh'
                      : 'Submit Verification'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==========================================================
              MODAL: Thay đổi mật khẩu (requires 2FA enabled)
             ========================================================== */}
          {pwModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pw-modal-title"
            >
              <form
                onSubmit={handleSubmitPasswordChange}
                className="w-full max-w-md rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 space-y-4 shadow-2xl shadow-black/80"
              >
                <div className="flex items-center justify-between border-b border-[#27223B] pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-[#C4B5FD]" />
                    <h3 id="pw-modal-title" className="font-display text-base font-bold text-[#F5F3FF]">
                      {isVi ? 'Thay đổi mật khẩu' : 'Change Password'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPwModalOpen(false)}
                    aria-label="Đóng cửa sổ đổi mật khẩu"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {modalErr && (
                  <div className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-[#FB7185]">
                    {modalErr}
                  </div>
                )}

                <div>
                  <label htmlFor="pw-current" className="mb-1.5 block text-xs font-semibold text-[#C8C2DC]">
                    {isVi ? 'Mật khẩu hiện tại' : 'Current Password'}
                  </label>
                  <input
                    id="pw-current"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
                  />
                </div>

                <div>
                  <label htmlFor="pw-new" className="mb-1.5 block text-xs font-semibold text-[#C8C2DC]">
                    {isVi ? 'Mật khẩu mới (tối thiểu 6 ký tự)' : 'New Password (min 6 chars)'}
                  </label>
                  <input
                    id="pw-new"
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
                  />
                </div>

                <div>
                  <label htmlFor="pw-confirm" className="mb-1.5 block text-xs font-semibold text-[#C8C2DC]">
                    {isVi ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                  </label>
                  <input
                    id="pw-confirm"
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#958CB3] hover:text-[#F5F3FF] cursor-pointer"
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPw ? (isVi ? 'Ẩn mật khẩu' : 'Hide passwords') : isVi ? 'Hiện mật khẩu' : 'Show passwords'}</span>
                </button>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPwModalOpen(false)}
                    className="rounded-lg border border-[#2F2947] bg-[#181625] px-4 py-2.5 text-xs font-semibold text-[#C8C2DC] hover:bg-[#231F38] cursor-pointer"
                  >
                    {isVi ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
                  >
                    {loading
                      ? isVi
                        ? 'Đang cập nhật...'
                        : 'Updating...'
                      : isVi
                      ? 'Xác nhận đổi mật khẩu'
                      : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <GoogleAuthModal
            open={twoFaModalMode !== null}
            mode={twoFaModalMode ?? 'enable'}
            lang={lang}
            token={token}
            userEmail={user.email}
            onClose={() => setTwoFaModalMode(null)}
            onSuccess={(updatedUser, successMsg) => {
              onUserUpdated(updatedUser);
              setTwoFaModalMode(null);
              setMsg({ type: 'ok', text: successMsg });
            }}
          />
        </>
      )}
    </div>
  );
};
