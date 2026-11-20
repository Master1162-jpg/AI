import React, { useState } from 'react';
import { Crown, Info, Lock, Sparkles, User as UserIcon } from 'lucide-react';
import {
  QUICKINVEST_DAILY_LEADERBOARD,
  QUICKINVEST_TOP_PACKAGES,
  type DailyInvestorRank,
  type TopPackageItem,
} from './quickInvestData';

interface QuickInvestDiscoverTabProps {
  onCopyPackage: (pkg: TopPackageItem) => void;
  onCopyTrader: (trader: DailyInvestorRank) => void;
}

const MedalRibbon: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const palette =
    rank === 1
      ? { outer: '#FDE68A', inner: '#F59E0B', rim: '#FFFBEB', text: '#92400E', ribbon: '#FB923C' }
      : rank === 2
      ? { outer: '#DDD6FE', inner: '#A78BFA', rim: '#F5F3FF', text: '#140E24', ribbon: '#8B5CF6' }
      : { outer: '#A7F3D0', inner: '#10B981', rim: '#ECFDF5', text: '#064E3B', ribbon: '#059669' };

  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center">
      <svg viewBox="0 0 48 52" className="h-12 w-12 drop-shadow-md" aria-hidden="true">
        <path d="M16 32L12 49L20 44L23 48L24 34Z" fill={palette.ribbon} />
        <path d="M32 32L36 49L28 44L25 48L24 34Z" fill={palette.outer} />
        <circle cx="24" cy="21" r="16" fill={palette.outer} stroke={palette.rim} strokeWidth="2.5" />
        <circle cx="24" cy="21" r="12" fill={palette.inner} />
        <text
          x="24"
          y="26"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#FFFFFF"
          fontFamily="sans-serif"
        >
          {rank}
        </text>
      </svg>
    </div>
  );
};

export const QuickInvestDiscoverTab: React.FC<QuickInvestDiscoverTabProps> = ({
  onCopyPackage,
  onCopyTrader,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const topThree = QUICKINVEST_DAILY_LEADERBOARD.slice(0, 3);
  const restRanks = QUICKINVEST_DAILY_LEADERBOARD.slice(3);

  const getPackageGradient = (rank: 1 | 2 | 3) => {
    if (rank === 1) return 'from-[#78350F] via-[#B45309] to-[#451A03]';
    if (rank === 2) return 'from-[#31245C] via-[#4C1D95] to-[#1D1536]';
    return 'from-[#065F46] via-[#047857] to-[#064E3B]';
  };

  const getTopRankCardStyle = (tier?: 'silver' | 'gold' | 'emerald') => {
    if (tier === 'silver') {
      return 'bg-gradient-to-r from-[#2B1F54] via-[#4C1D95] to-[#3B2573] border-[#C4B5FD]/45';
    }
    if (tier === 'gold') {
      return 'bg-gradient-to-r from-[#5A2D0C] via-[#92400E] to-[#78350F] border-amber-400/45';
    }
    return 'bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#065F46] border-emerald-400/45';
  };

  return (
    <div className="space-y-7 px-3.5 py-5 pb-24 lg:px-6 lg:py-6 lg:pb-8">
      {/* Section 1: Gói hiệu quả hàng đầu */}
      <section aria-labelledby="qi-top-packages-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1
              id="qi-top-packages-heading"
              className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight bg-gradient-to-r from-[#F5F3FF] via-[#DDD6FE] to-[#C4B5FD] bg-clip-text text-transparent"
            >
              Gói hiệu quả hàng đầu
            </h1>
            <Sparkles className="h-5 w-5 text-[#C4B5FD] shrink-0" />
          </div>
          <span className="hidden sm:inline-flex text-xs font-semibold text-[#958CB3]">
            Cập nhật trực tiếp 24h · QuickInvest
          </span>
        </div>

        {/* Mobile horizontal snap cards -> Desktop 3-column grid */}
        <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {QUICKINVEST_TOP_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              data-testid={`top-package-card-${pkg.rank}`}
              className="w-[268px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#27223B] bg-[#111118] shadow-xl shadow-black/50 lg:w-auto flex flex-col"
            >
              <div
                className={`bg-gradient-to-b ${getPackageGradient(
                  pkg.rank
                )} px-4 pt-5 pb-5 text-center flex-1 flex flex-col justify-between border-b border-[#27223B]`}
              >
                <MedalRibbon rank={pkg.rank} />
                <h2 className="mt-2.5 text-sm sm:text-[15px] font-extrabold tracking-wide text-[#F5F3FF] uppercase leading-snug drop-shadow-xs">
                  {pkg.name}
                </h2>
                <div className="mt-2.5 text-xs font-semibold text-[#F5F3FF]/90">
                  <span>PnL 24h </span>
                  <span className="font-mono font-extrabold text-[#FEF08A]">
                    ({pkg.pnl24hPct})
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-black tracking-tight text-white tabular-nums">
                  {pkg.pnl24hUsd}
                </div>
              </div>

              <div className="bg-[#111118] p-3.5">
                <button
                  type="button"
                  onClick={() => onCopyPackage(pkg)}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] hover:from-[#DDD6FE] hover:to-[#C4B5FD] active:scale-[0.99] px-4 py-2.5 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 transition-all cursor-pointer"
                >
                  Sao chép gói
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: Bảng xếp hạng nhà đầu tư hàng ngày */}
      <section aria-labelledby="qi-daily-ranking-heading">
        <div className="mb-4 flex items-center gap-2 relative">
          <h2
            id="qi-daily-ranking-heading"
            className="font-display text-2xl sm:text-[26px] font-extrabold leading-tight tracking-tight bg-gradient-to-r from-[#F5F3FF] via-[#DDD6FE] to-[#C4B5FD] bg-clip-text text-transparent"
          >
            Bảng xếp hạng nhà đầu tư hàng ngày
          </h2>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-label="Thông tin bảng xếp hạng"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#958CB3] hover:bg-[#1E1A30] hover:text-[#F5F3FF] cursor-pointer shrink-0"
          >
            <Info className="h-4.5 w-4.5" />
          </button>

          {infoOpen && (
            <div className="absolute left-0 top-full mt-2 z-20 max-w-sm rounded-xl border border-[#2F2947] bg-[#14131E] p-3 text-xs text-[#C8C2DC] shadow-2xl shadow-black/80">
              Xếp hạng tỷ suất lợi nhuận 24h của các nhà đầu tư sử dụng chiến lược QuickInvest Bot. Nhấn vào tài khoản công khai để sao chép cấu hình chiến lược.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {/* Top 3 Highlighted Gradient Cards */}
          <div className="space-y-3 lg:col-span-5">
            {topThree.map((entry) => (
              <button
                key={`top-${entry.rank}`}
                type="button"
                onClick={() => onCopyTrader(entry)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left shadow-lg shadow-black/40 transition-transform hover:brightness-110 active:scale-[0.99] cursor-pointer ${getTopRankCardStyle(
                  entry.tier
                )}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/25 border border-white/25 text-white">
                    {entry.crown && (
                      <Crown className="absolute -top-3.5 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-300 text-amber-200 drop-shadow" />
                    )}
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">
                      {entry.username}
                    </div>
                    <div className="text-xs font-medium text-white/80">Pnl 24h</div>
                  </div>
                </div>
                <div className="font-mono text-xl font-black text-white tabular-nums shrink-0">
                  {entry.pnlPctLabel}
                </div>
              </button>
            ))}
          </div>

          {/* Ranks #4 to #13 Clean Rows */}
          <div className="space-y-2 lg:col-span-7">
            {restRanks.map((entry) => (
              <div
                key={`rank-${entry.rank}`}
                className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#111118] px-3.5 py-2.5 shadow-sm transition-colors hover:border-[#C4B5FD]/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 font-mono text-xs font-bold text-[#958CB3] tabular-nums shrink-0">
                    #{entry.rank}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#181625] border border-[#2F2947] text-[#C4B5FD]">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-sm font-semibold text-[#F5F3FF]">
                      {entry.username}
                    </span>
                    {entry.locked && (
                      <Lock
                        className="h-3.5 w-3.5 text-[#958CB3] shrink-0"
                        aria-label="Chiến lược riêng tư"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!entry.locked && (
                    <button
                      type="button"
                      onClick={() => onCopyTrader(entry)}
                      className="hidden sm:inline-flex rounded-lg border border-[#C4B5FD]/35 bg-[#181625] px-2.5 py-1 text-[11px] font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                    >
                      Sao chép
                    </button>
                  )}
                  <span className="min-w-[82px] rounded-lg border border-[#27223B] bg-[#161423] px-2.5 py-1.5 text-center font-mono text-xs font-bold text-[#F5F3FF] tabular-nums">
                    {entry.pnlPctLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
