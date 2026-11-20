export type Language = 'vi' | 'en';

export type AccountMode = 'live' | 'demo';

export type TradeDirection = 'BUY' | 'SELL';

export type RoundPhase = 'betting' | 'waiting';

export type AdminRoundOverride = 'auto' | 'BUY' | 'SELL';

export type UserRole = 'user' | 'admin';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Candle {
  id: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  result: TradeDirection;
}

export interface TechnicalIndicators {
  ema5: number[];
  ema10: number[];
  rsi14: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  sentimentBuyPct: number;
  sentimentSellPct: number;
}

export type GaugeSignalLabel = 'STRONG SELL' | 'SELL' | 'NEUTRAL' | 'BUY' | 'STRONG BUY';

export interface IndicatorGaugeReading {
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  /** Normalized signal score in [-1, 1], where -1 = STRONG SELL, 0 = NEUTRAL, +1 = STRONG BUY */
  score: number;
  /** Needle rotation angle in degrees [-72, +72] from vertical 12 o'clock */
  angleDeg: number;
  label: GaugeSignalLabel;
}

export interface IndicatorGaugesSummary {
  oscillators: IndicatorGaugeReading;
  summary: IndicatorGaugeReading;
  movingAverages: IndicatorGaugeReading;
  rsi14: number;
  macd: number;
  macdSignal: number;
  ema5: number;
  ema10: number;
  ema20: number;
}

export interface UserAccount {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  liveBalance: number;
  demoBalance: number;
  walletAddress: string;
  referralCode: string;
  referredBy: string | null;
  isVip: boolean;
  twoFactorEnabled: boolean;
  hideSensitiveData?: boolean;
  avatarUrl?: string;
  kycStatus: KycStatus;
  kycFullName?: string;
  kycDocNumber?: string;
  isBanned: boolean;
  totalDeposited: number;
  totalWithdrawn: number;
  totalVolume: number;
  commissionBalance?: number;
  totalTradingCommission?: number;
  totalVipCommission?: number;
  totalCommissionClaimed?: number;
  createdAt: string;
}

export interface TradeOrder {
  id: string;
  userId: string;
  userEmail: string;
  pair: 'BTC/USDT';
  accountMode: AccountMode;
  direction: TradeDirection;
  amount: number;
  payoutRate: number;
  entryPrice: number;
  closePrice?: number;
  roundId: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'DRAW';
  pnl: number;
  source: 'manual' | 'bot';
  createdAt: string;
  settledAt?: string;
}

export interface TradeDashboardStats {
  totalOrders: number;
  openOrders: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePct: number;
  totalVolume: number;
  totalRevenue: number;
  netProfit: number;
  buyCount: number;
  sellCount: number;
  buyPct: number;
  sellPct: number;
}

export interface StreakRecord {
  id: string;
  type: 'WIN' | 'LOSE';
  length: number;
  estimatedPrize: number;
  date: string;
}

export interface UserStreakSummary {
  currentWinStreak: number;
  currentLoseStreak: number;
  bestWinStreak: number;
  bestLoseStreak: number;
  qualifyingOrdersCount: number;
  targetStreak: number;
  minStake: number;
  records: StreakRecord[];
}

export interface PrizePoolWinner {
  id: string;
  type: 'WIN' | 'LOSE';
  streak: number;
  prizeAmount: number;
  maskedUser: string;
  date: string;
}

export type PrizePoolClaimStatus = 'eligible' | 'claimed' | 'paid' | 'rejected';

export interface PrizePoolClaim {
  id: string;
  streakRecordId?: string;
  userId: string;
  userEmail: string;
  userNickname: string;
  streakType: 'WIN' | 'LOSE' | 'MEGA';
  streakLength: number;
  prizeAmount: number;
  status: PrizePoolClaimStatus;
  twoFactorVerified: boolean;
  createdAt: string;
  claimedAt?: string;
  paidAt?: string;
  paidBy?: string;
}

export type WalletTxType =
  | 'deposit'
  | 'withdraw'
  | 'transfer_in'
  | 'transfer_out'
  | 'vip_upgrade'
  | 'commission_claim'
  | 'admin_adjust'
  | 'prize_pool';

export type WalletTxStatus = 'pending' | 'completed' | 'rejected';

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: WalletTxType;
  amount: number;
  fee: number;
  status: WalletTxStatus;
  addressOrPeer: string;
  txHash?: string;
  note?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'trade' | 'wallet' | 'system' | 'bot' | 'prize';
  read: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  payoutRate: number; // e.g. 0.95 (95%)
  minTradeAmount: number;
  maxTradeAmount: number;
  withdrawFee: number;
  vipFee: number;
  prizePool: number;
  masterWalletAddress: string;
  maintenanceMode: boolean;
}

export interface MarketSnapshot {
  pair: 'BTC/USDT';
  currentPrice: number;
  open24h: number;
  high24h: number;
  low24h: number;
  change24hPct: number;
  roundId: number;
  phase: RoundPhase;
  secondsRemaining: number;
  candles: Candle[];
  lastResults: TradeDirection[];
  prizePool: number;
  payoutRate: number;
  sentimentBuyPct: number;
  sentimentSellPct: number;
  maintenanceMode: boolean;
  depositWalletAddress: string;
}

export type BotStrategy =
  | 'ai_predict'
  | 'ema_rsi'
  | 'martingale'
  | 'fibonacci'
  | 'trend_follow'
  | 'reverse_2'
  | 'reverse_3'
  | 'trend_2_1'
  | 'bottom_top'
  | 'zigzag';

export type QuickInvestTab = 'discover' | 'portfolio' | 'signal' | 'strategies' | 'more';

export type QuickInvestPortfolioSubTab = 'list' | 'stats' | 'timer';

export type QuickInvestPeriod = 'today' | 'week' | 'month';

export interface QuickInvestPlan {
  id: string;
  name: string;
  strategy: BotStrategy;
  strategyName: string;
  method: string;
  baseAmount: number;
  takeProfit: number;
  stopLoss: number;
  maxSteps: number;
  accountMode: AccountMode;
  active: boolean;
  copiedFrom?: string;
  pnl: number;
  volume: number;
  tradesCount: number;
  winsCount: number;
  createdAt: string;
}

export interface QuickInvestTimer {
  id: string;
  planId: string;
  planName: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  repeatDays: string[]; // ['T2', 'T3', ...]
  enabled: boolean;
  createdAt: string;
}

export interface QuickInvestStrategyItem {
  id: string;
  name: string;
  method: 'String Method' | 'AI Quant' | 'Signal Matrix';
  category: 'Chiến lược mặc định' | 'Chiến lược tùy chỉnh' | 'Chiến lược AI';
  strategyKey: BotStrategy;
  patternCode: string;
  winRateRef: number;
  usersCount: number;
  createdAt: string;
  isDefault?: boolean;
  telegramChannel?: string;
}

export interface QuickInvestPeriodStats {
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalVolume: number;
  pnlSeries: number[];
  volumeSeries: number[];
}

export interface QuickInvestCalendarDay {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  pnl: number;
  volume: number;
  tradesCount: number;
}

export type AiSignalStrength = 'STRONG' | 'MODERATE' | 'CAUTIOUS';

export type AiSignalMode = 'balanced' | 'reversal';

export interface AiPredictionFactor {
  id: 'ema' | 'rsi' | 'macd' | 'bollinger' | 'waterdrop';
  nameVi: string;
  nameEn: string;
  valueLabel: string;
  vote: 'BUY' | 'SELL' | 'NEUTRAL';
  weight: number;
  noteVi: string;
  noteEn: string;
}

export interface AiOrderPrediction {
  roundId: number;
  direction: TradeDirection;
  confidencePct: number;
  buyPct: number;
  sellPct: number;
  signalStrength: AiSignalStrength;
  score: number;
  recommendedStakeMultiplier: number;
  summaryVi: string;
  summaryEn: string;
  supportPrice: number;
  resistancePrice: number;
  factors: AiPredictionFactor[];
}

export interface AiPredictionHistoryItem {
  roundId: number;
  predicted: TradeDirection;
  actual: TradeDirection;
  confidencePct: number;
  hit: boolean;
}

export interface GeminiDeepPrediction {
  roundId: number;
  model: string;
  direction: TradeDirection;
  confidencePct: number;
  headline: string;
  analysis: string;
  riskNote: string;
  supportLevel: number;
  resistanceLevel: number;
  generatedAt: string;
}

export interface BotConfig {
  enabled: boolean;
  accountMode: AccountMode;
  strategy: BotStrategy;
  baseAmount: number;
  takeProfit: number;
  stopLoss: number;
  maxSteps: number;
}

export interface BotLogEntry {
  id: string;
  roundId: number;
  strategy: BotStrategy;
  direction: TradeDirection;
  amount: number;
  reason: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'DRAW';
  pnl: number;
  timestamp: string;
}

export type CommissionKind = 'trading' | 'vip_agency';

export type CommissionStatus = 'pending' | 'approved' | 'rejected';

export interface CommissionRecord {
  id: string;
  recipientUserId: string;
  recipientNickname?: string;
  recipientEmail?: string;
  sourceUserId: string;
  sourceNickname: string;
  tier: number; // 1..7 (F1..F7)
  kind: CommissionKind;
  baseAmount: number;
  ratePct: number;
  commissionAmount: number;
  status?: CommissionStatus;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
}

export interface CommissionToastData {
  id: string;
  totalAmount: number;
  count: number;
  kind: CommissionKind | 'mixed';
  tier?: number;
  sourceNickname?: string;
  newCommissionBalance: number;
  createdAt: string;
}

export interface BoVipTierConfig {
  level: number; // 1..7
  minF1Vip: number;
  minWeeklyF1Volume: number;
  tradingRate: number; // e.g., 0.01 = 1%
  tradingRatePct: number; // e.g., 1
  vipBonusDefault: number; // based on $100 fee: 50, 25, 12.5, ...
  vipBonusRatio: number; // 0.5, 0.25, ...
}

export interface BoVipRankStatus {
  level: number; // 0 if not VIP, 1..7 if VIP
  unlockedTiers: number; // 0..7
  f1VipCount: number;
  weeklyF1Volume: number;
  currentTier: BoVipTierConfig | null;
  nextTier: BoVipTierConfig | null;
  f1VipProgressPct: number;
  volumeProgressPct: number;
  maxLevelReached: boolean;
}

export interface VipNetworkMember {
  id: string;
  nickname: string;
  maskedEmail: string;
  tier: number; // 1..7
  isVip: boolean;
  weeklyVolume: number;
  totalVolume: number;
  commissionGenerated: number;
  createdAt: string;
}

export interface VipDailyCommissionPoint {
  dateKey: string;
  label: string;
  tradingCommission: number;
  vipCommission: number;
  total: number;
}

export interface VipSummaryPayload {
  user: UserAccount;
  vipFee: number;
  rankStatus: BoVipRankStatus;
  stats: {
    totalMembers: number;
    f1Members: number;
    totalVipMembers: number;
    f1VipMembers: number;
    weeklyF1Volume: number;
    weeklyNetworkVolume: number;
    totalNetworkVolume: number;
    commissionBalance: number;
    totalTradingCommission: number;
    totalVipCommission: number;
    totalCommissionEarned: number;
    totalCommissionClaimed: number;
  };
  network: VipNetworkMember[];
  commissions: CommissionRecord[];
  dailyChart: VipDailyCommissionPoint[];
  tiers: BoVipTierConfig[];
}

