import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Clock,
} from 'lucide-react';
import type { AccountMode, Language, TradeOrder } from '../types';

interface OrdersHistoryViewProps {
  lang: Language;
  accountMode: AccountMode;
  orders: TradeOrder[];
  onBackToTrade: () => void;
}

type OrderScope = 'active' | 'all';

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({
  lang,
  accountMode,
  orders,
  onBackToTrade,
}) => {
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [scope, setScope] = useState<OrderScope>('active');

  const isVi = lang === 'vi';

  const scopedOrders = useMemo(() => {
    if (scope === 'all') return orders;
    return orders.filter((o) => o.accountMode === accountMode);
  }, [orders, scope, accountMode]);

  const openOrders = useMemo(
    () => scopedOrders.filter((o) => o.status === 'OPEN'),
    [scopedOrders]
  );

  const closedOrders = useMemo(
    () => scopedOrders.filter((o) => o.status !== 'OPEN'),
    [scopedOrders]
  );

  const visibleOrders = tab === 'OPEN' ? openOrders : closedOrders;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(isVi ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header: Back Arrow + Lịch sử Giao dịch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTrade}
            aria-label={isVi ? 'Quay lại giao dịch' : 'Back to trade'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#C8C2DC] transition-colors hover:bg-[#1E1A30] hover:text-[#F5F3FF] cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#F5F3FF]">
            {isVi ? 'Lịch sử Giao dịch' : 'Trade History'}
          </h1>
        </div>

        {/* Account Scope Toggle */}
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
            {isVi ? 'Tất cả' : 'All'} ({orders.length})
          </button>
        </div>
      </div>

      {/* Two Large Rounded-Full Segmented Buttons */}
      <div className="grid grid-cols-2 gap-3" role="tablist" aria-label={isVi ? 'Trạng thái lệnh' : 'Order status'}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'OPEN'}
          onClick={() => setTab('OPEN')}
          className={`flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full px-4 text-sm sm:text-base font-extrabold transition-all whitespace-nowrap cursor-pointer ${
            tab === 'OPEN'
              ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
              : 'border border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:border-[#C4B5FD]/40 hover:text-[#F5F3FF]'
          }`}
        >
          <span>{isVi ? 'Lệnh đang mở' : 'Open Orders'}</span>
          {openOrders.length > 0 && (
            <span className="font-mono text-xs opacity-90">({openOrders.length})</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'CLOSED'}
          onClick={() => setTab('CLOSED')}
          className={`flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full px-4 text-sm sm:text-base font-extrabold transition-all whitespace-nowrap cursor-pointer ${
            tab === 'CLOSED'
              ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
              : 'border border-[#27223B] bg-[#161423] text-[#C8C2DC] hover:border-[#C4B5FD]/40 hover:text-[#F5F3FF]'
          }`}
        >
          <span>{isVi ? 'Lệnh đã khớp' : 'Closed Orders'}</span>
          {closedOrders.length > 0 && (
            <span className="font-mono text-xs opacity-90">({closedOrders.length})</span>
          )}
        </button>
      </div>

      {/* Orders List or Centered Brand-Mark Empty State */}
      <div className="mt-6">
        {visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#27223B] bg-[#111118] px-4 py-16 text-center shadow-lg shadow-black/40">
            {/* Subtle RaidenBO Hexagonal Lightning Emblem */}
            <svg
              viewBox="0 0 64 64"
              className="h-16 w-16 text-[#C4B5FD]/45"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M32 6L54 19V45L32 58L10 45V19L32 6Z"
                fill="currentColor"
                opacity="0.3"
              />
              <path
                d="M36 14L20 34H31L27.5 50L44 29H33L36 14Z"
                fill="currentColor"
              />
            </svg>
            <p className="mt-5 text-base font-semibold text-[#C8C2DC]">
              {tab === 'OPEN'
                ? isVi
                  ? 'Bạn chưa có lệnh nào đang mở'
                  : 'You have no open orders yet'
                : isVi
                ? 'Bạn chưa có lệnh đã khớp nào'
                : 'You have no closed orders yet'}
            </p>
            <button
              type="button"
              onClick={onBackToTrade}
              className="mt-5 rounded-xl border border-[#C4B5FD]/35 bg-[#1E1933] px-5 py-2.5 text-xs font-bold text-[#DDD6FE] transition-colors hover:border-[#C4B5FD]/70 hover:bg-[#282144] cursor-pointer"
            >
              {isVi ? 'Đặt lệnh BTC/USDT ngay' : 'Place a BTC/USDT order'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((ord) => {
              const isBuy = ord.direction === 'BUY';
              const isWin = ord.status === 'WON';
              const isDraw = ord.status === 'DRAW';
              const isOpen = ord.status === 'OPEN';
              const totalReturn = isWin
                ? ord.amount + ord.pnl
                : isDraw
                ? ord.amount
                : 0;

              return (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-[#27223B] bg-[#111118] p-4 shadow-lg shadow-black/40 transition-colors hover:border-[#C4B5FD]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isBuy
                            ? 'bg-emerald-500/15 text-[#34D399]'
                            : 'bg-rose-500/15 text-[#FB7185]'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#F5F3FF]">
                            {ord.pair}
                          </span>
                          <span
                            className={`text-xs font-extrabold ${
                              isBuy ? 'text-[#34D399]' : 'text-[#FB7185]'
                            }`}
                          >
                            {isBuy ? (isVi ? 'MUA' : 'BUY') : isVi ? 'BÁN' : 'SELL'}
                          </span>
                          <span className="text-xs text-[#595078]">·</span>
                          <span className="text-xs font-semibold text-[#958CB3]">
                            {ord.accountMode === 'live'
                              ? isVi
                                ? 'Thực'
                                : 'Live'
                              : 'Demo'}
                          </span>
                          {ord.source === 'bot' && (
                            <>
                              <span className="text-xs text-[#595078]">·</span>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C4B5FD]">
                                <Bot className="h-3.5 w-3.5" />
                                Bot AI
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[#958CB3]">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(ord.createdAt)}</span>
                          <span>·</span>
                          <span>#{ord.roundId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-extrabold text-[#F5F3FF] tabular-nums">
                        ${ord.amount.toFixed(2)}
                      </div>
                      {isOpen ? (
                        <div className="mt-0.5 font-mono text-xs font-semibold text-[#C4B5FD]">
                          {isVi ? 'Đang mở' : 'Open'} · Entry ${ord.entryPrice.toFixed(2)}
                        </div>
                      ) : isDraw ? (
                        <div className="mt-0.5 font-mono text-xs font-bold text-[#C8C2DC] tabular-nums">
                          {isVi ? 'Hòa' : 'Draw'} · $0.00 ({isVi ? 'Hoàn' : 'Refund'} ${totalReturn.toFixed(2)})
                        </div>
                      ) : isWin ? (
                        <div className="mt-0.5 font-mono text-xs font-extrabold text-[#34D399] tabular-nums">
                          {isVi ? 'Thắng' : 'Won'} +${ord.pnl.toFixed(2)} ({isVi ? 'Nhận' : 'Payout'} ${totalReturn.toFixed(2)})
                        </div>
                      ) : (
                        <div className="mt-0.5 font-mono text-xs font-extrabold text-[#FB7185] tabular-nums">
                          {isVi ? 'Thua' : 'Lost'} -${ord.amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isOpen && ord.closePrice !== undefined && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#27223B] pt-2.5 font-mono text-[11px] text-[#958CB3] tabular-nums">
                      <span>
                        {isVi ? 'Giá mở:' : 'Entry:'}{' '}
                        <strong className="text-[#F5F3FF]">${ord.entryPrice.toFixed(2)}</strong>
                      </span>
                      <span>
                        {isVi ? 'Giá đóng:' : 'Close:'}{' '}
                        <strong className="text-[#F5F3FF]">${ord.closePrice.toFixed(2)}</strong>
                      </span>
                      <span>
                        {isVi ? 'Tỉ lệ:' : 'Payout:'}{' '}
                        <strong className="text-[#C4B5FD]">+{Math.round(ord.payoutRate * 100)}%</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
