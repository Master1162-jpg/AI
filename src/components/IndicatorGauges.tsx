import React, { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { computeIndicatorGauges } from '../lib/tradingEngine';
import type { Candle, IndicatorGaugeReading, Language } from '../types';

interface IndicatorGaugesProps {
  candles: Candle[];
  lang: Language;
}

type GaugeKey = 'oscillators' | 'summary' | 'movingAverages';

interface SingleGaugeProps {
  title: string;
  reading: IndicatorGaugeReading;
  featured?: boolean;
  isHelpActive: boolean;
  onToggleHelp: () => void;
  testId: string;
}

const SingleSpeedometerGauge: React.FC<SingleGaugeProps> = ({
  title,
  reading,
  featured = false,
  isHelpActive,
  onToggleHelp,
  testId,
}) => {
  const uid = useId().replace(/:/g, '');
  const arcGradId = `indArc-${uid}`;
  const domeGradId = `indDome-${uid}`;
  const needleGradId = `indNeedle-${uid}`;

  const vbW = 140;
  const vbH = 78;
  const cx = 70;
  const cy = 72;
  const radius = 58;

  // 4 inner segment divider ticks splitting the 180° arc into 5 zones (Strong Sell .. Strong Buy)
  const dividerAnglesDeg = [-54, -18, 18, 54];
  const tickInnerR = radius - (featured ? 7.5 : 5.5);
  const tickOuterR = radius - 1.5;

  const ticks = dividerAnglesDeg.map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x1: cx + Math.cos(rad) * tickInnerR,
      y1: cy + Math.sin(rad) * tickInnerR,
      x2: cx + Math.cos(rad) * tickOuterR,
      y2: cy + Math.sin(rad) * tickOuterR,
    };
  });

  // Subtle colored dome tint aligned toward active signal zone
  const rimTintColor =
    reading.score <= -0.18
      ? 'rgba(244, 63, 94, 0.22)'
      : reading.score >= 0.18
      ? 'rgba(16, 185, 129, 0.22)'
      : 'rgba(196, 181, 253, 0.22)';

  return (
    <div
      data-testid={testId}
      className={`flex min-w-0 flex-col items-center ${
        featured ? '-mt-2 sm:-mt-3' : 'mt-2 sm:mt-3'
      }`}
    >
      {/* Header label + circular "?" icon button */}
      <div className="mb-1.5 sm:mb-2 flex items-center justify-center gap-1 whitespace-nowrap">
        <span
          className={`font-bold tracking-tight text-[#F5F3FF] ${
            featured ? 'text-[11px] sm:text-sm' : 'text-[10px] sm:text-xs'
          }`}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={onToggleHelp}
          aria-label={`Thông tin ${title}`}
          aria-expanded={isHelpActive}
          className={`flex h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 items-center justify-center rounded-full border text-[9px] sm:text-[10px] font-bold leading-none transition-colors cursor-pointer ${
            isHelpActive
              ? 'border-[#C4B5FD] bg-[#292144] text-[#DDD6FE]'
              : 'border-[#3B3259] text-[#C4B5FD] hover:border-[#C4B5FD] hover:bg-[#1E1933]'
          }`}
        >
          ?
        </button>
      </div>

      {/* Semicircular Speedometer SVG */}
      <div
        className={`relative w-full ${
          featured
            ? 'max-w-[126px] sm:max-w-[168px]'
            : 'max-w-[92px] sm:max-w-[128px]'
        }`}
      >
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`${title}: ${reading.label}`}
        >
          <defs>
            {/* 5-Zone Smooth Arc Gradient: Crimson -> Rose -> Light Purple -> Mint -> Emerald */}
            <linearGradient id={arcGradId} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="28%" stopColor="#FB7185" />
              <stop offset="50%" stopColor="#C4B5FD" />
              <stop offset="72%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            {/* Inner Soft Radial Dome Shading for Obsidian Surface */}
            <linearGradient id={domeGradId} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={rimTintColor} />
              <stop offset="58%" stopColor="rgba(196, 181, 253, 0.08)" />
              <stop offset="100%" stopColor="rgba(17, 17, 24, 0)" />
            </linearGradient>

            {/* Luminous White-to-Light-Purple Tapered Needle Gradient */}
            <linearGradient id={needleGradId} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="55%" stopColor="#DDD6FE" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.22" />
            </linearGradient>
          </defs>

          {/* Subtle Inner Semicircle Dome */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy} Z`}
            fill={`url(#${domeGradId})`}
          />

          {/* Outer Colored Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#${arcGradId})`}
            strokeWidth={featured ? 3.2 : 2.6}
            strokeLinecap="round"
          />

          {/* Crisp Segment Divider Tick Marks along Inner Rim */}
          {ticks.map((tk, idx) => (
            <line
              key={idx}
              x1={tk.x1}
              y1={tk.y1}
              x2={tk.x2}
              y2={tk.y2}
              stroke="#111118"
              strokeWidth={featured ? 2.1 : 1.6}
              strokeOpacity="0.95"
            />
          ))}

          {/* Tapered Needle smoothly rotating around (cx, cy) */}
          <g
            style={{
              transform: `rotate(${reading.angleDeg}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <path
              d={
                featured
                  ? `M ${cx - 3.6} ${cy} L ${cx - 1.5} ${cy - 44} Q ${cx} ${cy - 48} ${cx + 1.5} ${cy - 44} L ${cx + 3.6} ${cy} Z`
                  : `M ${cx - 3.2} ${cy} L ${cx - 1.35} ${cy - 41} Q ${cx} ${cy - 45} ${cx + 1.35} ${cy - 41} L ${cx + 3.2} ${cy} Z`
              }
              fill={`url(#${needleGradId})`}
            />
          </g>
        </svg>
      </div>

      {/* Crisp Signal Label Centered Beneath Baseline */}
      <div
        className={`mt-1 text-center font-extrabold uppercase tracking-wide ${
          reading.score <= -0.18
            ? 'text-[#FB7185]'
            : reading.score >= 0.18
            ? 'text-[#34D399]'
            : 'text-[#DDD6FE]'
        } ${featured ? 'text-[11px] sm:text-xs' : 'text-[10px] sm:text-xs'}`}
      >
        {reading.label}
      </div>
    </div>
  );
};

export const IndicatorGauges: React.FC<IndicatorGaugesProps> = ({ candles, lang }) => {
  const [activeHelp, setActiveHelp] = useState<GaugeKey | null>(null);
  const isVi = lang === 'vi';
  const gauges = useMemo(() => computeIndicatorGauges(candles), [candles]);

  const toggleHelp = (key: GaugeKey) => {
    setActiveHelp((prev) => (prev === key ? null : key));
  };

  const helpContent: Record<
    GaugeKey,
    { title: string; desc: string; reading: IndicatorGaugeReading; metrics: string }
  > = {
    oscillators: {
      title: 'Oscillators',
      desc: isVi
        ? 'Tổng hợp 6 chỉ báo dao động (RSI 14, MACD, Stochastic, CCI, Momentum, Williams %R) đo động lượng ngắn hạn.'
        : 'Aggregates 6 momentum oscillators (RSI 14, MACD, Stochastic, CCI, Momentum, Williams %R).',
      reading: gauges.oscillators,
      metrics: `RSI(14): ${gauges.rsi14} · MACD: ${gauges.macd} / ${gauges.macdSignal}`,
    },
    summary: {
      title: 'Summary',
      desc: isVi
        ? 'Tín hiệu đồng thuận tổng hợp từ toàn bộ 12 chỉ báo kỹ thuật (Dao động + Đường trung bình động) theo thời gian thực.'
        : 'Master consensus signal combining all 12 real-time Oscillators & Moving Averages.',
      reading: gauges.summary,
      metrics: `EMA5: ${gauges.ema5} · RSI(14): ${gauges.rsi14}`,
    },
    movingAverages: {
      title: 'Moving Averages',
      desc: isVi
        ? 'So sánh giá BTC/USDT hiện tại với 6 đường trung bình động (EMA 5/10/20 & SMA 5/10/20) để xác định xu hướng.'
        : 'Compares live BTC/USDT price against 6 moving averages (EMA 5/10/20 & SMA 5/10/20).',
      reading: gauges.movingAverages,
      metrics: `EMA5: ${gauges.ema5} · EMA10: ${gauges.ema10} · EMA20: ${gauges.ema20}`,
    },
  };

  return (
    <div className="pt-2 pb-1">
      {/* Strictly Horizontal 3-Column Gauge Cockpit */}
      <div
        data-testid="indicators-gauges-row"
        className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-1 sm:gap-6"
      >
        <SingleSpeedometerGauge
          title="Oscillators"
          reading={gauges.oscillators}
          isHelpActive={activeHelp === 'oscillators'}
          onToggleHelp={() => toggleHelp('oscillators')}
          testId="gauge-oscillators"
        />

        <SingleSpeedometerGauge
          title="Summary"
          reading={gauges.summary}
          featured
          isHelpActive={activeHelp === 'summary'}
          onToggleHelp={() => toggleHelp('summary')}
          testId="gauge-summary"
        />

        <SingleSpeedometerGauge
          title="Moving Averages"
          reading={gauges.movingAverages}
          isHelpActive={activeHelp === 'movingAverages'}
          onToggleHelp={() => toggleHelp('movingAverages')}
          testId="gauge-moving-averages"
        />
      </div>

      {/* Optional Compact On-Demand Info Drawer when user clicks "?" */}
      {activeHelp && (
        <div
          data-testid="indicator-help-popover"
          className="mx-auto mt-3 max-w-2xl rounded-lg border border-[#2F2947] bg-[#161423] px-3.5 py-2.5 text-xs text-[#C8C2DC]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 font-bold text-[#F5F3FF]">
                <span>{helpContent[activeHelp].title}</span>
                <span className="text-[11px] font-semibold text-[#FB7185]">
                  {isVi ? 'Bán' : 'Sell'}: {helpContent[activeHelp].reading.sellCount}
                </span>
                <span className="text-[11px] font-semibold text-[#958CB3]">
                  {isVi ? 'Trung lập' : 'Neutral'}: {helpContent[activeHelp].reading.neutralCount}
                </span>
                <span className="text-[11px] font-semibold text-[#34D399]">
                  {isVi ? 'Mua' : 'Buy'}: {helpContent[activeHelp].reading.buyCount}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#C8C2DC]">
                {helpContent[activeHelp].desc}
              </p>
              <div className="font-mono text-[11px] font-semibold text-[#C4B5FD]">
                {helpContent[activeHelp].metrics}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveHelp(null)}
              aria-label="Đóng chú thích chỉ báo"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
