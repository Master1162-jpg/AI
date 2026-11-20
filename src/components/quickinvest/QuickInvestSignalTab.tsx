import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Cpu,
  Loader2,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import emptyGardenImg from '../../assets/images/quickinvest_empty_garden_1795004381707.jpg';
import signalBuyImg from '../../assets/images/quickinvest_signal_buy_1795004381091.jpg';
import signalSellImg from '../../assets/images/quickinvest_signal_sell_1795004380311.jpg';
import { computeAiOrderPrediction, evaluateHistoricalAiAccuracy } from '../../lib/tradingEngine';
import type {
  AccountMode,
  AiSignalMode,
  BotLogEntry,
  GeminiDeepPrediction,
  MarketSnapshot,
  TradeDirection,
  TradeOrder,
} from '../../types';

interface QuickInvestSignalTabProps {
  token: string;
  accountMode: AccountMode;
  market: MarketSnapshot;
  orders: TradeOrder[];
  botLogs: BotLogEntry[];
  onBack: () => void;
  onPlaceTrade: (
    direction: TradeDirection,
    amount: number,
    modeOverride?: AccountMode
  ) => Promise<void>;
}

const MULTIPLIERS = [1, 2, 4, 8, 10] as const;

export const QuickInvestSignalTab: React.FC<QuickInvestSignalTabProps> = ({
  token,
  accountMode,
  market,
  orders,
  botLogs,
  onBack,
  onPlaceTrade,
}) => {
  const [baseUnit, setBaseUnit] = useState('1');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [expertMode, setExpertMode] = useState(true);
  const [signalMode, setSignalMode] = useState<AiSignalMode>('balanced');
  const [submitting, setSubmitting] = useState<TradeDirection | null>(null);
  const [orderFeedback, setOrderFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Gemini AI deep analysis state (server-side /api/bot/ai-predict)
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<GeminiDeepPrediction | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const prediction = useMemo(
    () => computeAiOrderPrediction(market.candles, market.lastResults, market.roundId, signalMode),
    [market.candles, market.lastResults, market.roundId, signalMode]
  );

  const historicalAccuracy = useMemo(
    () => evaluateHistoricalAiAccuracy(market.candles, 8, signalMode),
    [market.candles, signalMode]
  );

  const recentBuySignals = historicalAccuracy.filter((h) => h.predicted === 'BUY').length;
  const recentSellSignals = historicalAccuracy.filter((h) => h.predicted === 'SELL').length;

  const parsedBase = Math.max(1, Number(baseUnit) || 1);
  const effectiveOrderAmount = Number((parsedBase * multiplier).toFixed(2));
  const isWaiting = market.phase === 'waiting';

  // Circular countdown progress ring (synced to 30s round window)
  const ringRadius = 82;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressRatio = Math.min(1, Math.max(0, (30 - market.secondsRemaining) / 30));
  const activeArcLength = Math.max(24, ringCircumference * Math.max(0.18, progressRatio));

  const recentSessionTrades = useMemo(() => {
    const scopedOrders = orders.filter((o) => o.accountMode === accountMode).slice(0, 12);
    if (scopedOrders.length > 0) return scopedOrders;
    return [];
  }, [orders, accountMode]);

  const handleQuickOrder = async (direction: TradeDirection) => {
    if (isWaiting) {
      setOrderFeedback({
        type: 'err',
        text: `Đang phân tích kết quả phiên #${market.roundId}. Vui lòng chờ ${market.secondsRemaining}s để vào lệnh!`,
      });
      return;
    }
    if (!Number.isFinite(effectiveOrderAmount) || effectiveOrderAmount < 1) {
      setOrderFeedback({
        type: 'err',
        text: 'Số tiền vào lệnh tối thiểu là $1.',
      });
      return;
    }

    setSubmitting(direction);
    setOrderFeedback(null);
    try {
      await onPlaceTrade(direction, effectiveOrderAmount, accountMode);
      setOrderFeedback({
        type: 'ok',
        text: `Đã vào lệnh ${direction} $${effectiveOrderAmount.toFixed(2)} (${accountMode.toUpperCase()}) · Phiên #${market.roundId}`,
      });
    } catch (err) {
      setOrderFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Không thể đặt lệnh lúc này.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleRunGeminiDeepPredict = async () => {
    setGeminiLoading(true);
    setGeminiError(null);
    try {
      const res = await fetch('/api/bot/ai-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lang: 'vi' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể chạy phân tích Gemini AI.');
      }
      setGeminiResult(data.prediction);
    } catch (err) {
      setGeminiError(err instanceof Error ? err.message : 'Lỗi kết nối phân tích AI.');
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
    <div className="relative px-3.5 py-4 pb-24 lg:px-6 lg:py-5 lg:pb-8">
      {/* Top Back Arrow */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại Khám phá"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#C8C2DC] hover:bg-[#1E1A30] hover:text-[#F5F3FF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-[#958CB3]">
          <span>BTC/USDT</span>
          <span className="text-[#C4B5FD]">•</span>
          <span className="font-bold text-[#F5F3FF] tabular-nums">
            ${market.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Responsive Desktop Split (12 cols) vs Mobile Stack */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        {/* Left/Main Column (7 cols on desktop): Signal Hero + Quick Execution Card */}
        <div className="space-y-4 lg:col-span-7">
          {/* Card 1: Trend Is Friend - Vững Bước Giao Dịch */}
          <section
            data-testid="quickinvest-signal-hero"
            data-phase={market.phase}
            data-direction={prediction.direction}
            className="rounded-2xl border border-[#27223B] bg-[#111118] px-5 py-6 text-center shadow-lg shadow-black/40"
          >
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#F5F3FF] tracking-tight leading-snug">
              <Rocket className="mr-1.5 -mt-1 inline-block h-5 w-5 text-[#C4B5FD]" />
              Trend Is Friend - Vững Bước Giao Dịch
            </h1>

            {/* Two-Way AI Signal Mode Selector (Cân bằng Xanh/Đỏ vs Đảo chiều nhanh) */}
            <div
              role="group"
              aria-label="Chế độ tín hiệu AI 2 chiều"
              className="mx-auto mt-3 inline-flex rounded-xl border border-[#27223B] bg-[#161423] p-1 text-[11px] font-bold"
            >
              <button
                type="button"
                onClick={() => setSignalMode('balanced')}
                className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                  signalMode === 'balanced'
                    ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] font-extrabold shadow-xs'
                    : 'text-[#C8C2DC] hover:text-[#F5F3FF]'
                }`}
              >
                AI Cân bằng (Xanh &amp; Đỏ)
              </button>
              <button
                type="button"
                onClick={() => setSignalMode('reversal')}
                className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                  signalMode === 'reversal'
                    ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] font-extrabold shadow-xs'
                    : 'text-[#C8C2DC] hover:text-[#F5F3FF]'
                }`}
              >
                AI Đảo chiều nhanh
              </button>
            </div>

            {isWaiting ? (
              /* Waiting Phase */
              <div className="mt-3 flex flex-col items-center">
                <p className="text-lg font-bold text-[#958CB3]">
                  Đang phân tích tín hiệu...
                </p>

                <div className="relative my-5 flex h-[186px] w-[186px] items-center justify-center">
                  <svg viewBox="0 0 186 186" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle
                      cx="93"
                      cy="93"
                      r={ringRadius}
                      fill="none"
                      stroke="#28233C"
                      strokeWidth="5"
                    />
                    <circle
                      cx="93"
                      cy="93"
                      r={ringRadius}
                      fill="none"
                      stroke={prediction.direction === 'BUY' ? '#10B981' : '#F43F5E'}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${activeArcLength} ${ringCircumference}`}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#958CB3]">
                      AI Dự kiến
                    </span>
                    <span
                      className={`mt-0.5 font-display text-xl font-black ${
                        prediction.direction === 'BUY' ? 'text-[#34D399]' : 'text-[#FB7185]'
                      }`}
                    >
                      {prediction.direction === 'BUY' ? 'BUY · XANH' : 'SELL · ĐỎ'}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#C8C2DC] tabular-nums">
                      Ratio {prediction.confidencePct}%
                    </span>
                  </div>
                </div>

                <div
                  data-testid="signal-countdown"
                  className="font-mono text-2xl font-extrabold text-[#F5F3FF] tabular-nums"
                >
                  {market.secondsRemaining}s
                </div>
              </div>
            ) : (
              /* Betting Phase — Signal Ready */
              <div className="mt-3 flex flex-col items-center">
                <p className="text-lg font-bold text-[#DDD6FE]">Hãy vào lệnh</p>

                <div className="my-4 relative">
                  <img
                    src={prediction.direction === 'BUY' ? signalBuyImg : signalSellImg}
                    alt={`Tín hiệu AI ${prediction.direction}`}
                    className={`mx-auto h-48 w-48 sm:h-52 sm:w-52 rounded-2xl object-cover transition-all duration-300 ${
                      prediction.direction === 'BUY'
                        ? 'ring-2 ring-[#34D399]/60 shadow-[0_12px_32px_rgba(16,185,129,0.28)]'
                        : 'ring-2 ring-[#FB7185]/60 shadow-[0_12px_32px_rgba(244,63,94,0.28)]'
                    }`}
                  />
                </div>

                <div
                  data-testid="signal-ratio"
                  className={`font-mono text-lg font-extrabold tabular-nums ${
                    prediction.direction === 'BUY' ? 'text-[#34D399]' : 'text-[#FB7185]'
                  }`}
                >
                  Ratio {prediction.confidencePct}%
                </div>
                <div
                  data-testid="signal-countdown"
                  className="mt-1 font-mono text-2xl font-extrabold text-[#F5F3FF] tabular-nums"
                >
                  {market.secondsRemaining}s
                </div>
              </div>
            )}

            {/* Dual-Color Live AI Ratio Bar (Xanh BUY vs Đỏ SELL) */}
            <div
              data-testid="ai-dual-ratio-bar"
              className="mx-auto mt-5 max-w-md rounded-xl border border-[#27223B] bg-[#161423] p-3 text-left"
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="inline-flex items-center gap-1.5 text-[#34D399]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                  BUY (Xanh) {prediction.buyPct}%
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#FB7185]">
                  SELL (Đỏ) {prediction.sellPct}%
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" />
                </span>
              </div>
              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-[#28233C]">
                <div
                  style={{ width: `${prediction.buyPct}%` }}
                  className="h-full bg-gradient-to-r from-[#059669] to-[#34D399] transition-all duration-500"
                />
                <div
                  style={{ width: `${prediction.sellPct}%` }}
                  className="h-full bg-gradient-to-r from-[#FB7185] to-[#E11D48] transition-all duration-500"
                />
              </div>

              {historicalAccuracy.length > 0 && (
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#27223B] pt-2">
                  <span className="text-[11px] font-semibold text-[#958CB3]">
                    Chuỗi tín hiệu AI ({recentBuySignals} Xanh · {recentSellSignals} Đỏ):
                  </span>
                  <div
                    data-testid="ai-recent-signals-strip"
                    className="flex items-center gap-1"
                  >
                    {historicalAccuracy.map((h) => (
                      <span
                        key={h.roundId}
                        title={`Phiên #${h.roundId}: AI ${h.predicted} (${h.confidencePct}%) · Kết quả ${h.actual}`}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-black text-white ${
                          h.predicted === 'BUY' ? 'bg-[#059669]' : 'bg-[#E11D48]'
                        }`}
                      >
                        {h.predicted === 'BUY' ? 'B' : 'S'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Quick Order Execution Card with LIVE / DEMO Corner Ribbon */}
          <section className="relative overflow-hidden rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40 space-y-4">
            {/* Diagonal Corner Ribbon (LIVE / DEMO) */}
            <div
              aria-label={`Chế độ ${accountMode.toUpperCase()}`}
              className={`pointer-events-none absolute -right-8 top-3.5 w-28 rotate-45 py-1 text-center font-mono text-[10px] font-black tracking-widest shadow-md ${
                accountMode === 'live'
                  ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white'
                  : 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24]'
              }`}
            >
              {accountMode === 'live' ? 'LIVE' : 'DEMO'}
            </div>

            <div>
              <label
                htmlFor="qi-follow-stake"
                className="mb-2 block text-sm font-bold text-[#F5F3FF]"
              >
                Gói theo dõi đang chạy:
              </label>
              <input
                id="qi-follow-stake"
                type="number"
                min={1}
                step="any"
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full rounded-xl border border-[#2F2947] bg-[#0D0C14] px-4 py-3 font-mono text-base font-bold text-[#F5F3FF] focus:border-[#C4B5FD] focus:outline-none"
              />
            </div>

            {/* Hệ số nhân: 1X | 2X | 4X | 8X | 10X */}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-[#F5F3FF]">Hệ số nhân</span>
                <span className="font-mono text-xs font-bold text-[#C4B5FD] tabular-nums">
                  Lệnh: ${effectiveOrderAmount.toFixed(2)}
                </span>
              </div>
              <div
                role="group"
                aria-label="Chọn hệ số nhân"
                className="grid grid-cols-5 overflow-hidden rounded-xl border border-[#27223B] bg-[#161423]"
              >
                {MULTIPLIERS.map((m) => {
                  const active = multiplier === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMultiplier(m)}
                      className={`min-h-[44px] border-r last:border-r-0 border-[#27223B] font-mono text-sm font-extrabold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#C4B5FD] text-[#140E24]'
                          : 'text-[#C8C2DC] hover:bg-[#231F38] hover:text-[#F5F3FF]'
                      }`}
                    >
                      {m}X
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thời gian giao dịch & Gợi ý lệnh AI */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-[#F5F3FF]">Thời gian giao dịch:</span>
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-black ${
                    prediction.direction === 'BUY'
                      ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                      : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
                  }`}
                >
                  AI: {prediction.direction === 'BUY' ? 'BUY (Xanh)' : 'SELL (Đỏ)'}
                </span>
                <span className="font-mono text-base font-extrabold text-[#34D399] tabular-nums">
                  {market.secondsRemaining}s
                </span>
              </div>
            </div>

            {/* Dual Sell / Buy Action Buttons (Active AI direction highlighted clearly) */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleQuickOrder('SELL')}
                className={`relative min-h-[46px] rounded-xl px-4 py-3 text-base font-extrabold text-white transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer ${
                  prediction.direction === 'SELL'
                    ? 'bg-[#E11D48] hover:bg-[#F43F5E] ring-2 ring-[#FB7185]/70 shadow-lg shadow-rose-500/25'
                    : 'bg-[#E11D48]/80 hover:bg-[#E11D48] shadow-sm shadow-rose-500/15'
                }`}
              >
                <span>{submitting === 'SELL' ? 'Đang gửi...' : 'Sell'}</span>
                {prediction.direction === 'SELL' && (
                  <span className="ml-1.5 rounded bg-white/25 px-1.5 py-0.5 font-mono text-[10px] font-black align-middle">
                    AI
                  </span>
                )}
              </button>
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleQuickOrder('BUY')}
                className={`relative min-h-[46px] rounded-xl px-4 py-3 text-base font-extrabold text-white transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer ${
                  prediction.direction === 'BUY'
                    ? 'bg-[#059669] hover:bg-[#10B981] ring-2 ring-[#34D399]/70 shadow-lg shadow-emerald-500/25'
                    : 'bg-[#059669]/80 hover:bg-[#059669] shadow-sm shadow-emerald-500/15'
                }`}
              >
                <span>{submitting === 'BUY' ? 'Đang gửi...' : 'Buy'}</span>
                {prediction.direction === 'BUY' && (
                  <span className="ml-1.5 rounded bg-white/25 px-1.5 py-0.5 font-mono text-[10px] font-black align-middle">
                    AI
                  </span>
                )}
              </button>
            </div>

            {orderFeedback && (
              <div
                role="status"
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                  orderFeedback.type === 'ok'
                    ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                    : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
                }`}
              >
                {orderFeedback.text}
              </div>
            )}

            {/* Chế độ chuyên gia Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={expertMode}
                  aria-label="Chế độ chuyên gia"
                  onClick={() => setExpertMode((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    expertMode ? 'bg-[#C4B5FD]' : 'bg-[#2B2542]'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full shadow-xs transition-transform ${
                      expertMode ? 'translate-x-5.5 bg-[#140E24]' : 'translate-x-1 bg-[#E5E0F5]'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold text-[#F5F3FF]">
                  Chế độ chuyên gia
                </span>
              </div>

              {expertMode && (
                <button
                  type="button"
                  disabled={geminiLoading}
                  onClick={handleRunGeminiDeepPredict}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C4B5FD]/40 bg-[#1B1630] hover:bg-[#261F3D] px-3 py-1.5 text-xs font-bold text-[#DDD6FE] transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {geminiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                  )}
                  <span>{geminiLoading ? 'Đang phân tích...' : 'Phân tích AI sâu'}</span>
                </button>
              )}
            </div>

            {/* Expert Mode Technical 5-Factor Matrix + Gemini Result */}
            {expertMode && (
              <div className="mt-2 space-y-3 border-t border-[#27223B] pt-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#F5F3FF]">
                    <Cpu className="h-3.5 w-3.5 text-[#C4B5FD]" />
                    Ma trận 5 chỉ báo định lượng
                  </span>
                  <span className="font-mono text-[11px] text-[#958CB3] tabular-nums">
                    Hỗ trợ ${prediction.supportPrice.toLocaleString()} · Kháng cự $
                    {prediction.resistancePrice.toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-[#C8C2DC] leading-relaxed">
                  {prediction.summaryVi}
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {prediction.factors.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#161423] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-[#F5F3FF] truncate">{f.nameVi}</div>
                        <div className="text-[10px] text-[#958CB3] truncate">{f.noteVi}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                            f.vote === 'BUY'
                              ? 'border border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                              : f.vote === 'SELL'
                              ? 'border border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
                              : 'border border-[#2F2947] bg-[#231F38] text-[#C8C2DC]'
                          }`}
                        >
                          {f.vote}
                        </span>
                        <div className="mt-0.5 font-mono text-[10px] text-[#958CB3] tabular-nums">
                          {f.valueLabel}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {historicalAccuracy.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#161423] px-3 py-2 text-xs">
                    <span className="font-semibold text-[#958CB3]">
                      8 phiên gần nhất:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {historicalAccuracy.map((h) => (
                        <span
                          key={h.roundId}
                          title={`#${h.roundId}: Dự đoán ${h.predicted} / Thực tế ${h.actual}`}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-black ${
                            h.hit
                              ? 'bg-emerald-500/15 text-[#34D399] border border-emerald-400/35'
                              : 'bg-rose-500/15 text-[#FB7185] border border-rose-400/35'
                          }`}
                        >
                          {h.hit ? '✓' : '✕'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {geminiError && (
                  <div className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-[#FB7185]">
                    {geminiError}
                  </div>
                )}

                {geminiResult && (
                  <div
                    data-testid="quickinvest-gemini-result"
                    className="rounded-xl border border-[#C4B5FD]/40 bg-[#1B1630] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#DDD6FE]">
                        <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                        Nhận định AI Chuyên Sâu
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[11px] font-black ${
                          geminiResult.direction === 'BUY'
                            ? 'border border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
                            : 'border border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
                        }`}
                      >
                        {geminiResult.direction} · {geminiResult.confidencePct}%
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#F5F3FF]">{geminiResult.headline}</div>
                    <p className="text-xs text-[#C8C2DC] leading-relaxed">
                      {geminiResult.analysis}
                    </p>
                    <div className="text-[11px] font-medium text-amber-300">{geminiResult.riskNote}</div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (5 cols on desktop): Quá trình đầu tư */}
        <section className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-[#F5F3FF]">
              Quá trình đầu tư
            </h2>
            {(recentSessionTrades.length > 0 || botLogs.length > 0) && (
              <span className="font-mono text-xs font-bold text-[#958CB3] tabular-nums">
                {recentSessionTrades.length} lệnh
              </span>
            )}
          </div>

          {recentSessionTrades.length === 0 && botLogs.length === 0 ? (
            <div className="py-10 text-center">
              <img
                src={emptyGardenImg}
                alt="Minh họa chưa có quá trình đầu tư"
                className="mx-auto h-52 w-52 rounded-2xl object-cover ring-1 ring-[#2F2947] shadow-xl shadow-black/60"
              />
              <p className="mt-4 text-sm font-semibold text-[#958CB3]">
                Không có dữ liệu để hiển thị
              </p>
            </div>
          ) : (
            <div
              data-testid="quickinvest-signal-history"
              className="mt-4 space-y-2.5 max-h-[540px] overflow-y-auto pr-0.5"
            >
              {recentSessionTrades.map((ord) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#161423] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        ord.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-[#34D399]'
                          : 'bg-rose-500/15 text-[#FB7185]'
                      }`}
                    >
                      {ord.direction === 'BUY' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-[#F5F3FF]">
                        <span>{ord.direction}</span>
                        <span className="font-mono text-[#958CB3]">#{ord.roundId}</span>
                        <span className="rounded bg-[#261F3D] px-1.5 py-0.5 text-[10px] uppercase text-[#DDD6FE]">
                          {ord.source}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#958CB3] tabular-nums">
                        Vốn ${ord.amount.toFixed(2)} · Entry ${ord.entryPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    {ord.status === 'OPEN' ? (
                      <span className="rounded border border-amber-400/35 bg-amber-400/12 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                        ĐANG MỞ
                      </span>
                    ) : ord.status === 'WON' ? (
                      <span className="font-extrabold text-[#34D399]">
                        +${ord.pnl.toFixed(2)}
                      </span>
                    ) : ord.status === 'DRAW' ? (
                      <span className="font-bold text-[#958CB3]">$0.00</span>
                    ) : (
                      <span className="font-extrabold text-[#FB7185]">
                        -${Math.abs(ord.pnl).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
