import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import {
  computeTradeDashboardStats,
  filterOrdersByCriteria,
} from '../lib/tradingEngine';
import type { AccountMode, Language, TradeOrder } from '../types';

interface TradingDashboardViewProps {
  lang: Language;
  accountMode: AccountMode;
  orders: TradeOrder[];
  hideSensitiveData?: boolean;
}

function getOffsetDateString(daysOffset = 0): string {
  const d = new Date(Date.now() + daysOffset * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDollar(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `-$${formatted}`;
  if (showSign && value > 0) return `+$${formatted}`;
  return `$${formatted}`;
}

export const TradingDashboardView: React.FC<TradingDashboardViewProps> = ({
  lang,
  accountMode,
  orders,
  hideSensitiveData = false,
}) => {
  const isVi = lang === 'vi';
  const defaultStart = useMemo(() => getOffsetDateString(-30), []);
  const defaultEnd = useMemo(() => getOffsetDateString(0), []);
  const endInputRef = React.useRef<HTMLInputElement | null>(null);

  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [startDateInput, setStartDateInput] = useState<string>(defaultStart);
  const [endDateInput, setEndDateInput] = useState<string>(defaultEnd);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({
    start: defaultStart,
    end: defaultEnd,
  });

  const effectiveMode: AccountMode | 'all' = scope === 'all' ? 'all' : accountMode;

  const stats = useMemo(
    () => computeTradeDashboardStats(orders, effectiveMode),
    [orders, effectiveMode]
  );

  const filteredHistory = useMemo(
    () =>
      filterOrdersByCriteria(orders, {
        accountMode: effectiveMode,
        startDate: appliedRange.start || undefined,
        endDate: appliedRange.end || undefined,
      }),
    [orders, effectiveMode, appliedRange]
  );

  // Donut Ring SVG math (r=62 => circumference ~ 389.56)
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const total = stats.totalOrders;
  const winLen = total > 0 ? (stats.wins / total) * circumference : 0;
  const drawLen = total > 0 ? (stats.draws / total) * circumference : 0;
  const loseLen = total > 0 ? (stats.losses / total) * circumference : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedRange({ start: startDateInput, end: endDateInput });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pt-1">
      {/* Page Title & Account Scope Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F3FF]">
          {isVi ? 'Số liệu thống kê' : 'Trading Statistics'}
        </h1>

        <div className="inline-flex items-center rounded-xl border border-[#27223B] bg-[#161423] p-1 text-xs">
          <button
            type="button"
            onClick={() => setScope('active')}
            className={`rounded-lg px-3 py-1.5 font-bold whitespace-nowrap transition-all cursor-pointer ${
              scope === 'active'
                ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-sm'
                : 'text-[#C8C2DC] hover:text-[#F5F3FF]'
            }`}
          >
            {accountMode === 'live'
              ? isVi
                ? 'Tài khoản Thực'
                : 'Live Account'
              : isVi
              ? 'Tài khoản Demo'
              : 'Demo Account'}
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-lg px-3 py-1.5 font-bold whitespace-nowrap transition-all cursor-pointer ${
              scope === 'all'
                ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-sm'
                : 'text-[#C8C2DC] hover:text-[#F5F3FF]'
            }`}
          >
            {isVi ? 'Tất cả ví' : 'All Accounts'}
          </button>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Donut Ring + Round Counts Card */}
        <section
          aria-label={isVi ? 'Tổng quan lượt giao dịch' : 'Trade rounds overview'}
          className="lg:col-span-5 rounded-2xl border border-[#27223B] bg-[#111118] px-6 py-7 flex flex-col items-center text-center shadow-lg shadow-black/40"
        >
          {/* SVG Donut Chart */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
              {/* Dark obsidian-lavender base ring when 0 trades */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="#241F38"
                strokeWidth="18"
                opacity={total === 0 ? 0.95 : 0.65}
              />
              {total > 0 && (
                <>
                  {/* Wins arc (Light Purple #C4B5FD) */}
                  {winLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#C4B5FD"
                      strokeWidth="18"
                      strokeDasharray={`${winLen} ${circumference}`}
                      strokeDashoffset={0}
                      strokeLinecap="butt"
                    />
                  )}
                  {/* Draws arc (Muted Violet #6D5B9E) */}
                  {drawLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#6D5B9E"
                      strokeWidth="18"
                      strokeDasharray={`${drawLen} ${circumference}`}
                      strokeDashoffset={-winLen}
                      strokeLinecap="butt"
                    />
                  )}
                  {/* Losses arc (Rose #FB7185) */}
                  {loseLen > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#FB7185"
                      strokeWidth="18"
                      strokeDasharray={`${loseLen} ${circumference}`}
                      strokeDashoffset={-(winLen + drawLen)}
                      strokeLinecap="butt"
                    />
                  )}
                </>
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-[#958CB3]">
                {isVi ? 'Lượt giao dịch' : 'Total Trades'}
              </span>
              <span
                data-testid="stat-total-orders"
                className="mt-1 font-mono text-2xl font-extrabold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData ? '****' : stats.totalOrders}
              </span>
            </div>
          </div>

          {/* Centered Legend */}
          <div className="mt-5 w-full max-w-[230px] space-y-2.5 text-left text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#C8C2DC] font-medium">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#C4B5FD] shrink-0" />
                <span>{isVi ? 'Tổng vòng thắng' : 'Total Win Rounds'}</span>
              </div>
              <span
                data-testid="stat-wins"
                className="font-mono font-bold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.wins}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#C8C2DC] font-medium">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#6D5B9E] shrink-0" />
                <span>{isVi ? 'Tổng vòng hòa' : 'Total Draw Rounds'}</span>
              </div>
              <span
                data-testid="stat-draws"
                className="font-mono font-bold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.draws}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#C8C2DC] font-medium">
                <span className="h-4 w-4 rounded-full border-[2.5px] border-[#FB7185] shrink-0" />
                <span>{isVi ? 'Tổng vòng thua' : 'Total Lose Rounds'}</span>
              </div>
              <span
                data-testid="stat-losses"
                className="font-mono font-bold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData ? '***' : stats.losses}
              </span>
            </div>
          </div>

          {/* Win Rate & Total Volume */}
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs font-semibold text-[#958CB3]">
                {isVi ? 'Tỉ lệ thắng' : 'Win Rate'}
              </div>
              <div
                data-testid="stat-win-rate"
                className="mt-1 font-mono text-2xl font-extrabold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData
                  ? '****'
                  : `${
                      stats.winRatePct % 1 === 0
                        ? stats.winRatePct.toFixed(0)
                        : stats.winRatePct.toFixed(1)
                    }%`}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#958CB3]">
                {isVi ? 'Tổng giao dịch' : 'Total Trade Volume'}
              </div>
              <div
                data-testid="stat-total-volume"
                className="mt-1 font-mono text-2xl font-extrabold text-[#F5F3FF] tabular-nums"
              >
                {hideSensitiveData ? '****' : formatDollar(stats.totalVolume)}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Net Profit Banner, Total Revenue Banner & Trade Summary */}
        <div className="lg:col-span-7 space-y-4">
          {/* Obsidian & Light-Purple Net Profit Banner */}
          <div className="rounded-2xl border border-[#C4B5FD]/35 bg-gradient-to-r from-[#1D1636] via-[#2B204F] to-[#17122B] px-6 py-6 shadow-xl shadow-black/50">
            <div className="flex items-center justify-center sm:justify-start gap-5">
              <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 shrink-0 text-[#C4B5FD]"
                fill="none"
                aria-hidden="true"
              >
                <rect x="6" y="28" width="8" height="14" rx="2" fill="currentColor" />
                <rect x="19" y="18" width="8" height="24" rx="2" fill="currentColor" />
                <rect x="32" y="8" width="8" height="34" rx="2" fill="currentColor" />
                <line x1="4" y1="44" x2="44" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <div>
                <div className="text-base font-bold text-[#DDD6FE]">
                  {isVi ? 'Lợi nhuận ròng' : 'Net Profit'}
                </div>
                <div
                  data-testid="stat-net-profit"
                  className="mt-0.5 font-mono text-3xl font-extrabold text-[#F5F3FF] tabular-nums"
                >
                  {hideSensitiveData ? '****' : formatDollar(stats.netProfit, stats.netProfit > 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Deep Obsidian-Emerald Total Revenue Banner */}
          <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-[#0B251F] via-[#0F352B] to-[#0A1F1A] px-6 py-6 shadow-xl shadow-black/50">
            <div className="flex items-center justify-center sm:justify-start gap-5">
              <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 shrink-0 text-[#34D399]"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="24" cy="14" r="7" fill="currentColor" />
                <path d="M24 11L26.5 14L24 17L21.5 14L24 11Z" fill="#0B251F" />
                <path d="M24 21V31" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 28C24 24 18 22 14 23C15 27 19 29 24 28Z" fill="currentColor" />
                <path d="M24 28C24 24 30 22 34 23C33 27 29 29 24 28Z" fill="currentColor" />
                <path d="M16 32H32L30 43H18L16 32Z" fill="currentColor" />
              </svg>
              <div>
                <div className="text-base font-bold text-[#A7F3D0]">
                  {isVi ? 'Tổng doanh thu' : 'Total Revenue'}
                </div>
                <div
                  data-testid="stat-total-revenue"
                  className="mt-0.5 font-mono text-3xl font-extrabold text-[#F5F3FF] tabular-nums"
                >
                  {hideSensitiveData ? '****' : formatDollar(stats.totalRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Trade Summary (MUA % vs BÁN %) */}
          <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
            <h2 className="text-center text-lg font-bold text-[#F5F3FF]">
              {isVi ? 'Tóm tắt giao dịch' : 'Trade Summary'}
            </h2>

            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[#241F38]">
              {stats.totalOrders > 0 && (
                <>
                  <div
                    className="h-full bg-[#10B981] transition-all duration-300"
                    style={{ width: `${stats.buyPct}%` }}
                  />
                  <div
                    className="h-full bg-[#F43F5E] transition-all duration-300"
                    style={{ width: `${stats.sellPct}%` }}
                  />
                </>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="text-[#F5F3FF]">{isVi ? 'MUA' : 'BUY'}</span>
                <span className="font-mono text-[#34D399] tabular-nums">{stats.buyPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[#FB7185] tabular-nums">{stats.sellPct}%</span>
                <span className="text-[#F5F3FF]">{isVi ? 'BÁN' : 'SELL'}</span>
              </div>
            </div>

            {stats.openOrders > 0 && (
              <div className="mt-3 border-t border-[#27223B] pt-2.5 text-center text-xs text-[#958CB3]">
                {isVi
                  ? `Hiện có ${stats.openOrders} lệnh đang mở chờ kết quả.`
                  : `${stats.openOrders} open order(s) currently awaiting settlement.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Date-Range Trade History Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold text-[#F5F3FF]">
            {isVi ? 'Lịch sử giao dịch' : 'Trading History'}
          </h2>
          {(appliedRange.start || appliedRange.end) && (
            <button
              type="button"
              onClick={() => {
                setStartDateInput('');
                setEndDateInput('');
                setAppliedRange({ start: '', end: '' });
              }}
              className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer"
            >
              {isVi ? 'Hiển thị tất cả ngày' : 'Show all dates'}
            </button>
          )}
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2F2947] bg-[#111118] px-3.5 py-2.5 shadow-md shadow-black/40">
            <div className="flex flex-1 items-center gap-2 sm:gap-4">
              <input
                type="date"
                aria-label={isVi ? 'Từ ngày' : 'From date'}
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="w-full max-w-[145px] bg-transparent font-mono text-sm font-semibold text-[#F5F3FF] outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <span className="text-[#958CB3] font-bold">-</span>
              <input
                ref={endInputRef}
                type="date"
                aria-label={isVi ? 'Đến ngày' : 'To date'}
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="w-full max-w-[145px] bg-transparent font-mono text-sm font-semibold text-[#F5F3FF] outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const el = endInputRef.current;
                if (!el) return;
                if (typeof el.showPicker === 'function') {
                  try {
                    el.showPicker();
                    return;
                  } catch {
                    // fallback to focus
                  }
                }
                el.focus();
              }}
              aria-label={isVi ? 'Chọn ngày' : 'Pick date'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#C4B5FD] hover:bg-[#231F38] cursor-pointer shrink-0"
            >
              <Calendar className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3.5 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
          >
            {isVi ? 'Tìm kiếm' : 'Search'}
          </button>
        </form>

        {/* Filtered Results or "Không có dữ liệu" */}
        {filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-[#27223B] bg-[#111118] py-10 text-center text-sm font-medium text-[#958CB3]">
            {isVi ? 'Không có dữ liệu' : 'No data available'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#27223B] bg-[#181625] text-[#C8C2DC]">
                  <th className="px-4 py-3 font-bold">{isVi ? 'Thời gian' : 'Time'}</th>
                  <th className="px-4 py-3 font-bold">{isVi ? 'Cặp / Ví' : 'Pair / Account'}</th>
                  <th className="px-4 py-3 font-bold">{isVi ? 'Lệnh' : 'Side'}</th>
                  <th className="px-4 py-3 text-right font-bold">{isVi ? 'Số tiền' : 'Amount'}</th>
                  <th className="px-4 py-3 text-right font-bold">{isVi ? 'Kết quả' : 'Result'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#221D35]">
                {filteredHistory.map((ord) => {
                  const isBuy = ord.direction === 'BUY';
                  return (
                    <tr key={ord.id} className="hover:bg-[#171524]">
                      <td className="px-4 py-3 font-mono text-[#C8C2DC] tabular-nums">
                        {new Date(ord.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#F5F3FF]">{ord.pair}</span>
                        <span className="ml-1.5 text-[#958CB3]">
                          · {ord.accountMode === 'live' ? (isVi ? 'Thực' : 'Live') : 'Demo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isBuy ? 'text-[#34D399]' : 'text-[#FB7185]'
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {isBuy ? (isVi ? 'MUA' : 'BUY') : isVi ? 'BÁN' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#F5F3FF] tabular-nums">
                        ${ord.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {ord.status === 'OPEN' ? (
                          <span className="text-[#C4B5FD]">{isVi ? 'Đang mở' : 'Open'}</span>
                        ) : ord.status === 'DRAW' ? (
                          <span className="text-[#C8C2DC]">{isVi ? 'Hòa ($0)' : 'Draw ($0)'}</span>
                        ) : ord.status === 'WON' ? (
                          <span className="text-[#34D399]">+${ord.pnl.toFixed(2)}</span>
                        ) : (
                          <span className="text-[#FB7185]">-${ord.amount.toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
