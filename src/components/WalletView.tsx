import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crown,
  Eye,
  EyeOff,
  QrCode,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { getCommissionStatus, resolveDepositWalletAddress } from '../lib/tradingEngine';
import type {
  CommissionRecord,
  Language,
  PlatformSettings,
  UserAccount,
  WalletTransaction,
} from '../types';

export type WalletSubTab = 'main' | 'trading' | 'commission';

interface WalletViewProps {
  lang: Language;
  user: UserAccount;
  token: string;
  depositWalletAddress?: string;
  modalTrigger?: { tab: 'deposit' | 'withdraw'; seq: number } | null;
  subTabTrigger?: { tab: WalletSubTab; seq: number } | null;
  onUserUpdated: (user: UserAccount) => void;
  onResetDemo?: () => void;
  onGoToProfile?: () => void;
  onGoToTrade?: () => void;
  onGoToVip?: () => void;
}

type HistoryFilter = 'deposit' | 'withdraw' | 'internal' | 'commission' | 'all';
type CommissionHistoryFilter = 'all' | 'trading' | 'vip_agency' | 'pending' | 'approved';
type WithdrawNetwork = 'internal' | 'bep20';

const TetherIcon: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-11 w-11';
  return (
    <img
      src="/assets/aistudio/IMG_0102_a4e9003a.png"
      alt="USDT"
      className={`${sizeClass} shrink-0 rounded-full object-contain`}
    />
  );
};

function formatUsdt(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const WalletView: React.FC<WalletViewProps> = ({
  lang,
  user,
  token,
  depositWalletAddress,
  modalTrigger,
  subTabTrigger,
  onUserUpdated,
  onResetDemo,
  onGoToProfile,
  onGoToTrade,
  onGoToVip,
}) => {
  const isVi = lang === 'vi';

  const [subTab, setSubTab] = useState<WalletSubTab>('main');
  const [hideBalance, setHideBalance] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [withdrawNetwork, setWithdrawNetwork] = useState<WithdrawNetwork>('internal');

  // History dropdown filter
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('deposit');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Commission tab state
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commissionFilter, setCommissionFilter] = useState<CommissionHistoryFilter>('all');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Deposit form state
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [depositHash, setDepositHash] = useState<string>('');

  // Withdraw / Internal Transfer unified form state
  const [withdrawAmt, setWithdrawAmt] = useState<string>('');
  const [recipientOrAddr, setRecipientOrAddr] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [recipientPreview, setRecipientPreview] = useState<{
    id: string;
    email: string;
    nickname: string;
    isVip: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const withdrawFee = settings?.withdrawFee ?? 1;
  const activeDepositAddress = resolveDepositWalletAddress(
    depositWalletAddress || settings?.masterWalletAddress,
    user.walletAddress
  );

  const pendingCommissions = useMemo(
    () => commissions.filter((c) => getCommissionStatus(c) === 'pending'),
    [commissions]
  );
  const pendingCommissionTotal = useMemo(
    () =>
      Number(
        pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2)
      ),
    [pendingCommissions]
  );
  const totalAssets = Number(user.liveBalance.toFixed(2));

  useEffect(() => {
    if (modalTrigger && modalTrigger.seq > 0) {
      setModalTab(modalTrigger.tab);
      setFeedback(null);
      setModalOpen(true);
    }
  }, [modalTrigger]);

  useEffect(() => {
    if (subTabTrigger && subTabTrigger.seq > 0) {
      setSubTab(subTabTrigger.tab);
      fetchHistory();
    }
  }, [subTabTrigger]);

  useEffect(() => {
    if (!activeDepositAddress) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(activeDepositAddress, {
      width: 240,
      margin: 2,
      color: {
        dark: '#09090D',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [activeDepositAddress]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(data.transactions || []);
      setCommissions(data.commissions || []);
      if (data.settings) setSettings(data.settings);
    } catch {
      // ignore transient
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token, subTab, user.liveBalance, user.totalTradingCommission, user.totalVipCommission]);

  useEffect(() => {
    if (subTab !== 'commission') return;
    const timer = setInterval(fetchHistory, 2500);
    return () => clearInterval(timer);
  }, [token, subTab]);

  useEffect(() => {
    if (modalOpen) {
      fetchHistory();
    }
  }, [modalOpen, modalTab]);

  const openModal = (target: 'deposit' | 'withdraw') => {
    setModalTab(target);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleCopyAddress = async () => {
    if (!activeDepositAddress) return;
    try {
      await navigator.clipboard.writeText(activeDepositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback ignored
    }
  };

  const handlePaste = async (setter: (v: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setter(text.trim());
    } catch {
      // Clipboard API may be blocked in sandboxed iframe
    }
  };

  const handleVerifyRecipient = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setRecipientPreview(null);
      return;
    }
    try {
      const res = await fetch(`/api/wallet/lookup?query=${encodeURIComponent(clean)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setRecipientPreview(null);
        return;
      }
      const data = await res.json();
      setRecipientPreview(data.recipient || null);
    } catch {
      setRecipientPreview(null);
    }
  };

  const handleMaxWithdraw = () => {
    const fee = withdrawNetwork === 'bep20' ? withdrawFee : 0;
    const maxVal = Math.max(0, Number((user.liveBalance - fee).toFixed(2)));
    setWithdrawAmt(maxVal > 0 ? String(maxVal) : '0');
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amt = Number(depositAmt);
    if (!Number.isFinite(amt) || amt < 5) {
      setFeedback({
        type: 'err',
        text: isVi ? 'Số tiền nạp tối thiểu là 5 USDT.' : 'Minimum deposit amount is 5 USDT.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amt,
          txHash: depositHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi nạp tiền');
      if (data.user) onUserUpdated(data.user);
      setDepositAmt('');
      setDepositHash('');
      setHistoryFilter('deposit');
      setFeedback({
        type: 'ok',
        text: isVi
          ? `Đã gửi lệnh nạp ${formatUsdt(amt)} USDT. Đang chờ xác nhận.`
          : `Deposit request of ${formatUsdt(amt)} USDT submitted for confirmation.`,
      });
      fetchHistory();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi nạp tiền' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawOrTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!user.twoFactorEnabled) {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Bạn phải bật 2FA trong Hồ sơ & Bảo mật trước khi thực hiện yêu cầu rút tiền.'
          : 'Please enable 2FA in Profile & Security before withdrawing.',
      });
      return;
    }

    const amt = Number(withdrawAmt);
    if (!Number.isFinite(amt) || amt < 5) {
      setFeedback({
        type: 'err',
        text: isVi ? 'Số tiền tối thiểu là 5 USDT.' : 'Minimum amount is 5 USDT.',
      });
      return;
    }

    if (!recipientOrAddr.trim()) {
      setFeedback({
        type: 'err',
        text:
          withdrawNetwork === 'internal'
            ? isVi
              ? 'Vui lòng nhập biệt danh hoặc email người nhận.'
              : 'Please enter recipient nickname or email.'
            : isVi
            ? 'Vui lòng nhập địa chỉ ví nhận (0x...).'
            : 'Please enter destination wallet address (0x...).',
      });
      return;
    }

    setLoading(true);
    try {
      if (withdrawNetwork === 'internal') {
        const res = await fetch('/api/wallet/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientQuery: recipientOrAddr.trim(),
            amount: amt,
            note: withdrawNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi chuyển nội bộ');
        if (data.user) onUserUpdated(data.user);
        setWithdrawAmt('');
        setRecipientOrAddr('');
        setWithdrawNote('');
        setRecipientPreview(null);
        setHistoryFilter('internal');
        setFeedback({
          type: 'ok',
          text: isVi
            ? `Đã chuyển nội bộ tức thì ${formatUsdt(amt)} USDT (Phí 0 USDT)!`
            : `Sent ${formatUsdt(amt)} USDT internally (0 fee)!`,
        });
      } else {
        const res = await fetch('/api/wallet/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amt,
            address: recipientOrAddr.trim(),
            note: withdrawNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi rút tiền');
        if (data.user) onUserUpdated(data.user);
        setWithdrawAmt('');
        setRecipientOrAddr('');
        setWithdrawNote('');
        setHistoryFilter('withdraw');
        setFeedback({
          type: 'ok',
          text: isVi
            ? `Đã gửi yêu cầu rút ${formatUsdt(amt)} USDT. Đang chờ duyệt.`
            : `Submitted USDT withdrawal of ${formatUsdt(amt)} USDT.`,
        });
      }
      fetchHistory();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi giao dịch' });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (historyFilter === 'all') return transactions;
    if (historyFilter === 'deposit') return transactions.filter((tx) => tx.type === 'deposit');
    if (historyFilter === 'withdraw') return transactions.filter((tx) => tx.type === 'withdraw');
    if (historyFilter === 'commission') {
      return transactions.filter((tx) => tx.type === 'commission_claim');
    }
    return transactions.filter((tx) => tx.type === 'transfer_in' || tx.type === 'transfer_out');
  }, [transactions, historyFilter]);

  const commissionTimeline = useMemo(() => {
    return commissions
      .filter((c) => {
        const status = getCommissionStatus(c);
        if (commissionFilter === 'trading') return c.kind === 'trading';
        if (commissionFilter === 'vip_agency') return c.kind === 'vip_agency';
        if (commissionFilter === 'pending') return status === 'pending';
        if (commissionFilter === 'approved') return status === 'approved';
        return true;
      })
      .map((c) => {
        const status = getCommissionStatus(c);
        const rateStr = c.ratePct >= 1 ? `${c.ratePct}%` : `${Number(c.ratePct.toFixed(4))}%`;
        return {
          id: c.id,
          kind: c.kind,
          status,
          title:
            c.kind === 'trading'
              ? isVi
                ? `Hoa hồng giao dịch · F${c.tier}`
                : `Trading Commission · F${c.tier}`
              : isVi
              ? `Hoa hồng đại lý VIP · F${c.tier}`
              : `VIP Agency Bonus · F${c.tier}`,
          subtitle: isVi
            ? `${c.sourceNickname} · Gốc $${formatUsdt(c.baseAmount)} (${rateStr})`
            : `${c.sourceNickname} · Base $${formatUsdt(c.baseAmount)} (${rateStr})`,
          amount: c.commissionAmount,
          createdAt: c.createdAt,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [commissions, commissionFilter, isVi]);

  const filterMeta: Record<
    HistoryFilter,
    { label: string; colorClass: string; icon: 'down' | 'up' | 'swap' | 'commission' | 'all' }
  > = {
    deposit: { label: isVi ? 'Nạp tiền' : 'Deposit', colorClass: 'text-[#34D399]', icon: 'down' },
    withdraw: { label: isVi ? 'Rút tiền' : 'Withdraw', colorClass: 'text-[#FB7185]', icon: 'up' },
    internal: { label: isVi ? 'Nội bộ' : 'Internal', colorClass: 'text-[#C4B5FD]', icon: 'swap' },
    commission: {
      label: isVi ? 'Hoa hồng' : 'Commission',
      colorClass: 'text-[#C4B5FD]',
      icon: 'commission',
    },
    all: { label: isVi ? 'Tất cả' : 'All', colorClass: 'text-[#DDD6FE]', icon: 'all' },
  };

  const renderFilterIcon = (kind: 'down' | 'up' | 'swap' | 'commission' | 'all') => {
    if (kind === 'down') {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[#34D399]">
          <ArrowDownLeft className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (kind === 'up') {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[#FB7185]">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (kind === 'commission') {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C4B5FD]/15 text-[#C4B5FD]">
          <Crown className="h-3.5 w-3.5" />
        </span>
      );
    }
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C4B5FD]/15 text-[#C4B5FD]">
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </span>
    );
  };

  const maskedBalance = '••••••';
  const totalAssetsStr = hideBalance ? maskedBalance : formatUsdt(totalAssets);
  const liveBalanceStr = hideBalance ? maskedBalance : formatUsdt(user.liveBalance);
  const demoBalanceStr = hideBalance ? maskedBalance : formatUsdt(user.demoBalance);
  const pendingCommissionStr = hideBalance ? maskedBalance : formatUsdt(pendingCommissionTotal);

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      {/* ============================================================
          TOP OBSIDIAN-LAVENDER ASSETS HERO + 3-TAB BAR
         ============================================================ */}
      <section className="overflow-hidden shadow-xl shadow-black/50 lg:rounded-2xl lg:border lg:border-[#2F2947]">
        <div className="bg-gradient-to-br from-[#1C1633] via-[#2A1F4D] to-[#131022] px-5 pb-6 pt-6 sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm sm:text-base font-medium text-[#DDD6FE]">
              {isVi ? 'Tổng tài sản (USDT)' : 'Total Assets (USDT)'}
            </span>
            <button
              type="button"
              onClick={() => setHideBalance((h) => !h)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold text-[#DDD6FE] transition-colors hover:bg-[#C4B5FD]/15 hover:text-[#F5F3FF] cursor-pointer whitespace-nowrap"
            >
              {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>
                {hideBalance
                  ? isVi
                    ? 'Hiện số dư'
                    : 'Show balance'
                  : isVi
                  ? 'Ẩn số dư'
                  : 'Hide balance'}
              </span>
            </button>
          </div>

          <div
            data-testid="wallet-total-assets"
            className="mt-3 font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F5F3FF] tabular-nums"
          >
            {totalAssetsStr}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#C8C2DC]">
            <span>
              {isVi ? 'Ví chính:' : 'Main Wallet:'}{' '}
              <strong className="font-mono font-bold text-[#F5F3FF] tabular-nums">
                {hideBalance ? maskedBalance : `$${liveBalanceStr}`}
              </strong>
            </span>
            {pendingCommissionTotal > 0 && (
              <>
                <span className="text-[#6F668E]">·</span>
                <span>
                  {isVi ? 'Hoa hồng chờ duyệt:' : 'Pending commission:'}{' '}
                  <strong className="font-mono font-bold text-amber-300 tabular-nums">
                    {hideBalance ? maskedBalance : `+$${pendingCommissionStr}`}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Attached Obsidian Tab Strip: Ví chính | Ví giao dịch | Hoa hồng */}
        <div
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto bg-[#111118] border-b border-[#27223B] px-5 sm:px-7"
          role="tablist"
          aria-label={isVi ? 'Loại ví' : 'Wallet category'}
        >
          <button
            type="button"
            role="tab"
            data-testid="wallet-tab-main"
            aria-selected={subTab === 'main'}
            onClick={() => setSubTab('main')}
            className={`relative shrink-0 whitespace-nowrap py-3.5 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              subTab === 'main' ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
            }`}
          >
            <span>{isVi ? 'Ví chính' : 'Main Wallet'}</span>
            {subTab === 'main' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#C4B5FD]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            data-testid="wallet-tab-trading"
            aria-selected={subTab === 'trading'}
            onClick={() => setSubTab('trading')}
            className={`relative shrink-0 whitespace-nowrap py-3.5 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              subTab === 'trading' ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
            }`}
          >
            <span>{isVi ? 'Ví giao dịch' : 'Trading Wallet'}</span>
            {subTab === 'trading' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#C4B5FD]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            data-testid="wallet-tab-commission"
            aria-selected={subTab === 'commission'}
            onClick={() => {
              setSubTab('commission');
            }}
            className={`relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-3.5 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              subTab === 'commission' ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
            }`}
          >
            <span>{isVi ? 'Hoa hồng' : 'Commission'}</span>
            {subTab === 'commission' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#C4B5FD]" />
            )}
          </button>
        </div>
      </section>

      {/* ============================================================
          MAIN CONTENT BODY
         ============================================================ */}
      <div className="px-4 pt-6 space-y-8 lg:px-0">
        {subTab === 'main' ? (
          /* USDT Tether Asset Card */
          <div className="rounded-xl border border-[#27223B] bg-[#111118] overflow-hidden shadow-lg shadow-black/40">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3.5">
                <TetherIcon size="lg" />
                <div>
                  <div className="font-display text-base sm:text-lg font-extrabold text-[#F5F3FF]">
                    USDT
                  </div>
                  <div className="text-xs sm:text-sm text-[#958CB3]">Tether</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-base sm:text-lg font-extrabold text-[#F5F3FF] tabular-nums">
                  {liveBalanceStr}
                </div>
                <div className="font-mono text-xs sm:text-sm text-[#958CB3] tabular-nums">
                  {hideBalance ? '~$••••' : `~$${formatUsdt(user.liveBalance)}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-[#27223B]">
              <button
                type="button"
                onClick={() => openModal('deposit')}
                className="flex items-center justify-start sm:justify-center gap-2.5 px-4 py-4 text-sm font-bold text-[#F5F3FF] transition-colors hover:bg-[#181625] cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[#34D399]">
                  <ArrowDownLeft className="h-4 w-4" />
                </span>
                <span>{isVi ? 'Nạp tiền' : 'Deposit'}</span>
              </button>

              <button
                type="button"
                onClick={() => openModal('withdraw')}
                className="flex items-center justify-start sm:justify-center gap-2.5 border-l border-[#27223B] px-4 py-4 text-sm font-bold text-[#F5F3FF] transition-colors hover:bg-[#181625] cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-[#FB7185]">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <span>{isVi ? 'Rút tiền' : 'Withdraw'}</span>
              </button>
            </div>
          </div>
        ) : subTab === 'trading' ? (
          /* Ví giao dịch tab: Live Trading Balance + Demo Account Card */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F5F3FF]">
                  {isVi ? 'Tài khoản Thực' : 'Live Trading Account'}
                </span>
                <span className="text-xs font-bold text-[#34D399]">USDT</span>
              </div>
              <div className="mt-3 font-mono text-3xl font-extrabold text-[#F5F3FF] tabular-nums">
                ${liveBalanceStr}
              </div>
              <div className="mt-1 text-xs text-[#958CB3]">
                {isVi ? 'Đã nạp:' : 'Deposited:'} ${formatUsdt(user.totalDeposited)} ·{' '}
                {isVi ? 'Đã rút:' : 'Withdrawn:'} ${formatUsdt(user.totalWithdrawn)}
              </div>
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal('deposit')}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-2.5 text-xs font-extrabold text-[#140E24] shadow-sm shadow-[#C4B5FD]/15 hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
                >
                  {isVi ? 'Nạp tiền' : 'Deposit'}
                </button>
                {onGoToTrade && (
                  <button
                    type="button"
                    onClick={onGoToTrade}
                    className="flex-1 rounded-lg border border-[#C4B5FD]/35 bg-[#181625] py-2.5 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                  >
                    {isVi ? 'Giao dịch ngay' : 'Trade Now'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#27223B] bg-[#111118] p-5 shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#F5F3FF]">
                  {isVi ? 'Tài khoản Demo' : 'Demo Trading Account'}
                </span>
                <span className="text-xs font-bold text-[#C4B5FD]">
                  {isVi ? 'Thử nghiệm' : 'Practice'}
                </span>
              </div>
              <div className="mt-3 font-mono text-3xl font-extrabold text-[#34D399] tabular-nums">
                ${demoBalanceStr}
              </div>
              <div className="mt-1 text-xs text-[#958CB3]">
                {isVi
                  ? 'Miễn phí làm mới $1,000 bất kỳ lúc nào để luyện tập.'
                  : 'Reset freely to $1,000 anytime for practice.'}
              </div>
              <div className="mt-4 flex gap-2.5">
                {onResetDemo && (
                  <button
                    type="button"
                    onClick={onResetDemo}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#C4B5FD]/35 bg-[#181625] py-2.5 text-xs font-bold text-[#DDD6FE] hover:bg-[#231F38] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-[#C4B5FD]" />
                    <span>{isVi ? 'Đặt lại $1,000' : 'Reset $1,000'}</span>
                  </button>
                )}
                {onGoToTrade && (
                  <button
                    type="button"
                    onClick={onGoToTrade}
                    className="flex-1 rounded-lg bg-[#059669] py-2.5 text-xs font-extrabold text-white hover:bg-[#10B981] cursor-pointer"
                  >
                    {isVi ? 'Giao dịch Demo' : 'Trade Demo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             HOA HỒNG TAB: Lịch sử Hoa hồng (tự động cộng Ví chính sau khi Admin duyệt)
             ============================================================ */
          <div className="space-y-4" data-testid="wallet-commission-panel">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#F5F3FF]">
                    {isVi ? 'Lịch sử Hoa hồng' : 'Commission History'}
                  </h2>
                  <p className="mt-1 text-xs text-[#958CB3]">
                    {isVi
                      ? 'Hoa hồng giao dịch & đại lý VIP tự động cộng trực tiếp vào Ví chính ngay sau khi Admin duyệt.'
                      : 'Trading & VIP agency commissions are automatically credited to your Main Wallet after Admin approval.'}
                  </p>
                </div>

                {onGoToVip && (
                  <button
                    type="button"
                    onClick={onGoToVip}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-[#C4B5FD] transition-colors hover:text-[#DDD6FE] cursor-pointer whitespace-nowrap"
                  >
                    <span>{isVi ? 'Cấp bậc & Mạng lưới VIP' : 'VIP Rank & Network'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label={isVi ? 'Lọc lịch sử hoa hồng' : 'Filter commission history'}
              >
                {(
                  [
                    { key: 'all', label: isVi ? 'Tất cả' : 'All' },
                    { key: 'trading', label: isVi ? 'Hoa hồng giao dịch' : 'Trading' },
                    { key: 'vip_agency', label: isVi ? 'Hoa hồng đại lý VIP' : 'VIP Agency' },
                    {
                      key: 'pending',
                      label:
                        pendingCommissions.length > 0
                          ? isVi
                            ? `Chờ duyệt (${pendingCommissions.length})`
                            : `Pending (${pendingCommissions.length})`
                          : isVi
                          ? 'Chờ duyệt'
                          : 'Pending',
                    },
                    { key: 'approved', label: isVi ? 'Đã duyệt' : 'Approved' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCommissionFilter(item.key)}
                    className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      commissionFilter === item.key
                        ? 'border-[#C4B5FD]/60 bg-[#261F3D] text-[#DDD6FE]'
                        : 'border-[#27223B] bg-[#14131E] text-[#958CB3] hover:text-[#F5F3FF]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-[#27223B] bg-[#111118] shadow-lg shadow-black/40">
                {commissionTimeline.length === 0 ? (
                  <div className="py-8 text-center text-sm font-semibold text-[#958CB3]">
                    {isVi
                      ? 'Chưa có lịch sử hoa hồng trong mục này.'
                      : 'No commission records found for this filter.'}
                  </div>
                ) : (
                  <div className="divide-y divide-[#231F36]">
                    {commissionTimeline.map((row) => (
                      <div
                        key={row.id}
                        data-testid="wallet-commission-row"
                        data-status={row.status}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 hover:bg-[#181625]"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {renderFilterIcon('commission')}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[#F5F3FF]">
                              {row.title}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-[#C8C2DC]">
                              {row.subtitle}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[10px] text-[#958CB3]">
                              {new Date(row.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right whitespace-nowrap">
                          <div
                            className={`font-mono text-sm font-extrabold tabular-nums ${
                              row.status === 'approved'
                                ? 'text-[#34D399]'
                                : row.status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#958CB3] line-through'
                            }`}
                          >
                            +${row.amount.toFixed(2)}
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] font-bold ${
                              row.status === 'approved'
                                ? 'text-[#34D399]'
                                : row.status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#FB7185]'
                            }`}
                          >
                            {row.status === 'approved'
                              ? isVi
                                ? 'Đã duyệt · Ví chính'
                                : 'Approved · Main'
                              : row.status === 'pending'
                              ? isVi
                                ? 'Chờ duyệt'
                                : 'Pending'
                              : isVi
                              ? 'Từ chối'
                              : 'Rejected'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            TRANSACTION HISTORY SECTION (Shown on Main & Trading tabs)
           ============================================================ */}
        {subTab !== 'commission' && (
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-extrabold text-[#F5F3FF]">
              {isVi ? 'Lịch sử giao dịch' : 'Transaction History'}
            </h2>

            {/* Filter Dropdown */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((o) => !o)}
                aria-expanded={filterDropdownOpen}
                className="inline-flex items-center gap-2.5 rounded-lg border border-[#27223B] bg-[#14131E] px-3.5 py-2.5 text-sm font-semibold text-[#F5F3FF] shadow-xs transition-colors hover:border-[#C4B5FD]/60 cursor-pointer"
              >
                {renderFilterIcon(filterMeta[historyFilter].icon)}
                <span>{filterMeta[historyFilter].label}</span>
                <ChevronDown className="h-4 w-4 text-[#958CB3]" />
              </button>

              {filterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[#2F2947] bg-[#14131E] p-1.5 shadow-2xl shadow-black/80 z-30">
                  {(['deposit', 'withdraw', 'internal', 'commission', 'all'] as HistoryFilter[]).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setHistoryFilter(key);
                          setFilterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                          historyFilter === key
                            ? 'bg-[#261F3D] text-[#DDD6FE]'
                            : 'text-[#C8C2DC] hover:bg-[#1E1A30] hover:text-[#F5F3FF]'
                        }`}
                      >
                        {renderFilterIcon(filterMeta[key].icon)}
                        <span>{filterMeta[key].label}</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Empty State Card or Populated History List */}
            <div className="rounded-xl border border-[#27223B] bg-[#111118] overflow-hidden shadow-lg shadow-black/40">
              {filteredTransactions.length === 0 ? (
                <div className="py-7 text-center text-sm font-semibold text-[#958CB3]">
                  {isVi ? 'Không có dữ liệu' : 'No data available'}
                </div>
              ) : (
                <div className="divide-y divide-[#231F36]">
                  {filteredTransactions.map((tx) => {
                    const isCredit =
                      tx.type === 'deposit' ||
                      tx.type === 'transfer_in' ||
                      tx.type === 'prize_pool' ||
                      tx.type === 'commission_claim' ||
                      (tx.type === 'admin_adjust' && tx.amount > 0);
                    const typeLabel =
                      tx.type === 'deposit'
                        ? isVi
                          ? 'Nạp tiền'
                          : 'Deposit'
                        : tx.type === 'withdraw'
                        ? isVi
                          ? 'Rút tiền'
                          : 'Withdraw'
                        : tx.type === 'transfer_out'
                        ? isVi
                          ? 'Chuyển nội bộ'
                          : 'Internal Out'
                        : tx.type === 'transfer_in'
                        ? isVi
                          ? 'Nhận nội bộ'
                          : 'Internal In'
                        : tx.type === 'commission_claim'
                        ? isVi
                          ? 'Hoa hồng đã duyệt'
                          : 'Approved Commission'
                        : tx.type === 'prize_pool'
                        ? isVi
                          ? 'Thưởng Prize Pool'
                          : 'Prize Pool Reward'
                        : tx.type === 'vip_upgrade'
                        ? isVi
                          ? 'Nâng cấp VIP'
                          : 'VIP Upgrade'
                        : isVi
                        ? 'Điều chỉnh'
                        : 'Adjustment';

                    return (
                      <div
                        key={tx.id}
                        data-testid="wallet-tx-row"
                        className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 hover:bg-[#181625]"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {renderFilterIcon(
                            tx.type === 'commission_claim'
                              ? 'commission'
                              : tx.type === 'deposit' || tx.type === 'prize_pool'
                              ? 'down'
                              : tx.type === 'withdraw'
                              ? 'up'
                              : 'swap'
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[#F5F3FF]">
                              {typeLabel}
                            </div>
                            <div
                              className="mt-0.5 truncate font-mono text-[11px] text-[#C8C2DC]"
                              title={tx.addressOrPeer}
                            >
                              {tx.addressOrPeer}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[10px] text-[#958CB3]">
                              {new Date(tx.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right whitespace-nowrap">
                          <div
                            className={`font-mono text-sm font-extrabold tabular-nums ${
                              isCredit ? 'text-[#34D399]' : 'text-[#FB7185]'
                            }`}
                          >
                            {isCredit ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] font-bold ${
                              tx.status === 'completed'
                                ? 'text-[#34D399]'
                                : tx.status === 'pending'
                                ? 'text-amber-300'
                                : 'text-[#FB7185]'
                            }`}
                          >
                            {tx.status === 'completed'
                              ? isVi
                                ? 'Hoàn tất'
                                : 'Completed'
                              : tx.status === 'pending'
                              ? isVi
                                ? 'Chờ duyệt'
                                : 'Pending'
                              : isVi
                              ? 'Từ chối'
                              : 'Rejected'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ============================================================
          DEPOSIT / WITHDRAW FULL-FEATURED MODAL
         ============================================================ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/75 backdrop-blur-xs sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modalTab === 'deposit' ? 'Nạp tiền USDT' : 'Rút tiền USDT'}
        >
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#111118] sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-[#2F2947] shadow-2xl shadow-black/80">
            {/* Top Modal Tab Bar: Nạp tiền | Rút tiền + X */}
            <div className="relative flex items-center border-b border-[#27223B] bg-[#14131E] px-4">
              <div className="grid flex-1 grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('deposit');
                    setFeedback(null);
                  }}
                  className={`relative py-4 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                    modalTab === 'deposit' ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
                  }`}
                >
                  <span>{isVi ? 'Nạp tiền' : 'Deposit'}</span>
                  {modalTab === 'deposit' && (
                    <span className="absolute bottom-0 left-1/2 h-[3px] w-28 -translate-x-1/2 rounded-t-full bg-[#C4B5FD]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalTab('withdraw');
                    setFeedback(null);
                  }}
                  className={`relative py-4 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                    modalTab === 'withdraw' ? 'text-[#DDD6FE]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
                  }`}
                >
                  <span>{isVi ? 'Rút tiền' : 'Withdraw'}</span>
                  {modalTab === 'withdraw' && (
                    <span className="absolute bottom-0 left-1/2 h-[3px] w-28 -translate-x-1/2 rounded-t-full bg-[#C4B5FD]" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng cửa sổ ví"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Shared USDT Balance Strip Box */}
              <div className="flex items-center gap-3 rounded-lg border border-[#27223B] bg-[#161423] px-3.5 py-2.5">
                <TetherIcon size="sm" />
                <span className="font-mono text-base font-extrabold text-[#F5F3FF] tabular-nums">
                  {formatUsdt(user.liveBalance)}
                </span>
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

              {/* ==========================================
                  MODAL TAB 1: NẠP TIỀN
                 ========================================== */}
              {modalTab === 'deposit' ? (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs font-semibold text-[#C8C2DC]">
                      {isVi ? 'Mạng lưới' : 'Network'}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-7 py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15"
                    >
                      USDT (BSC)
                    </button>
                  </div>

                  {/* Safety Note Box */}
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
                    <strong className="font-bold text-amber-300">
                      {isVi ? 'Ghi chú:' : 'Note:'}
                    </strong>{' '}
                    {isVi
                      ? 'Để đảm bảo an toàn cho tài sản của bạn, hãy chọn đúng mạng lưới. Sau khi chuyển tiền vào ví bên dưới, vui lòng điền mã TxID và số tiền đã chuyển (không bao gồm phí chuyển)'
                      : 'To keep your assets safe, please verify you selected the BSC network. After transferring to the wallet below, submit your TxID and transferred amount (excluding fees).'}
                  </div>

                  {/* Centered QR Code & Wallet Address (crisp white backing for camera scanning) */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-[#F5F3FF]">
                      {isVi ? (
                        <>
                          Địa chỉ <span className="text-[#34D399]">USDT</span> nạp tiền của bạn
                        </>
                      ) : (
                        <>
                          Your <span className="text-[#34D399]">USDT</span> Deposit Address
                        </>
                      )}
                    </h3>

                    <div className="mt-4 rounded-xl border border-[#2F2947] bg-white p-2.5 shadow-lg shadow-black/50">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR ví ${activeDepositAddress}`}
                          data-testid="wallet-qr-image"
                          className="h-44 w-44"
                        />
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center text-[#4B3E72]">
                          <QrCode className="h-14 w-14" />
                        </div>
                      )}
                    </div>

                    {/* Wallet Address Copy Bar */}
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      title={isVi ? 'Nhấn để sao chép địa chỉ ví' : 'Click to copy address'}
                      className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-[#2F2947] bg-[#181625] px-3.5 py-2.5 text-left text-[#F5F3FF] transition-colors hover:bg-[#231F38] cursor-pointer"
                    >
                      <code
                        data-testid="wallet-address-text"
                        className="flex-1 truncate font-mono text-xs sm:text-sm font-semibold text-[#DDD6FE]"
                      >
                        {activeDepositAddress}
                      </code>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#261F3D] px-2 py-1 text-[11px] font-bold text-[#C4B5FD]">
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#34D399]" />
                            <span>{isVi ? 'Đã chép' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </span>
                    </button>

                    <div className="mt-2.5 text-xs italic text-[#958CB3]">
                      {isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Minimum amount: 5 USDT'}
                    </div>
                  </div>

                  {/* Lavender Accent Separator + Deposit Submission Form */}
                  <div className="mx-auto h-0.5 w-3/4 rounded-full bg-gradient-to-r from-transparent via-[#C4B5FD]/60 to-transparent" />

                  <form onSubmit={handleDepositSubmit} className="space-y-4">
                    <div className="relative rounded-lg border border-[#2F2947] bg-[#111118] px-3.5 pb-2.5 pt-3.5 focus-within:border-[#C4B5FD]">
                      <label
                        htmlFor="modal-dep-amount"
                        className="absolute -top-2.5 left-3 bg-[#111118] px-1.5 text-[11px] font-semibold text-[#958CB3]"
                      >
                        {isVi ? 'Số tiền đã chuyển (USDT)' : 'Transferred Amount (USDT)'}
                      </label>
                      <input
                        id="modal-dep-amount"
                        type="number"
                        min={5}
                        step="0.01"
                        required
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder={isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Min amount: 5 USDT'}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
                      />
                    </div>

                    <div className="relative flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#111118] px-3.5 pb-2.5 pt-3.5 focus-within:border-[#C4B5FD]">
                      <label
                        htmlFor="modal-dep-hash"
                        className="absolute -top-2.5 left-3 bg-[#111118] px-1.5 text-[11px] font-semibold text-[#958CB3]"
                      >
                        {isVi ? 'Mã TxID (tuỳ chọn)' : 'TxID Hash (optional)'}
                      </label>
                      <input
                        id="modal-dep-hash"
                        type="text"
                        value={depositHash}
                        onChange={(e) => setDepositHash(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 bg-transparent font-mono text-xs text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
                      />
                      <button
                        type="button"
                        onClick={() => handlePaste(setDepositHash)}
                        className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer"
                      >
                        {isVi ? 'Dán' : 'Paste'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-3 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/20 transition hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer disabled:opacity-60"
                    >
                      {loading
                        ? isVi
                          ? 'Đang xử lý...'
                          : 'Processing...'
                        : isVi
                        ? 'Xác nhận nạp tiền'
                        : 'Confirm Deposit'}
                    </button>
                  </form>
                </div>
              ) : (
                /* ==========================================
                   MODAL TAB 2: RÚT TIỀN — Nội bộ & BEP20
                   ========================================== */
                <form onSubmit={handleWithdrawOrTransferSubmit} className="space-y-5">
                  <div>
                    <div className="mb-2.5 text-xs font-semibold text-[#C8C2DC]">
                      {isVi ? 'Mạng lưới' : 'Network'}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawNetwork('internal');
                          setRecipientOrAddr('');
                          setRecipientPreview(null);
                          setFeedback(null);
                        }}
                        className={`relative rounded-lg px-3 py-3 text-center transition-all cursor-pointer ${
                          withdrawNetwork === 'internal'
                            ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/20'
                            : 'border border-[#2F2947] bg-[#181625] text-[#C8C2DC] hover:bg-[#231F38]'
                        }`}
                      >
                        {withdrawNetwork === 'internal' && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#140E24] text-[#DDD6FE] shadow">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="text-sm font-extrabold">{isVi ? 'Nội bộ' : 'Internal'}</div>
                        <div
                          className={`mt-0.5 text-xs font-semibold ${
                            withdrawNetwork === 'internal' ? 'text-[#281C47]' : 'text-amber-300'
                          }`}
                        >
                          {isVi ? 'Phí: 0 USDT' : 'Fee: 0 USDT'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawNetwork('bep20');
                          setRecipientOrAddr('');
                          setRecipientPreview(null);
                          setFeedback(null);
                        }}
                        className={`relative rounded-lg px-3 py-3 text-center transition-all cursor-pointer ${
                          withdrawNetwork === 'bep20'
                            ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/20'
                            : 'border border-[#2F2947] bg-[#181625] text-[#C8C2DC] hover:bg-[#231F38]'
                        }`}
                      >
                        {withdrawNetwork === 'bep20' && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#140E24] text-[#DDD6FE] shadow">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="text-sm font-extrabold">USDT (BSC)</div>
                        <div
                          className={`mt-0.5 text-xs font-semibold ${
                            withdrawNetwork === 'bep20' ? 'text-[#281C47]' : 'text-amber-300'
                          }`}
                        >
                          {isVi ? `Phí: ${withdrawFee} USDT` : `Fee: ${withdrawFee} USDT`}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Field 1: Số lượng USDT + TỐI ĐA button */}
                  <div className="relative flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#111118] px-3.5 pb-2.5 pt-3.5 focus-within:border-[#C4B5FD]">
                    <label
                      htmlFor="wd-modal-amount"
                      className="absolute -top-2.5 left-3 bg-[#111118] px-1.5 text-[11px] font-semibold text-[#958CB3]"
                    >
                      {isVi ? 'Số lượng USDT' : 'USDT Amount'}
                    </label>
                    <input
                      id="wd-modal-amount"
                      type="number"
                      min={5}
                      step="0.01"
                      required
                      value={withdrawAmt}
                      onChange={(e) => setWithdrawAmt(e.target.value)}
                      placeholder={isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Minimum amount: 5 USDT'}
                      className="flex-1 bg-transparent font-mono text-sm font-semibold text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
                    />
                    <button
                      type="button"
                      onClick={handleMaxWithdraw}
                      className="rounded-md bg-[#C4B5FD] px-3 py-1.5 text-xs font-extrabold text-[#140E24] transition-colors hover:bg-[#DDD6FE] cursor-pointer shrink-0"
                    >
                      {isVi ? 'TỐI ĐA' : 'MAX'}
                    </button>
                  </div>

                  {/* Field 2: Biệt danh người nhận (Nội bộ) or Địa chỉ ví nhận (BEP20) */}
                  <div>
                    <div className="relative flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#111118] px-3.5 pb-2.5 pt-3.5 focus-within:border-[#C4B5FD]">
                      <label
                        htmlFor="wd-modal-recipient"
                        className="absolute -top-2.5 left-3 bg-[#111118] px-1.5 text-[11px] font-semibold text-[#958CB3]"
                      >
                        {withdrawNetwork === 'internal'
                          ? isVi
                            ? 'Biệt danh người nhận'
                            : 'Recipient Nickname'
                          : isVi
                          ? 'Địa chỉ ví nhận USDT'
                          : 'USDT Destination Address'}
                      </label>
                      <input
                        id="wd-modal-recipient"
                        type="text"
                        required
                        value={recipientOrAddr}
                        onChange={(e) => {
                          setRecipientOrAddr(e.target.value);
                          setRecipientPreview(null);
                        }}
                        onBlur={() => {
                          if (withdrawNetwork === 'internal') {
                            handleVerifyRecipient(recipientOrAddr);
                          }
                        }}
                        placeholder={
                          withdrawNetwork === 'internal'
                            ? isVi
                              ? 'Nhập biệt danh người nhận'
                              : 'Enter recipient nickname or email'
                            : '0x...'
                        }
                        className="flex-1 bg-transparent text-sm text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
                      />
                      <button
                        type="button"
                        onClick={() => handlePaste(setRecipientOrAddr)}
                        className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer shrink-0"
                      >
                        {isVi ? 'Dán' : 'Paste'}
                      </button>
                    </div>

                    {withdrawNetwork === 'internal' && recipientPreview && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-xs text-[#34D399]">
                        <CheckCircle2 className="h-4 w-4 text-[#34D399] shrink-0" />
                        <span>
                          {isVi ? 'Đã xác nhận người nhận:' : 'Verified recipient:'}{' '}
                          <strong>{recipientPreview.nickname}</strong> ({recipientPreview.email})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Field 3: Ghi chú (tuỳ chọn) */}
                  <div className="relative flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#111118] px-3.5 pb-2.5 pt-3.5 focus-within:border-[#C4B5FD]">
                    <label
                      htmlFor="wd-modal-note"
                      className="absolute -top-2.5 left-3 bg-[#111118] px-1.5 text-[11px] font-semibold text-[#958CB3]"
                    >
                      {isVi ? 'Ghi chú (tuỳ chọn)' : 'Note (optional)'}
                    </label>
                    <input
                      id="wd-modal-note"
                      type="text"
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      placeholder={isVi ? 'Nhập ghi chú của bạn' : 'Enter your note'}
                      className="flex-1 bg-transparent text-sm text-[#F5F3FF] outline-none placeholder:text-[#7E769C]"
                    />
                    <button
                      type="button"
                      onClick={() => handlePaste(setWithdrawNote)}
                      className="text-xs font-bold text-[#C4B5FD] hover:text-[#DDD6FE] cursor-pointer shrink-0"
                    >
                      {isVi ? 'Dán' : 'Paste'}
                    </button>
                  </div>

                  {/* 2FA Required Warning Banner */}
                  {!user.twoFactorEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(false);
                        onGoToProfile?.();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/35 bg-rose-500/15 px-4 py-3 text-center text-xs sm:text-sm font-semibold text-[#FB7185] transition-colors hover:bg-rose-500/20 cursor-pointer"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0 text-[#FB7185]" />
                      <span>
                        {isVi
                          ? 'Bạn phải bật 2FA để thực hiện yêu cầu rút tiền'
                          : 'You must enable 2FA to make a withdrawal request'}
                      </span>
                    </button>
                  )}

                  {/* Centered Submit CTA ("Gửi") */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full max-w-[260px] rounded-lg bg-[#E11D48] text-sm sm:text-base font-bold text-white shadow-md shadow-rose-500/25 transition-all hover:bg-[#F43F5E] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (isVi ? 'Đang gửi...' : 'Submitting...') : isVi ? 'Gửi' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
