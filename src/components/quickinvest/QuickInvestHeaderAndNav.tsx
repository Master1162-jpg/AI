import React, { useState } from 'react';
import {
  Bell,
  Bot,
  ChevronDown,
  LayoutGrid,
  MoreHorizontal,
  Radio,
  Share2,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import type {
  AccountMode,
  AppNotification,
  QuickInvestTab,
  UserAccount,
} from '../../types';

interface QuickInvestHeaderProps {
  user: UserAccount;
  accountMode: AccountMode;
  activeTab: QuickInvestTab;
  notifications: AppNotification[];
  botEnabled: boolean;
  onSelectTab: (tab: QuickInvestTab) => void;
  onChangeAccountMode: (mode: AccountMode) => void;
  onMarkNotificationsRead: () => void;
  onGoToProfile: () => void;
}

export const QuickInvestBrandEmblem: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="flex items-center gap-2 shrink-0 select-none">
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 44 44"
        className={compact ? 'h-8 w-8' : 'h-9 w-9'}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="qiOrbitA" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="52%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
          <linearGradient id="qiOrbitB" x1="40" y1="6" x2="4" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="55%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#E879F9" />
          </linearGradient>
        </defs>
        <ellipse
          cx="22"
          cy="22"
          rx="18"
          ry="8.2"
          transform="rotate(-32 22 22)"
          stroke="url(#qiOrbitA)"
          strokeWidth="1.65"
        />
        <ellipse
          cx="22"
          cy="22"
          rx="18"
          ry="8.2"
          transform="rotate(32 22 22)"
          stroke="url(#qiOrbitB)"
          strokeWidth="1.65"
        />
        <ellipse
          cx="22"
          cy="22"
          rx="17"
          ry="7.5"
          transform="rotate(90 22 22)"
          stroke="url(#qiOrbitA)"
          strokeOpacity="0.85"
          strokeWidth="1.4"
        />
        <polygon
          points="22,12 30.5,17 30.5,27 22,32 13.5,27 13.5,17"
          stroke="#C4B5FD"
          strokeWidth="1.6"
          fill="#161423"
        />
        <path
          d="M17.5 24.5L21 20.5L23.5 22.8L27 17.5"
          stroke="#DDD6FE"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24.2 17.5H27V20.3"
          stroke="#DDD6FE"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="mt-0.5 text-[7px] font-extrabold tracking-widest text-[#C4B5FD] uppercase leading-none">
        QuickInvest
      </span>
    </div>
    <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#F5F3FF] via-[#DDD6FE] to-[#C4B5FD] bg-clip-text text-transparent">
      QuickInvest
    </span>
  </div>
);

const DESKTOP_TABS: {
  id: QuickInvestTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'discover', label: 'Khám phá', icon: LayoutGrid },
  { id: 'portfolio', label: 'Quản lý Bot', icon: Bot },
  { id: 'signal', label: 'Tín hiệu AI', icon: Radio },
  { id: 'strategies', label: 'Thiết kế Bot AI', icon: Share2 },
  { id: 'more', label: 'Mở rộng', icon: MoreHorizontal },
];

export const QuickInvestHeader: React.FC<QuickInvestHeaderProps> = ({
  user,
  accountMode,
  activeTab,
  notifications,
  botEnabled,
  onSelectTab,
  onChangeAccountMode,
  onMarkNotificationsRead,
  onGoToProfile,
}) => {
  const [walletOpen, setWalletOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const balance = accountMode === 'live' ? user.liveBalance : user.demoBalance;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="border-b border-[#27223B] bg-[#111118]/95 px-3.5 py-2.5 lg:rounded-t-2xl lg:px-5 lg:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Left: QuickInvest Atom Emblem + Gradient Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('discover')}
          className="cursor-pointer focus:outline-none"
          aria-label="QuickInvest Trang chủ"
        >
          <QuickInvestBrandEmblem />
        </button>

        {/* Center: Desktop Integrated 5-Tab Switcher (replaces bottom bar on lg+) */}
        <nav
          aria-label="Điều hướng QuickInvest"
          className="hidden lg:flex items-center gap-1 rounded-xl border border-[#27223B] bg-[#161423] p-1"
        >
          {DESKTOP_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] text-[#140E24] font-extrabold shadow-sm shadow-[#C4B5FD]/15'
                    : 'text-[#C8C2DC] hover:bg-[#231F38] hover:text-[#F5F3FF]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.id === 'portfolio' && botEnabled && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Wallet Switcher + Bell + Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Wallet Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setWalletOpen((o) => !o);
                setNotifOpen(false);
              }}
              aria-label="Chọn ví giao dịch QuickInvest"
              className="flex items-center gap-2 rounded-xl px-2 py-1 text-left hover:bg-[#1E1A30] transition-colors cursor-pointer"
            >
              <Wallet className="h-5 w-5 text-[#C4B5FD] shrink-0" />
              <div className="leading-tight">
                <div className="flex items-center gap-1 font-mono text-sm font-extrabold text-[#F5F3FF] tabular-nums">
                  <span>
                    $
                    {balance.toLocaleString('en-US', {
                      minimumFractionDigits: balance % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#958CB3]" />
                </div>
                <div className="text-[11px] font-medium text-[#958CB3] whitespace-nowrap">
                  {accountMode === 'live' ? 'Ví TK Live' : 'Ví TK Demo'}
                </div>
              </div>
            </button>

            {walletOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[#2F2947] bg-[#14131E] p-1.5 shadow-2xl shadow-black/80 z-50">
                <button
                  type="button"
                  onClick={() => {
                    onChangeAccountMode('live');
                    setWalletOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    accountMode === 'live'
                      ? 'bg-[#261F3D] text-[#F5F3FF] border border-[#C4B5FD]/40'
                      : 'text-[#C8C2DC] hover:bg-[#1E1A30]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#F5F3FF]">Ví TK Live</div>
                    <div className="text-[10px] text-[#958CB3]">Giao dịch tiền thật</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-[#34D399] tabular-nums">
                    ${user.liveBalance.toFixed(2)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeAccountMode('demo');
                    setWalletOpen(false);
                  }}
                  className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    accountMode === 'demo'
                      ? 'bg-[#261F3D] text-[#F5F3FF] border border-[#C4B5FD]/40'
                      : 'text-[#C8C2DC] hover:bg-[#1E1A30]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-[#F5F3FF]">Ví TK Demo</div>
                    <div className="text-[10px] text-[#958CB3]">Luyện tập chiến lược</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-[#C4B5FD] tabular-nums">
                    ${user.demoBalance.toFixed(2)}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((o) => !o);
                setWalletOpen(false);
                if (!notifOpen && unread > 0) onMarkNotificationsRead();
              }}
              aria-label="Thông báo QuickInvest"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#C8C2DC] hover:bg-[#1E1A30] hover:text-[#F5F3FF] cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5 fill-current" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FB7185]" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#2F2947] bg-[#14131E] p-3 shadow-2xl shadow-black/80 z-50">
                <div className="border-b border-[#27223B] pb-2 text-xs font-bold text-[#F5F3FF]">
                  Thông báo QuickInvest
                </div>
                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-5 text-center text-xs text-[#958CB3]">
                      Chưa có thông báo mới
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-[#27223B] bg-[#181625] p-2.5 text-xs"
                      >
                        <div className="font-bold text-[#F5F3FF]">{n.title}</div>
                        <div className="mt-0.5 text-[11px] text-[#C8C2DC]">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Circle */}
          <button
            type="button"
            onClick={onGoToProfile}
            aria-label="Hồ sơ cá nhân"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C4B5FD]/40 bg-[#1B1630] text-[#DDD6FE] hover:border-[#C4B5FD] transition-colors cursor-pointer overflow-hidden"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.nickname}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuickInvestMobileBottomNavProps {
  activeTab: QuickInvestTab;
  botEnabled: boolean;
  onSelectTab: (tab: QuickInvestTab) => void;
}

export const QuickInvestMobileBottomNav: React.FC<QuickInvestMobileBottomNavProps> = ({
  activeTab,
  botEnabled,
  onSelectTab,
}) => {
  const items: {
    id: QuickInvestTab;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      id: 'discover',
      label: 'Khám phá',
      renderIcon: (active) => (
        <LayoutGrid className={`h-5 w-5 ${active ? 'text-[#C4B5FD]' : 'text-[#958CB3]'}`} />
      ),
    },
    {
      id: 'portfolio',
      label: 'Quản lý Bot',
      renderIcon: (active) => (
        <div className="relative">
          <Bot className={`h-5 w-5 ${active ? 'text-[#C4B5FD]' : 'text-[#958CB3]'}`} />
          {botEnabled && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#34D399] ring-2 ring-[#111118]" />
          )}
        </div>
      ),
    },
    {
      id: 'signal',
      label: 'Tín hiệu AI',
      renderIcon: (active) => (
        <Radio className={`h-5 w-5 ${active ? 'text-[#C4B5FD]' : 'text-[#958CB3]'}`} />
      ),
    },
    {
      id: 'strategies',
      label: 'Thiết kế Bot AI',
      renderIcon: (active) => (
        <Share2 className={`h-5 w-5 ${active ? 'text-[#C4B5FD]' : 'text-[#958CB3]'}`} />
      ),
    },
    {
      id: 'more',
      label: 'Thêm tùy chọn',
      renderIcon: (active) => (
        <MoreHorizontal className={`h-5 w-5 ${active ? 'text-[#C4B5FD]' : 'text-[#958CB3]'}`} />
      ),
    },
  ];

  return (
    <nav
      aria-label="Thanh điều hướng QuickInvest"
      className="fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-5 items-center border-t border-[#27223B] bg-[#111118]/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.65)] lg:hidden"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className="relative flex h-full min-h-[44px] w-full items-center justify-center cursor-pointer transition-colors hover:bg-[#1E1A30]"
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#C4B5FD]" />
            )}
            {item.renderIcon(isActive)}
          </button>
        );
      })}
    </nav>
  );
};
