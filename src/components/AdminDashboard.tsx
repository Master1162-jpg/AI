import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  Ban,
  CheckCircle2,
  Coins,
  Crown,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sliders,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { getCommissionStatus, validateMasterWalletAddress } from '../lib/tradingEngine';
import type {
  AccountMode,
  AdminRoundOverride,
  CommissionRecord,
  Language,
  PlatformSettings,
  PrizePoolClaim,
  TradeOrder,
  UserAccount,
  WalletTransaction,
} from '../types';

interface AdminDashboardProps {
  lang: Language;
  token: string;
  onSyncSelfUser: () => void;
}

interface AdminOverviewPayload {
  stats: {
    totalUsers: number;
    totalLiveBalance: number;
    totalVolume: number;
    platformNetPnl: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingPrizeClaims: number;
    pendingCommissions: number;
  };
  roundControl: {
    roundId: number;
    phase: 'betting' | 'waiting';
    secondsRemaining: number;
    adminOverride: AdminRoundOverride;
    liveBuyVolume: number;
    liveSellVolume: number;
    totalBuyVolume: number;
    totalSellVolume: number;
    openOrdersCount: number;
  };
  users: UserAccount[];
  transactions: WalletTransaction[];
  trades: TradeOrder[];
  prizeClaims: PrizePoolClaim[];
  commissions: CommissionRecord[];
  settings: PlatformSettings;
}

type AdminTab =
  | 'overview'
  | 'round'
  | 'users'
  | 'finance'
  | 'commissions'
  | 'prizepool'
  | 'ledger'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  token,
  onSyncSelfUser,
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Balance adjustment modal state
  const [adjustUser, setAdjustUser] = useState<UserAccount | null>(null);
  const [adjustMode, setAdjustMode] = useState<AccountMode>('live');
  const [adjustOp, setAdjustOp] = useState<'add' | 'subtract'>('add');
  const [adjustAmt, setAdjustAmt] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Thưởng sự kiện RaidenBO');

  // Settings local form
  const [settingsForm, setSettingsForm] = useState<PlatformSettings | null>(null);
  const [walletQrPreview, setWalletQrPreview] = useState<string>('');

  // Prize Pool manual award form
  const [awardUserId, setAwardUserId] = useState<string>('');
  const [awardType, setAwardType] = useState<'WIN' | 'LOSE' | 'MEGA'>('WIN');
  const [awardAmount, setAwardAmount] = useState<string>('27.68');
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null);

  // Commission approval state
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [commissionBusyId, setCommissionBusyId] = useState<string | null>(null);
  const [approveAllBusy, setApproveAllBusy] = useState(false);

  const isVi = lang === 'vi';

  // Live QR preview for the configured deposit wallet address
  useEffect(() => {
    const addr = settingsForm?.masterWalletAddress?.trim() ?? '';
    if (addr.length < 10 || /\s/.test(addr)) {
      setWalletQrPreview('');
      return;
    }
    QRCode.toDataURL(addr, {
      width: 140,
      margin: 1,
      color: { dark: '#09090D', light: '#ffffff' },
    })
      .then((url) => setWalletQrPreview(url))
      .catch(() => setWalletQrPreview(''));
  }, [settingsForm?.masterWalletAddress]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as AdminOverviewPayload;
      setData(json);
      setSettingsForm((prev) => prev ?? json.settings);
    } catch {
      // ignore transient poll errors
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(loadOverview, 2000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  const handleSetOverride = async (override: AdminRoundOverride) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/round-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ override }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật điều khiển phiên');
      setFeedback({
        type: 'ok',
        text: `Đã đặt kết quả phiên #${data?.roundControl.roundId}: ${
          override === 'auto' ? 'Tự động (Auto)' : override === 'BUY' ? 'Ép MUA (BUY)' : 'Ép BÁN (SELL)'
        }`,
      });
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleDecideTx = async (txId: string, decision: 'approve' | 'reject') => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi xử lý giao dịch');
      setFeedback({
        type: 'ok',
        text: decision === 'approve' ? 'Đã duyệt giao dịch thành công.' : 'Đã từ chối giao dịch.',
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleDecideCommission = async (
    commission: CommissionRecord,
    decision: 'approve' | 'reject'
  ) => {
    setFeedback(null);
    setCommissionBusyId(commission.id);
    try {
      const res = await fetch(`/api/admin/commissions/${commission.id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi duyệt hoa hồng');
      setFeedback({
        type: 'ok',
        text:
          decision === 'approve'
            ? `Đã duyệt & tự động cộng +$${commission.commissionAmount.toFixed(2)} USDT vào Ví chính của ${
                commission.recipientNickname || 'đại lý'
              }.`
            : `Đã từ chối khoản hoa hồng $${commission.commissionAmount.toFixed(2)} từ ${commission.sourceNickname}.`,
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    } finally {
      setCommissionBusyId(null);
    }
  };

  const handleApproveAllCommissions = async () => {
    setFeedback(null);
    setApproveAllBusy(true);
    try {
      const res = await fetch('/api/admin/commissions/approve-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi duyệt hàng loạt hoa hồng');
      setFeedback({
        type: 'ok',
        text: `Đã duyệt ${json.approvedCount} khoản hoa hồng (+$${Number(json.totalAmount || 0).toFixed(2)} USDT) và cộng tự động vào Ví chính của đại lý.`,
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    } finally {
      setApproveAllBusy(false);
    }
  };

  const handleUpdateUser = async (userId: string, patch: Partial<UserAccount>) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi cập nhật người dùng');
      setFeedback({ type: 'ok', text: `Đã cập nhật tài khoản ${json.user.nickname}.` });
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleSubmitBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUser) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${adjustUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountMode: adjustMode,
          operation: adjustOp,
          amount: adjustAmt,
          reason: adjustReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi điều chỉnh số dư');
      setFeedback({
        type: 'ok',
        text: `Đã ${adjustOp === 'add' ? 'cộng' : 'trừ'} $${adjustAmt} cho ${adjustUser.nickname} (${adjustMode.toUpperCase()}).`,
      });
      setAdjustUser(null);
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setFeedback(null);

    const walletCheck = validateMasterWalletAddress(settingsForm.masterWalletAddress);
    if (!walletCheck.valid) {
      setFeedback({ type: 'err', text: walletCheck.error || 'Địa chỉ ví không hợp lệ.' });
      return;
    }

    try {
      const payload: PlatformSettings = {
        ...settingsForm,
        masterWalletAddress: walletCheck.address,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu cấu hình');
      setSettingsForm(json.settings);
      setFeedback({
        type: 'ok',
        text: 'Đã lưu cấu hình & đồng bộ ví nhận nạp tiền mới sang mục Nạp tiền của toàn bộ thành viên.',
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handlePayoutPrizeClaim = async (claim: PrizePoolClaim) => {
    setFeedback(null);
    setPayoutBusyId(claim.id);
    try {
      const res = await fetch(`/api/admin/prizepool/claims/${claim.id}/payout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể cộng tiền thưởng Prize Pool');
      setFeedback({
        type: 'ok',
        text: `Đã cộng +$${claim.prizeAmount.toFixed(2)} USDT thưởng Prize Pool vào tài khoản ${claim.userNickname} (${claim.userEmail}).`,
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    } finally {
      setPayoutBusyId(null);
    }
  };

  const handleAwardPrizePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardUserId) {
      setFeedback({ type: 'err', text: 'Vui lòng chọn thành viên thắng Prize Pool.' });
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/prizepool/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: awardUserId,
          streakType: awardType,
          streakLength: 9,
          prizeAmount: Number(awardAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không thể ghi nhận giải thưởng');
      setFeedback({
        type: 'ok',
        text: `Đã ghi nhận thắng Prize Pool (+$${Number(awardAmount).toFixed(2)}) và gửi thông báo hiển thị nút Nhận thưởng (yêu cầu 2FA) cho người dùng.`,
      });
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  if (!data) {
    return (
      <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-10 text-center text-sm text-[#958CB3]">
        Đang tải bảng điều khiển Quản trị viên...
      </div>
    );
  }

  const filteredUsers = data.users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const pendingTxs = data.transactions.filter((t) => t.status === 'pending');
  const allCommissions = data.commissions || [];
  const pendingCommissions = allCommissions.filter(
    (c) => getCommissionStatus(c) === 'pending'
  );
  const pendingCommissionsTotal = Number(
    pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2)
  );
  const filteredCommissions = [...allCommissions]
    .filter((c) => {
      if (commissionFilter === 'all') return true;
      return getCommissionStatus(c) === commissionFilter;
    })
    .sort((a, b) => {
      const aPending = getCommissionStatus(a) === 'pending' ? 0 : 1;
      const bPending = getCommissionStatus(b) === 'pending' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const prizeClaims = data.prizeClaims || [];
  const activePrizeClaims = prizeClaims.filter(
    (c) => c.status === 'claimed' || c.status === 'eligible'
  );
  const claimedReadyForPayout = prizeClaims.filter((c) => c.status === 'claimed');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C4B5FD]/15 text-[#C4B5FD]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-[#F5F3FF]">
              {isVi ? 'Bảng điều khiển Quản trị RaidenBO' : 'RaidenBO Admin Console'}
            </h1>
            <p className="text-xs text-[#958CB3]">
              {isVi
                ? 'Quản lý người dùng, duyệt nạp/rút, duyệt hoa hồng đại lý, Prize Pool & điều khiển phiên'
                : 'Manage users, deposits/withdrawals, agency commission approvals, Prize Pool & settings'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOverview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#C4B5FD]/35 bg-[#181625] px-3.5 py-2 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: isVi ? 'Tổng quan' : 'Overview', icon: Activity },
          { id: 'round', label: isVi ? 'Điều khiển phiên BTC/USDT' : 'Round Control', icon: Sliders },
          { id: 'users', label: isVi ? `Thành viên (${data.users.length})` : `Users (${data.users.length})`, icon: Users },
          {
            id: 'finance',
            label: isVi ? `Duyệt Nạp/Rút (${pendingTxs.length})` : `Approvals (${pendingTxs.length})`,
            icon: Coins,
          },
          {
            id: 'commissions',
            label: isVi
              ? `Duyệt Hoa hồng (${pendingCommissions.length})`
              : `Commissions (${pendingCommissions.length})`,
            icon: Crown,
          },
          {
            id: 'prizepool',
            label: isVi
              ? `Thưởng Prize Pool (${activePrizeClaims.length})`
              : `Prize Pool (${activePrizeClaims.length})`,
            icon: Trophy,
          },
          { id: 'ledger', label: isVi ? 'Sổ lệnh & Chuyển tiền' : 'Trades Ledger', icon: TrendingUp },
          { id: 'settings', label: isVi ? 'Cài đặt Sàn' : 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const highlightAmber =
            (item.id === 'prizepool' && claimedReadyForPayout.length > 0) ||
            (item.id === 'commissions' && pendingCommissions.length > 0);
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`admin-tab-${item.id}`}
              onClick={() => setTab(item.id as AdminTab)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-transparent bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
                  : highlightAmber
                  ? 'border-amber-400/40 bg-amber-400/15 text-amber-300 hover:bg-amber-400/20'
                  : 'border-[#27223B] bg-[#14131E] text-[#C8C2DC] hover:bg-[#1E1A30] hover:text-[#F5F3FF]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/15 text-[#34D399]'
              : 'border-rose-400/35 bg-rose-500/15 text-[#FB7185]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB 1: Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
              <div className="text-xs font-medium text-[#958CB3]">Tổng thành viên</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-[#F5F3FF]">
                {data.stats.totalUsers}
              </div>
            </div>
            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
              <div className="text-xs font-medium text-[#958CB3]">Tổng số dư Ví Thực</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-[#34D399]">
                ${data.stats.totalLiveBalance.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
              <div className="text-xs font-medium text-[#958CB3]">Tổng khối lượng Live</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-[#C4B5FD]">
                ${data.stats.totalVolume.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40">
              <div className="text-xs font-medium text-[#958CB3]">Chờ duyệt Nạp / Rút</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-amber-300">
                {data.stats.pendingDeposits} / {data.stats.pendingWithdrawals}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
              <h3 className="font-display text-sm font-bold text-[#F5F3FF] mb-3">
                Phiên BTC/USDT hiện tại (#{data.roundControl.roundId})
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#27223B] bg-[#161423] p-3">
                  <div className="text-[#958CB3]">Tổng MUA (Live / All)</div>
                  <div className="mt-1 font-mono text-base font-bold text-[#34D399]">
                    ${data.roundControl.liveBuyVolume.toFixed(2)} / ${data.roundControl.totalBuyVolume.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#27223B] bg-[#161423] p-3">
                  <div className="text-[#958CB3]">Tổng BÁN (Live / All)</div>
                  <div className="mt-1 font-mono text-base font-bold text-[#FB7185]">
                    ${data.roundControl.liveSellVolume.toFixed(2)} / ${data.roundControl.totalSellVolume.toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('round')}
                className="mt-4 w-full rounded-xl border border-[#C4B5FD]/35 bg-[#181625] py-2.5 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
              >
                Mở bảng điều khiển kết quả phiên
              </button>
            </div>

            <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
              <h3 className="font-display text-sm font-bold text-[#F5F3FF] mb-3">
                Yêu cầu Nạp/Rút đang chờ duyệt ({pendingTxs.length})
              </h3>
              {pendingTxs.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#958CB3]">Không có yêu cầu nào đang chờ.</p>
              ) : (
                <div className="space-y-2">
                  {pendingTxs.slice(0, 4).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#161423] px-3 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#F5F3FF]">
                          {tx.type === 'deposit' ? 'Nạp USDT' : 'Rút USDT'} · ${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-[#958CB3]">{tx.userEmail}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecideTx(tx.id, 'approve')}
                          className="rounded-lg bg-[#059669] px-2.5 py-1.5 font-bold text-white hover:bg-[#10B981] cursor-pointer"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecideTx(tx.id, 'reject')}
                          className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1.5 font-bold text-[#FB7185] hover:bg-rose-500/25 cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Agency Commissions Quick Alert on Overview */}
          {pendingCommissions.length > 0 && (
            <div className="rounded-2xl border border-[#C4B5FD]/35 bg-gradient-to-r from-[#1A152E] via-[#14131E] to-[#111118] p-5 shadow-lg shadow-black/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Crown className="h-5 w-5 text-[#C4B5FD]" />
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-extrabold text-[#F5F3FF]">
                      {isVi
                        ? `Hoa hồng giao dịch & đại lý chờ duyệt (${pendingCommissions.length} · +$${pendingCommissionsTotal.toFixed(2)})`
                        : `Pending Agency Commissions (${pendingCommissions.length} · +$${pendingCommissionsTotal.toFixed(2)})`}
                    </h3>
                    <p className="text-xs text-[#958CB3]">
                      {isVi
                        ? 'Duyệt để hệ thống tự động cộng trực tiếp vào Ví chính USDT của tuyến trên.'
                        : 'Approve to automatically credit each upline agent’s Main USDT Wallet.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={approveAllBusy}
                    onClick={handleApproveAllCommissions}
                    className="rounded-lg bg-[#059669] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#10B981] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {approveAllBusy ? 'Đang duyệt...' : 'Duyệt tất cả'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('commissions')}
                    className="rounded-lg border border-[#C4B5FD]/35 bg-[#181625] px-3.5 py-2 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer whitespace-nowrap"
                  >
                    {isVi ? 'Xem chi tiết →' : 'Review all →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Prize Pool Winners Notification Panel right on Overview */}
          {activePrizeClaims.length > 0 && (
            <div
              data-testid="admin-overview-prizepool-alerts"
              className="rounded-2xl border border-amber-400/35 bg-gradient-to-r from-[#1D1914] via-[#14131E] to-[#1A152C] p-5 shadow-lg shadow-black/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <h3 className="font-display text-sm sm:text-base font-extrabold text-amber-200">
                    {isVi
                      ? `Thông báo thắng Prize Pool (${activePrizeClaims.length})`
                      : `Prize Pool Winner Alerts (${activePrizeClaims.length})`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('prizepool')}
                  className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] hover:underline cursor-pointer"
                >
                  {isVi ? 'Quản lý toàn bộ →' : 'Manage all →'}
                </button>
              </div>
              <div className="space-y-2.5">
                {activePrizeClaims.slice(0, 4).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#27223B] bg-[#111118] px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#F5F3FF]">{claim.userNickname}</span>
                        <span className="text-[#958CB3]">({claim.userEmail})</span>
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                          {claim.streakType === 'MEGA'
                            ? 'Mega Prize'
                            : `${claim.streakType === 'WIN' ? 'Win' : 'Lose'} Streak ${claim.streakLength}x`}
                        </span>
                      </div>
                      <div className="mt-1 text-[#C8C2DC]">
                        Giải thưởng:{' '}
                        <strong className="font-mono text-[#C4B5FD]">
                          +${claim.prizeAmount.toFixed(2)} USDT
                        </strong>{' '}
                        ·{' '}
                        {claim.status === 'claimed' ? (
                          <span className="font-bold text-[#34D399]">
                            Đã xác thực 2FA — Sẵn sàng cộng tiền
                          </span>
                        ) : (
                          <span className="text-[#958CB3]">
                            Người dùng vừa thắng (chưa nhập 2FA nhận thưởng)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={payoutBusyId === claim.id}
                      data-testid="admin-overview-payout-btn"
                      onClick={() => handlePayoutPrizeClaim(claim)}
                      className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-3.5 py-2 text-xs font-extrabold text-[#140E24] shadow-sm hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      {payoutBusyId === claim.id ? 'Đang cộng...' : 'Cộng tiền vào tài khoản'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live BTC/USDT Round Result Control */}
      {tab === 'round' && (
        <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-6 space-y-6 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27223B] pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5F3FF]">
                Điều khiển kết quả phiên BTC/USDT #{data.roundControl.roundId}
              </h2>
              <p className="text-xs text-[#958CB3] mt-0.5">
                Trạng thái: <strong className="text-[#F5F3FF] uppercase">{data.roundControl.phase}</strong> · Còn{' '}
                <strong className="font-mono text-[#C4B5FD]">{data.roundControl.secondsRemaining}s</strong>
              </p>
            </div>
            <div className="rounded-xl border border-[#27223B] bg-[#161423] px-4 py-2 text-xs text-[#C8C2DC]">
              Chế độ đang chọn:{' '}
              <strong
                className={
                  data.roundControl.adminOverride === 'BUY'
                    ? 'text-[#34D399]'
                    : data.roundControl.adminOverride === 'SELL'
                    ? 'text-[#FB7185]'
                    : 'text-[#C4B5FD]'
                }
              >
                {data.roundControl.adminOverride.toUpperCase()}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#34D399]">KHỐI LƯỢNG ĐẶT MUA (BUY)</span>
                <TrendingUp className="h-5 w-5 text-[#34D399]" />
              </div>
              <div className="mt-2 font-mono text-3xl font-extrabold text-[#F5F3FF]">
                ${data.roundControl.totalBuyVolume.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-[#C8C2DC]">
                Trong đó Ví Thực (Live): ${data.roundControl.liveBuyVolume.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FB7185]">KHỐI LƯỢNG ĐẶT BÁN (SELL)</span>
                <TrendingDown className="h-5 w-5 text-[#FB7185]" />
              </div>
              <div className="mt-2 font-mono text-3xl font-extrabold text-[#F5F3FF]">
                ${data.roundControl.totalSellVolume.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-[#C8C2DC]">
                Trong đó Ví Thực (Live): ${data.roundControl.liveSellVolume.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleSetOverride('auto')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'auto'
                  ? 'border-[#C4B5FD] bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
                  : 'border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:bg-[#1F1B33]'
              }`}
            >
              Tự động theo thị trường (Auto)
            </button>
            <button
              type="button"
              onClick={() => handleSetOverride('BUY')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'BUY'
                  ? 'border-[#10B981] bg-[#059669] text-white shadow-md'
                  : 'border-emerald-400/30 bg-emerald-500/12 text-[#34D399] hover:bg-emerald-500/20'
              }`}
            >
              Ép kết quả MUA (BUY)
            </button>
            <button
              type="button"
              onClick={() => handleSetOverride('SELL')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'SELL'
                  ? 'border-[#F43F5E] bg-[#E11D48] text-white shadow-md'
                  : 'border-rose-400/30 bg-rose-500/12 text-[#FB7185] hover:bg-rose-500/20'
              }`}
            >
              Ép kết quả BÁN (SELL)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Users Management */}
      {tab === 'users' && (
        <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 space-y-4 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-[#F5F3FF]">Quản lý tài khoản người dùng</h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958CB3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo email hoặc biệt danh..."
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] py-2 pl-9 pr-3 text-xs text-[#F5F3FF] outline-none placeholder:text-[#7E769C] focus:border-[#C4B5FD]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#27223B] text-[#958CB3]">
                  <th className="pb-3 font-semibold">Người dùng</th>
                  <th className="pb-3 font-semibold text-right">Ví Thực</th>
                  <th className="pb-3 font-semibold text-right">Ví Demo</th>
                  <th className="pb-3 font-semibold text-center">KYC</th>
                  <th className="pb-3 font-semibold text-center">VIP</th>
                  <th className="pb-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#231F36]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#181625]">
                    <td className="py-3">
                      <div className="font-bold text-[#F5F3FF]">
                        {u.nickname}{' '}
                        {u.role === 'admin' && <span className="text-[10px] text-[#C4B5FD]">(ADMIN)</span>}
                        {u.isBanned && <span className="text-[10px] text-[#FB7185]">(LOCKED)</span>}
                      </div>
                      <div className="text-[11px] text-[#958CB3]">{u.email}</div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#34D399]">
                      ${u.liveBalance.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono text-[#C8C2DC]">
                      ${u.demoBalance.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateUser(u.id, {
                            kycStatus: u.kycStatus === 'verified' ? 'unverified' : 'verified',
                          })
                        }
                        className={`rounded px-2 py-1 text-[11px] font-bold cursor-pointer ${
                          u.kycStatus === 'verified'
                            ? 'bg-emerald-500/15 text-[#34D399]'
                            : u.kycStatus === 'pending'
                            ? 'bg-amber-400/15 text-amber-300'
                            : 'bg-[#1D1A2D] text-[#958CB3]'
                        }`}
                      >
                        {u.kycStatus.toUpperCase()}
                      </button>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, { isVip: !u.isVip })}
                        aria-label={`Đổi VIP cho ${u.nickname}`}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold cursor-pointer ${
                          u.isVip ? 'bg-amber-400/15 text-amber-300' : 'bg-[#1D1A2D] text-[#958CB3]'
                        }`}
                      >
                        <Crown className="h-3 w-3" />
                        {u.isVip ? 'VIP' : 'Free'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustUser(u);
                            setAdjustAmt(100);
                          }}
                          className="rounded-lg border border-[#C4B5FD]/35 bg-[#181625] px-2.5 py-1 text-[11px] font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                        >
                          +/- Tiền
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateUser(u.id, { isBanned: !u.isBanned })}
                            aria-label={u.isBanned ? `Mở khóa ${u.nickname}` : `Khóa ${u.nickname}`}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-500/15 text-[#34D399]'
                                : 'bg-rose-500/15 text-[#FB7185]'
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Deposit & Withdraw Approvals */}
      {tab === 'finance' && (
        <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
          <h2 className="font-display text-base font-bold text-[#F5F3FF] mb-4">
            Quản lý & Duyệt giao dịch Nạp / Rút tiền
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#27223B] text-[#958CB3]">
                  <th className="pb-3">Loại</th>
                  <th className="pb-3">Người dùng</th>
                  <th className="pb-3">Địa chỉ / Chi tiết</th>
                  <th className="pb-3 text-right">Số tiền</th>
                  <th className="pb-3 text-right">Trạng thái / Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#231F36]">
                {data.transactions
                  .filter((t) => t.type === 'deposit' || t.type === 'withdraw')
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#181625]">
                      <td className="py-3 font-bold text-[#F5F3FF]">
                        {tx.type === 'deposit' ? 'Nạp USDT' : 'Rút USDT'}
                      </td>
                      <td className="py-3 text-[#C8C2DC]">{tx.userEmail}</td>
                      <td className="py-3 font-mono text-[11px] text-[#958CB3] max-w-[180px] truncate">
                        {tx.addressOrPeer}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#F5F3FF]">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        {tx.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDecideTx(tx.id, 'approve')}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#059669] px-2.5 py-1 font-bold text-white hover:bg-[#10B981] cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecideTx(tx.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1 font-bold text-[#FB7185] hover:bg-rose-500/25 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-bold ${
                              tx.status === 'completed' ? 'text-[#34D399]' : 'text-[#FB7185]'
                            }`}
                          >
                            {tx.status === 'completed' ? 'Đã duyệt' : 'Từ chối'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4.2: Agency Commission Approvals */}
      {tab === 'commissions' && (
        <div
          data-testid="admin-commissions-panel"
          className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 space-y-5 shadow-lg shadow-black/40"
        >
          <div className="flex flex-col gap-4 border-b border-[#27223B] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Crown className="mt-0.5 h-5 w-5 shrink-0 text-[#C4B5FD]" />
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-[#F5F3FF]">
                  {isVi
                    ? 'Quản lý & Duyệt Hoa hồng Đại lý'
                    : 'Agency Commission Approvals'}
                </h2>
                <p className="mt-0.5 text-xs text-[#958CB3]">
                  {isVi
                    ? 'Hoa hồng phát sinh khi tuyến dưới giao dịch Live hoặc nâng cấp VIP. Sau khi Admin duyệt, tiền sẽ tự động cộng thẳng vào Ví chính USDT của tuyến trên.'
                    : 'Commissions generated from Live trades and VIP upgrades appear here. Upon approval, funds credit automatically into the upline’s Main USDT Wallet.'}
                </p>
              </div>
            </div>

            {pendingCommissions.length > 0 && (
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <div className="text-left lg:text-right">
                  <div className="text-[11px] font-semibold text-[#958CB3]">
                    {isVi ? 'Chờ duyệt' : 'Pending Total'}
                  </div>
                  <div className="font-mono text-sm font-extrabold text-amber-300 tabular-nums">
                    {pendingCommissions.length} · +${pendingCommissionsTotal.toFixed(2)} USDT
                  </div>
                </div>
                <button
                  type="button"
                  disabled={approveAllBusy}
                  data-testid="admin-approve-all-commissions"
                  onClick={handleApproveAllCommissions}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-4 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {approveAllBusy
                      ? isVi
                        ? 'Đang duyệt...'
                        : 'Approving...'
                      : isVi
                      ? `Duyệt tất cả (${pendingCommissions.length})`
                      : `Approve All (${pendingCommissions.length})`}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={isVi ? 'Lọc trạng thái hoa hồng' : 'Filter commission status'}
          >
            {(
              [
                { id: 'all', label: isVi ? `Tất cả (${allCommissions.length})` : `All (${allCommissions.length})` },
                { id: 'pending', label: isVi ? `Chờ duyệt (${pendingCommissions.length})` : `Pending (${pendingCommissions.length})` },
                {
                  id: 'approved',
                  label: isVi
                    ? `Đã duyệt (${allCommissions.filter((c) => getCommissionStatus(c) === 'approved').length})`
                    : `Approved (${allCommissions.filter((c) => getCommissionStatus(c) === 'approved').length})`,
                },
                {
                  id: 'rejected',
                  label: isVi
                    ? `Từ chối (${allCommissions.filter((c) => getCommissionStatus(c) === 'rejected').length})`
                    : `Rejected (${allCommissions.filter((c) => getCommissionStatus(c) === 'rejected').length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCommissionFilter(f.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  commissionFilter === f.id
                    ? 'border-[#C4B5FD]/60 bg-[#261F3D] text-[#DDD6FE]'
                    : 'border-[#27223B] bg-[#14131E] text-[#958CB3] hover:text-[#F5F3FF]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#958CB3]">
              {isVi
                ? 'Không có khoản hoa hồng nào trong bộ lọc này.'
                : 'No commission records in this filter.'}
            </div>
          ) : (
            <>
              {/* Mobile stacked rows (< sm) */}
              <div className="sm:hidden divide-y divide-[#231F36] border-t border-[#27223B]">
                {filteredCommissions.map((rec) => {
                  const status = getCommissionStatus(rec);
                  return (
                    <div
                      key={`mob-${rec.id}`}
                      data-testid="admin-commission-row-mobile"
                      className="py-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#F5F3FF]">
                            {rec.recipientNickname || rec.recipientUserId}
                          </div>
                          <div className="text-[11px] text-[#958CB3]">{rec.recipientEmail}</div>
                        </div>
                        <div className="text-right font-mono font-extrabold tabular-nums">
                          <span
                            className={
                              status === 'approved'
                                ? 'text-[#34D399]'
                                : status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#958CB3] line-through'
                            }
                          >
                            +${rec.commissionAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#C8C2DC]">
                        <span>
                          {rec.sourceNickname} ·{' '}
                          <strong className="font-mono text-[#C4B5FD]">F{rec.tier}</strong> ·{' '}
                          {rec.kind === 'trading' ? 'Giao dịch' : 'Đại lý VIP'} ($
                          {rec.baseAmount.toFixed(2)})
                        </span>
                        <span className="font-mono text-[10px] text-[#958CB3]">
                          {new Date(rec.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              disabled={commissionBusyId === rec.id}
                              onClick={() => handleDecideCommission(rec, 'approve')}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#059669] px-3 py-1.5 font-bold text-white hover:bg-[#10B981] cursor-pointer disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={commissionBusyId === rec.id}
                              onClick={() => handleDecideCommission(rec, 'reject')}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-3 py-1.5 font-bold text-[#FB7185] hover:bg-rose-500/25 cursor-pointer disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <span
                            className={`font-bold ${
                              status === 'approved' ? 'text-[#34D399]' : 'text-[#FB7185]'
                            }`}
                          >
                            {status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table (>= sm) */}
              <div className="hidden sm:block overflow-x-auto border-t border-[#27223B]">
                <table className="w-full min-w-[740px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27223B] text-[#958CB3]">
                      <th className="py-3 pr-3 font-semibold">Người nhận (Tuyến trên)</th>
                      <th className="py-3 px-3 font-semibold">Nguồn (Tuyến dưới)</th>
                      <th className="py-3 px-3 font-semibold">Loại</th>
                      <th className="py-3 px-3 font-semibold text-right">KLGD / Gốc</th>
                      <th className="py-3 px-3 font-semibold text-right">Hoa hồng</th>
                      <th className="py-3 pl-3 font-semibold text-right">Trạng thái / Duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231F36]">
                    {filteredCommissions.map((rec) => {
                      const status = getCommissionStatus(rec);
                      return (
                        <tr
                          key={rec.id}
                          data-testid="admin-commission-row"
                          data-status={status}
                          className="hover:bg-[#181625]"
                        >
                          <td className="py-3 pr-3">
                            <div className="font-bold text-[#F5F3FF]">
                              {rec.recipientNickname || rec.recipientUserId}
                            </div>
                            <div className="text-[11px] text-[#958CB3]">{rec.recipientEmail}</div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-[#F5F3FF]">
                              {rec.sourceNickname}{' '}
                              <span className="font-mono text-[#C4B5FD]">· F{rec.tier}</span>
                            </div>
                            <div className="font-mono text-[10px] text-[#958CB3]">
                              {new Date(rec.createdAt).toLocaleString('vi-VN')}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold whitespace-nowrap">
                            {rec.kind === 'trading' ? (
                              <span className="text-[#34D399]">Hoa hồng GD</span>
                            ) : (
                              <span className="text-[#DDD6FE]">Đại lý VIP</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#C8C2DC] tabular-nums whitespace-nowrap">
                            ${rec.baseAmount.toFixed(2)}{' '}
                            <span className="text-[#958CB3]">({rec.ratePct}%)</span>
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono text-sm font-extrabold tabular-nums whitespace-nowrap ${
                              status === 'approved'
                                ? 'text-[#34D399]'
                                : status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#958CB3] line-through'
                            }`}
                          >
                            +${rec.commissionAmount.toFixed(2)}
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            {status === 'pending' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={commissionBusyId === rec.id}
                                  data-testid="admin-approve-commission-btn"
                                  onClick={() => handleDecideCommission(rec, 'approve')}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#059669] px-2.5 py-1.5 font-bold text-white hover:bg-[#10B981] cursor-pointer disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Duyệt
                                </button>
                                <button
                                  type="button"
                                  disabled={commissionBusyId === rec.id}
                                  data-testid="admin-reject-commission-btn"
                                  onClick={() => handleDecideCommission(rec, 'reject')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1.5 font-bold text-[#FB7185] hover:bg-rose-500/25 cursor-pointer disabled:opacity-60"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Từ chối
                                </button>
                              </div>
                            ) : status === 'approved' ? (
                              <div className="text-right">
                                <span
                                  data-testid="admin-commission-approved-badge"
                                  className="font-bold text-[#34D399]"
                                >
                                  Đã duyệt
                                </span>
                                {rec.processedBy && (
                                  <div className="text-[10px] text-[#958CB3]">
                                    bởi {rec.processedBy}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-[#FB7185]">Từ chối</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4.5: Prize Pool Winner Notifications & Account Crediting */}
      {tab === 'prizepool' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-amber-300" />
                <div>
                  <h2 className="font-display text-base font-bold text-[#F5F3FF]">
                    {isVi
                      ? 'Thông báo người thắng Prize Pool & Cộng tiền vào tài khoản'
                      : 'Prize Pool Winners & Account Payouts'}
                  </h2>
                  <p className="text-xs text-[#958CB3]">
                    {isVi
                      ? 'Khi người dùng thắng Prize Pool và xác thực mã 2FA, yêu cầu xuất hiện tại đây để Admin cộng trực tiếp vào Ví Thực.'
                      : 'Verified 2FA Prize Pool winners appear here for Admin crediting to Live Wallet.'}
                  </p>
                </div>
              </div>
            </div>

            {prizeClaims.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#958CB3]">
                Chưa có người dùng nào thắng Prize Pool.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#27223B] text-[#958CB3]">
                      <th className="pb-3 pr-4">Người thắng</th>
                      <th className="pb-3 pr-4">Chuỗi / Giải</th>
                      <th className="pb-3 pr-6 text-right">Số tiền thưởng</th>
                      <th className="pb-3 px-4">Xác thực 2FA</th>
                      <th className="pb-3 pl-4 text-right">Hành động / Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#231F36]">
                    {prizeClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-[#181625]">
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-[#F5F3FF]">{claim.userNickname}</div>
                          <div className="text-[11px] text-[#958CB3]">{claim.userEmail}</div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="rounded-md bg-amber-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                            {claim.streakType === 'MEGA'
                              ? 'Mega Prize'
                              : `${claim.streakType === 'WIN' ? 'Win' : 'Lose'} Streak ${claim.streakLength}x`}
                          </span>
                          <div className="mt-1 font-mono text-[10px] text-[#958CB3]">
                            {new Date(claim.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </td>
                        <td className="py-3.5 pr-6 text-right font-mono text-sm font-extrabold text-[#C4B5FD] tabular-nums whitespace-nowrap">
                          +${claim.prizeAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {claim.twoFactorVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 font-bold text-[#34D399]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Đã nhập 2FA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#1D1A2D] px-2.5 py-1 font-semibold text-[#C8C2DC]">
                              Chờ người dùng nhập 2FA
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          {claim.status === 'paid' ? (
                            <div className="text-right">
                              <span
                                data-testid="admin-prize-paid-badge"
                                className="font-bold text-[#34D399]"
                              >
                                Đã cộng tiền
                              </span>
                              {claim.paidBy && (
                                <div className="text-[10px] text-[#958CB3]">bởi {claim.paidBy}</div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={payoutBusyId === claim.id}
                              data-testid="admin-payout-prize-btn"
                              onClick={() => handlePayoutPrizeClaim(claim)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-3.5 py-2 font-extrabold text-[#140E24] hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>
                                {payoutBusyId === claim.id ? 'Đang cộng...' : 'Cộng tiền vào tài khoản'}
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Admin tool: Record/Trigger a Prize Pool winner */}
          <form
            onSubmit={handleAwardPrizePool}
            className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 space-y-4 shadow-lg shadow-black/40"
          >
            <div>
              <h3 className="font-display text-sm font-bold text-[#F5F3FF]">
                Ghi nhận người dùng thắng Prize Pool (Hiển thị nút Nhận thưởng + 2FA)
              </h3>
              <p className="mt-0.5 text-xs text-[#958CB3]">
                Chọn thành viên trúng thưởng sự kiện hoặc Mega Prize để hệ thống gửi thông báo và bật nút Nhận thưởng ngay trên trang Prize Pool.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <select
                value={awardUserId}
                onChange={(e) => setAwardUserId(e.target.value)}
                aria-label="Chọn thành viên thắng Prize Pool"
                className="rounded-xl border border-[#2F2947] bg-[#0D0C14] px-3 py-2.5 text-xs text-[#F5F3FF] outline-none [color-scheme:dark] focus:border-[#C4B5FD]"
              >
                <option value="">-- Chọn thành viên --</option>
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nickname} ({u.email})
                  </option>
                ))}
              </select>

              <select
                value={awardType}
                onChange={(e) => setAwardType(e.target.value as 'WIN' | 'LOSE' | 'MEGA')}
                aria-label="Loại giải thưởng"
                className="rounded-xl border border-[#2F2947] bg-[#0D0C14] px-3 py-2.5 text-xs text-[#F5F3FF] outline-none [color-scheme:dark] focus:border-[#C4B5FD]"
              >
                <option value="WIN">Win Streak 9x</option>
                <option value="LOSE">Lose Streak 9x</option>
                <option value="MEGA">Mega Prize</option>
              </select>

              <input
                type="number"
                min={1}
                step="0.01"
                value={awardAmount}
                onChange={(e) => setAwardAmount(e.target.value)}
                placeholder="Số tiền thưởng (USDT)"
                aria-label="Số tiền thưởng Prize Pool"
                className="rounded-xl border border-[#2F2947] bg-[#0D0C14] px-3 py-2.5 font-mono text-xs text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-4 py-2.5 text-xs font-extrabold text-[#140E24] shadow-sm hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                Ghi nhận thắng giải
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: All Platform Trades & Transfers Ledger */}
      {tab === 'ledger' && (
        <div className="rounded-2xl border border-[#27223B] bg-[#111118] p-5 space-y-5 shadow-lg shadow-black/40">
          <div>
            <h2 className="font-display text-base font-bold text-[#F5F3FF] mb-3">
              Lịch sử Đặt lệnh BTC/USDT toàn hệ thống
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27223B] text-[#958CB3]">
                    <th className="pb-2.5">Phiên</th>
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Ví / Nguồn</th>
                    <th className="pb-2.5">Lệnh</th>
                    <th className="pb-2.5 text-right">Vốn</th>
                    <th className="pb-2.5 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#231F36]">
                  {data.trades.slice(0, 30).map((tr) => (
                    <tr key={tr.id} className="hover:bg-[#181625]">
                      <td className="py-2.5 font-mono text-[#958CB3]">#{tr.roundId}</td>
                      <td className="py-2.5 text-[#DDD6FE]">{tr.userEmail}</td>
                      <td className="py-2.5 text-[#958CB3]">
                        {tr.accountMode.toUpperCase()} · {tr.source.toUpperCase()}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-bold ${
                            tr.direction === 'BUY' ? 'text-[#34D399]' : 'text-[#FB7185]'
                          }`}
                        >
                          {tr.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-[#F5F3FF]">
                        ${tr.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">
                        {tr.status === 'OPEN' ? (
                          <span className="text-[#C4B5FD]">OPEN</span>
                        ) : (
                          <span className={tr.pnl >= 0 ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                            {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: System Settings */}
      {tab === 'settings' && settingsForm && (
        <form onSubmit={handleSaveSettings} className="rounded-2xl border border-[#27223B] bg-[#111118] p-6 space-y-5 shadow-lg shadow-black/40">
          <h2 className="font-display text-base font-bold text-[#F5F3FF] border-b border-[#27223B] pb-3">
            Cấu hình thông số hệ thống RaidenBO
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="admin-payout-rate" className="block text-xs font-semibold text-[#C8C2DC] mb-1">
                Tỷ lệ trả thưởng (0.95 = 95%)
              </label>
              <input
                id="admin-payout-rate"
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={settingsForm.payoutRate}
                onChange={(e) => setSettingsForm({ ...settingsForm, payoutRate: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <div>
              <label htmlFor="admin-withdraw-fee" className="block text-xs font-semibold text-[#C8C2DC] mb-1">
                Phí rút USDT
              </label>
              <input
                id="admin-withdraw-fee"
                type="number"
                min="0"
                value={settingsForm.withdrawFee}
                onChange={(e) => setSettingsForm({ ...settingsForm, withdrawFee: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <div>
              <label htmlFor="admin-vip-fee" className="block text-xs font-semibold text-[#C8C2DC] mb-1">
                Phí nâng cấp VIP (USDT)
              </label>
              <input
                id="admin-vip-fee"
                type="number"
                min="0"
                value={settingsForm.vipFee}
                onChange={(e) => setSettingsForm({ ...settingsForm, vipFee: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-sm text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>

            <div className="sm:col-span-2 rounded-xl border border-[#27223B] bg-[#161423] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="admin-master-wallet" className="block text-xs font-bold text-[#F5F3FF]">
                    Địa chỉ ví tổng USDT (Ví nhận nạp tiền)
                  </label>
                  <input
                    id="admin-master-wallet"
                    type="text"
                    required
                    value={settingsForm.masterWalletAddress}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, masterWalletAddress: e.target.value })
                    }
                    placeholder="0x..."
                    className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2.5 font-mono text-xs text-[#F5F3FF] placeholder:text-[#7E769C] focus:border-[#C4B5FD] focus:outline-none"
                  />
                  <p className="text-[11px] leading-relaxed text-[#C8C2DC]">
                    Khi bấm lưu, địa chỉ ví và mã QR mới sẽ hiển thị ngay lập tức tại mục{' '}
                    <span className="font-bold text-[#C4B5FD]">Ví → Nạp tiền</span> của tất cả người dùng.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[#2F2947] bg-white p-1.5 shadow-sm">
                    {walletQrPreview ? (
                      <img
                        src={walletQrPreview}
                        alt="Xem trước mã QR ví nạp"
                        data-testid="admin-wallet-qr-preview"
                        className="h-full w-full"
                      />
                    ) : (
                      <QrCode className="h-9 w-9 text-[#4B3E72]" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-[#958CB3]">Xem trước QR</span>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#F5F3FF] cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={settingsForm.maintenanceMode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })}
                  className="accent-[#C4B5FD]"
                />
                <span>Chế độ bảo trì giao dịch</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-6 py-2.5 text-xs font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
          >
            Lưu cấu hình hệ thống
          </button>
        </form>
      )}

      {/* Balance Adjustment Modal */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSubmitBalanceAdjust}
            className="w-full max-w-md rounded-2xl border border-[#2F2947] bg-[#14131E] p-6 space-y-4 shadow-2xl shadow-black/80"
          >
            <h3 className="font-display text-lg font-bold text-[#F5F3FF]">
              Điều chỉnh số dư: {adjustUser.nickname}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#C8C2DC] mb-1">Loại ví</label>
                <select
                  value={adjustMode}
                  onChange={(e) => setAdjustMode(e.target.value as AccountMode)}
                  className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 text-xs text-[#F5F3FF] outline-none [color-scheme:dark] focus:border-[#C4B5FD]"
                >
                  <option value="live">Ví Thực (${adjustUser.liveBalance.toFixed(2)})</option>
                  <option value="demo">Ví Demo (${adjustUser.demoBalance.toFixed(2)})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#C8C2DC] mb-1">Thao tác</label>
                <select
                  value={adjustOp}
                  onChange={(e) => setAdjustOp(e.target.value as 'add' | 'subtract')}
                  className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 text-xs text-[#F5F3FF] outline-none [color-scheme:dark] focus:border-[#C4B5FD]"
                >
                  <option value="add">Cộng tiền (+)</option>
                  <option value="subtract">Trừ tiền (-)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C8C2DC] mb-1">Số tiền (USDT)</label>
              <input
                type="number"
                min={1}
                required
                value={adjustAmt}
                onChange={(e) => setAdjustAmt(Number(e.target.value))}
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 font-mono text-sm font-bold text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C8C2DC] mb-1">Lý do điều chỉnh</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-[#2F2947] bg-[#0D0C14] px-3 py-2 text-xs text-[#F5F3FF] outline-none focus:border-[#C4B5FD]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustUser(null)}
                className="rounded-lg border border-[#2F2947] bg-[#181625] px-4 py-2 text-xs font-semibold text-[#C8C2DC] hover:bg-[#231F38] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-5 py-2 text-xs font-extrabold text-[#140E24] shadow-sm hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
