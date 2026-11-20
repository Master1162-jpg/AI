import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CandlestickChart } from './CandlestickChart';
import { IndicatorGauges } from './IndicatorGauges';
import { COPY } from '../lib/i18n';
import type {
  AccountMode,
  Language,
  MarketSnapshot,
  TradeDirection,
  TradeOrder,
  UserAccount,
} from '../types';

interface TradingTerminalProps {
  market: MarketSnapshot;
  user: UserAccount;
  accountMode: AccountMode;
  orders: TradeOrder[];
  lang: Language;
  onPlaceTrade: (direction: TradeDirection, amount: number) => Promise<void>;
  onGoToBot: () => void;
  onGoToOrders?: () => void;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  market,
  user,
  accountMode,
  orders,
  lang,
  onPlaceTrade,
  onGoToBot,
  onGoToOrders,
}) => {
  const [amount, setAmount] = useState<number>(10);
  const [bottomTab, setBottomTab] = useState<'results' | 'indicators'>('results');
  const [orderTab, setOrderTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const t = COPY[lang];
  const isVi = lang === 'vi';
  const activeBalance = accountMode === 'live' ? user.liveBalance : user.demoBalance;
  const payoutTotal = Number((amount + amount * market.payoutRate).toFixed(2));
  const profitPercent = Math.round(market.payoutRate * 100);
  const isWaiting = market.phase !== 'betting';

  // 5 blocks of 5x4 = 20 circles (desktop shows 5 blocks, mobile shows latest 3 blocks)
  const waterdropBlocks = useMemo(() => {
    const recent = market.lastResults.slice(-88);
    const totalBlocks = 5;
    const blockCapacity = 20;
    const blocks: Array<Array<TradeDirection | null>> = [];
    for (let b = 0; b < totalBlocks; b++) {
      const start = b * blockCapacity;
      const arr: Array<TradeDirection | null> = [];
      for (let i = 0; i < blockCapacity; i++) {
        arr.push(recent[start + i] ?? null);
      }
      blocks.push(arr);
    }
    return blocks;
  }, [market.lastResults]);

  // Mobile 3 blocks of 5x4
  const mobileWaterdropBlocks = useMemo(() => {
    const recent = market.lastResults.slice(-46);
    const totalBlocks = 3;
    const blockCapacity = 20;
    const blocks: Array<Array<TradeDirection | null>> = [];
    for (let b = 0; b < totalBlocks; b++) {
      const start = b * blockCapacity;
      const arr: Array<TradeDirection | null> = [];
      for (let i = 0; i < blockCapacity; i++) {
        arr.push(recent[start + i] ?? null);
      }
      blocks.push(arr);
    }
    return blocks;
  }, [market.lastResults]);

  const upCount = useMemo(
    () => market.lastResults.filter((r) => r === 'BUY').length,
    [market.lastResults]
  );
  const downCount = useMemo(
    () => market.lastResults.filter((r) => r === 'SELL').length,
    [market.lastResults]
  );

  const openOrders = useMemo(() => orders.filter((o) => o.status === 'OPEN'), [orders]);
  const closedOrders = useMemo(() => orders.filter((o) => o.status !== 'OPEN'), [orders]);

  const handleOrder = async (dir: TradeDirection) => {
    setFeedback(null);
    if (market.phase !== 'betting') {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Đang trong 30s chờ kết quả. Vui lòng đợi phiên đặt lệnh tiếp theo!'
          : 'Waiting for round settlement. Please wait for the next betting phase.',
      });
      return;
    }
    if (amount <= 0 || amount > activeBalance) {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Số tiền đặt lệnh không hợp lệ hoặc vượt quá số dư.'
          : 'Invalid amount or insufficient balance.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await onPlaceTrade(dir, amount);
      setFeedback({
        type: 'ok',
        text: isVi
          ? `Đã vào lệnh ${dir === 'BUY' ? 'MUA' : 'BÁN'} $${amount.toFixed(2)} thành công!`
          : `Placed ${dir} $${amount.toFixed(2)} order!`,
      });
      setOrderTab('OPEN');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Lỗi đặt lệnh',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 xl:gap-4">
      {/* Left/Center Main Chart + Last Results Column */}
      <div className="xl:col-span-9 flex flex-col xl:gap-4">
        <CandlestickChart
          candles={market.candles}
          currentPrice={market.currentPrice}
          secondsRemaining={market.secondsRemaining}
          phase={market.phase}
          sentimentBuyPct={market.sentimentBuyPct}
          sentimentSellPct={market.sentimentSellPct}
        />

        {/* Indicators & Last Results (5x4 Waterdrop Matrix) */}
        <div className="border-b border-[#27223B] bg-[#111118] px-3 pt-2.5 pb-3 shadow-lg shadow-black/40 lg:rounded-xl lg:border lg:p-4">
          <div className="flex items-center justify-between gap-2 pb-2.5 lg:border-b lg:border-[#27223B]">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setBottomTab('indicators')}
                className={`pb-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'indicators'
                    ? 'border-b-2 border-[#C4B5FD] text-[#F5F3FF]'
                    : 'text-[#958CB3] hover:text-[#DDD6FE]'
                }`}
              >
                {t.indicators}
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('results')}
                className={`pb-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  bottomTab === 'results'
                    ? 'border-b-2 border-[#C4B5FD] text-[#F5F3FF]'
                    : 'text-[#958CB3] hover:text-[#DDD6FE]'
                }`}
              >
                {t.lastResults}
              </button>
            </div>

            {bottomTab === 'results' && (
              <div className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2F2947] bg-[#181625] px-2.5 py-1 text-[#F5F3FF]">
                  <TrendingUp className="h-4 w-4 text-[#34D399]" />
                  {upCount}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2F2947] bg-[#181625] px-2.5 py-1 text-[#F5F3FF]">
                  <TrendingDown className="h-4 w-4 text-[#FB7185]" />
                  {downCount}
                </span>
              </div>
            )}
          </div>

          {bottomTab === 'results' ? (
            <>
              {/* Mobile 3-block clean waterdrop grid */}
              <div className="mt-2 grid grid-cols-3 gap-3 md:hidden">
                {mobileWaterdropBlocks.map((block, bIdx) => (
                  <div
                    key={bIdx}
                    className="grid grid-cols-5 grid-rows-4 grid-flow-col justify-items-center gap-1.5"
                  >
                    {block.map((cell, cIdx) => (
                      <span
                        key={cIdx}
                        title={cell ? (cell === 'BUY' ? 'MUA (Tăng)' : 'BÁN (Giảm)') : 'Chờ kết quả'}
                        className={`h-4 w-4 rounded-full transition-colors ${
                          cell === 'BUY'
                            ? 'bg-[#10B981]'
                            : cell === 'SELL'
                            ? 'bg-[#F43F5E]'
                            : 'bg-[#28233C]'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet 5-block waterdrop grid */}
              <div className="mt-4 hidden md:block overflow-x-auto pb-1">
                <div className="flex min-w-[540px] items-center justify-between gap-4">
                  {waterdropBlocks.map((block, bIdx) => (
                    <div
                      key={bIdx}
                      className="grid grid-cols-5 grid-rows-4 grid-flow-col gap-1.5 rounded-lg border border-[#27223B] bg-[#161423] p-2.5"
                    >
                      {block.map((cell, cIdx) => (
                        <span
                          key={cIdx}
                          title={cell ? (cell === 'BUY' ? 'MUA (Tăng)' : 'BÁN (Giảm)') : 'Chờ kết quả'}
                          className={`h-3.5 w-3.5 rounded-full transition-colors ${
                            cell === 'BUY'
                              ? 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.45)]'
                              : cell === 'SELL'
                              ? 'bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.45)]'
                              : 'bg-[#28233C]'
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <IndicatorGauges candles={market.candles} lang={lang} />
          )}
        </div>

        {/* ============================================================
            MOBILE / TABLET EXECUTION DOCK (< xl)
           ============================================================ */}
        <div className="xl:hidden px-3 pt-3 pb-5 space-y-3 bg-[#09090D]">
          {/* Compact Feedback Banner */}
          {feedback && (
            <div
              className={`rounded-lg border px-3 py-1.5 text-center text-xs font-semibold ${
                feedback.type === 'ok'
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                  : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Row 1: Inline Profit Summary */}
          <div className="flex items-baseline justify-center gap-2.5">
            <span className="text-sm font-semibold text-[#C8C2DC]">{t.profit}</span>
            <span className="font-mono text-lg font-extrabold text-[#C4B5FD]">{profitPercent}%</span>
            <span className="font-mono text-2xl font-extrabold text-[#34D399]">
              +${payoutTotal % 1 === 0 ? payoutTotal.toFixed(0) : payoutTotal.toFixed(2)}
            </span>
          </div>

          {/* Row 2: Clean Horizontal Stepper ([ - ] [ $10 ] [ + ]) */}
          <div className="grid grid-cols-12 items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 5))}
              aria-label="Giảm 5 đô"
              className="col-span-3 flex h-11 items-center justify-center rounded-lg border border-[#2F2947] bg-[#181625] text-[#DDD6FE] transition-colors hover:border-[#C4B5FD]/50 hover:bg-[#231F38] cursor-pointer"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="relative col-span-6">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-[#958CB3]">
                $
              </span>
              <input
                type="number"
                min={1}
                step={1}
                aria-label="Số tiền đặt lệnh"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="h-11 w-full rounded-lg border border-[#2F2947] bg-[#111118] pl-7 pr-3 font-mono text-base font-extrabold text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount((a) => a + 5)}
              aria-label="Tăng 5 đô"
              className="col-span-3 flex h-11 items-center justify-center rounded-lg border border-[#2F2947] bg-[#181625] text-[#DDD6FE] transition-colors hover:border-[#C4B5FD]/50 hover:bg-[#231F38] cursor-pointer"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Row 3: 3-Column Action Bar ([ BÁN ↘ ] [ Chờ Kết quả 24s ] [ MUA ↗ ]) */}
          <div className="grid grid-cols-3 items-stretch gap-2">
            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('SELL')}
              className={`flex h-14 items-center justify-center gap-1.5 rounded-xl font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'border border-[#2A243D] bg-[#1D1A2D] text-[#7D749B] cursor-not-allowed'
                  : 'bg-[#E11D48] text-white shadow-md shadow-rose-900/40 hover:bg-[#F43F5E]'
              }`}
            >
              <span>{t.sell}</span>
              <TrendingDown className="h-5 w-5" />
            </button>

            <div className="flex h-14 flex-col items-center justify-center rounded-xl border border-[#2F2947] bg-[#14131E] px-1 text-center shadow-md shadow-black/40">
              <div className="text-[11px] font-semibold leading-tight text-[#C8C2DC]">
                {isWaiting ? (isVi ? 'Chờ Kết quả' : 'Wait Result') : t.pleaseTrade}
              </div>
              <div
                className={`font-mono text-lg font-extrabold leading-tight ${
                  !isWaiting ? 'text-[#34D399]' : 'text-[#C4B5FD]'
                }`}
              >
                {market.secondsRemaining}s
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('BUY')}
              className={`flex h-14 items-center justify-center gap-1.5 rounded-xl font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'border border-[#2A243D] bg-[#1D1A2D] text-[#7D749B] cursor-not-allowed'
                  : 'bg-[#059669] text-white shadow-md shadow-emerald-900/40 hover:bg-[#10B981]'
              }`}
            >
              <span>{t.buy}</span>
              <TrendingUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          DESKTOP RIGHT ORDER EXECUTION & ORDERS COLUMN (>= xl)
         ============================================================ */}
      <div className="hidden xl:flex xl:col-span-3 flex-col gap-4">
        <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between text-xs text-[#958CB3] mb-2">
            <span className="font-medium">{isVi ? 'Số tiền đặt lệnh' : 'Order Amount'}</span>
            <span className="font-mono font-semibold text-[#DDD6FE]">
              {isVi ? 'Khả dụng:' : 'Avail:'} ${activeBalance.toFixed(2)}
            </span>
          </div>

          {/* Stepper Input */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 5))}
              aria-label="Giảm 5 đô"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2F2947] bg-[#181625] text-[#DDD6FE] hover:border-[#C4B5FD]/50 hover:bg-[#231F38] cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[#958CB3]">
                $
              </span>
              <input
                type="number"
                min={1}
                step={1}
                aria-label="Số tiền đặt lệnh"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="h-10 w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] pl-7 pr-3 font-mono text-base font-extrabold text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount((a) => a + 5)}
              aria-label="Tăng 5 đô"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2F2947] bg-[#181625] text-[#DDD6FE] hover:border-[#C4B5FD]/50 hover:bg-[#231F38] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Amount Chips */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[5, 10, 20, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount((a) => Number((a + val).toFixed(2)))}
                className="rounded-lg border border-[#27223B] bg-[#181625] py-1.5 font-mono text-xs font-semibold text-[#C8C2DC] transition-colors hover:border-[#C4B5FD]/50 hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
              >
                +{val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(Math.floor(activeBalance))}
              className="rounded-lg border border-[#C4B5FD]/40 bg-[#231D3A] py-1.5 font-mono text-xs font-bold text-[#DDD6FE] transition-colors hover:bg-[#2E254D] cursor-pointer"
            >
              All
            </button>
          </div>

          {/* Profit Projection */}
          <div className="mt-4 text-center">
            <div className="text-xs font-medium text-[#C8C2DC]">
              {t.profit} <strong className="text-[#C4B5FD]">{profitPercent}%</strong>
            </div>
            <div className="mt-0.5 font-mono text-2xl font-extrabold text-[#34D399]">
              +${payoutTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#958CB3]">
              {isVi ? 'Tổng nhận khi thắng (Vốn + 95%)' : 'Total return on win (Stake + 95%)'}
            </div>
          </div>

          {/* Traders Sentiment Bar */}
          <div className="mt-4">
            <div className="text-center text-[11px] font-medium text-[#958CB3] mb-1.5">{t.tradersSentiment}</div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#241F38]">
              <div
                className="bg-[#10B981] transition-all duration-300"
                style={{ width: `${market.sentimentBuyPct}%` }}
              />
              <div
                className="bg-[#F43F5E] transition-all duration-300"
                style={{ width: `${market.sentimentSellPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] font-bold">
              <span className="text-[#34D399]">{market.sentimentBuyPct}%</span>
              <span className="text-[#FB7185]">{market.sentimentSellPct}%</span>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
                feedback.type === 'ok'
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                  : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* BUY / Phase Timer / SELL Stack */}
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('BUY')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'border border-[#2A243D] bg-[#1D1A2D] text-[#7D749B] cursor-not-allowed'
                  : 'bg-[#059669] text-white shadow-md shadow-emerald-900/40 hover:bg-[#10B981]'
              }`}
            >
              <span>{t.buy}</span>
              <TrendingUp className="h-5 w-5" />
            </button>

            <div className="rounded-xl border border-[#2F2947] bg-[#181625] py-2.5 text-center">
              <div className="text-[11px] font-semibold text-[#C8C2DC]">
                {isWaiting ? (isVi ? 'Chờ Kết quả' : 'Wait Result') : t.pleaseTrade}
              </div>
              <div
                className={`font-mono text-base font-extrabold ${
                  !isWaiting ? 'text-[#34D399]' : 'text-[#C4B5FD]'
                }`}
              >
                {market.secondsRemaining}s
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || isWaiting}
              onClick={() => handleOrder('SELL')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-base font-extrabold transition-all cursor-pointer ${
                isWaiting || submitting
                  ? 'border border-[#2A243D] bg-[#1D1A2D] text-[#7D749B] cursor-not-allowed'
                  : 'bg-[#E11D48] text-white shadow-md shadow-rose-900/40 hover:bg-[#F43F5E]'
              }`}
            >
              <span>{t.sell}</span>
              <TrendingDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Open / Closed Orders Card */}
        <div className="flex-1 rounded-xl border border-[#27223B] bg-[#111118] p-3.5 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between gap-2 border-b border-[#27223B] pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setOrderTab('OPEN')}
                className={`flex items-center gap-1 pb-1 text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  orderTab === 'OPEN'
                    ? 'border-b-2 border-[#C4B5FD] text-[#F5F3FF]'
                    : 'text-[#958CB3] hover:text-[#DDD6FE]'
                }`}
              >
                <span>{t.openOrders}</span>
                <span className="rounded bg-[#E11D48] px-1 py-0.5 font-mono text-[9.5px] leading-none text-white">
                  {openOrders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOrderTab('CLOSED')}
                className={`flex items-center gap-1 pb-1 text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  orderTab === 'CLOSED'
                    ? 'border-b-2 border-[#C4B5FD] text-[#F5F3FF]'
                    : 'text-[#958CB3] hover:text-[#DDD6FE]'
                }`}
              >
                <span>{t.closedOrders}</span>
                <span className="rounded bg-[#251F3A] px-1 py-0.5 font-mono text-[9.5px] leading-none text-[#DDD6FE]">
                  {closedOrders.length}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              {onGoToOrders && (
                <button
                  type="button"
                  onClick={onGoToOrders}
                  className="text-[10.5px] font-bold whitespace-nowrap text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer"
                >
                  {isVi ? 'Tất cả' : 'All'}
                </button>
              )}
              <button
                type="button"
                onClick={onGoToBot}
                title="Mở Bot AI"
                className="inline-flex items-center gap-1 rounded-md border border-[#C4B5FD]/35 bg-[#1F1A36] px-1.5 py-1 text-[10px] font-bold whitespace-nowrap text-[#DDD6FE] hover:bg-[#2B234A] cursor-pointer"
              >
                <Bot className="h-3 w-3 shrink-0" />
                <span>Bot</span>
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {(orderTab === 'OPEN' ? openOrders : closedOrders).length === 0 ? (
              <div className="py-8 text-center text-xs text-[#958CB3]">
                {orderTab === 'OPEN'
                  ? isVi
                    ? 'Chưa có lệnh đang mở trong phiên này.'
                    : 'No open orders in this round.'
                  : isVi
                  ? 'Chưa có lịch sử lệnh đã đóng.'
                  : 'No closed orders yet.'}
              </div>
            ) : (
              (orderTab === 'OPEN' ? openOrders : closedOrders).map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-lg border border-[#27223B] bg-[#161423] px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F5F3FF]">
                      {ord.pair}{' '}
                      <span className="text-[10px] text-[#958CB3]">
                        ({ord.accountMode === 'live' ? 'LIVE' : 'DEMO'}
                        {ord.source === 'bot' ? ' · BOT' : ''})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-[#F5F3FF]">
                      ${ord.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        ord.direction === 'BUY' ? 'text-[#34D399]' : 'text-[#FB7185]'
                      }`}
                    >
                      {ord.direction === 'BUY' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {ord.direction}
                    </span>
                    {ord.status === 'OPEN' ? (
                      <span className="font-mono text-[11px] font-semibold text-[#C4B5FD]">
                        Entry ${ord.entryPrice.toFixed(2)}
                      </span>
                    ) : ord.status === 'DRAW' ? (
                      <span className="font-mono font-bold text-[#C8C2DC]">
                        {isVi ? 'Hòa $0.00' : 'Draw $0.00'}
                      </span>
                    ) : (
                      <span
                        className={`font-mono font-bold ${
                          ord.status === 'WON' ? 'text-[#34D399]' : 'text-[#FB7185]'
                        }`}
                      >
                        {ord.pnl >= 0 ? '+' : ''}${ord.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
