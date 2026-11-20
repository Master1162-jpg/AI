import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Lock,
  Mail,
  QrCode,
  Send,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { COPY } from '../lib/i18n';
import type { Language } from '../types';
import type { AuthMode } from './AuthDrawer';

interface LandingPageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onOpenAuth: (mode: AuthMode) => void;
}

const FAQS_VI = [
  {
    q: 'RaidenBO là gì?',
    a: 'RaidenBO là nền tảng đầu tư tài sản số chuyên sâu cặp BTC/USDT, tích hợp biểu đồ nến 30s trực quan, hệ thống Bot AI tự động, chuyển tiền nội bộ 0 phí và ví USDT tạo mã QR tự động.',
  },
  {
    q: 'RaidenBO có minh bạch và an toàn không?',
    a: 'Mọi giao dịch được mã hóa, bảo vệ bởi xác thực 2 lớp (2FA) và định danh KYC. Tuy nhiên, như mọi hình thức đầu tư tài sản số khác, thị trường luôn tiềm ẩn rủi ro biến động — bạn nên trải nghiệm tài khoản Demo $1,000 trước khi đầu tư vốn thực.',
  },
  {
    q: 'Bot AI trên RaidenBO hoạt động như thế nào?',
    a: 'Bot AI hỗ trợ nhiều chiến lược thông minh (AI Dự Đoán, EMA + RSI, Martingale Pro, Fibonacci, Theo xu hướng) kèm ngưỡng Chốt lời (Take Profit) và Cắt lỗ (Stop Loss) tự động trên cả ví Demo và ví Thực.',
  },
  {
    q: 'Chuyển tiền nội bộ và nạp USDT qua QR có mất phí không?',
    a: 'Chuyển tiền nội bộ giữa các tài khoản RaidenBO hoàn toàn miễn phí (0%) và xử lý tức thì theo Email hoặc Biệt danh. Nạp USDT qua mã QR tự sinh từ địa chỉ ví cá nhân cũng hoàn toàn 0 phí nạp.',
  },
  {
    q: 'Tài khoản VIP và tài khoản thử nghiệm $1,000 dùng để làm gì?',
    a: 'Tài khoản thử nghiệm tặng miễn phí $1,000 để làm quen giao diện và thử nghiệm chiến lược Bot AI không rủi ro. Tài khoản VIP (phí kích hoạt 100 USDT) mở khóa chương trình hoa hồng Affiliate nhiều cấp.',
  },
];

const FAQS_EN = [
  {
    q: 'What is RaidenBO?',
    a: 'RaidenBO is a next-generation digital asset trading platform focused exclusively on BTC/USDT with real-time candlestick indicators, automated AI Trading Bots, instant zero-fee internal transfers, and auto-generated USDT QR wallets.',
  },
  {
    q: 'How secure is RaidenBO?',
    a: 'All accounts are protected by 2FA security, KYC verification, and encrypted order execution. Digital asset options carry high volatility risk, so we provide a free $1,000 Demo account to test strategies before trading live.',
  },
  {
    q: 'How does the AI Trading Bot work?',
    a: 'Our AI Bot supports automated strategies (AI Predict, EMA+RSI, Martingale Pro, Fibonacci, Trend Follow) with automatic Take Profit and Stop Loss guardrails on both Demo and Live balances.',
  },
  {
    q: 'Are internal transfers and QR deposits free?',
    a: 'Internal USDT transfers between RaidenBO accounts are 100% free (0% fee) and settle instantly. USDT deposits via your auto-generated wallet QR code also carry zero deposit fee.',
  },
  {
    q: 'What are the VIP and $1,000 Demo accounts for?',
    a: 'Every new account receives $1,000 in unlimited Demo funds to practice BTC/USDT trading. Upgrading to VIP (100 USDT) unlocks multi-tier Affiliate commission payouts.',
  },
];

const HERO_CANDLES = [
  { x: 18, o: 68, c: 56, h: 48, l: 74, up: true },
  { x: 34, o: 56, c: 63, h: 52, l: 70, up: false },
  { x: 50, o: 63, c: 52, h: 45, l: 68, up: true },
  { x: 66, o: 52, c: 44, h: 38, l: 58, up: true },
  { x: 82, o: 44, c: 54, h: 40, l: 61, up: false },
  { x: 98, o: 54, c: 47, h: 42, l: 59, up: true },
  { x: 114, o: 47, c: 39, h: 32, l: 52, up: true },
  { x: 130, o: 39, c: 48, h: 35, l: 55, up: false },
  { x: 146, o: 48, c: 36, h: 29, l: 51, up: true },
  { x: 162, o: 36, c: 30, h: 24, l: 42, up: true },
  { x: 178, o: 30, c: 37, h: 26, l: 44, up: false },
  { x: 194, o: 37, c: 25, h: 18, l: 40, up: true },
  { x: 210, o: 25, c: 19, h: 13, l: 30, up: true },
];

const HERO_DOTS = [
  1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1,
  1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1,
  0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0,
];

const RaidenHeroPreview: React.FC<{ isVi: boolean }> = ({ isVi }) => (
  <div className="relative w-full max-w-[620px] rounded-3xl border border-[#C4B5FD]/25 bg-gradient-to-br from-[#19142B] via-[#111118] to-[#0D0C14] p-4 sm:p-5 shadow-2xl shadow-black/70">
    {/* Desktop RaidenBO Obsidian & Light-Purple Terminal Mockup */}
    <div className="overflow-hidden rounded-2xl border border-[#2C2545] bg-[#0B0A11] shadow-xl shadow-black/60">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#251F3A] bg-[#111118] px-3.5 py-2">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center rounded-md border border-[#C4B5FD]/35 bg-[#1E1835] px-2 py-0.5 font-mono text-[10px] font-bold text-[#DDD6FE]">
            Prize $27.7k
          </span>
          <span className="rounded-md border border-[#2F2947] bg-[#181625] px-2 py-0.5 font-mono text-[10px] font-bold text-[#34D399]">
            $1,000.00
          </span>
          <span className="rounded-md bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-2 py-0.5 text-[10px] font-extrabold text-[#140E24]">
            {isVi ? 'Nạp tiền' : 'Deposit'}
          </span>
        </div>
      </div>

      {/* Main Split: Chart + Right Trade Ticket */}
      <div className="grid grid-cols-12 gap-2.5 p-3">
        <div className="col-span-8 space-y-2.5">
          {/* Candlestick Canvas Card */}
          <div className="relative overflow-hidden rounded-xl border border-[#27223B] bg-[#0D0C13] p-2.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#2F2947] bg-[#181625] px-2 py-0.5 font-bold text-[#F5F3FF]">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                BTC/USDT
              </span>
              <span className="rounded bg-[#C4B5FD] px-1.5 py-0.5 font-mono font-extrabold text-[#140E24] tabular-nums">
                95,240.64
              </span>
            </div>

            <div className="relative mt-1.5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-xl font-black tracking-[0.22em] text-[#C4B5FD]/10 select-none"
              >
                RAIDENBO
              </div>
              <svg viewBox="0 0 236 96" className="h-32 sm:h-36 w-full" aria-hidden="true">
                {[20, 44, 68].map((y) => (
                  <line
                    key={y}
                    x1="6"
                    y1={y}
                    x2="230"
                    y2={y}
                    stroke="#241E3A"
                    strokeDasharray="3 3"
                    strokeWidth="0.9"
                  />
                ))}
                <path
                  d="M 18 64 Q 66 48 114 43 T 210 22"
                  fill="none"
                  stroke="#C4B5FD"
                  strokeWidth="1.6"
                />
                <path
                  d="M 18 70 Q 66 56 114 50 T 210 31"
                  fill="none"
                  stroke="#F472B6"
                  strokeWidth="1.3"
                  strokeOpacity="0.85"
                />
                {HERO_CANDLES.map((c) => {
                  const top = Math.min(c.o, c.c);
                  const h = Math.max(4, Math.abs(c.c - c.o));
                  const fill = c.up ? '#10B981' : '#F43F5E';
                  return (
                    <g key={c.x}>
                      <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={fill} strokeWidth="1.3" />
                      <rect x={c.x - 4} y={top} width="8" height={h} rx="1.5" fill={fill} />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Waterdrop Strip */}
          <div className="rounded-xl border border-[#27223B] bg-[#111118] p-2">
            <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold text-[#958CB3]">
              <span>{isVi ? 'Bảng Giọt Nước' : 'Last Results'}</span>
              <span className="font-mono text-[#34D399]">
                ▲ 41 · <span className="text-[#FB7185]">▼ 32</span>
              </span>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {HERO_DOTS.map((d, i) => (
                <span
                  key={i}
                  className={`mx-auto h-2.5 w-2.5 rounded-full ${
                    d ? 'bg-[#10B981]' : 'bg-[#F43F5E]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Ticket */}
        <div className="col-span-4 flex flex-col justify-between rounded-xl border border-[#27223B] bg-[#111118] p-2.5">
          <div className="space-y-1.5 text-center">
            <div className="rounded-lg border border-[#2F2947] bg-[#181625] py-1 font-mono text-xs font-extrabold text-[#F5F3FF]">
              $ 10
            </div>
            <div className="text-[9px] font-semibold text-[#958CB3]">
              {isVi ? 'Lợi nhuận 95%' : 'Profit 95%'}
            </div>
            <div className="font-mono text-base font-black text-[#34D399]">+$19.50</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#241F38] flex">
              <span className="h-full w-[72%] bg-[#10B981]" />
              <span className="h-full w-[28%] bg-[#F43F5E]" />
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="rounded-lg bg-[#059669] py-2 text-center text-[11px] font-extrabold text-white shadow-xs">
              {isVi ? 'MUA ↗' : 'BUY ↗'}
            </div>
            <div className="rounded-lg border border-[#2F2947] bg-[#181625] py-1 text-center font-mono text-[10px] font-extrabold text-[#DDD6FE]">
              24s
            </div>
            <div className="rounded-lg bg-[#E11D48] py-2 text-center text-[11px] font-extrabold text-white shadow-xs">
              {isVi ? 'BÁN ↘' : 'SELL ↘'}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Floating Mobile RaidenBO Companion Card */}
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#C4B5FD]/25 bg-[#14131E] px-4 py-2.5 shadow-lg shadow-black/50">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#DDD6FE] to-[#A78BFA] text-[#140E24] font-mono text-xs font-black shadow-xs">
          AI
        </span>
        <div>
          <div className="text-xs font-extrabold text-[#F5F3FF]">
            RaidenBO QuickInvest Engine
          </div>
          <div className="text-[11px] text-[#958CB3]">
            {isVi ? 'Đồng bộ Web & Mobile · Tín hiệu AI 2 chiều' : 'Web & Mobile Sync · 2-Way AI Signal'}
          </div>
        </div>
      </div>
      <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] font-extrabold text-[#34D399] shrink-0">
        BUY 78%
      </span>
    </div>
  </div>
);

const RaidenIndicatorsPreview: React.FC<{ isVi: boolean }> = ({ isVi }) => (
  <div className="rounded-3xl border border-[#27223B] bg-[#111118] p-4 sm:p-5 shadow-xl shadow-black/50 space-y-4">
    <div className="flex items-center justify-between border-b border-[#251F3A] pb-3">
      <BrandLogo size="sm" />
      <span className="rounded-lg border border-[#C4B5FD]/30 bg-[#1B172C] px-2.5 py-1 font-mono text-[11px] font-bold text-[#DDD6FE]">
        BTC/USDT · 30s
      </span>
    </div>

    {/* 3 Dark-Obsidian & Light-Purple Speedometer Indicator Gauges */}
    <div className="grid grid-cols-3 gap-2.5">
      {[
        { label: isVi ? 'Dao động' : 'Oscillators', status: isVi ? 'Mua' : 'Buy', rot: 36, color: '#34D399' },
        { label: isVi ? 'Tổng hợp' : 'Summary', status: isVi ? 'Mua mạnh' : 'Strong Buy', rot: 56, color: '#34D399' },
        { label: isVi ? 'Trung bình' : 'Moving Avg', status: isVi ? 'Mua mạnh' : 'Strong Buy', rot: 48, color: '#C4B5FD' },
      ].map((g) => (
        <div
          key={g.label}
          className="rounded-xl border border-[#27223B] bg-[#161423] px-2 py-3 text-center"
        >
          <div className="text-[10px] font-bold text-[#C8C2DC] truncate">{g.label}</div>
          <svg viewBox="0 0 100 58" className="mx-auto mt-1 h-12 w-22" aria-hidden="true">
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#28233C" strokeWidth="7" strokeLinecap="round" />
            <path d="M 10 50 A 40 40 0 0 1 34 14" fill="none" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" />
            <path d="M 66 14 A 40 40 0 0 1 90 50" fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round" />
            <g transform={`rotate(${g.rot} 50 50)`}>
              <line x1="50" y1="50" x2="50" y2="17" stroke="#DDD6FE" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <circle cx="50" cy="50" r="4" fill="#C4B5FD" />
          </svg>
          <div className="font-mono text-[10px] font-extrabold" style={{ color: g.color }}>
            {g.status}
          </div>
        </div>
      ))}
    </div>

    {/* 5-Factor Quantitative AI Matrix */}
    <div className="rounded-xl border border-[#27223B] bg-[#161423] p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="text-[#34D399]">BUY (Xanh) 76%</span>
        <span className="text-[#FB7185]">SELL (Đỏ) 24%</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#27223B]">
        <span className="h-full w-[76%] bg-[#10B981]" />
        <span className="h-full w-[24%] bg-[#F43F5E]" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[10px]">
        <div className="rounded-lg border border-[#27223B] bg-[#111118] px-2 py-1.5">
          <div className="text-[#958CB3]">EMA 5/10</div>
          <div className="font-extrabold text-[#34D399]">BULLISH</div>
        </div>
        <div className="rounded-lg border border-[#27223B] bg-[#111118] px-2 py-1.5">
          <div className="text-[#958CB3]">RSI (14)</div>
          <div className="font-extrabold text-[#C4B5FD]">58.4</div>
        </div>
        <div className="rounded-lg border border-[#27223B] bg-[#111118] px-2 py-1.5">
          <div className="text-[#958CB3]">MACD</div>
          <div className="font-extrabold text-[#34D399]">+14.2</div>
        </div>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ lang, onChangeLang, onOpenAuth }) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'risk' | null>(null);
  const t = COPY[lang];
  const isVi = lang === 'vi';
  const faqs = isVi ? FAQS_VI : FAQS_EN;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#09090D] text-[#F5F3FF]">
      {/* Top Navigation Bar - Clean 3-zone contract */}
      <header className="sticky top-0 z-40 border-b border-[#27223B] bg-[#0D0C14]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3">
          <a href="#top" className="shrink-0">
            <BrandLogo size="md" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#C8C2DC]">
            <a href="#indicators" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#DDD6FE]">
              {isVi ? 'Chỉ báo & Bot AI' : 'Indicators & AI Bot'}
            </a>
            <a href="#features" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#DDD6FE]">
              {isVi ? 'Tính năng' : 'Features'}
            </a>
            <a href="#steps" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#DDD6FE]">
              {isVi ? 'Bắt đầu' : 'Get Started'}
            </a>
            <a href="#faq" className="whitespace-nowrap shrink-0 transition-colors hover:text-[#DDD6FE]">
              {isVi ? 'Câu hỏi' : 'FAQ'}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-3 sm:px-4 py-2 text-xs sm:text-sm font-extrabold text-[#140E24] shadow-sm shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navRegister}
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="rounded-lg border border-[#C4B5FD]/35 bg-[#181625] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#DDD6FE] transition-colors hover:border-[#C4B5FD]/70 hover:bg-[#231F38] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.navLogin}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="relative overflow-hidden border-b border-[#27223B]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(196,181,253,0.14),transparent_52%),radial-gradient(ellipse_at_bottom_right,rgba(167,139,250,0.12),transparent_56%),linear-gradient(to_right,rgba(196,181,253,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(196,181,253,0.035)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,48px_48px,48px_48px]"
        />
        <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-6 px-4 sm:px-6 py-8 lg:grid-cols-12 lg:py-12">
          <div className="lg:col-span-6">
            <p className="text-xs font-bold tracking-wider text-[#C4B5FD]">
              {t.heroBadge} · BTC/USDT
            </p>
            <h1 className="mt-3.5 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-[#F5F3FF] sm:text-5xl lg:text-[54px] [text-wrap:balance]">
              {t.heroTitle1}{' '}
              <span className="block">{t.heroTitle2}</span>
              <span className="bg-gradient-to-r from-[#DDD6FE] via-[#C4B5FD] to-[#A78BFA] bg-clip-text text-transparent">
                {t.heroTitleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#C8C2DC]">
              {t.heroDesc}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-6 py-3.5 text-sm font-extrabold text-[#140E24] shadow-lg shadow-[#C4B5FD]/15 transition-transform hover:-translate-y-0.5 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                <span>{t.heroPrimaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#indicators"
                className="inline-flex items-center gap-2 rounded-xl border border-[#C4B5FD]/35 bg-[#14131E] px-5 py-3.5 text-sm font-semibold text-[#DDD6FE] transition-colors hover:border-[#C4B5FD]/70 hover:bg-[#1E1A30]"
              >
                <span>{t.heroSecondaryCta}</span>
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-[#958CB3]">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#C4B5FD]" />
                {t.trust2fa}
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#DDD6FE]" />
                {t.trustFast}
              </span>
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#A78BFA]" />
                {t.trustUsdt}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <RaidenHeroPreview isVi={isVi} />
          </div>
        </div>
      </section>

      {/* Section 2: Indicators & AI Bot Showcase */}
      <section
        id="indicators"
        className="relative bg-[radial-gradient(ellipse_at_left,rgba(196,181,253,0.08),transparent_55%)]"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 lg:py-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6 relative">
              <RaidenIndicatorsPreview isVi={isVi} />
              <div className="mt-3.5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#27223B] bg-[#111118] px-4 py-3 flex items-center gap-3 shadow-md shadow-black/40">
                  <TrendingUp className="h-5 w-5 text-[#C4B5FD] shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-bold text-[#F5F3FF]">24/7</div>
                    <div className="text-xs text-[#958CB3]">
                      {isVi ? 'Thị trường BTC/USDT' : 'BTC/USDT Market'}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#27223B] bg-[#111118] px-4 py-3 flex items-center gap-3 shadow-md shadow-black/40">
                  <Clock className="h-5 w-5 text-[#DDD6FE] shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-bold text-[#F5F3FF]">&lt; 1s</div>
                    <div className="text-xs text-[#958CB3]">
                      {isVi ? 'Độ trễ khớp lệnh' : 'Execution Latency'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <p className="text-xs font-bold tracking-wider text-[#C4B5FD]">
                {isVi ? 'Một nền tảng · Mọi công cụ' : 'One Platform · Every Tool'}
              </p>
              <h2 className="mt-2.5 font-display text-3xl font-extrabold text-[#F5F3FF] sm:text-4xl [text-wrap:balance]">
                {isVi ? 'Đầu tư thông minh với ' : 'Trade smarter with '}
                <span className="bg-gradient-to-r from-[#DDD6FE] to-[#A78BFA] bg-clip-text text-transparent">
                  {isVi ? 'chỉ báo & Bot AI tiên tiến' : 'advanced indicators & AI Bot'}
                </span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#C8C2DC]">
                {isVi
                  ? 'RaidenBO trang bị bộ chỉ báo kỹ thuật EMA, RSI, MACD, bảng giọt nước 5x4 trực quan cùng Bot AI tự động giúp bạn ra quyết định tự tin trong từng phiên BTC/USDT.'
                  : 'RaidenBO equips you with live EMA, RSI, MACD overlays, 5x4 Last Results matrix, and automated AI Bot strategies for confident BTC/USDT execution.'}
              </p>

              <ul className="mt-6 space-y-3.5 text-sm text-[#E5E0F5]">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C4B5FD]" />
                  <span>
                    {isVi
                      ? 'Biểu đồ nến 30s sắc nét độc quyền RaidenBO, tín hiệu đọc ngay trên màn hình'
                      : 'Signature RaidenBO 30s candlestick chart with live EMA crossovers'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C4B5FD]" />
                  <span>
                    {isVi
                      ? 'Bot AI tự động đặt lệnh theo EMA+RSI, Martingale, Fibonacci & quản lý TP/SL'
                      : 'Automated AI Bot supporting EMA+RSI, Martingale, Fibonacci & TP/SL'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C4B5FD]" />
                  <span>
                    {isVi
                      ? 'Chuyển tiền nội bộ 0% phí & nạp USDT qua mã QR tự sinh từ ví'
                      : 'Zero-fee internal transfers & auto-generated USDT wallet QR'}
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-6 py-3.5 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                <span>{isVi ? 'Bắt đầu miễn phí' : 'Start Free Now'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Bento Features Grid */}
      <section id="features" className="border-t border-[#27223B] bg-[#0D0C14] py-10 lg:py-12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-bold tracking-wider text-[#C4B5FD]">
              {isVi ? 'Vì sao chọn RaidenBO' : 'Why RaidenBO'}
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-extrabold text-[#F5F3FF] sm:text-4xl">
              {isVi ? 'Được xây dựng trên ' : 'Built on '}
              <span className="text-[#C4B5FD]">{isVi ? 'sự đột phá' : 'precision engineering'}</span>
            </h2>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Large Bento Card 1 */}
            <div className="md:col-span-7 rounded-2xl border border-[#27223B] bg-[#14131E] p-7 shadow-lg shadow-black/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C4B5FD]/25 bg-[#1E1933] text-[#DDD6FE]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-[#F5F3FF]">
                  {isVi ? 'Ổn định & Bảo mật đa tầng' : 'Multi-Layer Security & Uptime'}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#C8C2DC]">
                {isVi
                  ? 'RaidenBO vận hành ổn định 24/7 với cặp thanh khoản BTC/USDT. Tài sản của bạn được bảo vệ bởi xác thực 2 lớp (2FA), định danh KYC và hệ thống ví USDT riêng biệt.'
                  : 'RaidenBO operates 24/7 on BTC/USDT liquidity with 2FA protection, KYC verification, and dedicated USDT wallets.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#C8C2DC]">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#C4B5FD]" />
                  {isVi ? 'Xác thực 2 lớp (2FA)' : '2FA Authentication'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
                  {isVi ? 'Định danh KYC' : 'KYC Verification'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-[#DDD6FE]" />
                  {isVi ? 'QR Ví USDT tự sinh' : 'Auto Wallet QR'}
                </span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="md:col-span-5 rounded-2xl border border-[#27223B] bg-[#14131E] p-7 flex flex-col justify-between shadow-lg shadow-black/40">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C4B5FD]/25 bg-[#1E1933] text-[#DDD6FE]">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#F5F3FF]">
                    {isVi ? 'Bot AI Tự động 24/7' : 'Automated AI Bot'}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#C8C2DC]">
                  {isVi
                    ? 'Tự động hóa giao dịch BTC/USDT theo chỉ báo kỹ thuật và quản trị vốn thông minh với điểm dừng lỗ, chốt lời tự động.'
                    : 'Automate BTC/USDT orders with technical signal logic and disciplined TP/SL risk guardrails.'}
                </p>
              </div>
              <div className="mt-6 h-16 w-full rounded-xl bg-gradient-to-r from-[#1B1630] via-[#221B3D] to-[#171329] border border-[#C4B5FD]/25 flex items-center justify-between px-4">
                <span className="text-xs font-semibold text-[#DDD6FE]">EMA + RSI + Martingale</span>
                <span className="font-mono text-sm font-bold text-[#34D399]">+95% Payout</span>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="md:col-span-4 rounded-2xl border border-[#27223B] bg-[#14131E] p-6 shadow-lg shadow-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C4B5FD]/25 bg-[#1E1933] text-[#DDD6FE]">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-[#F5F3FF]">
                {isVi ? 'Chuyển tiền nội bộ & QR' : 'Internal Transfer & QR'}
              </h3>
              <p className="mt-2 text-sm text-[#958CB3]">
                {isVi
                  ? '0% phí chuyển tiền nội bộ giữa các tài khoản RaidenBO. Mã QR tự sinh tức thì từ địa chỉ ví.'
                  : '0% fee internal transfers between RaidenBO accounts and instant auto-generated QR deposit codes.'}
              </p>
            </div>

            {/* Bento Card 4 */}
            <div className="md:col-span-4 rounded-2xl border border-[#27223B] bg-[#14131E] p-6 shadow-lg shadow-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-[#F5F3FF]">
                {isVi ? 'Giới thiệu & Kiếm tiền VIP' : 'VIP & Affiliate Network'}
              </h3>
              <p className="mt-2 text-sm text-[#958CB3]">
                {isVi
                  ? 'Nhận hoa hồng nhiều cấp khi bạn bè giao dịch BTC/USDT qua hệ thống Affiliate của RaidenBO.'
                  : 'Earn multi-tier referral commissions when your network trades BTC/USDT on RaidenBO.'}
              </p>
            </div>

            {/* Bento Card 5: KPIs */}
            <div className="md:col-span-4 rounded-2xl border border-[#27223B] bg-[#14131E] p-6 grid grid-cols-2 gap-4 shadow-lg shadow-black/40">
              <div>
                <div className="font-mono text-2xl font-bold text-[#F5F3FF]">30s</div>
                <div className="text-xs text-[#958CB3] mt-0.5">{isVi ? 'Chu kỳ mỗi phiên' : 'Round Cycle'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#34D399]">95%</div>
                <div className="text-xs text-[#958CB3] mt-0.5">{isVi ? 'Tỷ suất lợi nhuận' : 'Payout Rate'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#F5F3FF]">$1,000</div>
                <div className="text-xs text-[#958CB3] mt-0.5">{isVi ? 'Vốn thử miễn phí' : 'Free Demo Funds'}</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#C4B5FD]">BTC/USDT</div>
                <div className="text-xs text-[#958CB3] mt-0.5">{isVi ? 'Cặp chuyên sâu' : 'Focused Pair'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Networks Strip */}
      <section className="bg-gradient-to-r from-[#131022] via-[#1C1633] to-[#131022] py-6 border-y border-[#C4B5FD]/25">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-widest text-[#DDD6FE] uppercase">
            {isVi ? 'Được hỗ trợ bởi các mạng lưới hàng đầu' : 'Powered by Leading Blockchain Networks'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-lg shadow-black/50 ring-1 ring-[#C4B5FD]/30">
              <img
                src="/assets/aistudio/IMG_0043_f790f9ad.webp"
                alt="Binance Smart Chain"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-lg shadow-black/50 ring-1 ring-[#C4B5FD]/30">
              <img
                src="/assets/aistudio/IMG_0044_18e7f01e.webp"
                alt="Bitcoin"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
            <div className="flex h-13 w-42 items-center justify-center rounded-xl bg-white px-4 py-2 shadow-lg shadow-black/50 ring-1 ring-[#C4B5FD]/30">
              <img
                src="/assets/aistudio/IMG_0045_b33025a5.webp"
                alt="Tether USDT"
                referrerPolicy="no-referrer"
                className="max-h-9 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 3 Steps */}
      <section id="steps" className="mx-auto max-w-[1280px] px-4 sm:px-6 py-10 lg:py-12">
        <h2 className="text-center font-display text-3xl font-extrabold text-[#F5F3FF] sm:text-4xl">
          {isVi ? 'Bắt đầu chỉ sau ' : 'Start trading in '}
          <span className="text-[#C4B5FD]">{isVi ? '5 phút' : '5 minutes'}</span>
        </h2>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: '1',
              icon: UserPlus,
              title: isVi ? 'Đăng ký RaidenBO' : 'Register RaidenBO',
              desc: isVi
                ? 'Tạo tài khoản miễn phí chỉ với email — nhận ngay tài khoản thử nghiệm $1,000.'
                : 'Create a free account with your email and instantly receive $1,000 demo funds.',
              time: isVi ? '~1 phút' : '~1 min',
            },
            {
              step: '2',
              icon: Wallet,
              title: isVi ? 'Ký quỹ qua QR USDT' : 'Deposit via USDT QR',
              desc: isVi
                ? 'Quét mã QR tự sinh từ địa chỉ ví USDT hoặc nhận chuyển tiền nội bộ 0 phí.'
                : 'Scan your auto-generated USDT wallet QR code or receive zero-fee internal transfers.',
              time: isVi ? '~2 phút' : '~2 mins',
            },
            {
              step: '3',
              icon: TrendingUp,
              title: isVi ? 'Giao dịch & Bot AI' : 'Trade & Run AI Bot',
              desc: isVi
                ? 'Theo dõi biểu đồ BTC/USDT hoặc kích hoạt Bot AI tự động gia tăng danh mục.'
                : 'Trade BTC/USDT live candlesticks or activate the automated AI Bot.',
              time: isVi ? 'Bất cứ lúc nào' : 'Anytime',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-[#27223B] bg-[#14131E] p-7 text-center shadow-lg shadow-black/40"
              >
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#C4B5FD]/40 bg-[#1F1A36] font-mono text-xs font-bold text-[#DDD6FE]">
                  {item.step}
                </div>
                <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#C4B5FD]/25 bg-[#1C1730] text-[#C4B5FD]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-[#F5F3FF]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#958CB3]">{item.desc}</p>
                <div className="mt-4 text-xs font-semibold text-[#C4B5FD]">{item.time}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-7 py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
          >
            <span>{isVi ? 'Tạo tài khoản miễn phí' : 'Create Free Account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Section 5: Cross-Device CTA Banner */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 py-2">
        <div className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-3xl border border-[#C4B5FD]/30 bg-gradient-to-r from-[#18132B] via-[#241B44] to-[#131022] p-6 sm:p-8 shadow-2xl shadow-black/60 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl font-extrabold text-[#F5F3FF] sm:text-4xl [text-wrap:balance]">
              {isVi ? 'Mọi nơi bạn muốn. Mọi lúc bạn cần.' : 'Everywhere you go. Anytime you trade.'}
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#C8C2DC]">
              {isVi
                ? 'RaidenBO chạy mượt trên mọi thiết bị — điện thoại, máy tính bảng hay trình duyệt. Bắt đầu với tài khoản thử nghiệm $1,000, không cần nạp tiền.'
                : 'RaidenBO runs seamlessly across mobile, tablet, and desktop browsers. Start immediately with $1,000 Demo balance.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-6 py-3 text-sm font-extrabold text-[#140E24] shadow-lg shadow-[#C4B5FD]/20 transition-transform hover:-translate-y-0.5 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                <span>{isVi ? 'Đầu tư ngay' : 'Trade Now'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-[#DDD6FE]">
                {isVi ? 'Miễn phí đăng ký · Không ràng buộc' : 'Free registration · No obligation'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[440px] rounded-2xl border border-[#C4B5FD]/25 bg-[#0E0D15]/95 p-4 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between border-b border-[#27223B] pb-2.5">
                <BrandLogo size="sm" />
                <span className="rounded-md border border-[#C4B5FD]/30 bg-[#1E1934] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#DDD6FE]">
                  Web · iOS · Android
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 text-center">
                <div className="rounded-xl border border-[#27223B] bg-[#161423] p-3">
                  <div className="text-[10px] font-bold text-[#958CB3]">
                    {isVi ? 'Tài khoản Demo' : 'Demo Balance'}
                  </div>
                  <div className="mt-1 font-mono text-lg font-black text-[#34D399]">$1,000.00</div>
                </div>
                <div className="rounded-xl border border-[#27223B] bg-[#161423] p-3">
                  <div className="text-[10px] font-bold text-[#958CB3]">
                    {isVi ? 'Lợi nhuận phiên' : 'Round Payout'}
                  </div>
                  <div className="mt-1 font-mono text-lg font-black text-[#C4B5FD]">95%</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#059669] py-2 text-center text-xs font-extrabold text-white">
                  {isVi ? 'MUA ↗' : 'BUY ↗'}
                </div>
                <div className="rounded-lg bg-[#E11D48] py-2 text-center text-xs font-extrabold text-white">
                  {isVi ? 'BÁN ↘' : 'SELL ↘'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section id="faq" className="mx-auto max-w-[1040px] px-4 sm:px-6 py-10 lg:py-12">
        <div className="text-center">
          <p className="text-xs font-bold tracking-wider text-[#C4B5FD]">
            {isVi ? 'Câu hỏi thường gặp' : 'FAQ'}
          </p>
          <h2 className="mt-1.5 font-display text-3xl font-extrabold text-[#F5F3FF]">
            {isVi ? 'Giải đáp thắc mắc' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="mt-6 space-y-2.5">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="rounded-xl border border-[#27223B] bg-[#14131E] overflow-hidden shadow-md shadow-black/30"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-sm sm:text-base font-semibold text-[#F5F3FF] transition-colors hover:bg-[#1C192C] cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#958CB3] transition-transform ${
                      isOpen ? 'rotate-180 text-[#C4B5FD]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#27223B] px-5 py-3.5 text-sm leading-relaxed text-[#C8C2DC]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-[#958CB3]">
          <span>{isVi ? 'Vẫn còn thắc mắc? ' : 'Still have questions? '}</span>
          <a
            href="mailto:support@raidenbo.io"
            className="inline-flex items-center gap-1.5 font-bold text-[#C4B5FD] hover:text-[#DDD6FE] hover:underline"
          >
            <Mail className="h-4 w-4" />
            support@raidenbo.io
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27223B] bg-[#0D0C14] py-9">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-4 space-y-4">
              <BrandLogo size="md" />
              <p className="text-sm text-[#958CB3] max-w-xs">
                {isVi
                  ? 'Nền tảng đầu tư tài sản số BTC/USDT — đơn giản, minh bạch và tích hợp Bot AI.'
                  : 'BTC/USDT digital asset platform — fast, transparent, and AI-powered.'}
              </p>
              <button
                type="button"
                onClick={() => onChangeLang(isVi ? 'en' : 'vi')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#14131E] px-3 py-1.5 text-xs font-semibold text-[#DDD6FE] hover:border-[#C4B5FD]/50 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-[#C4B5FD]" />
                <span>{isVi ? 'Tiếng Việt (Chuyển EN)' : 'English (Switch VI)'}</span>
              </button>
            </div>

            <div className="md:col-span-2 space-y-2.5 text-sm">
              <h3 className="font-display font-bold text-[#F5F3FF]">{isVi ? 'Hỗ trợ' : 'Support'}</h3>
              <ul className="space-y-2 text-[#958CB3]">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className="hover:text-[#DDD6FE] cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <a href="mailto:support@raidenbo.io" className="hover:text-[#DDD6FE]">
                    support@raidenbo.io
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-sm">
              <h3 className="font-display font-bold text-[#F5F3FF]">
                {isVi ? 'Pháp lý & Bảo mật' : 'Legal & Security'}
              </h3>
              <ul className="space-y-2 text-[#958CB3]">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className="hover:text-[#DDD6FE] cursor-pointer"
                  >
                    {isVi ? 'Điều khoản và điều kiện' : 'Terms & Conditions'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModal('risk')}
                    className="hover:text-[#DDD6FE] cursor-pointer"
                  >
                    {isVi ? 'Cảnh báo rủi ro' : 'Risk Disclosure'}
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 rounded-xl border border-[#27223B] bg-[#14131E] p-5 shadow-lg shadow-black/40">
              <div className="font-display text-sm font-bold text-[#F5F3FF]">
                {isVi ? 'Sẵn sàng bắt đầu?' : 'Ready to start?'}
              </div>
              <p className="mt-1.5 text-xs text-[#958CB3]">
                {isVi
                  ? 'Nhận tài khoản thử nghiệm $1,000 miễn phí ngay khi đăng ký.'
                  : 'Receive $1,000 free Demo funds immediately on sign-up.'}
              </p>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-2.5 text-xs font-extrabold text-[#140E24] shadow-sm shadow-[#C4B5FD]/15 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                <span>{isVi ? 'Đăng ký ngay' : 'Register Now'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-10 border-t border-[#27223B] pt-6 text-xs text-[#958CB3] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>© 2026 RaidenBO. All rights reserved.</span>
              <span>
                {isVi ? 'Đầu tư tài sản số tiềm ẩn mức rủi ro cao.' : 'Digital asset trading involves high risk.'}
              </span>
            </div>
            <p className="leading-relaxed">
              {isVi
                ? 'Cảnh báo rủi ro: Giao dịch và đầu tư vào tài sản kỹ thuật số BTC/USDT có mức độ rủi ro đáng kể. Vui lòng cân nhắc mục tiêu đầu tư, mức độ kinh nghiệm và không sử dụng nguồn vốn vượt quá khả năng tài chính của bạn.'
                : 'Risk Warning: Trading digital asset options carries significant risk and may not be suitable for all investors. Never invest funds you cannot afford to lose.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#F5F3FF]">
                {legalModal === 'privacy'
                  ? 'Privacy Policy'
                  : legalModal === 'terms'
                  ? isVi
                    ? 'Điều khoản & Điều kiện'
                    : 'Terms & Conditions'
                  : isVi
                  ? 'Cảnh báo rủi ro'
                  : 'Risk Disclosure'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#C8C2DC]">
              {legalModal === 'privacy' &&
                'RaidenBO cam kết bảo mật tuyệt đối thông tin email, lịch sử giao dịch và dữ liệu KYC của người dùng theo tiêu chuẩn mã hóa hiện đại.'}
              {legalModal === 'terms' &&
                'Người dùng cam kết đủ 18 tuổi, chịu trách nhiệm bảo mật thông tin đăng nhập, mã 2FA và tuân thủ quy định sử dụng tài khoản VIP / Affiliate trên RaidenBO.'}
              {legalModal === 'risk' &&
                'Giao dịch quyền chọn nhị phân BTC/USDT mang tính đầu cơ cao. Kết quả quá khứ và Bot AI không đảm bảo lợi nhuận tuyệt đối trong tương lai.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
