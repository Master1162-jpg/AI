import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Gift,
  ShieldCheck,
  TrendingUp,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import {
  computeUserStreakStats,
  generatePrizePoolWinners,
} from '../lib/tradingEngine';
import { GoogleAuthModal } from './GoogleAuthModal';
import type {
  Language,
  MarketSnapshot,
  PrizePoolClaim,
  TradeOrder,
  UserAccount,
} from '../types';

interface PrizePoolViewProps {
  lang: Language;
  token: string;
  user: UserAccount;
  market: MarketSnapshot;
  orders: TradeOrder[];
  onUserUpdated: (user: UserAccount) => void;
  onGoToTrade: () => void;
}

const ITEMS_PER_PAGE = 10;

export const PrizePoolView: React.FC<PrizePoolViewProps> = ({
  lang,
  token,
  user,
  market,
  orders,
  onUserUpdated,
  onGoToTrade,
}) => {
  const isVi = lang === 'vi';
  const [activeTab, setActiveTab] = useState<'winners' | 'history'>('winners');
  const [page, setPage] = useState<number>(1);
  const rulesRef = useRef<HTMLDivElement | null>(null);

  // Real user PrizePool win claims from server
  const [claims, setClaims] = useState<PrizePoolClaim[]>([]);
  const [activeClaimModal, setActiveClaimModal] = useState<PrizePoolClaim | null>(null);
  const [claimTotpCode, setClaimTotpCode] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [setup2FaOpen, setSetup2FaOpen] = useState(false);

  const loadClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/prizepool/claims', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.claims)) {
        setClaims(data.claims);
      }
    } catch {
      // ignore transient network poll errors
    }
  }, [token]);

  useEffect(() => {
    loadClaims();
    const timer = setInterval(loadClaims, 3000);
    return () => clearInterval(timer);
  }, [loadClaims, orders.length]);

  const handleOpenClaimModal = (claim: PrizePoolClaim) => {
    setActiveClaimModal(claim);
    setClaimTotpCode('');
    setClaimError(null);
    setBannerMsg(null);
  };

  const handlePasteClaimCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits) setClaimTotpCode(digits);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimModal) return;
    setClaimError(null);

    if (!user.twoFactorEnabled) {
      setClaimError(
        isVi
          ? 'Vui lòng bật Xác Thực Google (2FA) trước khi nhận thưởng.'
          : 'Please enable Google Authenticator (2FA) before claiming.'
      );
      return;
    }

    const cleanCode = claimTotpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setClaimError(
        isVi
          ? 'Vui lòng nhập đầy đủ mã 2FA gồm 6 chữ số từ Google Authenticator.'
          : 'Please enter the 6-digit 2FA code from Google Authenticator.'
      );
      return;
    }

    setClaimBusy(true);
    try {
      const res = await fetch(`/api/prizepool/claims/${activeClaimModal.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totpCode: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isVi ? 'Không thể xác nhận nhận thưởng.' : 'Failed to claim reward.'));
      }
      setActiveClaimModal(null);
      setClaimTotpCode('');
      setBannerMsg({
        type: 'ok',
        text: isVi
          ? `Xác thực 2FA thành công! Admin đã nhận thông báo thắng Prize Pool (+$${activeClaimModal.prizeAmount.toFixed(2)}) và sẽ cộng tiền vào tài khoản của bạn.`
          : `2FA verified! Admin has been notified of your +$${activeClaimModal.prizeAmount.toFixed(2)} Prize Pool win and will credit your account.`,
      });
      await loadClaims();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Lỗi xác thực nhận thưởng');
    } finally {
      setClaimBusy(false);
    }
  };

  const winners = useMemo(
    () => generatePrizePoolWinners(market.prizePool, 50),
    [market.prizePool]
  );

  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE);
  const pageWinners = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return winners.slice(start, start + ITEMS_PER_PAGE);
  }, [winners, page]);

  const userStreak = useMemo(
    () => computeUserStreakStats(orders, market.prizePool, 10, 9),
    [orders, market.prizePool]
  );

  const megaPrizeAmount = Number((market.prizePool * 0.005).toFixed(2));
  const yesterdayStr = useMemo(() => {
    const d = new Date(Date.now() - 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, []);

  const scrollToRules = () => {
    rulesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatStreakLabel = (claim: PrizePoolClaim) => {
    if (claim.streakType === 'MEGA') return 'Mega Prize';
    return `${claim.streakType === 'WIN' ? 'Win' : 'Lose'} Streak ${claim.streakLength}x`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      {/* Subtle Back Bar */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onGoToTrade}
          className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#C8C2DC] transition-colors hover:bg-[#1B1829] hover:text-[#F5F3FF] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{isVi ? 'Quay lại Giao dịch' : 'Back to Trading'}</span>
        </button>
      </div>

      {/* ============================================================
          SECTION 1: STREAK CHALLENGE HERO BANNER
         ============================================================ */}
      <section className="relative overflow-hidden rounded-3xl border border-[#C4B5FD]/35 bg-[radial-gradient(ellipse_at_top,_#2D2154_0%,_#161229_56%,_#0B0A12_100%)] px-5 py-9 text-center shadow-2xl shadow-black/60 sm:px-10 sm:py-12">
        {/* Subtle Horizon Rim Arc */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[140%] -translate-x-1/2 rounded-[100%] border-b border-[#C4B5FD]/35 shadow-[0_8px_40px_rgba(196,181,253,0.22)]"
        />

        <h1 className="relative font-display text-3xl sm:text-5xl font-black tracking-wider text-[#F5F3FF] uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)]">
          STREAK
          <br />
          CHALLENGE
        </h1>

        {/* Center Prize Pool Emblem + Isometric Vaults */}
        <div className="relative mx-auto mt-6 flex max-w-xl items-center justify-center gap-3 sm:gap-6">
          {/* Left Tech Prize Crate SVG */}
          <svg
            viewBox="0 0 80 80"
            className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)]"
            fill="none"
            aria-hidden="true"
          >
            <polygon points="40,10 70,26 40,42 10,26" fill="#34D399" />
            <polygon points="40,14 63,26 40,38 17,26" fill="#C4B5FD" opacity="0.7" />
            <polygon points="10,26 40,42 40,70 10,54" fill="#31245C" />
            <polygon points="70,26 40,42 40,70 70,54" fill="#1C1536" />
            <rect x="20" y="42" width="12" height="16" rx="2" fill="#6EE7B7" opacity="0.9" />
            <path d="M48 45L62 37V53L48 61V45Z" fill="#DDD6FE" opacity="0.75" />
          </svg>

          {/* Glowing Center Prize Pool Crest */}
          <div className="flex flex-col items-center">
            <div className="relative rounded-2xl border border-[#C4B5FD]/40 bg-[#1B1630]/85 px-6 py-2.5 backdrop-blur-xs shadow-md">
              <div className="text-[11px] font-black tracking-widest text-[#DDD6FE] uppercase">
                PRIZE POOL
              </div>
            </div>

            <div
              data-testid="prizepool-live-amount"
              className="mt-2 font-mono text-3xl sm:text-5xl font-black tracking-tight text-amber-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)] tabular-nums"
            >
              ${Math.round(market.prizePool).toLocaleString('en-US')}
            </div>

            {/* Mega Prizes Pill */}
            <div className="mt-3 rounded-xl border border-amber-400/50 bg-[#0D0C14]/85 px-5 py-1.5 shadow-md">
              <div className="font-mono text-base sm:text-lg font-extrabold text-amber-300 tabular-nums">
                ${megaPrizeAmount.toFixed(2)}
              </div>
              <div className="text-[9px] font-extrabold tracking-widest text-amber-200 uppercase">
                MEGA PRIZES
              </div>
            </div>
          </div>

          {/* Right Golden Treasure Chest SVG */}
          <svg
            viewBox="0 0 80 80"
            className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)]"
            fill="none"
            aria-hidden="true"
          >
            <polygon points="40,12 70,28 40,44 10,28" fill="#F59E0B" />
            <ellipse cx="40" cy="28" rx="18" ry="8" fill="#FDE047" />
            <circle cx="33" cy="25" r="4" fill="#F59E0B" />
            <circle cx="43" cy="23" r="4.5" fill="#FBBF24" />
            <circle cx="49" cy="28" r="3.5" fill="#F59E0B" />
            <polygon points="10,28 40,44 40,70 10,54" fill="#78350F" />
            <polygon points="70,28 40,44 40,70 70,54" fill="#451A03" />
            <rect x="35" y="42" width="10" height="12" rx="2" fill="#FBBF24" />
          </svg>
        </div>

        {/* Hero Primary CTA + Info Anchor */}
        <div className="relative mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onGoToTrade}
            className="w-full max-w-xs rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-7 py-3.5 text-sm sm:text-base font-extrabold text-[#140E24] shadow-lg shadow-[#C4B5FD]/20 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] active:scale-[0.98] cursor-pointer"
          >
            {isVi ? 'Giao dịch & Chiến thắng' : 'Trade & Win Now'}
          </button>

          <button
            type="button"
            onClick={scrollToRules}
            className="text-xs sm:text-sm font-semibold text-[#DDD6FE] hover:text-[#F5F3FF] underline-offset-4 hover:underline cursor-pointer"
          >
            {isVi ? 'Xem thêm thông tin' : 'Learn more about the rules'}
          </button>
        </div>
      </section>

      {/* Status feedback banner */}
      {bannerMsg && (
        <div
          role="status"
          data-testid="prizepool-banner-msg"
          className={`mt-5 rounded-2xl border px-4 py-3.5 text-xs sm:text-sm font-semibold ${
            bannerMsg.type === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
              : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
          }`}
        >
          {bannerMsg.text}
        </div>
      )}

      {/* ============================================================
          SECTION 1.5: USER PRIZE POOL REWARDS & 2FA CLAIM PANEL
         ============================================================ */}
      {claims.length > 0 && (
        <section
          aria-label={isVi ? 'Phần thưởng Prize Pool của bạn' : 'Your Prize Pool Rewards'}
          data-testid="prizepool-user-rewards"
          className="mt-6 space-y-3"
        >
          {claims.map((claim) => {
            const isEligible = claim.status === 'eligible';
            const isClaimed = claim.status === 'claimed';
            const isPaid = claim.status === 'paid';
            return (
              <div
                key={claim.id}
                data-testid={`prizepool-reward-card-${claim.status}`}
                className={`relative overflow-hidden rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 shadow-lg shadow-black/40 ${
                  isEligible
                    ? 'border-amber-400/40 bg-gradient-to-r from-[#1E1A14] via-[#14131E] to-[#1A152C]'
                    : isClaimed
                    ? 'border-[#C4B5FD]/40 bg-gradient-to-r from-[#1A152C] via-[#14131E] to-[#111118]'
                    : 'border-emerald-400/35 bg-gradient-to-r from-[#101C18] via-[#14131E] to-[#111118]'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        isEligible
                          ? 'bg-amber-400/15 text-amber-300'
                          : isClaimed
                          ? 'bg-[#C4B5FD]/15 text-[#C4B5FD]'
                          : 'bg-emerald-500/15 text-[#34D399]'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Trophy className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm sm:text-base font-extrabold text-[#F5F3FF]">
                          {isEligible
                            ? isVi
                              ? 'Chúc mừng! Bạn đã thắng Prize Pool'
                              : 'Congratulations! You won the Prize Pool'
                            : isClaimed
                            ? isVi
                              ? 'Đã gửi yêu cầu nhận thưởng Prize Pool'
                              : 'Prize Pool Claim Submitted'
                            : isVi
                            ? 'Đã nhận thưởng Prize Pool'
                            : 'Prize Pool Reward Credited'}
                        </span>
                        <span className="rounded-md border border-amber-400/35 bg-amber-400/12 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                          {formatStreakLabel(claim)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                        <span className="font-mono text-xl sm:text-2xl font-black text-[#C4B5FD] tabular-nums">
                          +${claim.prizeAmount.toFixed(2)} USDT
                        </span>
                        <span className="text-xs text-[#C8C2DC]">
                          {isEligible
                            ? isVi
                              ? 'Yêu cầu xác thực Google 2FA để nhận thưởng'
                              : 'Google 2FA verification required to claim'
                            : isClaimed
                            ? isVi
                              ? 'Đã xác thực 2FA · Đang chờ Admin cộng tiền vào Ví Thực'
                              : '2FA verified · Waiting for Admin to credit your Live Wallet'
                            : isVi
                            ? 'Admin đã cộng tiền trực tiếp vào Ví Thực của bạn'
                            : 'Credited to your Live Wallet by Admin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isEligible ? (
                      <button
                        type="button"
                        data-testid="prizepool-claim-btn"
                        onClick={() => handleOpenClaimModal(claim)}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                      >
                        <Gift className="h-4 w-4" />
                        <span>{isVi ? 'Nhận thưởng' : 'Claim Reward'}</span>
                      </button>
                    ) : isClaimed ? (
                      <div
                        data-testid="prizepool-claim-pending"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#C4B5FD]/35 bg-[#C4B5FD]/12 px-4 py-2.5 text-xs font-bold text-[#DDD6FE]"
                      >
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{isVi ? 'Chờ Admin cộng tiền' : 'Pending Admin Credit'}</span>
                      </div>
                    ) : (
                      <div
                        data-testid="prizepool-claim-paid"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-[#34D399]"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{isVi ? 'Đã cộng tiền' : 'Credited'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ============================================================
          SECTION 2: LATEST MEGA JACKPOT WINNER
         ============================================================ */}
      <section className="mt-10 text-center">
        <div className="text-xs sm:text-sm font-bold text-[#C4B5FD]">
          {isVi ? 'Vinh danh người chiến thắng' : 'Hall of Champions'}
        </div>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-black tracking-wide text-[#F5F3FF] uppercase text-balance">
          {isVi ? 'NGƯỜI CHIẾN THẮNG MỚI NHẤT' : 'LATEST MEGA WINNER'}
        </h2>

        <div className="relative mx-auto mt-6 max-w-md rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#1E1A14] via-[#14131E] to-[#1A152C] px-6 pb-8 pt-8 shadow-xl shadow-black/50">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-amber-400/50 bg-[#231B12] px-4 py-1 text-[10px] font-extrabold tracking-wider text-amber-300 uppercase whitespace-nowrap">
            MEGA JACKPOT WINNER
          </div>

          <div className="font-display text-xl sm:text-2xl font-black tracking-wider text-[#DDD6FE]">
            HNPMINH
          </div>
          <div className="mt-1 text-xs font-medium text-[#958CB3]">
            Won Mega Prizes {yesterdayStr}
          </div>

          <div className="mt-4 inline-block rounded-xl border border-[#C4B5FD]/40 bg-[#1C1633] px-5 py-1.5 shadow-sm">
            <div className="font-mono text-base font-extrabold text-amber-300 tabular-nums">
              ${megaPrizeAmount.toFixed(2)}
            </div>
            <div className="text-[9px] font-bold tracking-widest text-[#DDD6FE] uppercase">
              MEGA PRIZES
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WINNERS LEADERBOARD & YOUR STREAK HISTORY TABS
         ============================================================ */}
      <section className="mt-10">
        <div className="grid grid-cols-2 border-b border-[#27223B]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'winners'}
            onClick={() => setActiveTab('winners')}
            className={`pb-3 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              activeTab === 'winners'
                ? 'border-b-2 border-[#C4B5FD] text-[#DDD6FE]'
                : 'text-[#958CB3] hover:text-[#F5F3FF]'
            }`}
          >
            {isVi ? 'Người chiến thắng' : 'Winners'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-b-2 border-[#C4B5FD] text-[#DDD6FE]'
                : 'text-[#958CB3] hover:text-[#F5F3FF]'
            }`}
          >
            {isVi ? 'Lịch sử của bạn' : 'Your History'}
          </button>
        </div>

        {activeTab === 'winners' ? (
          <div className="mt-3">
            <div className="overflow-hidden rounded-2xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40">
              <div className="divide-y divide-[#231F36]">
                {pageWinners.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 hover:bg-[#181625]"
                  >
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          w.type === 'WIN' ? 'text-[#34D399]' : 'text-[#FB7185]'
                        }`}
                      >
                        {w.type === 'WIN'
                          ? `Win Streak ${w.streak}x`
                          : `Lose Streak ${w.streak}x`}
                      </div>
                      <div className="mt-0.5 font-mono text-xs sm:text-sm font-extrabold text-[#F5F3FF] tabular-nums">
                        $ {w.prizeAmount.toFixed(6)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs sm:text-sm font-bold text-[#DDD6FE]">
                        {w.maskedUser}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[#958CB3] tabular-nums">
                        {w.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            <nav
              aria-label={isVi ? 'Phân trang danh sách thắng giải' : 'Winners pagination'}
              className="mt-5 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={isVi ? 'Trang trước' : 'Previous page'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#27223B] bg-[#14131E] text-[#C8C2DC] transition-colors hover:bg-[#231F38] hover:text-[#F5F3FF] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  aria-current={page === pNum ? 'page' : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors cursor-pointer ${
                    page === pNum
                      ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/20'
                      : 'border border-[#27223B] bg-[#14131E] text-[#C8C2DC] hover:bg-[#231F38] hover:text-[#F5F3FF]'
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={isVi ? 'Trang sau' : 'Next page'}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#27223B] bg-[#14131E] text-[#C8C2DC] transition-colors hover:bg-[#231F38] hover:text-[#F5F3FF] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Live User Streak Progress Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#34D399]">
                    {isVi ? 'Chuỗi Thắng hiện tại' : 'Current Win Streak'}
                  </span>
                  <span className="font-mono font-extrabold text-[#F5F3FF] tabular-nums">
                    {userStreak.currentWinStreak} / {userStreak.targetStreak}
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#231F38]">
                  <div
                    className="h-full rounded-full bg-[#10B981] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStreak.currentWinStreak / userStreak.targetStreak) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-[#958CB3]">
                  {isVi
                    ? `Kỷ lục thắng liên tiếp: ${userStreak.bestWinStreak} phiên`
                    : `Best win streak: ${userStreak.bestWinStreak} rounds`}
                </div>
              </div>

              <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FB7185]">
                    {isVi ? 'Chuỗi Thua hiện tại' : 'Current Lose Streak'}
                  </span>
                  <span className="font-mono font-extrabold text-[#F5F3FF] tabular-nums">
                    {userStreak.currentLoseStreak} / {userStreak.targetStreak}
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#231F38]">
                  <div
                    className="h-full rounded-full bg-[#F43F5E] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStreak.currentLoseStreak / userStreak.targetStreak) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-[#958CB3]">
                  {isVi
                    ? `Kỷ lục thua liên tiếp: ${userStreak.bestLoseStreak} phiên`
                    : `Best lose streak: ${userStreak.bestLoseStreak} rounds`}
                </div>
              </div>
            </div>

            {claims.length === 0 && userStreak.records.length === 0 ? (
              <div className="rounded-2xl border border-[#27223B] bg-[#111118] px-5 py-10 text-center shadow-lg shadow-black/40">
                <p className="text-sm font-bold text-[#F5F3FF]">
                  {isVi
                    ? 'Bạn chưa có giải thưởng Streak Challenge nào.'
                    : 'No Streak Challenge rewards claimed yet.'}
                </p>
                <p className="mt-1 text-xs text-[#958CB3]">
                  {isVi
                    ? `Số lệnh hợp lệ (>= $${userStreak.minStake}) đã chốt: ${userStreak.qualifyingOrdersCount}. Đạt chuỗi ${userStreak.targetStreak} lệnh Thắng hoặc Thua liên tiếp để nhận 0.1% Prize Pool!`
                    : `Qualifying settled orders (>= $${userStreak.minStake}): ${userStreak.qualifyingOrdersCount}. Hit ${userStreak.targetStreak} consecutive Wins or Losses to claim 0.1% of the Prize Pool!`}
                </p>
                <button
                  type="button"
                  onClick={onGoToTrade}
                  className="mt-4 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
                >
                  {isVi ? 'Tham gia Giao dịch ngay' : 'Start Trading Now'}
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#27223B] bg-[#111118] divide-y divide-[#231F36] shadow-lg shadow-black/40">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          claim.streakType === 'LOSE' ? 'text-[#FB7185]' : 'text-[#34D399]'
                        }`}
                      >
                        {formatStreakLabel(claim)}
                      </div>
                      <div className="font-mono text-xs text-[#958CB3]">
                        {new Date(claim.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-extrabold text-[#C4B5FD] tabular-nums">
                        +${claim.prizeAmount.toFixed(2)}
                      </span>
                      {claim.status === 'eligible' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenClaimModal(claim)}
                          className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-3 py-1.5 text-xs font-extrabold text-[#140E24] hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
                        >
                          {isVi ? 'Nhận thưởng' : 'Claim'}
                        </button>
                      ) : claim.status === 'claimed' ? (
                        <span className="text-xs font-bold text-[#DDD6FE]">
                          {isVi ? 'Chờ Admin cộng tiền' : 'Pending Credit'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#34D399]">
                          {isVi ? 'Đã cộng tiền' : 'Paid'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 4: HOW TO PARTICIPATE
         ============================================================ */}
      <section ref={rulesRef} className="mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs font-bold text-[#C4B5FD]">
              {isVi ? 'Hướng dẫn' : 'Guide'}
            </div>
            <h2 className="mt-0.5 font-display text-2xl sm:text-3xl font-black tracking-wide text-[#F5F3FF] uppercase">
              {isVi ? 'CÁCH THAM GIA THỬ THÁCH' : 'HOW TO JOIN THE CHALLENGE'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: '1',
              title: isVi ? 'ĐĂNG KÝ' : 'REGISTER',
              desc: isVi ? 'Đăng ký bằng email của bạn' : 'Create your RaidenBO account via email',
              icon: UserPlus,
              color: 'text-[#34D399]',
            },
            {
              step: '2',
              title: isVi ? 'GIAO DỊCH' : 'TRADE',
              desc: isVi ? 'Giao dịch và kiếm lợi nhuận' : 'Trade BTC/USDT rounds and build your streak',
              icon: TrendingUp,
              color: 'text-[#C4B5FD]',
            },
            {
              step: '3',
              title: isVi ? 'CHIẾN THẮNG' : 'WIN',
              desc: isVi
                ? 'Bạn càng giao dịch nhiều cơ hội thắng càng lớn'
                : 'The more consecutive rounds you complete, the bigger your reward chance',
              icon: Coins,
              color: 'text-amber-300',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="flex flex-col items-center rounded-2xl border border-[#27223B] bg-gradient-to-b from-[#14131E] to-[#111118] px-6 py-8 text-center shadow-lg shadow-black/40"
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#2F2947] bg-[#181625] shadow-md shadow-black/50">
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] font-display text-sm font-black italic text-[#140E24]">
                    {item.step}
                  </span>
                  <Icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <h3 className="mt-5 font-display text-lg font-extrabold tracking-wide text-[#F5F3FF] uppercase">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[#C8C2DC]">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* About & Terms Sections */}
        <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-[#C8C2DC] shadow-lg shadow-black/40">
          <div>
            <h3 className="font-display text-xl font-extrabold text-[#F5F3FF]">
              {isVi ? 'Về thử thách này' : 'About this Challenge'}
            </h3>
            <p className="mt-2.5">
              {isVi
                ? 'Thử thách Streak là chương trình khuyến khích đặc biệt tại RaidenBO cho phép các nhà giao dịch BTC/USDT nhận phần thưởng cho cả chuỗi thắng lẫn chuỗi thua liên tiếp. 0,05% tổng khối lượng giao dịch trên toàn nền tảng được cộng dồn trực tiếp vào Quỹ thưởng (Prize Pool) mỗi phút. Mỗi khi đạt điều kiện thử thách, 0,1% giá trị quỹ thưởng sẽ được trao thưởng và cơ hội nhận thêm giải Mega gấp 5 lần mỗi ngày.'
                : 'Streak Challenge is a RaidenBO incentive program rewarding BTC/USDT traders for consecutive winning or losing streaks. 0.05% of total platform trading volume feeds directly into the progressive Prize Pool every minute. Qualifying streaks receive 0.1% of the Prize Pool plus eligibility for the daily 5x Mega Prize.'}
            </p>
          </div>

          <div className="border-t border-[#27223B] pt-5 space-y-3">
            <h3 className="font-display text-xl font-extrabold text-[#F5F3FF]">
              {isVi ? 'Điều khoản và chính sách' : 'Terms & Policy'}
            </h3>
            <p>
              {isVi
                ? 'Người dùng đặt lệnh MUA hoặc BÁN trong các phiên giao dịch BTC/USDT liên tiếp với giá trị tối thiểu $10 mỗi lệnh để đủ điều kiện tham gia. Trường hợp có nhiều người dùng cùng đạt giải độc đắc trong một phiên, giải thưởng được chia đều cho các tài khoản đủ điều kiện. Tài khoản cần hoàn tất xác minh KYC để nhận thưởng; giải thưởng được phân phối tự động vào Ví Thực trong vòng 48 giờ.'
                : 'Users must place BUY or SELL orders in consecutive BTC/USDT rounds with a minimum stake of $10 per order to qualify. When multiple traders qualify in the same session, rewards are distributed evenly. Completed KYC verification is required; payouts settle directly into the Live Wallet within 48 hours.'}
            </p>
            <p>
              {isVi
                ? 'RaidenBO có quyền điều chỉnh điều kiện chương trình và rà soát các hành vi gian lận hoặc thao túng nhằm bảo đảm tính minh bạch, công bằng cho toàn bộ cộng đồng giao dịch.'
                : 'RaidenBO reserves the right to adjust campaign rules and audit irregular trading patterns to maintain fairness and transparency across the trading community.'}
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          MODAL: NHẬN THƯỞNG PRIZE POOL (BẮT BUỘC XÁC THỰC 2FA)
         ============================================================ */}
      {activeClaimModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prizepool-claim-modal-title"
          data-testid="prizepool-claim-modal"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 shadow-2xl shadow-black/80">
            <button
              type="button"
              onClick={() => setActiveClaimModal(null)}
              aria-label={isVi ? 'Đóng cửa sổ nhận thưởng' : 'Close reward claim modal'}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                <Trophy className="h-7 w-7" />
              </div>
              <h3
                id="prizepool-claim-modal-title"
                className="mt-3 font-display text-xl font-extrabold text-[#F5F3FF]"
              >
                {isVi ? 'Nhận thưởng Prize Pool' : 'Claim Prize Pool Reward'}
              </h3>
              <div className="mt-1.5 font-mono text-2xl font-black text-[#C4B5FD] tabular-nums">
                +${activeClaimModal.prizeAmount.toFixed(2)} USDT
              </div>
              <div className="mt-1 text-xs font-semibold text-[#958CB3]">
                {formatStreakLabel(activeClaimModal)}
              </div>
            </div>

            {!user.twoFactorEnabled ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-200">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>{isVi ? 'Yêu cầu bật Xác Thực Google (2FA)' : 'Google 2FA Required'}</span>
                  </div>
                  <p className="mt-1.5">
                    {isVi
                      ? 'Để bảo mật giải thưởng, bạn phải kích hoạt Xác Thực Google (2FA) trước khi gửi yêu cầu nhận thưởng để Admin cộng tiền vào tài khoản.'
                      : 'To protect your payout, please enable Google Authenticator (2FA) before claiming your Prize Pool reward.'}
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="prizepool-enable-2fa-btn"
                  onClick={() => setSetup2FaOpen(true)}
                  className="w-full rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
                >
                  {isVi ? 'Bật Xác Thực Google (2FA) ngay' : 'Enable Google Authenticator (2FA)'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="mt-5 space-y-4">
                <p className="text-center text-xs leading-relaxed text-[#C8C2DC]">
                  {isVi
                    ? 'Nhập mã 2FA gồm 6 chữ số từ ứng dụng Google Authenticator của bạn để xác nhận nhận thưởng. Sau khi xác thực, Admin sẽ nhận thông báo và cộng tiền vào Ví Thực.'
                    : 'Enter the 6-digit code from Google Authenticator to confirm your claim. Admin will be notified to credit your Live Wallet.'}
                </p>

                {claimError && (
                  <div
                    role="alert"
                    data-testid="prizepool-claim-error"
                    className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-3.5 py-2.5 text-xs font-semibold text-[#FB7185]"
                  >
                    {claimError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="prizepool-claim-2fa"
                    className="mb-1.5 block text-xs font-bold text-[#C8C2DC]"
                  >
                    {isVi ? 'Mã 2FA (Google Authenticator)' : '2FA Code (Google Authenticator)'}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3.5 py-2.5 focus-within:border-[#C4B5FD] focus-within:ring-2 focus-within:ring-[#C4B5FD]/25">
                    <input
                      id="prizepool-claim-2fa"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      value={claimTotpCode}
                      onChange={(e) => setClaimTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={isVi ? 'Nhập mã 6 chữ số' : 'Enter 6-digit code'}
                      data-testid="prizepool-claim-2fa-input"
                      className="w-full bg-transparent font-mono text-sm font-bold tracking-[0.2em] text-[#F5F3FF] outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#7E769C]"
                    />
                    <button
                      type="button"
                      onClick={handlePasteClaimCode}
                      className="shrink-0 text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer"
                    >
                      {isVi ? 'Dán' : 'Paste'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={claimBusy}
                  data-testid="prizepool-claim-submit"
                  className="w-full rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
                >
                  {claimBusy
                    ? isVi
                      ? 'Đang xác thực 2FA...'
                      : 'Verifying 2FA...'
                    : isVi
                    ? 'Xác nhận nhận thưởng'
                    : 'Confirm Reward Claim'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Inline Google Authenticator 2FA Setup Modal if user hasn't activated 2FA yet */}
      <GoogleAuthModal
        open={setup2FaOpen}
        mode="enable"
        lang={lang}
        token={token}
        userEmail={user.email}
        onClose={() => setSetup2FaOpen(false)}
        onSuccess={(updatedUser, successMsg) => {
          onUserUpdated(updatedUser);
          setSetup2FaOpen(false);
          setBannerMsg({ type: 'ok', text: successMsg });
        }}
      />
    </div>
  );
};
