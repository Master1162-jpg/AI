import React, { useEffect, useState } from 'react';
import { ArrowRight, Crown, X } from 'lucide-react';
import type { CommissionToastData, Language } from '../types';

interface CommissionToastProps {
  toast: CommissionToastData | null;
  lang: Language;
  durationMs?: number;
  onDismiss: () => void;
  onOpenCommissionWallet: () => void;
}

function fmtAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: safe < 1 && safe > 0 ? 2 : 2,
    maximumFractionDigits: safe < 0.01 && safe > 0 ? 4 : 2,
  });
}

export const CommissionToast: React.FC<CommissionToastProps> = ({
  toast,
  lang,
  durationMs = 5500,
  onDismiss,
  onOpenCommissionWallet,
}) => {
  const isVi = lang === 'vi';
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [toast, paused, durationMs, onDismiss]);

  if (!toast) return null;

  const titleText =
    toast.count > 1
      ? isVi
        ? `Nhận ${toast.count} khoản hoa hồng mới`
        : `${toast.count} New Agency Commissions`
      : toast.kind === 'vip_agency'
      ? isVi
        ? `Hoa hồng Đại lý VIP · F${toast.tier ?? 1}`
        : `VIP Agency Bonus · F${toast.tier ?? 1}`
      : isVi
      ? `Hoa hồng giao dịch · F${toast.tier ?? 1}`
      : `Trading Commission · F${toast.tier ?? 1}`;

  const sourceLabel =
    toast.count > 1
      ? isVi
        ? 'Từ hệ thống đại lý VIP'
        : 'From VIP agency network'
      : toast.sourceNickname
      ? isVi
        ? `từ ${toast.sourceNickname}`
        : `from ${toast.sourceNickname}`
      : isVi
      ? 'Hệ thống đại lý'
      : 'Agency network';

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      data-testid="commission-toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="fixed left-4 right-4 top-[66px] z-50 sm:left-auto sm:right-5 sm:top-[72px] sm:w-[356px] overflow-hidden rounded-xl border border-[#C4B5FD]/45 bg-[#14131E]/95 shadow-2xl shadow-black/75 backdrop-blur-md"
      style={{ animation: 'commissionToastIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Compact Light-Purple Agency Crest */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#DDD6FE] via-[#C4B5FD] to-[#8B5CF6] text-[#140E24] shadow-md shadow-[#C4B5FD]/25">
          <Crown className="h-5 w-5 stroke-[2.2]" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-xs font-bold text-[#DDD6FE]">{titleText}</div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={isVi ? 'Đóng thông báo hoa hồng' : 'Dismiss commission notification'}
              className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#958CB3] transition-colors hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              data-testid="commission-toast-amount"
              className="font-mono text-lg font-extrabold tracking-tight text-[#34D399] tabular-nums"
            >
              +${fmtAmount(toast.totalAmount)} USDT
            </span>
            <span className="truncate text-xs text-[#958CB3]">{sourceLabel}</span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#27223B] pt-2 text-[11px]">
            <span className="truncate text-[#C8C2DC] tabular-nums">
              {isVi ? 'Đã cộng Ví chính:' : 'Main Wallet:'}{' '}
              <strong
                data-testid="commission-toast-balance"
                className="font-mono font-bold text-[#F5F3FF]"
              >
                ${fmtAmount(toast.newCommissionBalance)}
              </strong>
            </span>
            <button
              type="button"
              data-testid="commission-toast-open-wallet"
              onClick={onOpenCommissionWallet}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-[#C4B5FD] transition-colors hover:text-[#F5F3FF] cursor-pointer whitespace-nowrap"
            >
              <span>{isVi ? 'Xem lịch sử' : 'View history'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle auto-dismiss countdown progress bar */}
      <div className="h-[2.5px] w-full bg-[#241F38]">
        <div
          className="h-full w-full origin-left bg-gradient-to-r from-[#C4B5FD] to-[#34D399]"
          style={{
            animation: `commissionProgress ${durationMs}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};
