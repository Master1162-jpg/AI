import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowRight,
  Award,
  Check,
  Copy,
  Crown,
  QrCode,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BO_VIP_TIERS, getCommissionStatus } from '../lib/tradingEngine';
import type {
  CommissionKind,
  Language,
  UserAccount,
  VipSummaryPayload,
} from '../types';

interface VipMemberViewProps {
  lang: Language;
  user: UserAccount;
  token: string;
  onUserUpdated: (user: UserAccount) => void;
  onGoToCommissionWallet: () => void;
  onGoToDeposit: () => void;
}

type VipSubTab = 'overview' | 'network' | 'history';

function fmtUsd(value: number, maxDecimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: maxDecimals,
  });
}

function fmtRate(pct: number): string {
  if (pct >= 1) return `${pct}%`;
  return `${Number(pct.toFixed(6))}%`;
}

export const VipMemberView: React.FC<VipMemberViewProps> = ({
  lang,
  user,
  token,
  onUserUpdated,
  onGoToCommissionWallet,
  onGoToDeposit,
}) => {
  const isVi = lang === 'vi';

  const [summary, setSummary] = useState<VipSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [subTab, setSubTab] = useState<VipSubTab>('overview');

  // Copy & QR state
  const [copiedKey, setCopiedKey] = useState<'link' | 'code' | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Network tab filters
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [vipStatusFilter, setVipStatusFilter] = useState<'all' | 'vip' | 'regular'>('all');
  const [networkSearch, setNetworkSearch] = useState('');

  // History tab filters
  const [historyKind, setHistoryKind] = useState<'all' | CommissionKind>('all');
  const [historyTier, setHistoryTier] = useState<number | 'all'>('all');

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const refLink = `${window.location.origin}/?ref=${user.referralCode}`;

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/vip/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as VipSummaryPayload;
      setSummary(data);
    } catch {
      // ignore transient network error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, user.isVip, user.liveBalance, user.totalTradingCommission, user.totalVipCommission]);

  useEffect(() => {
    if (!qrModalOpen) return;
    QRCode.toDataURL(refLink, {
      width: 240,
      margin: 2,
      color: { dark: '#09090D', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [qrModalOpen, refLink]);

  const handleCopy = async (text: string, key: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const handleUpgradeVip = async () => {
    setFeedback(null);
    setUpgrading(true);
    try {
      const res = await fetch('/api/account/upgrade-vip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi kích hoạt Đại lý VIP');
      if (data.user) onUserUpdated(data.user);
      if (data.summary) setSummary(data.summary);
      setFeedback({
        type: 'ok',
        text: isVi
          ? 'Kích hoạt Quyền Đại Lý VIP thành công! Bạn đã đạt Cấp bậc 1 và mở khóa hoa hồng tầng F1.'
          : 'VIP Agency License activated! You are now Level 1 with F1 commissions unlocked.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Lỗi nâng cấp VIP',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const filteredNetwork = useMemo(() => {
    const list = summary?.network ?? [];
    const q = networkSearch.trim().toLowerCase();
    return list.filter((m) => {
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false;
      if (vipStatusFilter === 'vip' && !m.isVip) return false;
      if (vipStatusFilter === 'regular' && m.isVip) return false;
      if (
        q &&
        !m.nickname.toLowerCase().includes(q) &&
        !m.maskedEmail.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [summary?.network, tierFilter, vipStatusFilter, networkSearch]);

  const filteredCommissions = useMemo(() => {
    const list = summary?.commissions ?? [];
    return list.filter((c) => {
      if (historyKind !== 'all' && c.kind !== historyKind) return false;
      if (historyTier !== 'all' && c.tier !== historyTier) return false;
      return true;
    });
  }, [summary?.commissions, historyKind, historyTier]);

  const vipFee = summary?.vipFee ?? 100;
  const rank = summary?.rankStatus;
  const stats = summary?.stats;
  const tiers = summary?.tiers ?? BO_VIP_TIERS;
  const dailyChart = summary?.dailyChart ?? [];
  const maxDailyTotal = Math.max(10, ...dailyChart.map((d) => d.total));

  if (loading && !summary) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="h-44 animate-pulse rounded-2xl border border-[#27223B] bg-[#111118]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl border border-[#27223B] bg-[#111118]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="vip-member-root" className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
              : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* =================================================================
          NON-VIP AGENCY LICENSE ACTIVATION BANNER (Standard BO $100 Model)
         ================================================================= */}
      {!user.isVip ? (
        <section className="overflow-hidden rounded-2xl border border-[#2F2947] bg-gradient-to-br from-[#1B1531] via-[#13111F] to-[#111118] shadow-xl shadow-black/50">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:items-stretch lg:p-7">
            {/* Left Offer Story */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#C4B5FD]">
                  <Crown className="h-4 w-4 shrink-0" />
                  <span>
                    {isVi
                      ? 'Chương trình Đại lý VIP chuẩn BO · 7 Cấp bậc · 7 Tầng hoa hồng'
                      : 'BO-Standard VIP Agency Program · 7 Ranks · 7 Tiers'}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F3FF] [text-wrap:balance]">
                  {isVi
                    ? 'Mua quyền Đại lý VIP — Hưởng hoa hồng giao dịch & đại lý tới 7 tầng'
                    : 'Activate VIP Agency License — Earn 7-Tier Trading & Agency Commissions'}
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-[#C8C2DC]">
                  {isVi
                    ? 'Kích hoạt một lần duy nhất với 100 USDT để mở khóa hệ thống đối tác RaidenBO. Nhận ngay 1% khối lượng giao dịch và 50 USDT hoa hồng đại lý từ tuyến dưới F1, mở rộng tới F7 khi thăng hạng.'
                    : 'One-time 100 USDT activation unlocks the full RaidenBO agency matrix: earn up to 1% trading volume commission and $50 agency bonus from F1, scaling through F7.'}
                </p>
              </div>

              {/* 2 Concrete Revenue Pillars (Clean hairline dividers, no nested cards) */}
              <div className="grid grid-cols-1 gap-4 border-t border-[#27223B] pt-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#34D399]">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>{isVi ? 'Hoa hồng Giao dịch (1% → 0.0156%)' : 'Trading Volume (1% → 0.0156%)'}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#958CB3]">
                    {isVi
                      ? 'Ghi nhận tự động theo từng lệnh thực của F1–F7 và cộng trực tiếp vào Ví chính ngay sau khi Admin duyệt.'
                      : 'Tracked automatically on every live order from F1–F7 and credited directly to your Main Wallet after Admin approval.'}
                  </p>
                </div>

                <div className="space-y-1 sm:border-l sm:border-[#27223B] sm:pl-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#DDD6FE]">
                    <Award className="h-4 w-4 shrink-0" />
                    <span>{isVi ? 'Hoa hồng Đại lý VIP ($50 → $0.78)' : 'VIP Agency Bonus ($50 → $0.78)'}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#958CB3]">
                    {isVi
                      ? 'Nhận ngay $50 khi F1 mua quyền VIP, $25 từ F2, $12.5 từ F3 và chia đôi tới tầng F7.'
                      : 'Earn $50 when F1 activates VIP, $25 from F2, $12.5 from F3, halving down to F7.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Activation Checkout Panel */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[#2F2947] bg-[#111118] p-5">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#27223B] pb-3.5">
                  <div>
                    <div className="text-xs font-semibold text-[#958CB3]">
                      {isVi ? 'Phí kích hoạt Đại lý VIP' : 'VIP Agency License Fee'}
                    </div>
                    <div className="mt-1 font-mono text-3xl font-extrabold text-[#F5F3FF] tabular-nums">
                      ${fmtUsd(vipFee)} <span className="text-sm font-bold text-[#C4B5FD]">USDT</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#34D399]">
                    {isVi ? 'Trọn đời' : 'Lifetime'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#958CB3]">{isVi ? 'Số dư Ví Chính hiện tại:' : 'Available Main Wallet:'}</span>
                    <span className="font-mono font-bold text-[#F5F3FF] tabular-nums">
                      ${fmtUsd(user.liveBalance)} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#958CB3]">{isVi ? 'Cấp bậc sau kích hoạt:' : 'Starting Rank:'}</span>
                    <span className="font-bold text-[#DDD6FE]">
                      {isVi ? 'Cấp bậc 1 (Mở khóa F1)' : 'Level 1 (F1 Unlocked)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#958CB3]">{isVi ? 'Thanh toán hoa hồng:' : 'Commission Payout:'}</span>
                    <span className="font-bold text-[#34D399]">
                      {isVi ? 'Tự động về Ví chính (Admin duyệt)' : 'Auto to Main Wallet (Admin approved)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  disabled={upgrading || user.liveBalance < vipFee}
                  data-testid="vip-activate-btn"
                  onClick={handleUpgradeVip}
                  className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {upgrading
                    ? isVi
                      ? 'Đang kích hoạt Đại lý VIP...'
                      : 'Activating VIP Agency...'
                    : isVi
                    ? `Mua quyền Đại lý VIP (${fmtUsd(vipFee)} USDT)`
                    : `Buy VIP Agency (${fmtUsd(vipFee)} USDT)`}
                </button>

                {user.liveBalance < vipFee && (
                  <button
                    type="button"
                    onClick={onGoToDeposit}
                    className="w-full rounded-xl border border-[#2F2947] bg-[#181625] py-2.5 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                  >
                    {isVi
                      ? `Số dư chưa đủ · Nạp thêm USDT ngay`
                      : `Insufficient balance · Deposit USDT now`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* =================================================================
           ACTIVE BO VIP HERO: RANK EMBLEM + LEVEL PROGRESS + REFERRAL HUB
           ================================================================= */
        <section className="overflow-hidden rounded-2xl border border-[#2F2947] bg-gradient-to-br from-[#1C1634] via-[#131120] to-[#111118] shadow-xl shadow-black/50">
          <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-12 lg:items-stretch">
            {/* Left: Rank Identity + Next Level Progress */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DDD6FE] via-[#C4B5FD] to-[#8B5CF6] text-[#140E24] shadow-lg shadow-[#C4B5FD]/25">
                    <Crown className="h-7 w-7 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex flex-col gap-0.5 text-xs font-semibold text-[#C8C2DC] sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                      <span className="font-bold text-[#34D399]">
                        {isVi ? 'Đại lý VIP đã kích hoạt' : 'Active VIP Agency'}
                      </span>
                      <span className="hidden sm:inline" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#DDD6FE]">
                        {isVi
                          ? `Mở khóa hoa hồng F1 – F${rank?.unlockedTiers ?? 1}`
                          : `Unlocked Tiers F1 – F${rank?.unlockedTiers ?? 1}`}
                      </span>
                    </div>
                    <h1
                      data-testid="vip-current-rank"
                      className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F3FF]"
                    >
                      {isVi
                        ? `Cấp bậc ${rank?.level ?? 1}`
                        : `VIP Level ${rank?.level ?? 1}`}{' '}
                      <span className="font-mono text-base font-bold text-[#958CB3]">/ 7</span>
                    </h1>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onGoToCommissionWallet}
                  data-testid="vip-go-commission-wallet"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-4 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wallet className="h-4 w-4 shrink-0" />
                  <span>{isVi ? 'Lịch sử hoa hồng' : 'Commission History'}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>

              {/* Next-Rank Dual Condition Progress (Standard BO Weekly Rule) */}
              <div className="border-t border-[#27223B] pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#F5F3FF]">
                    {rank?.maxLevelReached
                      ? isVi
                        ? 'Bạn đã đạt Cấp bậc cao nhất (Cấp 7 · Mở khóa toàn bộ F1–F7)'
                        : 'Maximum Rank Achieved (Level 7 · All F1–F7 Unlocked)'
                      : isVi
                      ? `Điều kiện lên Cấp bậc ${rank?.nextTier?.level} (Mở khóa tầng F${rank?.nextTier?.level})`
                      : `Requirements for Level ${rank?.nextTier?.level} (Unlock F${rank?.nextTier?.level})`}
                  </span>
                  <span className="text-[#958CB3]">
                    {isVi ? 'Xét hạng tự động theo tuần' : 'Weekly auto-evaluation'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Condition 1: F1 VIP Agents */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#C8C2DC]">
                        {isVi ? 'Số Đại lý VIP F1' : 'F1 VIP Agents'}
                      </span>
                      <span className="font-mono font-bold text-[#F5F3FF] tabular-nums">
                        {rank?.f1VipCount ?? 0} / {rank?.nextTier ? rank.nextTier.minF1Vip : 8}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#241F38]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#DDD6FE]"
                        style={{ width: `${rank?.f1VipProgressPct ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Condition 2: Weekly F1 Volume */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#C8C2DC]">
                        {isVi ? 'KLGD F1 tuần này' : 'Weekly F1 Volume'}
                      </span>
                      <span className="font-mono font-bold text-[#34D399] tabular-nums">
                        ${fmtUsd(rank?.weeklyF1Volume ?? 0)} / $
                        {fmtUsd(rank?.nextTier ? rank.nextTier.minWeeklyF1Volume : 64000)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#241F38]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#34D399]"
                        style={{ width: `${rank?.volumeProgressPct ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Referral Link, Code & QR Share */}
            <div className="lg:col-span-5 flex flex-col justify-between border-t border-[#27223B] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#F5F3FF]">
                  {isVi ? 'Liên kết giới thiệu & Mã đại lý' : 'Referral Link & Agency Code'}
                </h2>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{isVi ? 'Mã QR' : 'QR Code'}</span>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="vip-ref-link"
                    className="mb-1 block text-[11px] font-semibold text-[#958CB3]"
                  >
                    {isVi ? 'Link đăng ký (Tự động gắn mã F1)' : 'Registration Link'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="vip-ref-link"
                      readOnly
                      value={refLink}
                      className="min-w-0 flex-1 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-xs text-[#DDD6FE] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(refLink, 'link')}
                      aria-label={isVi ? 'Sao chép liên kết giới thiệu' : 'Copy referral link'}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#2F2947] bg-[#181625] px-3 py-2 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                    >
                      {copiedKey === 'link' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                          <span className="text-[#34D399]">{isVi ? 'Đã chép' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="vip-ref-code"
                    className="mb-1 block text-[11px] font-semibold text-[#958CB3]"
                  >
                    {isVi ? 'Mã giới thiệu' : 'Referral Code'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="vip-ref-code"
                      readOnly
                      value={user.referralCode}
                      className="min-w-0 flex-1 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-sm font-extrabold tracking-wider text-[#C4B5FD] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(user.referralCode, 'code')}
                      aria-label={isVi ? 'Sao chép mã giới thiệu' : 'Copy referral code'}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-[#2F2947] bg-[#181625] px-3 py-2 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                    >
                      {copiedKey === 'code' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                          <span className="text-[#34D399]">{isVi ? 'Đã chép' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================
          4-COLUMN FULL-WIDTH KPI SUMMARY STRIP
         ================================================================= */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#958CB3]">
            {isVi ? 'Tổng thành viên hệ thống' : 'Total Network Members'}
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold text-[#F5F3FF] tabular-nums">
            {stats?.totalMembers ?? 0}
          </div>
          <div className="mt-1.5 text-xs text-[#C8C2DC] tabular-nums">
            {isVi ? 'Trực tiếp F1:' : 'Direct F1:'}{' '}
            <strong className="font-mono text-[#DDD6FE]">{stats?.f1Members ?? 0}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#958CB3]">
            {isVi ? 'Tổng Đại lý VIP' : 'Total VIP Agents'}
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold text-[#C4B5FD] tabular-nums">
            {stats?.totalVipMembers ?? 0}
          </div>
          <div className="mt-1.5 text-xs text-[#C8C2DC] tabular-nums">
            {isVi ? 'Đại lý VIP F1:' : 'F1 VIP Agents:'}{' '}
            <strong className="font-mono text-[#DDD6FE]">{stats?.f1VipMembers ?? 0}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#958CB3]">
            {isVi ? 'KLGD F1 tuần này' : 'Weekly F1 Volume'}
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold text-[#F5F3FF] tabular-nums">
            ${fmtUsd(stats?.weeklyF1Volume ?? 0)}
          </div>
          <div className="mt-1.5 text-xs text-[#C8C2DC] tabular-nums">
            {isVi ? 'Toàn mạng:' : 'Full network:'}{' '}
            <strong className="font-mono text-[#DDD6FE]">
              ${fmtUsd(stats?.totalNetworkVolume ?? 0)}
            </strong>
          </div>
        </div>

        <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 sm:p-5">
          <div className="text-xs font-semibold text-[#958CB3]">
            {isVi ? 'Tổng Hoa hồng tích lũy' : 'Total Commission Earned'}
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold text-[#34D399] tabular-nums">
            +${fmtUsd(stats?.totalCommissionEarned ?? 0)}
          </div>
          <div className="mt-1.5 text-xs text-[#C8C2DC] tabular-nums">
            {isVi ? 'GD:' : 'Trade:'}{' '}
            <strong className="font-mono text-[#34D399]">
              ${fmtUsd(stats?.totalTradingCommission ?? 0)}
            </strong>{' '}
            <span aria-hidden="true">·</span>{' '}
            <span>VIP:</span>{' '}
            <strong className="font-mono text-[#DDD6FE]">
              ${fmtUsd(stats?.totalVipCommission ?? 0)}
            </strong>
          </div>
        </div>
      </section>

      {/* =================================================================
          3-TAB BO VIP AGENCY CONSOLE: Tổng quan | Quản lý mạng lưới | Lịch sử hoa hồng
         ================================================================= */}
      <section className="rounded-2xl border border-[#27223B] bg-[#111118] overflow-hidden shadow-lg shadow-black/40">
        <div
          role="tablist"
          aria-label={isVi ? 'Danh mục Thành viên VIP' : 'VIP Member Sections'}
          className="flex items-center gap-1 sm:gap-2 overflow-x-auto border-b border-[#27223B] bg-[#14131E] px-3 sm:px-6"
        >
          {(
            [
              {
                id: 'overview',
                label: isVi ? 'Tổng quan & Chính sách' : 'Overview & Policy',
                mobileLabel: isVi ? 'Tổng quan' : 'Overview',
              },
              {
                id: 'network',
                label: isVi
                  ? `Quản lý mạng lưới (${stats?.totalMembers ?? 0})`
                  : `Network (${stats?.totalMembers ?? 0})`,
                mobileLabel: isVi
                  ? `Mạng lưới (${stats?.totalMembers ?? 0})`
                  : `Network (${stats?.totalMembers ?? 0})`,
              },
              {
                id: 'history',
                label: isVi
                  ? `Lịch sử hoa hồng (${summary?.commissions.length ?? 0})`
                  : `Commission History (${summary?.commissions.length ?? 0})`,
                mobileLabel: isVi
                  ? `Hoa hồng (${summary?.commissions.length ?? 0})`
                  : `History (${summary?.commissions.length ?? 0})`,
              },
            ] as Array<{ id: VipSubTab; label: string; mobileLabel: string }>
          ).map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={`relative py-3.5 px-2.5 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
                }`}
              >
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#C4B5FD]" />
                )}
              </button>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------
            TAB 1: TỔNG QUAN (7-Day Chart + 7-Level BO Commission Matrix)
           --------------------------------------------------------------- */}
        {subTab === 'overview' && (
          <div className="p-5 sm:p-6 space-y-8">
            {/* 7-Day Commission Revenue Chart */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#F5F3FF]">
                    {isVi ? 'Thống kê Hoa hồng 7 ngày gần nhất' : 'Last 7 Days Commission Breakdown'}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#958CB3]">
                    {isVi
                      ? 'Phân tách giữa Hoa hồng Giao dịch (F1–F7) và Hoa hồng Đại lý VIP.'
                      : 'Split between Trading Volume Commission and VIP Agency Bonus.'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#C8C2DC]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#10B981]" />
                    <span>{isVi ? 'Hoa hồng giao dịch' : 'Trading'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#C4B5FD]" />
                    <span>{isVi ? 'Hoa hồng VIP' : 'VIP Agency'}</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 border-b border-[#231F36] pb-3 pt-6">
                {dailyChart.map((pt) => {
                  const totalH = pt.total > 0 ? Math.max(10, Math.round((pt.total / maxDailyTotal) * 100)) : 4;
                  const vipRatio = pt.total > 0 ? Math.round((pt.vipCommission / pt.total) * 100) : 0;
                  const tradeRatio = 100 - vipRatio;
                  return (
                    <div key={pt.dateKey} className="flex h-full flex-col items-center justify-end gap-2">
                      <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#C8C2DC] tabular-nums">
                        {pt.total > 0 ? `$${fmtUsd(pt.total)}` : '$0'}
                      </span>
                      <div className="flex w-full max-w-[44px] flex-1 items-end">
                        <div
                          className="flex w-full flex-col overflow-hidden rounded-t-md bg-[#1C182D]"
                          style={{ height: `${totalH}%` }}
                          title={`${pt.label}: GD $${pt.tradingCommission} · VIP $${pt.vipCommission}`}
                        >
                          {pt.vipCommission > 0 && (
                            <div
                              className="w-full bg-[#C4B5FD]"
                              style={{ height: `${vipRatio}%` }}
                            />
                          )}
                          {pt.tradingCommission > 0 && (
                            <div
                              className="w-full bg-[#10B981]"
                              style={{ height: `${tradeRatio}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2 sm:gap-3 text-center font-mono text-[11px] text-[#958CB3]">
                {dailyChart.map((pt) => (
                  <span key={pt.dateKey}>{pt.label}</span>
                ))}
              </div>
            </div>

            {/* 7-Level BO VIP Policy Matrix Table */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#F5F3FF]">
                    {isVi
                      ? 'Bảng Chính sách 7 Cấp bậc Đại lý VIP (Chuẩn BO)'
                      : '7-Level BO VIP Agency Policy Matrix'}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#958CB3]">
                    {isVi
                      ? 'Đạt đủ đồng thời số Đại lý VIP F1 và KLGD F1 trong tuần để mở khóa thêm tầng hoa hồng từ F1 đến F7.'
                      : 'Meet both F1 VIP Agent count and Weekly F1 Volume to unlock deeper tiers from F1 to F7.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C4B5FD]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    {isVi
                      ? 'Tự động cộng vào Ví chính sau khi Admin duyệt'
                      : 'Auto-credited to Main Wallet upon Admin approval'}
                  </span>
                </div>
              </div>

              {/* Mobile stacked rows (< sm): zero horizontal clipping */}
              <div className="sm:hidden divide-y divide-[#231F36] border-t border-[#27223B]">
                {tiers.map((tier) => {
                  const currentLevel = rank?.level ?? 0;
                  const isCurrent = user.isVip && currentLevel === tier.level;
                  const isUnlocked = user.isVip && currentLevel >= tier.level;
                  const vipReward = Number((vipFee * tier.vipBonusRatio).toFixed(2));
                  return (
                    <div
                      key={`mob-tier-${tier.level}`}
                      className={`py-3.5 px-2 space-y-1.5 ${
                        isCurrent ? 'bg-[#211A3B]/80 -mx-2 px-4 rounded-lg' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-[#F5F3FF]">
                          {isVi ? `Cấp bậc ${tier.level}` : `Level ${tier.level}`}
                          {isCurrent && (
                            <span className="ml-1.5 text-[11px] font-bold text-[#C4B5FD]">
                              ({isVi ? 'Hiện tại' : 'Current'})
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            isUnlocked ? 'text-[#34D399]' : 'text-[#7D749B]'
                          }`}
                        >
                          {isUnlocked
                            ? isVi
                              ? 'Đã mở khóa'
                              : 'Unlocked'
                            : isVi
                            ? 'Chưa đạt'
                            : 'Locked'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-[#958CB3] tabular-nums">
                        <span>
                          {tier.level === 1
                            ? isVi
                              ? `Kích hoạt $${fmtUsd(vipFee)}`
                              : `Activate $${fmtUsd(vipFee)}`
                            : `≥ ${tier.minF1Vip} F1 VIP`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {isVi ? 'KLGD:' : 'Vol:'}{' '}
                          {tier.minWeeklyF1Volume === 0
                            ? '$0'
                            : `≥ $${tier.minWeeklyF1Volume.toLocaleString('en-US')}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 font-mono text-xs tabular-nums">
                        <span className="font-bold text-[#DDD6FE]">
                          {isVi ? `Tầng F${tier.level}` : `Tier F${tier.level}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#34D399]">
                            {isVi ? 'GD' : 'Trade'} {fmtRate(tier.tradingRatePct)}
                          </span>
                          <span className="font-bold text-[#C4B5FD]">
                            VIP +${vipReward.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet 7-column matrix (>= sm) */}
              <div className="hidden sm:block overflow-x-auto border-t border-[#27223B]">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27223B] text-[#958CB3]">
                      <th className="py-3 pr-3 font-semibold">{isVi ? 'Cấp bậc' : 'Rank'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Điều kiện F1 VIP' : 'F1 VIP Req.'}</th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'KLGD F1 / Tuần' : 'Weekly F1 Vol.'}
                      </th>
                      <th className="py-3 px-3 font-semibold text-center">
                        {isVi ? 'Tầng hưởng' : 'Tiers'}
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'Hoa hồng GD' : 'Trading Comm.'}
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'Hoa hồng Đại lý' : 'VIP Bonus'}
                      </th>
                      <th className="py-3 pl-3 font-semibold text-right">
                        {isVi ? 'Trạng thái' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231F36]">
                    {tiers.map((tier) => {
                      const currentLevel = rank?.level ?? 0;
                      const isCurrent = user.isVip && currentLevel === tier.level;
                      const isUnlocked = user.isVip && currentLevel >= tier.level;
                      const vipReward = Number((vipFee * tier.vipBonusRatio).toFixed(2));
                      return (
                        <tr
                          key={tier.level}
                          className={
                            isCurrent
                              ? 'bg-[#211A3B]/80 text-[#F5F3FF]'
                              : 'hover:bg-[#171525] text-[#C8C2DC]'
                          }
                        >
                          <td className="py-3 pr-3 font-bold text-[#F5F3FF] whitespace-nowrap">
                            {isVi ? `Cấp bậc ${tier.level}` : `Level ${tier.level}`}
                            {isCurrent && (
                              <span className="ml-2 text-[11px] font-bold text-[#C4B5FD]">
                                ({isVi ? 'Hiện tại' : 'Current'})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                            {tier.level === 1
                              ? isVi
                                ? `Kích hoạt $${fmtUsd(vipFee)}`
                                : `Activate $${fmtUsd(vipFee)}`
                              : `≥ ${tier.minF1Vip} F1 VIP`}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            {tier.minWeeklyF1Volume === 0
                              ? '$0'
                              : `≥ $${tier.minWeeklyF1Volume.toLocaleString('en-US')}`}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-[#DDD6FE] whitespace-nowrap">
                            F{tier.level}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#34D399] tabular-nums whitespace-nowrap">
                            {fmtRate(tier.tradingRatePct)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#DDD6FE] tabular-nums whitespace-nowrap">
                            +${vipReward.toFixed(2)}
                          </td>
                          <td className="py-3 pl-3 text-right font-semibold whitespace-nowrap">
                            {isUnlocked ? (
                              <span className="text-[#34D399]">
                                {isVi ? 'Đã mở khóa' : 'Unlocked'}
                              </span>
                            ) : (
                              <span className="text-[#7D749B]">
                                {isVi ? 'Chưa đạt' : 'Locked'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------
            TAB 2: QUẢN LÝ MẠNG LƯỚI (F1 - F7 Downline Tree Management)
           --------------------------------------------------------------- */}
        {subTab === 'network' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Filter Controls Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Tier Selector Buttons: All, F1..F7 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <button
                  type="button"
                  onClick={() => setTierFilter('all')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    tierFilter === 'all'
                      ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24]'
                      : 'border border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:text-[#F5F3FF]'
                  }`}
                >
                  {isVi ? 'Tất cả tầng' : 'All Tiers'}
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTierFilter(t)}
                    className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      tierFilter === t
                        ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24]'
                        : 'border border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:text-[#F5F3FF]'
                    }`}
                  >
                    F{t}
                  </button>
                ))}
              </div>

              {/* Status Filter + Search Input */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center rounded-lg border border-[#27223B] bg-[#161423] p-0.5">
                  {(
                    [
                      { id: 'all', label: isVi ? 'Tất cả' : 'All' },
                      { id: 'vip', label: isVi ? 'Đại lý VIP' : 'VIP' },
                      { id: 'regular', label: isVi ? 'Thường' : 'Member' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVipStatusFilter(opt.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        vipStatusFilter === opt.id
                          ? 'bg-[#282144] text-[#DDD6FE]'
                          : 'text-[#958CB3] hover:text-[#F5F3FF]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[200px] sm:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#958CB3]" />
                  <input
                    type="text"
                    value={networkSearch}
                    onChange={(e) => setNetworkSearch(e.target.value)}
                    placeholder={isVi ? 'Tìm biệt danh / email...' : 'Search nickname / email...'}
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-1.5 pl-8 pr-3 text-xs text-[#F5F3FF] outline-none placeholder:text-[#7E769C] focus:border-[#C4B5FD]"
                  />
                </div>
              </div>
            </div>

            {filteredNetwork.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="mx-auto h-8 w-8 text-[#635985]" />
                <p className="text-sm font-semibold text-[#C8C2DC]">
                  {isVi
                    ? 'Không tìm thấy thành viên nào phù hợp bộ lọc.'
                    : 'No downline members match the selected filter.'}
                </p>
                <p className="text-xs text-[#958CB3]">
                  {isVi
                    ? 'Chia sẻ liên kết giới thiệu của bạn để xây dựng hệ thống F1–F7 và nhận hoa hồng tự động.'
                    : 'Share your referral link to grow your F1–F7 network and earn commissions automatically.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-[#27223B]">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27223B] text-[#958CB3]">
                      <th className="py-3 pr-3 font-semibold">{isVi ? 'Thành viên' : 'Member'}</th>
                      <th className="py-3 px-3 font-semibold text-center">{isVi ? 'Tầng' : 'Tier'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Hạng' : 'Status'}</th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'KLGD Tuần' : 'Weekly Vol.'}
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'Tổng KLGD' : 'Total Vol.'}
                      </th>
                      <th className="py-3 pl-3 font-semibold text-right">
                        {isVi ? 'Hoa hồng mang lại' : 'Comm. Generated'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231F36]">
                    {filteredNetwork.map((member) => (
                      <tr key={member.id} className="hover:bg-[#171525]">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-[#F5F3FF]">{member.nickname}</div>
                          <div className="font-mono text-[11px] text-[#958CB3]">
                            {member.maskedEmail}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-[#C4B5FD]">
                          F{member.tier}
                        </td>
                        <td className="py-3 px-3 font-semibold whitespace-nowrap">
                          {member.isVip ? (
                            <span className="text-amber-300">
                              {isVi ? 'Đại lý VIP' : 'VIP Agent'}
                            </span>
                          ) : (
                            <span className="text-[#958CB3]">
                              {isVi ? 'Thành viên' : 'Member'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#E5E0F5] tabular-nums">
                          ${fmtUsd(member.weeklyVolume)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#C8C2DC] tabular-nums">
                          ${fmtUsd(member.totalVolume)}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono font-bold text-[#34D399] tabular-nums">
                          +${fmtUsd(member.commissionGenerated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------
            TAB 3: LỊCH SỬ HOA HỒNG (Trading & VIP Agency Commission Log)
           --------------------------------------------------------------- */}
        {subTab === 'history' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: isVi ? 'Tất cả loại' : 'All Types' },
                    { id: 'trading', label: isVi ? 'Hoa hồng giao dịch' : 'Trading Comm.' },
                    { id: 'vip_agency', label: isVi ? 'Hoa hồng đại lý VIP' : 'VIP Agency' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHistoryKind(item.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      historyKind === item.id
                        ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24]'
                        : 'border border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:text-[#F5F3FF]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <select
                  aria-label={isVi ? 'Lọc theo tầng' : 'Filter by tier'}
                  value={historyTier}
                  onChange={(e) =>
                    setHistoryTier(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-1.5 text-xs font-semibold text-[#F5F3FF] outline-none [color-scheme:dark]"
                >
                  <option value="all">{isVi ? 'Tất cả tầng (F1–F7)' : 'All Tiers (F1–F7)'}</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                    <option key={t} value={t}>
                      {isVi ? `Tầng F${t}` : `Tier F${t}`}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={onGoToCommissionWallet}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] whitespace-nowrap cursor-pointer"
              >
                <span>{isVi ? 'Mở mục Ví → Hoa hồng' : 'Open Wallet → Commission'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {filteredCommissions.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-[#958CB3]">
                {isVi ? 'Chưa có dữ liệu hoa hồng phù hợp bộ lọc.' : 'No commission records found.'}
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-[#27223B]">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27223B] text-[#958CB3]">
                      <th className="py-3 pr-3 font-semibold">{isVi ? 'Thời gian' : 'Time'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Từ thành viên' : 'From Member'}</th>
                      <th className="py-3 px-3 font-semibold">{isVi ? 'Loại hoa hồng' : 'Type'}</th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'KLGD / Gốc' : 'Base Volume'}
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">{isVi ? 'Tỷ lệ' : 'Rate'}</th>
                      <th className="py-3 px-3 font-semibold text-right">
                        {isVi ? 'Hoa hồng' : 'Amount'}
                      </th>
                      <th className="py-3 pl-3 font-semibold text-right">
                        {isVi ? 'Trạng thái' : 'Status'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231F36]">
                    {filteredCommissions.map((item) => {
                      const status = getCommissionStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-[#171525]">
                          <td className="py-3 pr-3 font-mono text-[11px] text-[#958CB3] whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold text-[#F5F3FF]">{item.sourceNickname}</span>
                            <span className="mx-1.5 text-[#635985]" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono font-bold text-[#C4B5FD]">F{item.tier}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold whitespace-nowrap">
                            {item.kind === 'trading' ? (
                              <span className="text-[#34D399]">
                                {isVi ? 'Hoa hồng giao dịch' : 'Trading Volume'}
                              </span>
                            ) : (
                              <span className="text-[#DDD6FE]">
                                {isVi ? 'Hoa hồng Đại lý VIP' : 'VIP Agency Bonus'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#C8C2DC] tabular-nums">
                            ${fmtUsd(item.baseAmount)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#958CB3] tabular-nums">
                            {fmtRate(item.ratePct)}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono font-extrabold tabular-nums ${
                              status === 'approved'
                                ? 'text-[#34D399]'
                                : status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#958CB3] line-through'
                            }`}
                          >
                            +${fmtUsd(item.commissionAmount, 4)}
                          </td>
                          <td className="py-3 pl-3 text-right font-bold whitespace-nowrap">
                            {status === 'approved' ? (
                              <span className="text-[#34D399]">
                                {isVi ? 'Đã duyệt' : 'Approved'}
                              </span>
                            ) : status === 'pending' ? (
                              <span className="text-amber-300">
                                {isVi ? 'Chờ duyệt' : 'Pending'}
                              </span>
                            ) : (
                              <span className="text-[#FB7185]">
                                {isVi ? 'Từ chối' : 'Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =================================================================
          QR REFERRAL CODE MODAL (Crisp White Backing for Mobile Scanners)
         ================================================================= */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={isVi ? 'Mã QR giới thiệu Đại lý VIP' : 'VIP Referral QR Code'}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 text-center shadow-2xl shadow-black/80 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27223B] pb-3">
              <h3 className="font-display text-base font-bold text-[#F5F3FF]">
                {isVi ? 'Mã QR Giới thiệu F1' : 'F1 Referral QR Code'}
              </h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                aria-label={isVi ? 'Đóng mã QR' : 'Close QR modal'}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-auto inline-flex rounded-xl border border-[#2F2947] bg-white p-3 shadow-lg shadow-black/50">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${user.referralCode}`}
                  className="h-48 w-48"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-[#4B3E72]">
                  <QrCode className="h-12 w-12" />
                </div>
              )}
            </div>

            <div className="text-xs text-[#C8C2DC]">
              {isVi ? 'Mã đại lý:' : 'Agency Code:'}{' '}
              <strong className="font-mono text-[#DDD6FE]">{user.referralCode}</strong>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(refLink, 'link')}
              className="w-full rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-2.5 text-xs font-extrabold text-[#140E24] hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
            >
              {copiedKey === 'link'
                ? isVi
                  ? 'Đã sao chép liên kết!'
                  : 'Link Copied!'
                : isVi
                ? 'Sao chép liên kết giới thiệu'
                : 'Copy Referral Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
