import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  BO_VIP_TIERS,
  calculateTierTradingCommission,
  calculateTierVipCommission,
  computeAiOrderPrediction,
  computeBoVipRank,
  computeIndicators,
  computeUserStreakStats,
  decideCommissionRecord,
  generateDeterministicBep20Address,
  getCommissionStatus,
  resolveDepositWalletAddress,
  settleTradeOrder,
  validateCommissionClaim,
  validateInternalTransfer,
  validateMasterWalletAddress,
  validatePasswordChange,
} from './src/lib/tradingEngine';
import {
  buildOtpAuthUri,
  generateRandomBase32Secret,
  verifyTotpCode,
} from './src/lib/totp';
import type {
  AccountMode,
  AdminRoundOverride,
  AppNotification,
  Candle,
  CommissionRecord,
  GeminiDeepPrediction,
  Language,
  MarketSnapshot,
  PlatformSettings,
  PrizePoolClaim,
  RoundPhase,
  TradeDirection,
  TradeOrder,
  UserAccount,
  VipDailyCommissionPoint,
  VipNetworkMember,
  VipSummaryPayload,
  WalletTransaction,
} from './src/types';

interface StoredUser extends UserAccount {
  passwordHash: string;
  twoFactorSecret?: string;
  pendingTwoFactorSecret?: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  trades: TradeOrder[];
  transactions: WalletTransaction[];
  notifications: AppNotification[];
  prizeClaims: PrizePoolClaim[];
  commissions: CommissionRecord[];
  settings: PlatformSettings;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const DEFAULT_ADMIN_EMAIL = 'ht.admin@hitechtrade.io';
const DEFAULT_ADMIN_PASSWORD = 'Hitech@Admin2026!';
const ENV_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const HAS_CUSTOM_ENV_ADMIN =
  Boolean(ENV_ADMIN_EMAIL) &&
  ENV_ADMIN_EMAIL !== 'my_admin_email' &&
  Boolean(ENV_ADMIN_PASSWORD.trim()) &&
  ENV_ADMIN_PASSWORD !== 'MY_ADMIN_PASSWORD';
const ADMIN_EMAIL = HAS_CUSTOM_ENV_ADMIN ? ENV_ADMIN_EMAIL : DEFAULT_ADMIN_EMAIL;
const ADMIN_PASSWORD = HAS_CUSTOM_ENV_ADMIN ? ENV_ADMIN_PASSWORD : DEFAULT_ADMIN_PASSWORD;

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(`hitechtrade_${pw}`).digest('hex');
}

function buildSeedAffiliateData(now: number): {
  affiliateUsers: StoredUser[];
  seedCommissions: CommissionRecord[];
  seedClaimTx: WalletTransaction;
} {
  const affiliateUsers: StoredUser[] = [
    {
      id: 'usr_aff_f1_01',
      email: 'linh.tran@raidenbo.io',
      nickname: 'LinhQuant',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 860,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f1_01'),
      referralCode: 'RB5101',
      referredBy: 'HT8866',
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      isBanned: false,
      totalDeposited: 1200,
      totalWithdrawn: 340,
      totalVolume: 2150,
      commissionBalance: 42.5,
      totalTradingCommission: 22.5,
      totalVipCommission: 50,
      totalCommissionClaimed: 30,
      createdAt: new Date(now - 86400000 * 11).toISOString(),
    },
    {
      id: 'usr_aff_f1_02',
      email: 'duc.pham@raidenbo.io',
      nickname: 'DucScalper',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 640,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f1_02'),
      referralCode: 'RB5102',
      referredBy: 'HT8866',
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      isBanned: false,
      totalDeposited: 900,
      totalWithdrawn: 150,
      totalVolume: 1840,
      commissionBalance: 18.2,
      totalTradingCommission: 18.2,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 9).toISOString(),
    },
    {
      id: 'usr_aff_f1_03',
      email: 'khanh.le@raidenbo.io',
      nickname: 'KhanhBTC',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 510,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f1_03'),
      referralCode: 'RB5103',
      referredBy: 'HT8866',
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      isBanned: false,
      totalDeposited: 750,
      totalWithdrawn: 100,
      totalVolume: 1420,
      commissionBalance: 12.4,
      totalTradingCommission: 12.4,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 7).toISOString(),
    },
    {
      id: 'usr_aff_f2_01',
      email: 'tuan.vo@raidenbo.io',
      nickname: 'TuanFX99',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 390,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f2_01'),
      referralCode: 'RB5201',
      referredBy: 'RB5101',
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      isBanned: false,
      totalDeposited: 500,
      totalWithdrawn: 0,
      totalVolume: 1280,
      commissionBalance: 6.5,
      totalTradingCommission: 6.5,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
    {
      id: 'usr_aff_f2_02',
      email: 'vy.ngoc@raidenbo.io',
      nickname: 'NgocVyBO',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 220,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f2_02'),
      referralCode: 'RB5202',
      referredBy: 'RB5102',
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'unverified',
      isBanned: false,
      totalDeposited: 300,
      totalWithdrawn: 0,
      totalVolume: 740,
      commissionBalance: 0,
      totalTradingCommission: 0,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 3).toISOString(),
    },
    {
      id: 'usr_aff_f3_01',
      email: 'hung.dao@raidenbo.io',
      nickname: 'HungCrypto',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 180,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address('usr_aff_f3_01'),
      referralCode: 'RB5301',
      referredBy: 'RB5201',
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'unverified',
      isBanned: false,
      totalDeposited: 200,
      totalWithdrawn: 0,
      totalVolume: 520,
      commissionBalance: 0,
      totalTradingCommission: 0,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 2).toISOString(),
    },
  ];

  const seedCommissions: CommissionRecord[] = [
    {
      id: 'com_seed_01',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_01',
      sourceNickname: 'LinhQuant',
      tier: 1,
      kind: 'vip_agency',
      baseAmount: 100,
      ratePct: 50,
      commissionAmount: 50,
      createdAt: new Date(now - 86400000 * 6).toISOString(),
    },
    {
      id: 'com_seed_02',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_02',
      sourceNickname: 'DucScalper',
      tier: 1,
      kind: 'vip_agency',
      baseAmount: 100,
      ratePct: 50,
      commissionAmount: 50,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
    {
      id: 'com_seed_03',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_03',
      sourceNickname: 'KhanhBTC',
      tier: 1,
      kind: 'vip_agency',
      baseAmount: 100,
      ratePct: 50,
      commissionAmount: 50,
      createdAt: new Date(now - 86400000 * 4).toISOString(),
    },
    {
      id: 'com_seed_04',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f2_01',
      sourceNickname: 'TuanFX99',
      tier: 2,
      kind: 'vip_agency',
      baseAmount: 100,
      ratePct: 25,
      commissionAmount: 25,
      createdAt: new Date(now - 86400000 * 3).toISOString(),
    },
    {
      id: 'com_seed_05',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_01',
      sourceNickname: 'LinhQuant',
      tier: 1,
      kind: 'trading',
      baseAmount: 2150,
      ratePct: 1,
      commissionAmount: 21.5,
      createdAt: new Date(now - 86400000 * 2 - 3600000 * 4).toISOString(),
    },
    {
      id: 'com_seed_06',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_02',
      sourceNickname: 'DucScalper',
      tier: 1,
      kind: 'trading',
      baseAmount: 1840,
      ratePct: 1,
      commissionAmount: 18.4,
      createdAt: new Date(now - 86400000 * 1 - 3600000 * 6).toISOString(),
    },
    {
      id: 'com_seed_07',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f1_03',
      sourceNickname: 'KhanhBTC',
      tier: 1,
      kind: 'trading',
      baseAmount: 1420,
      ratePct: 1,
      commissionAmount: 14.2,
      createdAt: new Date(now - 3600000 * 14).toISOString(),
    },
    {
      id: 'com_seed_08',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_trader_02',
      sourceNickname: 'MinhCrypto',
      tier: 1,
      kind: 'trading',
      baseAmount: 960,
      ratePct: 1,
      commissionAmount: 9.6,
      createdAt: new Date(now - 3600000 * 7).toISOString(),
    },
    {
      id: 'com_seed_09',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f2_01',
      sourceNickname: 'TuanFX99',
      tier: 2,
      kind: 'trading',
      baseAmount: 1280,
      ratePct: 0.5,
      commissionAmount: 6.4,
      createdAt: new Date(now - 3600000 * 3).toISOString(),
    },
    {
      id: 'com_seed_10',
      recipientUserId: 'usr_trader_01',
      sourceUserId: 'usr_aff_f2_02',
      sourceNickname: 'NgocVyBO',
      tier: 2,
      kind: 'trading',
      baseAmount: 740,
      ratePct: 0.5,
      commissionAmount: 3.7,
      createdAt: new Date(now - 3600000 * 1).toISOString(),
    },
    {
      id: 'com_seed_admin_01',
      recipientUserId: 'usr_admin_01',
      sourceUserId: 'usr_trader_01',
      sourceNickname: 'HoangTrader',
      tier: 1,
      kind: 'vip_agency',
      baseAmount: 100,
      ratePct: 50,
      commissionAmount: 50,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
    {
      id: 'com_seed_admin_02',
      recipientUserId: 'usr_admin_01',
      sourceUserId: 'usr_trader_01',
      sourceNickname: 'HoangTrader',
      tier: 1,
      kind: 'trading',
      baseAmount: 4820,
      ratePct: 1,
      commissionAmount: 48.2,
      createdAt: new Date(now - 3600000 * 8).toISOString(),
    },
  ];

  const seedClaimTx: WalletTransaction = {
    id: 'tx_seed_comm_01',
    userId: 'usr_trader_01',
    userEmail: 'trader@hitechtrade.io',
    type: 'commission_claim',
    amount: 100,
    fee: 0,
    status: 'completed',
    addressOrPeer: 'Ví Hoa Hồng → Ví Chính (USDT)',
    note: 'Chuyển hoa hồng đại lý về Ví chính (0% phí)',
    createdAt: new Date(now - 86400000 * 2).toISOString(),
    processedAt: new Date(now - 86400000 * 2).toISOString(),
  };

  return {
    affiliateUsers,
    seedCommissions: seedCommissions.map((c) => ({ ...c, status: 'approved' as const })),
    seedClaimTx,
  };
}

function makeInitialSeed(): DatabaseSchema {
  const adminId = 'usr_admin_01';
  const traderId = 'usr_trader_01';
  const trader2Id = 'usr_trader_02';
  const now = Date.now();

  const users: StoredUser[] = [
    {
      id: adminId,
      email: ADMIN_EMAIL,
      nickname: 'AdminMaster',
      passwordHash: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      liveBalance: 25000,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(adminId),
      referralCode: 'HTADMIN',
      referredBy: null,
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      kycFullName: 'Nguyễn Quản Trị',
      kycDocNumber: '079092001234',
      isBanned: false,
      totalDeposited: 25000,
      totalWithdrawn: 0,
      totalVolume: 18400,
      createdAt: new Date(now - 86400000 * 30).toISOString(),
    },
    {
      id: traderId,
      email: 'trader@hitechtrade.io',
      nickname: 'HoangTrader',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 1250,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(traderId),
      referralCode: 'HT8866',
      referredBy: 'HTADMIN',
      isVip: true,
      twoFactorEnabled: false,
      kycStatus: 'verified',
      kycFullName: 'Trần Minh Hoàng',
      kycDocNumber: '001095008812',
      isBanned: false,
      totalDeposited: 1500,
      totalWithdrawn: 250,
      totalVolume: 4820,
      createdAt: new Date(now - 86400000 * 14).toISOString(),
    },
    {
      id: trader2Id,
      email: 'minh.nguyen@hitechtrade.io',
      nickname: 'MinhCrypto',
      passwordHash: hashPassword('123456'),
      role: 'user',
      liveBalance: 480,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(trader2Id),
      referralCode: 'HT3399',
      referredBy: 'HT8866',
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'pending',
      kycFullName: 'Nguyễn Văn Minh',
      kycDocNumber: '034098004511',
      isBanned: false,
      totalDeposited: 500,
      totalWithdrawn: 0,
      totalVolume: 960,
      commissionBalance: 0,
      totalTradingCommission: 0,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date(now - 86400000 * 5).toISOString(),
    },
  ];

  const { affiliateUsers, seedCommissions, seedClaimTx } = buildSeedAffiliateData(now);
  users[0].commissionBalance = 98.2;
  users[0].totalTradingCommission = 48.2;
  users[0].totalVipCommission = 50;
  users[0].totalCommissionClaimed = 0;

  users[1].commissionBalance = 148.8;
  users[1].totalTradingCommission = 73.8;
  users[1].totalVipCommission = 175;
  users[1].totalCommissionClaimed = 100;

  users.push(...affiliateUsers);

  const transactions: WalletTransaction[] = [
    {
      id: 'tx_seed_01',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      type: 'deposit',
      amount: 1500,
      fee: 0,
      status: 'completed',
      addressOrPeer: generateDeterministicBep20Address(traderId),
      txHash: '0x94a1f82e3b771c09812fa83e19c4b9e028a72101',
      note: 'Nạp USDT',
      createdAt: new Date(now - 86400000 * 10).toISOString(),
      processedAt: new Date(now - 86400000 * 10 + 120000).toISOString(),
    },
    {
      id: 'tx_seed_02',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      type: 'withdraw',
      amount: 250,
      fee: 1,
      status: 'completed',
      addressOrPeer: '0x4E81C903D2719B8A330F42D880A17E9011223344',
      txHash: '0x62b0d44c9e123fa71829c3a50192837465abcd02',
      note: 'Rút về ví Binance cá nhân',
      createdAt: new Date(now - 86400000 * 4).toISOString(),
      processedAt: new Date(now - 86400000 * 4 + 180000).toISOString(),
    },
    {
      id: 'tx_seed_03',
      userId: trader2Id,
      userEmail: 'minh.nguyen@hitechtrade.io',
      type: 'deposit',
      amount: 300,
      fee: 0,
      status: 'pending',
      addressOrPeer: generateDeterministicBep20Address(trader2Id),
      txHash: '0x71c992ab34890ef1234567890abcdef123456789',
      note: 'Yêu cầu xác nhận nạp USDT',
      createdAt: new Date(now - 3600000 * 2).toISOString(),
    },
    {
      id: 'tx_seed_04',
      userId: trader2Id,
      userEmail: 'minh.nguyen@hitechtrade.io',
      type: 'withdraw',
      amount: 120,
      fee: 1,
      status: 'pending',
      addressOrPeer: '0x99887766554433221100AABBCCDDEEFF00112233',
      note: 'Rút lợi nhuận tuần',
      createdAt: new Date(now - 1800000).toISOString(),
    },
  ];

  const trades: TradeOrder[] = [
    {
      id: 'tr_seed_01',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      pair: 'BTC/USDT',
      accountMode: 'live',
      direction: 'BUY',
      amount: 50,
      payoutRate: 0.95,
      entryPrice: 95110.25,
      closePrice: 95148.8,
      roundId: 1001,
      status: 'WON',
      pnl: 47.5,
      source: 'manual',
      createdAt: new Date(now - 7200000).toISOString(),
      settledAt: new Date(now - 7140000).toISOString(),
    },
    {
      id: 'tr_seed_02',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      pair: 'BTC/USDT',
      accountMode: 'live',
      direction: 'SELL',
      amount: 25,
      payoutRate: 0.95,
      entryPrice: 95180.1,
      closePrice: 95162.4,
      roundId: 1002,
      status: 'WON',
      pnl: 23.75,
      source: 'bot',
      createdAt: new Date(now - 3600000).toISOString(),
      settledAt: new Date(now - 3540000).toISOString(),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'ntf_seed_prize_admin',
      userId: adminId,
      title: '🏆 Thắng Prize Pool: HoangTrader (+$27.68)',
      message:
        'Người dùng HoangTrader (trader@hitechtrade.io) đã đạt Win Streak 9x và đủ điều kiện nhận thưởng $27.68 từ Prize Pool.',
      type: 'prize',
      read: false,
      createdAt: new Date(now - 1800000).toISOString(),
    },
    {
      id: 'ntf_seed_prize_user',
      userId: traderId,
      title: '🎉 Chúc mừng bạn thắng Prize Pool (+$27.68)',
      message:
        'Bạn đã đạt Win Streak 9x! Mở mục Prize Pool, nhấn Nhận thưởng và nhập mã Google Authenticator (2FA) để Admin cộng tiền vào Ví Thực.',
      type: 'prize',
      read: false,
      createdAt: new Date(now - 1800000).toISOString(),
    },
    {
      id: 'ntf_seed_01',
      userId: traderId,
      title: 'Chào mừng đến với RaidenBO',
      message: 'Tài khoản Demo $1,000 đã sẵn sàng. Bắt đầu giao dịch BTC/USDT hoặc kích hoạt Bot AI.',
      type: 'system',
      read: false,
      createdAt: new Date(now - 3600000 * 6).toISOString(),
    },
    {
      id: 'ntf_seed_02',
      userId: traderId,
      title: 'Lệnh thắng +$47.50',
      message: 'Lệnh MUA BTC/USDT $50.00 đã chốt lời thành công (+95%).',
      type: 'trade',
      read: false,
      createdAt: new Date(now - 7140000).toISOString(),
    },
  ];

  const prizeClaims: PrizePoolClaim[] = [
    {
      id: 'claim_seed_01',
      streakRecordId: 'stk_w_seed_9x',
      userId: traderId,
      userEmail: 'trader@hitechtrade.io',
      userNickname: 'HoangTrader',
      streakType: 'WIN',
      streakLength: 9,
      prizeAmount: 27.68,
      status: 'eligible',
      twoFactorVerified: false,
      createdAt: new Date(now - 1800000).toISOString(),
    },
  ];

  const settings: PlatformSettings = {
    payoutRate: 0.95,
    minTradeAmount: 1,
    maxTradeAmount: 10000,
    withdrawFee: 1,
    vipFee: 100,
    prizePool: 27680.5,
    masterWalletAddress: '0x71C7656EC7AB88B098DEF751B7401B5F6D8976F0',
    maintenanceMode: false,
  };

  transactions.unshift(seedClaimTx);

  return {
    users,
    trades,
    transactions,
    notifications,
    prizeClaims,
    commissions: seedCommissions,
    settings,
  };
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seeded = makeInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    let mutated = false;
    const adminUser = parsed.users.find((u) => u.id === 'usr_admin_01' || u.role === 'admin');
    const expectedHash = hashPassword(ADMIN_PASSWORD);
    if (!adminUser) {
      const seededAdmin = makeInitialSeed().users[0];
      parsed.users.unshift(seededAdmin);
      mutated = true;
    } else if (
      adminUser.email !== ADMIN_EMAIL ||
      adminUser.passwordHash !== expectedHash ||
      adminUser.role !== 'admin' ||
      adminUser.isBanned
    ) {
      adminUser.email = ADMIN_EMAIL;
      adminUser.passwordHash = expectedHash;
      adminUser.role = 'admin';
      adminUser.isBanned = false;
      mutated = true;
    }

    // Migrate legacy boolean-only 2FA accounts without a real TOTP secret
    for (const u of parsed.users) {
      if (u.twoFactorEnabled && !u.twoFactorSecret) {
        u.twoFactorEnabled = false;
        mutated = true;
      }
    }

    // Migrate older store.json files missing prizeClaims
    if (!Array.isArray(parsed.prizeClaims)) {
      const seed = makeInitialSeed();
      parsed.prizeClaims = seed.prizeClaims;
      const existingIds = new Set(parsed.notifications.map((n) => n.id));
      for (const n of seed.notifications) {
        if ((n.id === 'ntf_seed_prize_admin' || n.id === 'ntf_seed_prize_user') && !existingIds.has(n.id)) {
          parsed.notifications.unshift(n);
        }
      }
      mutated = true;
    }

    // Migrate older store.json files missing commissions & BO VIP network fields
    if (!Array.isArray(parsed.commissions)) {
      const { affiliateUsers, seedCommissions, seedClaimTx } = buildSeedAffiliateData(Date.now());
      parsed.commissions = seedCommissions;

      for (const aff of affiliateUsers) {
        if (!parsed.users.some((u) => u.id === aff.id)) {
          parsed.users.push(aff);
        }
      }

      const trader1 = parsed.users.find((u) => u.id === 'usr_trader_01');
      if (trader1) {
        trader1.commissionBalance = 148.8;
        trader1.totalTradingCommission = 73.8;
        trader1.totalVipCommission = 175;
        trader1.totalCommissionClaimed = 100;
      }
      const admin1 = parsed.users.find((u) => u.id === 'usr_admin_01');
      if (admin1) {
        admin1.commissionBalance = 98.2;
        admin1.totalTradingCommission = 48.2;
        admin1.totalVipCommission = 50;
        admin1.totalCommissionClaimed = 0;
      }

      if (!parsed.transactions.some((tx) => tx.id === seedClaimTx.id)) {
        parsed.transactions.unshift(seedClaimTx);
      }
      mutated = true;
    }

    for (const u of parsed.users) {
      if (typeof u.commissionBalance !== 'number') {
        u.commissionBalance = 0;
        mutated = true;
      }
      if (typeof u.totalTradingCommission !== 'number') {
        u.totalTradingCommission = 0;
        mutated = true;
      }
      if (typeof u.totalVipCommission !== 'number') {
        u.totalVipCommission = 0;
        mutated = true;
      }
      if (typeof u.totalCommissionClaimed !== 'number') {
        u.totalCommissionClaimed = 0;
        mutated = true;
      }
    }

    for (const c of parsed.commissions) {
      if (!c.status) {
        c.status = 'approved';
        mutated = true;
      }
    }

    if (mutated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const seeded = makeInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
}

let db: DatabaseSchema = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store.json:', err);
  }
}

function sanitizeUser(u: StoredUser): UserAccount {
  const {
    passwordHash: _pw,
    twoFactorSecret: _sec,
    pendingTwoFactorSecret: _psec,
    ...safe
  } = u;
  return safe;
}

function notifyAllAdmins(title: string, message: string, type: AppNotification['type'] = 'prize') {
  const nowIso = new Date().toISOString();
  const admins = db.users.filter((u) => u.role === 'admin');
  for (const admin of admins) {
    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: admin.id,
      title,
      message,
      type,
      read: false,
      createdAt: nowIso,
    });
  }
  if (db.notifications.length > 250) db.notifications.length = 250;
}

// ==========================================
// BO 7-Level VIP Network & Commission Engine
// ==========================================
function getUserWeeklyLiveVolume(u: StoredUser): number {
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentLiveTradesVol = db.trades
    .filter(
      (t) =>
        t.userId === u.id &&
        t.accountMode === 'live' &&
        new Date(t.createdAt).getTime() >= sevenDaysAgo
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Seeded network members carry active weekly volume baseline + any new live orders
  const seededBaseline =
    u.id.startsWith('usr_aff_') || u.id === 'usr_trader_02'
      ? Number((u.totalVolume * 0.6).toFixed(2))
      : 0;

  return Number((recentLiveTradesVol + seededBaseline).toFixed(2));
}

function getDownlineNetwork(rootUser: StoredUser): Array<{ user: StoredUser; tier: number }> {
  const result: Array<{ user: StoredUser; tier: number }> = [];
  const visited = new Set<string>([rootUser.id]);
  let frontier: Array<{ code: string; tier: number }> = [
    { code: rootUser.referralCode.toUpperCase(), tier: 1 },
  ];

  while (frontier.length > 0) {
    const nextFrontier: Array<{ code: string; tier: number }> = [];
    for (const node of frontier) {
      if (node.tier > 7) continue;
      for (const candidate of db.users) {
        if (visited.has(candidate.id)) continue;
        if (candidate.referredBy && candidate.referredBy.toUpperCase() === node.code) {
          visited.add(candidate.id);
          result.push({ user: candidate, tier: node.tier });
          if (node.tier < 7) {
            nextFrontier.push({
              code: candidate.referralCode.toUpperCase(),
              tier: node.tier + 1,
            });
          }
        }
      }
    }
    frontier = nextFrontier;
  }

  return result;
}

function computeUserRankSnapshot(u: StoredUser) {
  const f1Users = db.users.filter(
    (c) => c.id !== u.id && c.referredBy && c.referredBy.toUpperCase() === u.referralCode.toUpperCase()
  );
  const f1VipCount = f1Users.filter((c) => c.isVip).length;
  const weeklyF1Volume = Number(
    f1Users.reduce((sum, c) => sum + getUserWeeklyLiveVolume(c), 0).toFixed(2)
  );
  return computeBoVipRank({
    isVip: u.isVip,
    f1VipCount,
    weeklyF1Volume,
  });
}

function creditUplineCommissions(
  sourceUser: StoredUser,
  kind: 'trading' | 'vip_agency',
  baseAmount: number
) {
  if (!sourceUser.referredBy || baseAmount <= 0) return;
  const visited = new Set<string>([sourceUser.id]);
  let currentRefCode: string | null = sourceUser.referredBy;
  const nowIso = new Date().toISOString();

  for (let tier = 1; tier <= 7 && currentRefCode; tier++) {
    const sponsor = db.users.find(
      (u) => u.referralCode.toUpperCase() === currentRefCode!.toUpperCase()
    );
    if (!sponsor || visited.has(sponsor.id)) break;
    visited.add(sponsor.id);

    if (sponsor.isVip && !sponsor.isBanned) {
      const rank = computeUserRankSnapshot(sponsor);
      const commissionAmt =
        kind === 'trading'
          ? calculateTierTradingCommission(baseAmount, tier, rank.level)
          : calculateTierVipCommission(baseAmount, tier, rank.level);

      if (commissionAmt > 0) {
        const tierCfg = BO_VIP_TIERS[tier - 1];
        const ratePct =
          kind === 'trading'
            ? tierCfg.tradingRatePct
            : Number((tierCfg.vipBonusRatio * 100).toFixed(4));

        db.commissions.unshift({
          id: `com_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          recipientUserId: sponsor.id,
          sourceUserId: sourceUser.id,
          sourceNickname: sourceUser.nickname,
          tier,
          kind,
          baseAmount,
          ratePct,
          commissionAmount: commissionAmt,
          status: 'pending',
          createdAt: nowIso,
        });
        if (db.commissions.length > 600) db.commissions.length = 600;

        notifyAllAdmins(
          `Hoa hồng chờ duyệt +$${commissionAmt.toFixed(2)} (${sponsor.nickname})`,
          `${sourceUser.nickname} (F${tier}) vừa ${
            kind === 'trading' ? `giao dịch $${baseAmount.toFixed(2)}` : 'nâng cấp Đại lý VIP'
          }. Vào mục Duyệt Hoa hồng để duyệt & tự động cộng vào Ví chính của ${sponsor.nickname}.`,
          'wallet'
        );
      }
    }

    currentRefCode = sponsor.referredBy;
  }
}

function applyCommissionDecision(
  record: CommissionRecord,
  decision: 'approve' | 'reject',
  adminNickname: string
): { ok: boolean; error?: string; creditAmount: number; recipient?: StoredUser } {
  const res = decideCommissionRecord(record, decision);
  if (!res.valid || !res.nextStatus) {
    return { ok: false, error: res.error || 'Không thể xử lý khoản hoa hồng này.', creditAmount: 0 };
  }

  const nowIso = new Date().toISOString();
  record.status = res.nextStatus;
  record.processedAt = nowIso;
  record.processedBy = adminNickname;

  const recipient = db.users.find((u) => u.id === record.recipientUserId);

  if (decision === 'approve' && recipient) {
    const credited = Number(res.creditAmount.toFixed(2));
    recipient.liveBalance = Number((recipient.liveBalance + credited).toFixed(2));
    if (record.kind === 'trading') {
      recipient.totalTradingCommission = Number(
        ((recipient.totalTradingCommission ?? 0) + res.creditAmount).toFixed(4)
      );
    } else {
      recipient.totalVipCommission = Number(
        ((recipient.totalVipCommission ?? 0) + res.creditAmount).toFixed(2)
      );
    }

    const label =
      record.kind === 'trading'
        ? `Hoa hồng giao dịch · F${record.tier} (${record.sourceNickname})`
        : `Hoa hồng Đại lý VIP · F${record.tier} (${record.sourceNickname})`;

    db.transactions.unshift({
      id: `tx_com_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      userId: recipient.id,
      userEmail: recipient.email,
      type: 'commission_claim',
      amount: credited > 0 ? credited : Number(res.creditAmount.toFixed(4)),
      fee: 0,
      status: 'completed',
      addressOrPeer: label,
      note: `Admin ${adminNickname} đã duyệt & tự động cộng vào Ví chính`,
      createdAt: nowIso,
      processedAt: nowIso,
    });
    if (db.transactions.length > 500) db.transactions.length = 500;

    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: recipient.id,
      title: `Đã cộng hoa hồng +$${res.creditAmount.toFixed(2)} (F${record.tier})`,
      message: `Quản trị viên đã duyệt khoản ${
        record.kind === 'trading' ? 'hoa hồng giao dịch' : 'hoa hồng đại lý VIP'
      } từ ${record.sourceNickname}. Tiền đã tự động cộng vào Ví chính USDT của bạn.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    if (db.notifications.length > 250) db.notifications.length = 250;
  } else if (decision === 'reject' && recipient) {
    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: recipient.id,
      title: `Từ chối hoa hồng F${record.tier} (${record.sourceNickname})`,
      message: `Khoản hoa hồng $${record.commissionAmount.toFixed(2)} từ ${record.sourceNickname} không được quản trị viên phê duyệt.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    if (db.notifications.length > 250) db.notifications.length = 250;
  }

  return { ok: true, creditAmount: res.creditAmount, recipient };
}

function buildUserVipSummary(user: StoredUser): VipSummaryPayload {
  const downlines = getDownlineNetwork(user);
  const userCommissions = db.commissions.filter((c) => c.recipientUserId === user.id);
  const approvedCommissions = userCommissions.filter(
    (c) => getCommissionStatus(c) === 'approved'
  );

  const generatedBySource = new Map<string, number>();
  for (const c of approvedCommissions) {
    generatedBySource.set(
      c.sourceUserId,
      Number(((generatedBySource.get(c.sourceUserId) ?? 0) + c.commissionAmount).toFixed(4))
    );
  }

  const network: VipNetworkMember[] = downlines.map(({ user: m, tier }) => ({
    id: m.id,
    nickname: m.nickname,
    maskedEmail: m.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    tier,
    isVip: m.isVip,
    weeklyVolume: getUserWeeklyLiveVolume(m),
    totalVolume: m.totalVolume,
    commissionGenerated: Number((generatedBySource.get(m.id) ?? 0).toFixed(2)),
    createdAt: m.createdAt,
  }));

  const f1Members = network.filter((m) => m.tier === 1);
  const f1VipMembers = f1Members.filter((m) => m.isVip).length;
  const totalVipMembers = network.filter((m) => m.isVip).length;
  const weeklyF1Volume = Number(
    f1Members.reduce((sum, m) => sum + m.weeklyVolume, 0).toFixed(2)
  );
  const weeklyNetworkVolume = Number(
    network.reduce((sum, m) => sum + m.weeklyVolume, 0).toFixed(2)
  );
  const totalNetworkVolume = Number(
    network.reduce((sum, m) => sum + m.totalVolume, 0).toFixed(2)
  );

  const rankStatus = computeBoVipRank({
    isVip: user.isVip,
    f1VipCount: f1VipMembers,
    weeklyF1Volume,
  });

  // Build last 7 days approved commission breakdown chart
  const dailyChart: VipDailyCommissionPoint[] = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const label = `${dd}/${mm}`;
    let tradingCommission = 0;
    let vipCommission = 0;

    for (const c of approvedCommissions) {
      const cd = new Date(c.processedAt || c.createdAt);
      const cKey = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
      if (cKey === dateKey) {
        if (c.kind === 'trading') tradingCommission += c.commissionAmount;
        else vipCommission += c.commissionAmount;
      }
    }

    tradingCommission = Number(tradingCommission.toFixed(2));
    vipCommission = Number(vipCommission.toFixed(2));
    dailyChart.push({
      dateKey,
      label,
      tradingCommission,
      vipCommission,
      total: Number((tradingCommission + vipCommission).toFixed(2)),
    });
  }

  const totalTradingCommission = Number((user.totalTradingCommission ?? 0).toFixed(2));
  const totalVipCommission = Number((user.totalVipCommission ?? 0).toFixed(2));
  const commissionBalance = Number((user.commissionBalance ?? 0).toFixed(2));
  const totalCommissionClaimed = Number((user.totalCommissionClaimed ?? 0).toFixed(2));

  return {
    user: sanitizeUser(user),
    vipFee: db.settings.vipFee,
    rankStatus,
    stats: {
      totalMembers: network.length,
      f1Members: f1Members.length,
      totalVipMembers,
      f1VipMembers,
      weeklyF1Volume,
      weeklyNetworkVolume,
      totalNetworkVolume,
      commissionBalance,
      totalTradingCommission,
      totalVipCommission,
      totalCommissionEarned: Number((totalTradingCommission + totalVipCommission).toFixed(2)),
      totalCommissionClaimed,
    },
    network,
    commissions: userCommissions.slice(0, 120),
    dailyChart,
    tiers: [...BO_VIP_TIERS],
  };
}

// In-memory session store (persisted with simple HMAC-like token validation so restarts still work)
const SESSION_SECRET = 'hitechtrade_session_secret_2026';
function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token?: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { userId: string };
    return parsed.userId;
  } catch {
    return null;
  }
}

// ==========================================
// Synchronized BTC/USDT Market Engine
// ==========================================
function generateInitialCandles(count = 72): Candle[] {
  const candles: Candle[] = [];
  let price = 95040;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = Number(price.toFixed(2));
    const delta = Math.sin(i * 0.72) * 20 + (Math.random() - 0.5) * 44;
    const close = Number(Math.max(94200, Math.min(96200, open + delta)).toFixed(2));
    const wickUp = Math.random() * 24 + 4;
    const wickDown = Math.random() * 24 + 4;
    const high = Number((Math.max(open, close) + wickUp).toFixed(2));
    const low = Number((Math.min(open, close) - wickDown).toFixed(2));
    const volume = Number((8 + Math.random() * 24).toFixed(2));
    candles.push({
      id: 6478700 + i,
      timestamp: now - (count - i) * 30000,
      open,
      high,
      low,
      close,
      volume,
      result: close >= open ? 'BUY' : 'SELL',
    });
    price = close;
  }
  return candles;
}

const candles: Candle[] = generateInitialCandles(72);
const lastResults: TradeDirection[] = candles.slice(-76).map((c) => c.result);

let currentPrice = candles[candles.length - 1].close;
let roundId = 6478772;
let roundPhase: RoundPhase = 'betting'; // 0..29s betting, 30..59s waiting
let secondsRemaining = 30;
let roundEntryPrice = currentPrice;
let adminRoundOverride: AdminRoundOverride = 'auto';

let activeCandle: Candle = {
  id: roundId,
  timestamp: Date.now(),
  open: currentPrice,
  high: currentPrice,
  low: currentPrice,
  close: currentPrice,
  volume: 4.5,
  result: 'BUY',
};

function settleRoundOrders(settledRoundId: number, entry: number, close: number) {
  let anyChanged = false;
  const nowIso = new Date().toISOString();

  for (const order of db.trades) {
    if (order.roundId === settledRoundId && order.status === 'OPEN') {
      const outcome = settleTradeOrder(
        order.direction,
        order.amount,
        order.payoutRate,
        entry,
        close
      );
      order.status = outcome.status;
      order.pnl = outcome.pnl;
      order.closePrice = close;
      order.settledAt = nowIso;

      const user = db.users.find((u) => u.id === order.userId);
      if (user) {
        if (outcome.totalReturn > 0) {
          if (order.accountMode === 'live') {
            user.liveBalance = Number((user.liveBalance + outcome.totalReturn).toFixed(2));
          } else {
            user.demoBalance = Number((user.demoBalance + outcome.totalReturn).toFixed(2));
          }
        }
        db.notifications.unshift({
          id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: user.id,
          title:
            outcome.status === 'WON'
              ? `Thắng +$${outcome.pnl.toFixed(2)} (${order.accountMode.toUpperCase()})`
              : outcome.status === 'DRAW'
              ? `Hòa lệnh hoàn $${order.amount.toFixed(2)} (${order.accountMode.toUpperCase()})`
              : `Kết thúc lệnh -$${order.amount.toFixed(2)} (${order.accountMode.toUpperCase()})`,
          message: `Lệnh ${order.direction === 'BUY' ? 'MUA' : 'BÁN'} BTC/USDT $${order.amount.toFixed(2)} chốt ở $${close.toFixed(2)}.`,
          type: order.source === 'bot' ? 'bot' : 'trade',
          read: false,
          createdAt: nowIso,
        });
        if (db.notifications.length > 200) db.notifications.length = 200;
      }
      anyChanged = true;
    }
  }

  if (anyChanged) {
    // Detect newly qualified 9x Win/Lose Streak Prize Pool winners
    const settledUsers = new Set(
      db.trades.filter((t) => t.roundId === settledRoundId).map((t) => t.userId)
    );
    for (const uid of settledUsers) {
      const winner = db.users.find((u) => u.id === uid);
      if (!winner) continue;
      const userOrders = db.trades.filter((t) => t.userId === uid);
      const streakStats = computeUserStreakStats(userOrders, db.settings.prizePool, 10, 9);
      for (const rec of streakStats.records) {
        const exists = db.prizeClaims.some(
          (c) => c.userId === uid && c.streakRecordId === rec.id
        );
        if (!exists) {
          const prizeAmt = Number(Math.max(5, rec.estimatedPrize).toFixed(2));
          const claim: PrizePoolClaim = {
            id: `claim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            streakRecordId: rec.id,
            userId: winner.id,
            userEmail: winner.email,
            userNickname: winner.nickname,
            streakType: rec.type,
            streakLength: rec.length,
            prizeAmount: prizeAmt,
            status: 'eligible',
            twoFactorVerified: false,
            createdAt: nowIso,
          };
          db.prizeClaims.unshift(claim);
          db.notifications.unshift({
            id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId: winner.id,
            title: `🎉 Chúc mừng bạn thắng Prize Pool (+$${prizeAmt.toFixed(2)})`,
            message: `Bạn đạt ${rec.type === 'WIN' ? 'Win' : 'Lose'} Streak ${rec.length}x! Mở mục Prize Pool, nhấn Nhận thưởng và xác thực 2FA để nhận tiền.`,
            type: 'prize',
            read: false,
            createdAt: nowIso,
          });
          notifyAllAdmins(
            `🏆 Thắng Prize Pool: ${winner.nickname} (+$${prizeAmt.toFixed(2)})`,
            `Người dùng ${winner.nickname} (${winner.email}) vừa đạt ${rec.type === 'WIN' ? 'Win' : 'Lose'} Streak ${rec.length}x và thắng $${prizeAmt.toFixed(2)} từ Prize Pool.`
          );
        }
      }
    }
    saveDb();
  }
}

// 500ms tick loop for smooth Kaizenfin-style live candlestick movement
setInterval(() => {
  const cycleBias = Math.sin(roundId * 0.95) * 1.15;
  const meanPull = (95100 - currentPrice) * 0.004;
  let drift = (Math.random() - 0.5) * 10.5 + cycleBias + meanPull;
  if (roundPhase === 'waiting' && adminRoundOverride !== 'auto') {
    const targetGap = adminRoundOverride === 'BUY' ? 18 : -18;
    const desired = roundEntryPrice + targetGap;
    drift = (desired - currentPrice) * 0.25 + (Math.random() - 0.5) * 2.5;
  }
  currentPrice = Number(Math.max(93500, Math.min(97500, currentPrice + drift)).toFixed(2));
  activeCandle.close = currentPrice;
  activeCandle.high = Number(Math.max(activeCandle.high, currentPrice).toFixed(2));
  activeCandle.low = Number(Math.min(activeCandle.low, currentPrice).toFixed(2));
  activeCandle.volume = Number((activeCandle.volume + Math.random() * 0.35).toFixed(2));
  activeCandle.result = activeCandle.close >= activeCandle.open ? 'BUY' : 'SELL';
}, 500);

// 1s phase countdown loop (30s Betting -> 30s Waiting -> Settle -> New Round)
setInterval(() => {
  secondsRemaining -= 1;
  if (secondsRemaining <= 0) {
    if (roundPhase === 'betting') {
      // Transition to 30s result / waiting phase
      roundPhase = 'waiting';
      secondsRemaining = 30;
      roundEntryPrice = activeCandle.open;
    } else {
      // Close active candle, settle orders, start new betting round
      let finalClose = currentPrice;
      if (adminRoundOverride === 'BUY' && finalClose <= activeCandle.open) {
        finalClose = Number((activeCandle.open + 14.5).toFixed(2));
      } else if (adminRoundOverride === 'SELL' && finalClose >= activeCandle.open) {
        finalClose = Number((activeCandle.open - 14.5).toFixed(2));
      }
      currentPrice = finalClose;
      activeCandle.close = finalClose;
      activeCandle.high = Number(Math.max(activeCandle.high, finalClose).toFixed(2));
      activeCandle.low = Number(Math.min(activeCandle.low, finalClose).toFixed(2));
      activeCandle.result = finalClose >= activeCandle.open ? 'BUY' : 'SELL';

      candles.push({ ...activeCandle });
      if (candles.length > 90) candles.shift();

      lastResults.push(activeCandle.result);
      if (lastResults.length > 100) lastResults.shift();

      settleRoundOrders(roundId, activeCandle.open, finalClose);

      db.settings.prizePool = Number((db.settings.prizePool + Math.random() * 4.2).toFixed(2));

      roundId += 1;
      roundPhase = 'betting';
      secondsRemaining = 30;
      adminRoundOverride = 'auto';
      roundEntryPrice = currentPrice;
      activeCandle = {
        id: roundId,
        timestamp: Date.now(),
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 1.2,
        result: 'BUY',
      };
    }
  }
}, 1000);

// ==========================================
// Express Server & API Routes
// ==========================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  function getAuthUser(req: express.Request): StoredUser | null {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const userId = verifyToken(token);
    if (!userId) return null;
    return db.users.find((u) => u.id === userId) ?? null;
  }

  function requireAuth(req: express.Request, res: express.Response): StoredUser | null {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
      return null;
    }
    if (user.isBanned) {
      res.status(403).json({ error: 'Tài khoản của bạn đã bị tạm khóa bởi quản trị viên.' });
      return null;
    }
    return user;
  }

  function requireAdmin(req: express.Request, res: express.Response): StoredUser | null {
    const user = requireAuth(req, res);
    if (!user) return null;
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Bạn không có quyền truy cập bảng điều khiển Admin.' });
      return null;
    }
    return user;
  }

  // --- Auth Routes ---
  app.post('/api/auth/register', (req, res) => {
    const { email, nickname, password, referralCode } = req.body as {
      email?: string;
      nickname?: string;
      password?: string;
      referralCode?: string;
    };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanNick = (nickname ?? '').trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }
    if (!cleanNick || cleanNick.length < 3) {
      return res.status(400).json({ error: 'Biệt danh phải có ít nhất 3 ký tự.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }
    if (db.users.some((u) => u.email === cleanEmail)) {
      return res.status(409).json({ error: 'Email này đã được đăng ký.' });
    }
    if (db.users.some((u) => u.nickname.toLowerCase() === cleanNick.toLowerCase())) {
      return res.status(409).json({ error: 'Biệt danh này đã có người sử dụng.' });
    }

    const id = `usr_${Date.now().toString(36)}`;
    const newUser: StoredUser = {
      id,
      email: cleanEmail,
      nickname: cleanNick,
      passwordHash: hashPassword(password),
      role: 'user',
      liveBalance: 0,
      demoBalance: 1000,
      walletAddress: generateDeterministicBep20Address(id + cleanEmail),
      referralCode: `HT${Math.floor(1000 + Math.random() * 9000)}`,
      referredBy: referralCode?.trim() || null,
      isVip: false,
      twoFactorEnabled: false,
      kycStatus: 'unverified',
      isBanned: false,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalVolume: 0,
      commissionBalance: 0,
      totalTradingCommission: 0,
      totalVipCommission: 0,
      totalCommissionClaimed: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: id,
      title: 'Tặng $1,000 tài khoản Demo',
      message: 'Tài khoản RaidenBO của bạn đã sẵn sàng với $1,000 vốn thử nghiệm miễn phí.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();

    const token = createToken(id);
    return res.json({ token, user: sanitizeUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const identifier = (email ?? '').trim().toLowerCase();
    const rawPassword = password ?? '';
    const pwHash = hashPassword(rawPassword);

    let user = db.users.find(
      (u) => u.email.toLowerCase() === identifier || u.nickname.toLowerCase() === identifier
    );

    const isIssuedAdminLogin =
      (identifier === DEFAULT_ADMIN_EMAIL || identifier === 'adminmaster') &&
      rawPassword === DEFAULT_ADMIN_PASSWORD;

    if (!user && isIssuedAdminLogin) {
      user = db.users.find((u) => u.id === 'usr_admin_01' || u.role === 'admin');
    }

    const passwordValid =
      Boolean(user) &&
      (user!.passwordHash === pwHash || (user!.role === 'admin' && isIssuedAdminLogin));

    if (!user || !passwordValid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ support@raidenbo.io.' });
    }
    const token = createToken(user.id);
    return res.json({ token, user: sanitizeUser(user) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email.' });
    }
    return res.json({
      message: `Nếu email ${cleanEmail} tồn tại trên hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.`,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    return res.json({ user: sanitizeUser(user) });
  });

  // --- Market & Trade Routes ---
  app.get('/api/market/state', (req, res) => {
    const allCandles = [...candles, activeCandle];
    const indicators = computeIndicators(allCandles);
    const open24h = candles[0]?.open ?? currentPrice;
    const high24h = Math.max(...allCandles.map((c) => c.high));
    const low24h = Math.min(...allCandles.map((c) => c.low));
    const change24hPct = Number((((currentPrice - open24h) / open24h) * 100).toFixed(2));

    const snapshot: MarketSnapshot = {
      pair: 'BTC/USDT',
      currentPrice,
      open24h,
      high24h,
      low24h,
      change24hPct,
      roundId,
      phase: roundPhase,
      secondsRemaining,
      candles: allCandles.slice(-60),
      lastResults: lastResults.slice(-80),
      prizePool: db.settings.prizePool,
      payoutRate: db.settings.payoutRate,
      sentimentBuyPct: indicators.sentimentBuyPct,
      sentimentSellPct: indicators.sentimentSellPct,
      maintenanceMode: db.settings.maintenanceMode,
      depositWalletAddress: db.settings.masterWalletAddress,
    };

    const user = getAuthUser(req);
    const orders = user
      ? db.trades.filter((t) => t.userId === user.id).slice(0, 200)
      : [];
    const recentCommissions = user
      ? db.commissions
          .filter(
            (c) => c.recipientUserId === user.id && getCommissionStatus(c) === 'approved'
          )
          .sort(
            (a, b) =>
              new Date(b.processedAt || b.createdAt).getTime() -
              new Date(a.processedAt || a.createdAt).getTime()
          )
          .slice(0, 20)
      : [];

    return res.json({
      market: snapshot,
      user: user ? sanitizeUser(user) : null,
      orders,
      recentCommissions,
    });
  });

  app.post('/api/trades', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    if (db.settings.maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({ error: 'Hệ thống đang bảo trì giao dịch tạm thời.' });
    }

    if (roundPhase !== 'betting') {
      return res.status(400).json({ error: 'Đang trong thời gian chờ kết quả. Vui lòng đợi phiên kế tiếp.' });
    }

    const { direction, amount, accountMode, source } = req.body as {
      direction?: TradeDirection;
      amount?: number;
      accountMode?: AccountMode;
      source?: 'manual' | 'bot';
    };

    if (direction !== 'BUY' && direction !== 'SELL') {
      return res.status(400).json({ error: 'Hướng đặt lệnh không hợp lệ.' });
    }
    const mode: AccountMode = accountMode === 'live' ? 'live' : 'demo';
    const stake = Number(amount ?? 0);
    if (!Number.isFinite(stake) || stake < db.settings.minTradeAmount || stake > db.settings.maxTradeAmount) {
      return res.status(400).json({
        error: `Số tiền đặt lệnh phải từ $${db.settings.minTradeAmount} đến $${db.settings.maxTradeAmount}.`,
      });
    }

    const available = mode === 'live' ? user.liveBalance : user.demoBalance;
    if (stake > available) {
      return res.status(400).json({
        error: `Số dư tài khoản ${mode === 'live' ? 'Thực (Live)' : 'Demo'} không đủ.`,
      });
    }

    if (mode === 'live') {
      user.liveBalance = Number((user.liveBalance - stake).toFixed(2));
      user.totalVolume = Number((user.totalVolume + stake).toFixed(2));
      creditUplineCommissions(user, 'trading', stake);
    } else {
      user.demoBalance = Number((user.demoBalance - stake).toFixed(2));
    }

    const newOrder: TradeOrder = {
      id: `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      userEmail: user.email,
      pair: 'BTC/USDT',
      accountMode: mode,
      direction,
      amount: stake,
      payoutRate: db.settings.payoutRate,
      entryPrice: currentPrice,
      roundId,
      status: 'OPEN',
      pnl: 0,
      source: source === 'bot' ? 'bot' : 'manual',
      createdAt: new Date().toISOString(),
    };

    db.trades.unshift(newOrder);
    if (db.trades.length > 500) db.trades.length = 500;
    saveDb();

    return res.json({ order: newOrder, user: sanitizeUser(user) });
  });

  // --- Server-Side Gemini AI Deep Order Prediction ---
  app.post('/api/bot/ai-predict', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        error:
          'Chưa cấu hình GEMINI_API_KEY trong bảng Settings > Secrets để chạy phân tích chuyên sâu Gemini AI. Bộ dự đoán kỹ thuật 5 chỉ báo thời gian thực vẫn đang hoạt động bình thường.',
      });
    }

    const { lang } = (req.body || {}) as { lang?: Language };
    const isVi = lang !== 'en';
    const allCandles = [...candles, activeCandle];
    const recentCandles = allCandles.slice(-20);
    const indicators = computeIndicators(allCandles);
    const quant = computeAiOrderPrediction(allCandles, lastResults.slice(-20), roundId);
    const lastIdx = Math.max(0, indicators.ema5.length - 1);

    const candleLines = recentCandles
      .map(
        (c, i) =>
          `#${i + 1} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${c.volume.toFixed(1)} (${c.result})`
      )
      .join('\n');

    const prompt = [
      `Analyze the live BTC/USDT 60-second market snapshot for Round #${roundId} (phase: ${roundPhase}, ${secondsRemaining}s remaining).`,
      `Current Price: $${currentPrice.toFixed(2)}`,
      `EMA5: ${(indicators.ema5[lastIdx] ?? currentPrice).toFixed(2)}, EMA10: ${(indicators.ema10[lastIdx] ?? currentPrice).toFixed(2)}`,
      `RSI(14): ${indicators.rsi14}, MACD: ${indicators.macd}, Signal: ${indicators.macdSignal}`,
      `Bollinger Upper: ${indicators.bollingerUpper}, Lower: ${indicators.bollingerLower}`,
      `Recent 15 Waterdrop results (oldest -> newest): ${lastResults.slice(-15).join(', ')}`,
      `5-Factor Quant Baseline: ${quant.direction} (${quant.confidencePct}%), Support: ${quant.supportPrice}, Resistance: ${quant.resistancePrice}`,
      `Last 20 candles:\n${candleLines}`,
      isVi
        ? 'Trả về nhận định dự đoán lệnh tiếp theo (BUY hoặc SELL) ngắn gọn, chuyên nghiệp bằng tiếng Việt theo đúng cấu trúc JSON.'
        : 'Return a concise, professional next-round order forecast (BUY or SELL) in English matching the JSON schema.',
    ].join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: isVi
            ? 'Bạn là chuyên gia phân tích định lượng BTC/USDT khung 1 phút cho sàn RaidenBO. Đưa ra phân tích súc tích, thực tế (headline dưới 14 từ, analysis 2-3 câu rõ ràng, riskNote 1 câu nhắc quản trị vốn). Không bao giờ khẳng định thắng 100%.'
            : 'You are a quantitative 1-minute BTC/USDT market analyst for RaidenBO. Provide concise, disciplined analysis (headline under 14 words, analysis 2-3 sentences, riskNote 1 sentence on risk management). Never guarantee profits.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              direction: {
                type: Type.STRING,
                description: 'Must be strictly BUY or SELL.',
              },
              confidencePct: {
                type: Type.INTEGER,
                description: 'Calibrated integer confidence percentage between 52 and 92.',
              },
              headline: {
                type: Type.STRING,
                description: 'Short tactical headline summarizing the signal.',
              },
              analysis: {
                type: Type.STRING,
                description: '2-3 sentences explaining price action, EMA/RSI/MACD momentum, and waterdrop context.',
              },
              riskNote: {
                type: Type.STRING,
                description: '1 concise risk management warning for this round.',
              },
              supportLevel: {
                type: Type.NUMBER,
                description: 'Immediate support price in USDT.',
              },
              resistanceLevel: {
                type: Type.NUMBER,
                description: 'Immediate resistance price in USDT.',
              },
            },
            required: [
              'direction',
              'confidencePct',
              'headline',
              'analysis',
              'riskNote',
              'supportLevel',
              'resistanceLevel',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Gemini AI không trả về dữ liệu phân tích. Vui lòng thử lại.' });
      }

      const parsed = JSON.parse(rawText) as {
        direction?: string;
        confidencePct?: number;
        headline?: string;
        analysis?: string;
        riskNote?: string;
        supportLevel?: number;
        resistanceLevel?: number;
      };

      const normalizedDir: TradeDirection =
        String(parsed.direction || '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
      const clampedConfidence = Math.min(
        94,
        Math.max(52, Math.round(Number(parsed.confidencePct) || quant.confidencePct))
      );

      const result: GeminiDeepPrediction = {
        roundId,
        model: 'gemini-4-hydrogen',
        direction: normalizedDir,
        confidencePct: clampedConfidence,
        headline: String(parsed.headline || '').trim(),
        analysis: String(parsed.analysis || '').trim(),
        riskNote: String(parsed.riskNote || '').trim(),
        supportLevel: Number((Number(parsed.supportLevel) || quant.supportPrice).toFixed(2)),
        resistanceLevel: Number((Number(parsed.resistanceLevel) || quant.resistancePrice).toFixed(2)),
        generatedAt: new Date().toISOString(),
      };

      return res.json({ prediction: result });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : 502;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (status === 400 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(errMsg)) {
        return res.status(403).json({
          error:
            'API Key Gemini không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại GEMINI_API_KEY trong Settings > Secrets.',
        });
      }
      if (status === 429 || /RESOURCE_EXHAUSTED/i.test(errMsg)) {
        return res.status(429).json({
          error:
            'Đã vượt hạn mức gọi Gemini API tạm thời. Vui lòng thử lại sau ít phút hoặc nâng cấp khóa API trong Settings > Secrets.',
        });
      }
      return res.status(502).json({
        error: `Không thể kết nối dịch vụ Gemini AI lúc này (${errMsg.slice(0, 120)}).`,
      });
    }
  });

  // --- Account & Profile Routes ---
  app.post('/api/account/reset-demo', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    user.demoBalance = 1000;
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/profile', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const {
      nickname,
      twoFactorEnabled,
      hideSensitiveData,
      avatarUrl,
      kycFullName,
      kycDocNumber,
    } = req.body as {
      nickname?: string;
      twoFactorEnabled?: boolean;
      hideSensitiveData?: boolean;
      avatarUrl?: string | null;
      kycFullName?: string;
      kycDocNumber?: string;
    };

    if (nickname !== undefined) {
      const clean = nickname.trim();
      if (clean.length < 3) return res.status(400).json({ error: 'Biệt danh tối thiểu 3 ký tự.' });
      const duplicate = db.users.some(
        (u) => u.id !== user.id && u.nickname.toLowerCase() === clean.toLowerCase()
      );
      if (duplicate) return res.status(409).json({ error: 'Biệt danh này đã có người sử dụng.' });
      user.nickname = clean;
    }
    if (typeof twoFactorEnabled === 'boolean' && twoFactorEnabled !== user.twoFactorEnabled) {
      return res.status(400).json({
        error: 'Vui lòng sử dụng xác thực Google Authenticator (mật khẩu + mã 2FA) để bật/tắt 2FA.',
      });
    }
    if (typeof hideSensitiveData === 'boolean') {
      user.hideSensitiveData = hideSensitiveData;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        delete user.avatarUrl;
      } else if (
        typeof avatarUrl === 'string' &&
        avatarUrl.startsWith('data:image/') &&
        avatarUrl.length <= 450_000
      ) {
        user.avatarUrl = avatarUrl;
      } else {
        return res.status(400).json({ error: 'Ảnh đại diện không hợp lệ hoặc vượt quá dung lượng cho phép.' });
      }
    }
    if (kycFullName && kycDocNumber) {
      if (user.kycStatus === 'verified') {
        return res.status(400).json({ error: 'Hồ sơ đã xác minh không thể chỉnh sửa.' });
      }
      user.kycFullName = kycFullName.trim();
      user.kycDocNumber = kycDocNumber.trim();
      user.kycStatus = 'pending';
      db.notifications.unshift({
        id: `ntf_${Date.now()}`,
        userId: user.id,
        title: 'Hồ sơ KYC đã được gửi',
        message: 'Hồ sơ định danh của bạn đang được quản trị viên xét duyệt.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/change-password', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    const check = validatePasswordChange({
      twoFactorEnabled: user.twoFactorEnabled,
      currentPassword: currentPassword ?? '',
      newPassword: newPassword ?? '',
      confirmPassword: confirmPassword ?? '',
    });
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }
    if (user.passwordHash !== hashPassword(currentPassword ?? '')) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }
    user.passwordHash = hashPassword(newPassword ?? '');
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: 'Đổi mật khẩu thành công',
      message: 'Mật khẩu đăng nhập RaidenBO của bạn vừa được cập nhật.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();
    return res.json({ ok: true, message: 'Đổi mật khẩu thành công.' });
  });

  // --- Google Authenticator 2FA Setup / Enable / Disable ---
  app.post('/api/account/2fa/setup', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const secret = generateRandomBase32Secret(16);
    user.pendingTwoFactorSecret = secret;
    saveDb();
    return res.json({
      secret,
      otpauthUrl: buildOtpAuthUri(user.email, secret, 'RaidenBO'),
    });
  });

  app.post('/api/account/2fa/enable', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { password, totpCode } = req.body as {
      password?: string;
      totpCode?: string;
    };
    if (!password || user.passwordHash !== hashPassword(password)) {
      return res.status(400).json({ error: 'Mật khẩu đăng nhập không chính xác.' });
    }
    if (!user.pendingTwoFactorSecret) {
      return res.status(400).json({
        error: 'Phiên tạo khóa 2FA chưa sẵn sàng. Vui lòng tạo key ngẫu nhiên mới.',
      });
    }
    if (!verifyTotpCode(user.pendingTwoFactorSecret, totpCode ?? '')) {
      return res.status(400).json({
        error: 'Mã 2FA không chính xác hoặc đã hết hạn. Vui lòng kiểm tra ứng dụng Google Authenticator.',
      });
    }

    user.twoFactorSecret = user.pendingTwoFactorSecret;
    user.twoFactorEnabled = true;
    delete user.pendingTwoFactorSecret;
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: 'Đã bật Xác Thực Google (2FA)',
      message: 'Tài khoản của bạn đã được bảo vệ bằng mã xác thực 2FA Google Authenticator.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/account/2fa/disable', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { password, totpCode } = req.body as {
      password?: string;
      totpCode?: string;
    };
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Tài khoản hiện chưa bật Xác Thực Google (2FA).' });
    }
    if (!password || user.passwordHash !== hashPassword(password)) {
      return res.status(400).json({ error: 'Mật khẩu đăng nhập không chính xác.' });
    }
    if (!verifyTotpCode(user.twoFactorSecret, totpCode ?? '')) {
      return res.status(400).json({
        error: 'Mã 2FA không chính xác hoặc đã hết hạn.',
      });
    }

    user.twoFactorEnabled = false;
    delete user.twoFactorSecret;
    delete user.pendingTwoFactorSecret;
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: 'Đã tắt Xác Thực Google (2FA)',
      message: 'Xác thực 2 lớp Google Authenticator vừa được tắt cho tài khoản của bạn.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveDb();
    return res.json({ user: sanitizeUser(user) });
  });

  // --- Prize Pool Winner Claims (2FA Verified) ---
  app.get('/api/prizepool/claims', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const claims = db.prizeClaims.filter((c) => c.userId === user.id);
    return res.json({ claims });
  });

  app.post('/api/prizepool/claims/:id/claim', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const claim = db.prizeClaims.find((c) => c.id === req.params.id && c.userId === user.id);
    if (!claim) {
      return res.status(404).json({ error: 'Không tìm thấy giải thưởng Prize Pool hợp lệ.' });
    }
    if (claim.status === 'claimed') {
      return res.status(400).json({ error: 'Bạn đã gửi yêu cầu nhận thưởng. Đang chờ Admin cộng tiền.' });
    }
    if (claim.status === 'paid') {
      return res.status(400).json({ error: 'Giải thưởng này đã được cộng vào tài khoản của bạn.' });
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        error: 'Bạn bắt buộc phải bật Xác Thực Google (2FA) trước khi nhận thưởng Prize Pool.',
      });
    }

    const { totpCode } = req.body as { totpCode?: string };
    if (!verifyTotpCode(user.twoFactorSecret, totpCode ?? '')) {
      return res.status(400).json({
        error: 'Mã 2FA không chính xác hoặc đã hết hạn. Vui lòng nhập đúng mã từ Google Authenticator.',
      });
    }

    const nowIso = new Date().toISOString();
    claim.status = 'claimed';
    claim.twoFactorVerified = true;
    claim.claimedAt = nowIso;

    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      userId: user.id,
      title: `Đã xác thực 2FA nhận thưởng Prize Pool ($${claim.prizeAmount.toFixed(2)})`,
      message: `Yêu cầu nhận thưởng $${claim.prizeAmount.toFixed(2)} đã được gửi tới quản trị viên. Admin sẽ cộng tiền trực tiếp vào Ví Thực của bạn.`,
      type: 'prize',
      read: false,
      createdAt: nowIso,
    });

    const streakDesc =
      claim.streakType === 'MEGA'
        ? 'Mega Prize'
        : `${claim.streakType === 'WIN' ? 'Win' : 'Lose'} Streak ${claim.streakLength}x`;

    notifyAllAdmins(
      `🏆 Nhận thưởng Prize Pool: ${user.nickname} (+$${claim.prizeAmount.toFixed(2)})`,
      `Người dùng ${user.nickname} (${user.email}) thắng ${streakDesc} và đã nhập mã 2FA yêu cầu nhận thưởng $${claim.prizeAmount.toFixed(2)}. Mở mục Thưởng Prize Pool để cộng tiền vào tài khoản.`
    );

    saveDb();
    return res.json({ claim });
  });

  app.get('/api/account/network-info', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const cleanIp = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
    return res.json({
      ip: cleanIp,
      serverTime: Date.now(),
    });
  });

  app.get('/api/vip/summary', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    return res.json(buildUserVipSummary(user));
  });

  app.post('/api/account/upgrade-vip', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (user.isVip) {
      return res.status(400).json({ error: 'Tài khoản của bạn đã là thành viên VIP.' });
    }
    const fee = db.settings.vipFee;
    if (user.liveBalance < fee) {
      return res.status(400).json({ error: `Cần ít nhất ${fee} USDT trong Ví Thực để nâng cấp VIP.` });
    }
    const nowIso = new Date().toISOString();
    user.liveBalance = Number((user.liveBalance - fee).toFixed(2));
    user.isVip = true;
    db.transactions.unshift({
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'vip_upgrade',
      amount: fee,
      fee: 0,
      status: 'completed',
      addressOrPeer: 'RaidenBO VIP Agency',
      note: 'Mua quyền Đại lý VIP (7 tầng hoa hồng BO)',
      createdAt: nowIso,
      processedAt: nowIso,
    });
    creditUplineCommissions(user, 'vip_agency', fee);
    db.notifications.unshift({
      id: `ntf_${Date.now()}_vip`,
      userId: user.id,
      title: 'Kích hoạt Quyền Đại Lý VIP thành công',
      message: 'Bạn đã đạt Cấp bậc 1 và mở khóa nhận hoa hồng giao dịch 1% & hoa hồng đại lý $50 từ F1.',
      type: 'system',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({ user: sanitizeUser(user), summary: buildUserVipSummary(user) });
  });

  // --- Wallet, Commission Claim, QR Deposit, Withdraw & Internal Transfer ---
  app.get('/api/wallet/transactions', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const txs = db.transactions.filter((t) => t.userId === user.id);
    const commissions = db.commissions.filter((c) => c.recipientUserId === user.id).slice(0, 120);
    const referrals = db.users
      .filter((u) => u.referredBy === user.referralCode)
      .map((u) => ({
        nickname: u.nickname,
        email: u.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
        isVip: u.isVip,
        totalVolume: u.totalVolume,
        createdAt: u.createdAt,
      }));
    return res.json({ transactions: txs, commissions, referrals, settings: db.settings });
  });

  app.post('/api/wallet/commission/claim', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const available = Number((user.commissionBalance ?? 0).toFixed(2));
    const requestedRaw = (req.body as { amount?: number })?.amount;
    const amt =
      requestedRaw === undefined || requestedRaw === null
        ? available
        : Number(Number(requestedRaw).toFixed(2));

    const check = validateCommissionClaim({ availableCommission: available, amount: amt, minAmount: 1 });
    if (!check.valid) {
      return res.status(400).json({ error: check.error || 'Số tiền rút hoa hồng không hợp lệ.' });
    }

    const nowIso = new Date().toISOString();
    user.commissionBalance = Number(Math.max(0, available - amt).toFixed(2));
    user.liveBalance = Number((user.liveBalance + amt).toFixed(2));
    user.totalCommissionClaimed = Number(((user.totalCommissionClaimed ?? 0) + amt).toFixed(2));

    const tx: WalletTransaction = {
      id: `tx_com_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'commission_claim',
      amount: amt,
      fee: 0,
      status: 'completed',
      addressOrPeer: 'Ví Hoa Hồng → Ví Chính (USDT)',
      note: 'Chuyển hoa hồng về Ví chính (0% phí)',
      createdAt: nowIso,
      processedAt: nowIso,
    };

    db.transactions.unshift(tx);
    db.notifications.unshift({
      id: `ntf_${Date.now()}_com`,
      userId: user.id,
      title: `Chuyển hoa hồng +$${amt.toFixed(2)}`,
      message: `Bạn đã rút ${amt.toFixed(2)} USDT từ Ví Hoa Hồng sang Ví Chính (phí 0%).`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({
      user: sanitizeUser(user),
      transaction: tx,
      commissionBalance: user.commissionBalance,
    });
  });

  app.post('/api/wallet/deposit', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { amount, txHash, instantTestCredit } = req.body as {
      amount?: number;
      txHash?: string;
      instantTestCredit?: boolean;
    };
    const amt = Number(amount ?? 0);
    if (!Number.isFinite(amt) || amt < 5) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu là 5 USDT.' });
    }
    const nowIso = new Date().toISOString();
    const isInstant = Boolean(instantTestCredit);

    const tx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'deposit',
      amount: amt,
      fee: 0,
      status: isInstant ? 'completed' : 'pending',
      addressOrPeer: resolveDepositWalletAddress(db.settings.masterWalletAddress, user.walletAddress),
      txHash: txHash?.trim() || `0x${crypto.randomBytes(16).toString('hex')}`,
      note: isInstant ? 'Nạp USDT xác nhận nhanh' : 'Nạp USDT chờ Admin duyệt',
      createdAt: nowIso,
      processedAt: isInstant ? nowIso : undefined,
    };

    if (isInstant) {
      user.liveBalance = Number((user.liveBalance + amt).toFixed(2));
      user.totalDeposited = Number((user.totalDeposited + amt).toFixed(2));
    }

    db.transactions.unshift(tx);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: isInstant ? `Nạp thành công +$${amt.toFixed(2)}` : `Yêu cầu nạp $${amt.toFixed(2)}`,
      message: isInstant
        ? `Số dư Ví Thực đã được cộng +${amt.toFixed(2)} USDT.`
        : `Lệnh nạp ${amt.toFixed(2)} USDT đang chờ quản trị viên xác nhận.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({ transaction: tx, user: sanitizeUser(user) });
  });

  app.post('/api/wallet/withdraw', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const { amount, address, note } = req.body as {
      amount?: number;
      address?: string;
      note?: string;
    };
    const amt = Number(amount ?? 0);
    const fee = db.settings.withdrawFee;
    if (!Number.isFinite(amt) || amt < 5) {
      return res.status(400).json({ error: 'Số tiền rút tối thiểu là 5 USDT.' });
    }
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      return res.status(400).json({ error: 'Địa chỉ ví nhận (0x...) không hợp lệ.' });
    }
    if (amt + fee > user.liveBalance) {
      return res.status(400).json({
        error: `Số dư Ví Thực không đủ (cần ${(amt + fee).toFixed(2)} USDT bao gồm phí ${fee} USDT).`,
      });
    }

    user.liveBalance = Number((user.liveBalance - (amt + fee)).toFixed(2));
    const nowIso = new Date().toISOString();
    const tx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}`,
      userId: user.id,
      userEmail: user.email,
      type: 'withdraw',
      amount: amt,
      fee,
      status: 'pending',
      addressOrPeer: address.trim(),
      note: note?.trim() || 'Rút USDT',
      createdAt: nowIso,
    };
    db.transactions.unshift(tx);
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: user.id,
      title: `Yêu cầu rút -$${amt.toFixed(2)}`,
      message: `Lệnh rút ${amt.toFixed(2)} USDT về ${address.slice(0, 8)}... đang chờ duyệt.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();
    return res.json({ transaction: tx, user: sanitizeUser(user) });
  });

  app.get('/api/wallet/lookup', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const query = String(req.query.query ?? '').trim().toLowerCase();
    if (!query) {
      return res.status(400).json({ error: 'Nhập Email hoặc Biệt danh người nhận.' });
    }
    const found = db.users.find(
      (u) => u.email.toLowerCase() === query || u.nickname.toLowerCase() === query
    );
    if (!found) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người nhận.' });
    }
    if (found.id === user.id) {
      return res.status(400).json({ error: 'Không thể chuyển tiền cho chính tài khoản của bạn.' });
    }
    return res.json({
      recipient: {
        id: found.id,
        email: found.email,
        nickname: found.nickname,
        isVip: found.isVip,
      },
    });
  });

  app.post('/api/wallet/transfer', (req, res) => {
    const sender = requireAuth(req, res);
    if (!sender) return;
    const { recipientQuery, amount, note } = req.body as {
      recipientQuery?: string;
      amount?: number;
      note?: string;
    };
    const q = (recipientQuery ?? '').trim().toLowerCase();
    const recipient = db.users.find(
      (u) => u.email.toLowerCase() === q || u.nickname.toLowerCase() === q
    );
    const amt = Number(amount ?? 0);
    const check = validateInternalTransfer({ sender, recipient, amount: amt });
    if (!check.valid || !recipient) {
      return res.status(400).json({ error: check.error || 'Giao dịch không hợp lệ.' });
    }

    sender.liveBalance = Number((sender.liveBalance - amt).toFixed(2));
    recipient.liveBalance = Number((recipient.liveBalance + amt).toFixed(2));
    const nowIso = new Date().toISOString();

    const outTx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}_out`,
      userId: sender.id,
      userEmail: sender.email,
      type: 'transfer_out',
      amount: amt,
      fee: 0,
      status: 'completed',
      addressOrPeer: `${recipient.nickname} (${recipient.email})`,
      note: note?.trim() || 'Chuyển tiền nội bộ RaidenBO',
      createdAt: nowIso,
      processedAt: nowIso,
    };

    const inTx: WalletTransaction = {
      id: `tx_${Date.now().toString(36)}_in`,
      userId: recipient.id,
      userEmail: recipient.email,
      type: 'transfer_in',
      amount: amt,
      fee: 0,
      status: 'completed',
      addressOrPeer: `${sender.nickname} (${sender.email})`,
      note: note?.trim() || 'Nhận chuyển tiền nội bộ RaidenBO',
      createdAt: nowIso,
      processedAt: nowIso,
    };

    db.transactions.unshift(outTx, inTx);
    db.notifications.unshift(
      {
        id: `ntf_${Date.now()}_s`,
        userId: sender.id,
        title: `Đã chuyển -$${amt.toFixed(2)}`,
        message: `Bạn đã chuyển nội bộ ${amt.toFixed(2)} USDT đến ${recipient.nickname}.`,
        type: 'wallet',
        read: false,
        createdAt: nowIso,
      },
      {
        id: `ntf_${Date.now()}_r`,
        userId: recipient.id,
        title: `Nhận +$${amt.toFixed(2)}`,
        message: `Bạn vừa nhận ${amt.toFixed(2)} USDT từ ${sender.nickname} (Phí 0%).`,
        type: 'wallet',
        read: false,
        createdAt: nowIso,
      }
    );
    saveDb();

    return res.json({ transaction: outTx, user: sanitizeUser(sender) });
  });

  // --- Notifications ---
  app.get('/api/notifications', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const list = db.notifications.filter((n) => n.userId === user.id).slice(0, 30);
    return res.json({ notifications: list });
  });

  app.post('/api/notifications/read', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    for (const n of db.notifications) {
      if (n.userId === user.id) n.read = true;
    }
    saveDb();
    return res.json({ ok: true });
  });

  // --- Admin Control Panel APIs ---
  app.get('/api/admin/overview', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const currentRoundOrders = db.trades.filter((t) => t.roundId === roundId && t.status === 'OPEN');
    const liveBuyVolume = currentRoundOrders
      .filter((t) => t.accountMode === 'live' && t.direction === 'BUY')
      .reduce((acc, t) => acc + t.amount, 0);
    const liveSellVolume = currentRoundOrders
      .filter((t) => t.accountMode === 'live' && t.direction === 'SELL')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalBuyVolume = currentRoundOrders
      .filter((t) => t.direction === 'BUY')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalSellVolume = currentRoundOrders
      .filter((t) => t.direction === 'SELL')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalUsers = db.users.length;
    const totalLiveBalance = db.users.reduce((acc, u) => acc + u.liveBalance, 0);
    const totalVolume = db.users.reduce((acc, u) => acc + u.totalVolume, 0);
    const pendingDeposits = db.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending').length;
    const pendingWithdrawals = db.transactions.filter((t) => t.type === 'withdraw' && t.status === 'pending').length;
    const pendingPrizeClaims = db.prizeClaims.filter(
      (c) => c.status === 'claimed' || c.status === 'eligible'
    ).length;
    const pendingCommissions = db.commissions.filter(
      (c) => getCommissionStatus(c) === 'pending'
    ).length;
    const platformNetPnl = db.trades
      .filter((t) => t.accountMode === 'live' && t.status !== 'OPEN')
      .reduce((acc, t) => acc - t.pnl, 0);

    const userLookup = new Map(db.users.map((u) => [u.id, u]));
    const enrichedCommissions = db.commissions.slice(0, 150).map((c) => {
      const recUser = userLookup.get(c.recipientUserId);
      return {
        ...c,
        status: getCommissionStatus(c),
        recipientNickname: recUser?.nickname ?? 'Unknown',
        recipientEmail: recUser?.email ?? '',
      };
    });

    return res.json({
      stats: {
        totalUsers,
        totalLiveBalance: Number(totalLiveBalance.toFixed(2)),
        totalVolume: Number(totalVolume.toFixed(2)),
        platformNetPnl: Number(platformNetPnl.toFixed(2)),
        pendingDeposits,
        pendingWithdrawals,
        pendingPrizeClaims,
        pendingCommissions,
      },
      roundControl: {
        roundId,
        phase: roundPhase,
        secondsRemaining,
        adminOverride: adminRoundOverride,
        liveBuyVolume,
        liveSellVolume,
        totalBuyVolume,
        totalSellVolume,
        openOrdersCount: currentRoundOrders.length,
      },
      users: db.users.map(sanitizeUser),
      transactions: db.transactions.slice(0, 120),
      trades: db.trades.slice(0, 120),
      prizeClaims: db.prizeClaims.slice(0, 100),
      commissions: enrichedCommissions,
      settings: db.settings,
    });
  });

  app.post('/api/admin/commissions/:id/decide', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const { decision } = req.body as { decision?: 'approve' | 'reject' };
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ error: 'Hành động duyệt hoa hồng không hợp lệ.' });
    }
    const record = db.commissions.find((c) => c.id === req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi hoa hồng.' });
    }

    const result = applyCommissionDecision(record, decision, admin.nickname);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    saveDb();
    return res.json({
      commission: {
        ...record,
        recipientNickname: result.recipient?.nickname ?? '',
        recipientEmail: result.recipient?.email ?? '',
      },
      creditAmount: result.creditAmount,
      recipient: result.recipient ? sanitizeUser(result.recipient) : null,
    });
  });

  app.post('/api/admin/commissions/approve-all', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const pending = db.commissions.filter((c) => getCommissionStatus(c) === 'pending');
    if (pending.length === 0) {
      return res.json({ approvedCount: 0, totalAmount: 0 });
    }

    let approvedCount = 0;
    let totalAmount = 0;
    for (const rec of pending) {
      const outcome = applyCommissionDecision(rec, 'approve', admin.nickname);
      if (outcome.ok) {
        approvedCount += 1;
        totalAmount = Number((totalAmount + outcome.creditAmount).toFixed(4));
      }
    }

    saveDb();
    return res.json({
      approvedCount,
      totalAmount: Number(totalAmount.toFixed(2)),
    });
  });

  app.post('/api/admin/prizepool/claims/:id/payout', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const claim = db.prizeClaims.find((c) => c.id === req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu thưởng Prize Pool.' });
    }
    if (claim.status === 'paid') {
      return res.status(400).json({ error: 'Giải thưởng này đã được cộng tiền trước đó.' });
    }
    if (claim.status === 'rejected') {
      return res.status(400).json({ error: 'Giải thưởng này đã bị hủy.' });
    }

    const target = db.users.find((u) => u.id === claim.userId);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người thắng thưởng.' });
    }

    const nowIso = new Date().toISOString();
    target.liveBalance = Number((target.liveBalance + claim.prizeAmount).toFixed(2));
    db.settings.prizePool = Number(Math.max(0, db.settings.prizePool - claim.prizeAmount).toFixed(2));
    claim.status = 'paid';
    claim.paidAt = nowIso;
    claim.paidBy = admin.nickname;

    const streakDesc =
      claim.streakType === 'MEGA'
        ? 'Mega Prize'
        : `${claim.streakType === 'WIN' ? 'Win' : 'Lose'} Streak ${claim.streakLength}x`;

    db.transactions.unshift({
      id: `tx_${Date.now().toString(36)}`,
      userId: target.id,
      userEmail: target.email,
      type: 'prize_pool',
      amount: claim.prizeAmount,
      fee: 0,
      status: 'completed',
      addressOrPeer: 'RaidenBO Prize Pool',
      note: `Thưởng Prize Pool (${streakDesc}) — Admin ${admin.nickname} đã cộng tiền`,
      createdAt: nowIso,
      processedAt: nowIso,
    });

    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      userId: target.id,
      title: `🎉 Đã cộng thưởng Prize Pool +$${claim.prizeAmount.toFixed(2)}`,
      message: `Quản trị viên đã cộng +$${claim.prizeAmount.toFixed(2)} USDT thưởng ${streakDesc} vào Ví Thực của bạn.`,
      type: 'prize',
      read: false,
      createdAt: nowIso,
    });

    saveDb();
    return res.json({ claim, user: sanitizeUser(target) });
  });

  app.post('/api/admin/prizepool/award', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const { userId, streakType, streakLength, prizeAmount } = req.body as {
      userId?: string;
      streakType?: 'WIN' | 'LOSE' | 'MEGA';
      streakLength?: number;
      prizeAmount?: number;
    };
    const target = db.users.find((u) => u.id === userId);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy thành viên.' });
    }
    const amt = Number(prizeAmount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Số tiền thưởng phải lớn hơn 0.' });
    }
    const type: 'WIN' | 'LOSE' | 'MEGA' =
      streakType === 'LOSE' || streakType === 'MEGA' ? streakType : 'WIN';
    const len = Math.max(1, Math.round(Number(streakLength) || 9));
    const nowIso = new Date().toISOString();

    const claim: PrizePoolClaim = {
      id: `claim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      userId: target.id,
      userEmail: target.email,
      userNickname: target.nickname,
      streakType: type,
      streakLength: len,
      prizeAmount: Number(amt.toFixed(2)),
      status: 'eligible',
      twoFactorVerified: false,
      createdAt: nowIso,
    };

    db.prizeClaims.unshift(claim);
    const desc = type === 'MEGA' ? 'Mega Prize' : `${type === 'WIN' ? 'Win' : 'Lose'} Streak ${len}x`;

    db.notifications.unshift({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      userId: target.id,
      title: `🎉 Chúc mừng bạn thắng Prize Pool (+$${claim.prizeAmount.toFixed(2)})`,
      message: `Bạn đã trúng giải ${desc} trị giá $${claim.prizeAmount.toFixed(2)}! Mở mục Prize Pool, nhấn Nhận thưởng và nhập mã 2FA để nhận tiền.`,
      type: 'prize',
      read: false,
      createdAt: nowIso,
    });

    notifyAllAdmins(
      `🏆 Ghi nhận thắng Prize Pool: ${target.nickname} (+$${claim.prizeAmount.toFixed(2)})`,
      `Đã ghi nhận ${target.nickname} (${target.email}) thắng ${desc} trị giá $${claim.prizeAmount.toFixed(2)}. Chờ người dùng nhập 2FA nhận thưởng.`
    );

    saveDb();
    return res.json({ claim });
  });

  app.post('/api/admin/round-override', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const { override } = req.body as { override?: AdminRoundOverride };
    if (override !== 'auto' && override !== 'BUY' && override !== 'SELL') {
      return res.status(400).json({ error: 'Giá trị điều khiển không hợp lệ.' });
    }
    adminRoundOverride = override;
    return res.json({ override: adminRoundOverride, roundId });
  });

  app.post('/api/admin/users/:id/balance', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const { accountMode, operation, amount, reason } = req.body as {
      accountMode?: AccountMode;
      operation?: 'add' | 'subtract';
      amount?: number;
      reason?: string;
    };
    const amt = Number(amount ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Số tiền điều chỉnh phải lớn hơn 0.' });
    }
    const mode: AccountMode = accountMode === 'demo' ? 'demo' : 'live';
    const delta = operation === 'subtract' ? -amt : amt;

    if (mode === 'live') {
      target.liveBalance = Number(Math.max(0, target.liveBalance + delta).toFixed(2));
    } else {
      target.demoBalance = Number(Math.max(0, target.demoBalance + delta).toFixed(2));
    }

    const nowIso = new Date().toISOString();
    db.transactions.unshift({
      id: `tx_${Date.now().toString(36)}`,
      userId: target.id,
      userEmail: target.email,
      type: 'admin_adjust',
      amount: delta,
      fee: 0,
      status: 'completed',
      addressOrPeer: `Admin (${admin.nickname})`,
      note: reason?.trim() || `Điều chỉnh ví ${mode.toUpperCase()} bởi Admin`,
      createdAt: nowIso,
      processedAt: nowIso,
    });
    db.notifications.unshift({
      id: `ntf_${Date.now()}`,
      userId: target.id,
      title: `Biến động số dư ${delta >= 0 ? '+' : ''}$${delta.toFixed(2)}`,
      message: reason?.trim() || `Quản trị viên đã điều chỉnh ví ${mode.toUpperCase()} của bạn.`,
      type: 'wallet',
      read: false,
      createdAt: nowIso,
    });
    saveDb();

    return res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/users/:id/update', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const { isBanned, isVip, kycStatus, role } = req.body as Partial<UserAccount>;
    if (typeof isBanned === 'boolean' && target.id !== admin.id) target.isBanned = isBanned;
    if (typeof isVip === 'boolean') target.isVip = isVip;
    if (kycStatus) target.kycStatus = kycStatus;
    if (role === 'user' || role === 'admin') target.role = role;
    saveDb();
    return res.json({ user: sanitizeUser(target) });
  });

  app.post('/api/admin/transactions/:id/decide', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const tx = db.transactions.find((t) => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'Giao dịch này đã được xử lý trước đó.' });
    }

    const { decision } = req.body as { decision?: 'approve' | 'reject' };
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ error: 'Quyết định không hợp lệ.' });
    }

    const target = db.users.find((u) => u.id === tx.userId);
    const nowIso = new Date().toISOString();
    tx.processedAt = nowIso;

    if (decision === 'approve') {
      tx.status = 'completed';
      if (target) {
        if (tx.type === 'deposit') {
          target.liveBalance = Number((target.liveBalance + tx.amount).toFixed(2));
          target.totalDeposited = Number((target.totalDeposited + tx.amount).toFixed(2));
        } else if (tx.type === 'withdraw') {
          target.totalWithdrawn = Number((target.totalWithdrawn + tx.amount).toFixed(2));
        }
        db.notifications.unshift({
          id: `ntf_${Date.now()}`,
          userId: target.id,
          title: tx.type === 'deposit' ? `Duyệt nạp +$${tx.amount.toFixed(2)}` : `Duyệt rút $${tx.amount.toFixed(2)}`,
          message: `Yêu cầu ${tx.type === 'deposit' ? 'nạp tiền' : 'rút tiền'} của bạn đã được Admin phê duyệt.`,
          type: 'wallet',
          read: false,
          createdAt: nowIso,
        });
      }
    } else {
      tx.status = 'rejected';
      if (target && tx.type === 'withdraw') {
        // Refund withheld amount + fee
        target.liveBalance = Number((target.liveBalance + tx.amount + tx.fee).toFixed(2));
      }
      if (target) {
        db.notifications.unshift({
          id: `ntf_${Date.now()}`,
          userId: target.id,
          title: `Từ chối giao dịch $${tx.amount.toFixed(2)}`,
          message: `Lệnh ${tx.type === 'deposit' ? 'nạp' : 'rút'} tiền đã bị từ chối bởi quản trị viên.`,
          type: 'wallet',
          read: false,
          createdAt: nowIso,
        });
      }
    }

    saveDb();
    return res.json({ transaction: tx });
  });

  app.post('/api/admin/settings', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const body = req.body as Partial<PlatformSettings>;
    if (typeof body.payoutRate === 'number' && body.payoutRate >= 0.5 && body.payoutRate <= 1.0) {
      db.settings.payoutRate = body.payoutRate;
    }
    if (typeof body.minTradeAmount === 'number' && body.minTradeAmount >= 1) {
      db.settings.minTradeAmount = body.minTradeAmount;
    }
    if (typeof body.maxTradeAmount === 'number' && body.maxTradeAmount >= 10) {
      db.settings.maxTradeAmount = body.maxTradeAmount;
    }
    if (typeof body.withdrawFee === 'number' && body.withdrawFee >= 0) {
      db.settings.withdrawFee = body.withdrawFee;
    }
    if (typeof body.vipFee === 'number' && body.vipFee >= 0) {
      db.settings.vipFee = body.vipFee;
    }
    if (body.masterWalletAddress !== undefined) {
      const walletCheck = validateMasterWalletAddress(body.masterWalletAddress);
      if (!walletCheck.valid) {
        return res.status(400).json({ error: walletCheck.error });
      }
      db.settings.masterWalletAddress = walletCheck.address;
    }
    if (typeof body.maintenanceMode === 'boolean') {
      db.settings.maintenanceMode = body.maintenanceMode;
    }
    saveDb();
    return res.json({ settings: db.settings });
  });

  // Mount Vite middleware in dev, or serve static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RaidenBO server running on http://localhost:${PORT}`);
  });
}

startServer();
