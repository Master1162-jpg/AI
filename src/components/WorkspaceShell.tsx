import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Bell,
  Bot,
  ChevronDown,
  Diamond,
  Gauge,
  Globe,
  LogOut,
  Mail,
  Rocket,
  RotateCcw,
  Settings,
  Share2,
  Shield,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { COPY } from '../lib/i18n';
import type {
  AccountMode,
  AppNotification,
  Language,
  MarketSnapshot,
  UserAccount,
} from '../types';

export type WorkspaceSection =
  | 'trade'
  | 'dashboard'
  | 'orders'
  | 'prizepool'
  | 'bot'
  | 'wallet'
  | 'vip'
  | 'profile'
  | 'admin';

interface WorkspaceShellProps {
  user: UserAccount;
  market: MarketSnapshot;
  accountMode: AccountMode;
  section: WorkspaceSection;
  lang: Language;
  notifications: AppNotification[];
  botRunning: boolean;
  onChangeSection: (section: WorkspaceSection) => void;
  onChangeAccountMode: (mode: AccountMode) => void;
  onQuickDeposit: () => void;
  onResetDemo: () => void;
  onMarkNotificationsRead: () => void;
  onChangeLang: (lang: Language) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavCardItem {
  id: WorkspaceSection | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'new' | 'bot_on';
  avatarStyle?: boolean;
  hidden?: boolean;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  user,
  market,
  accountMode,
  section,
  lang,
  notifications,
  botRunning,
  onChangeSection,
  onChangeAccountMode,
  onQuickDeposit,
  onResetDemo,
  onMarkNotificationsRead,
  onChangeLang,
  onLogout,
  children,
}) => {
  const [acctMenuOpen, setAcctMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = COPY[lang];
  const isVi = lang === 'vi';
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeBalance = accountMode === 'live' ? user.liveBalance : user.demoBalance;

  const earnItems: NavCardItem[] = [
    { id: 'trade', label: isVi ? 'Giao Dịch' : 'Trade', icon: Diamond },
    {
      id: 'bot',
      label: isVi ? 'QuickInvest Bot' : 'QuickInvest Bot',
      icon: Bot,
      badge: botRunning ? 'bot_on' : undefined,
    },
    { id: 'vip', label: isVi ? 'Thành Viên VIP' : 'VIP Member', icon: Share2 },
    { id: 'prizepool', label: 'Streak Challenge', icon: Rocket, badge: 'new' },
  ];

  const profileItems: NavCardItem[] = [
    { id: 'profile', label: user.nickname, icon: UserIcon, avatarStyle: true },
    { id: 'dashboard', label: isVi ? 'Bảng Điều Khiển' : 'Dashboard', icon: Gauge },
    { id: 'orders', label: isVi ? 'Lệnh' : 'Orders', icon: ArrowLeftRight },
    { id: 'wallet', label: isVi ? 'Ví' : 'Wallet', icon: Wallet },
    {
      id: 'admin',
      label: isVi ? 'Quản trị Admin' : 'Admin Console',
      icon: Shield,
      hidden: user.role !== 'admin',
    },
  ];

  const helpItems: NavCardItem[] = [
    { id: 'settings', label: isVi ? 'Cài đặt' : 'Settings', icon: Settings },
  ];

  const handleSelectNav = (target: WorkspaceSection | 'settings') => {
    setMobileMenuOpen(false);
    if (target === 'settings') {
      setSettingsOpen(true);
      return;
    }
    onChangeSection(target);
  };

  const renderGroupedNavigation = (showTopLogo: boolean) => (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-5 pt-4">
      {showTopLogo && (
        <div className="relative mb-5 flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => handleSelectNav('trade')}
            className="cursor-pointer"
          >
            <BrandLogo size="sm" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
            className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#1E1A30] hover:text-[#F5F3FF] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Light-Purple Deposit CTA */}
      <button
        type="button"
        onClick={() => {
          onQuickDeposit();
          setMobileMenuOpen(false);
        }}
        className="w-full rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] py-2.5 text-sm font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15 transition-all hover:from-[#DDD6FE] hover:to-[#C4B5FD] cursor-pointer"
      >
        {isVi ? 'Nạp tiền' : 'Deposit'}
      </button>

      {/* Group 1: Kiếm tiền */}
      <div className="mt-5">
        <div className="mb-2.5 text-xs font-bold tracking-wide text-[#958CB3]">
          {isVi ? 'Kiếm tiền' : 'Earn'}
        </div>
        <div className="space-y-2">
          {earnItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
                    : 'border border-[#27223B] bg-[#14131E] text-[#E5E0F5] hover:border-[#C4B5FD]/40 hover:bg-[#1C192C]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      active ? 'text-[#140E24]' : 'text-[#C4B5FD]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge === 'new' && (
                  <span className="inline-flex items-center rounded bg-gradient-to-r from-rose-500 to-fuchsia-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white uppercase shrink-0">
                    NEW
                  </span>
                )}
                {item.badge === 'bot_on' && (
                  <span
                    className={`font-mono text-[10px] font-extrabold shrink-0 ${
                      active ? 'text-[#140E24]' : 'text-[#34D399]'
                    }`}
                  >
                    ON
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 2: Quản lý hồ sơ */}
      <div className="mt-6">
        <div className="mb-2.5 text-xs font-bold tracking-wide text-[#958CB3]">
          {isVi ? 'Quản lý hồ sơ' : 'Profile Management'}
        </div>
        <div className="space-y-2">
          {profileItems
            .filter((i) => !i.hidden)
            .map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] font-extrabold text-[#140E24] shadow-md shadow-[#C4B5FD]/15'
                      : 'border border-[#27223B] bg-[#14131E] text-[#E5E0F5] hover:border-[#C4B5FD]/40 hover:bg-[#1C192C]'
                  }`}
                >
                  {item.avatarStyle ? (
                    user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.nickname}
                        className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-[#C4B5FD]/60"
                      />
                    ) : (
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          active ? 'bg-[#140E24]/15 text-[#140E24]' : 'bg-[#231E38] text-[#DDD6FE]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    )
                  ) : (
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-[#140E24]' : 'text-[#C4B5FD]'}`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Group 3: Cài đặt & Trợ giúp */}
      <div className="mt-6">
        <div className="mb-2.5 text-xs font-bold tracking-wide text-[#958CB3]">
          {isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
        </div>
        <div className="space-y-2">
          {helpItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-[#27223B] bg-[#14131E] px-4 py-3 text-sm font-semibold text-[#E5E0F5] transition-colors hover:border-[#C4B5FD]/40 hover:bg-[#1C192C] cursor-pointer"
              >
                <Icon className="h-4.5 w-4.5 shrink-0 text-[#C4B5FD]" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F5F3FF] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#27223B] bg-[#111118]/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-3 py-2 lg:gap-4 lg:px-6 lg:py-2.5">
          {/* Left: Mobile Hamburger + Desktop BrandLogo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(true);
                setAcctMenuOpen(false);
                setNotifOpen(false);
              }}
              aria-label="Mở menu điều hướng"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#DDD6FE] hover:bg-[#1E1A30] cursor-pointer lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="2.4" rx="1.2" fill="currentColor" />
                <rect x="3" y="11" width="14" height="2.4" rx="1.2" fill="currentColor" />
                <rect x="3" y="17" width="10" height="2.4" rx="1.2" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onChangeSection('trade')}
              className="hidden lg:inline-flex cursor-pointer"
            >
              <BrandLogo size="sm" />
            </button>
          </div>

          {/* Center & Right Controls */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 min-w-0">
            {/* Clickable Prize Pool Button */}
            <button
              type="button"
              onClick={() => {
                onChangeSection('prizepool');
                setAcctMenuOpen(false);
                setNotifOpen(false);
                setMobileMenuOpen(false);
              }}
              aria-label="Mở Prize Pool Streak Challenge"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 sm:px-3 sm:py-1.5 text-left transition-all shrink-0 cursor-pointer hover:border-[#DDD6FE]/70 active:scale-[0.98] ${
                section === 'prizepool'
                  ? 'border-[#DDD6FE] bg-gradient-to-r from-[#291E4E] via-[#342663] to-[#231A40] shadow-md shadow-[#C4B5FD]/15'
                  : 'border-[#C4B5FD]/35 bg-gradient-to-r from-[#1D1733] via-[#271E45] to-[#19142B]'
              }`}
            >
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-amber-400/15 border border-amber-300/35 shrink-0">
                <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-300" />
              </div>
              <div className="leading-tight">
                <div className="text-[9px] sm:text-[10px] font-semibold text-[#DDD6FE] whitespace-nowrap">
                  Prize Pool
                </div>
                <div className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 whitespace-nowrap tabular-nums">
                  ${(market.prizePool / 1000).toFixed(1)}k
                </div>
              </div>
            </button>

            {/* Live / Demo Account Switcher */}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => {
                  setAcctMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-[#2F2947] bg-[#181625] px-2.5 py-1 sm:px-3 sm:py-1.5 text-left transition-colors hover:border-[#C4B5FD]/50 cursor-pointer"
              >
                <div className="leading-tight min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-medium text-[#958CB3] whitespace-nowrap">
                    {accountMode === 'live' ? t.liveAccount : t.demoAccount}
                  </div>
                  <div
                    data-testid="active-balance-display"
                    className={`font-mono text-xs sm:text-sm font-extrabold whitespace-nowrap tabular-nums ${
                      accountMode === 'live' ? 'text-[#F5F3FF]' : 'text-[#34D399]'
                    }`}
                  >
                    $
                    {activeBalance.toLocaleString('en-US', {
                      minimumFractionDigits: activeBalance % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#27213E] text-[#DDD6FE] shrink-0">
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </button>

              {acctMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#2F2947] bg-[#14131E] p-2 shadow-2xl shadow-black/75 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeAccountMode('live');
                      setAcctMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      accountMode === 'live'
                        ? 'bg-[#241E3C] text-[#F5F3FF]'
                        : 'hover:bg-[#1B182A] text-[#C8C2DC]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#F5F3FF]">{t.liveAccount}</div>
                      <div className="text-[11px] text-[#958CB3]">USDT</div>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-[#34D399]">
                      ${user.liveBalance.toFixed(2)}
                    </span>
                  </button>

                  <div
                    className={`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 ${
                      accountMode === 'demo' ? 'bg-[#241E3C]' : 'hover:bg-[#1B182A]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChangeAccountMode('demo');
                        setAcctMenuOpen(false);
                      }}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#F5F3FF]">{t.demoAccount}</div>
                      <div className="font-mono text-sm font-extrabold text-[#C4B5FD]">
                        ${user.demoBalance.toFixed(2)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onResetDemo();
                        setAcctMenuOpen(false);
                      }}
                      title="Đặt lại $1,000 Demo"
                      aria-label="Đặt lại $1,000 Demo"
                      className="rounded-lg border border-[#3B3259] bg-[#181625] p-1.5 text-[#DDD6FE] hover:border-[#C4B5FD]/60 hover:bg-[#231F38] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Deposit Button (Desktop top bar) */}
            <button
              type="button"
              onClick={onQuickDeposit}
              className="hidden lg:inline-flex rounded-lg bg-gradient-to-r from-[#C4B5FD] to-[#A78BFA] px-3.5 py-2 text-xs font-extrabold text-[#140E24] shadow-sm shadow-[#C4B5FD]/15 whitespace-nowrap shrink-0 cursor-pointer hover:from-[#DDD6FE] hover:to-[#C4B5FD]"
            >
              {isVi ? 'Nạp tiền' : t.quickDeposit}
            </button>

            {/* Notifications Bell */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setAcctMenuOpen(false);
                  if (!notifOpen && unreadCount > 0) onMarkNotificationsRead();
                }}
                aria-label="Thông báo"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#DDD6FE] hover:bg-[#1E1A30] lg:border lg:border-[#2F2947] lg:bg-[#181625] cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-[#2F2947] bg-[#14131E] p-3 shadow-2xl shadow-black/75 z-50">
                  <div className="border-b border-[#27223B] pb-2 text-xs font-bold text-[#F5F3FF]">
                    {isVi ? 'Thông báo gần đây' : 'Recent Notifications'}
                  </div>
                  <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#958CB3]">Không có thông báo</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-lg p-2.5 text-xs ${
                            n.type === 'prize'
                              ? 'border border-amber-400/30 bg-amber-400/10'
                              : 'border border-[#27223B] bg-[#181625]'
                          }`}
                        >
                          <div
                            className={`font-bold ${
                              n.type === 'prize' ? 'text-amber-300' : 'text-[#F5F3FF]'
                            }`}
                          >
                            {n.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#C8C2DC]">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => onChangeLang(isVi ? 'en' : 'vi')}
              aria-label="Chuyển ngôn ngữ"
              className="hidden lg:inline-flex h-9 items-center gap-1 rounded-lg border border-[#2F2947] bg-[#181625] px-2.5 text-xs font-bold text-[#DDD6FE] hover:border-[#C4B5FD]/50 hover:bg-[#231F38] cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-[#C4B5FD]" />
              <span>{lang.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[300px] max-w-[82vw] flex-col border-r border-[#27223B] bg-[#0D0C14] shadow-2xl shadow-black/80">
            {renderGroupedNavigation(true)}
          </aside>
        </div>
      )}

      {/* Settings & Help Dialog */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2F2947] bg-[#14131E] p-5 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-[#27223B] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-[#C4B5FD]" />
                <h2 className="font-display text-lg font-bold text-[#F5F3FF]">
                  {isVi ? 'Cài đặt & Trợ giúp' : 'Settings & Help'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Đóng cài đặt"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#958CB3] hover:bg-[#231F38] hover:text-[#F5F3FF] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Language Selector */}
              <div className="flex items-center justify-between rounded-xl border border-[#27223B] bg-[#181625] px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-[#F5F3FF]">
                  <Globe className="h-4 w-4 text-[#C4B5FD]" />
                  <span>{isVi ? 'Ngôn ngữ hiển thị' : 'Display Language'}</span>
                </div>
                <div className="inline-flex rounded-lg bg-[#0D0C14] p-0.5 text-xs font-bold border border-[#27223B]">
                  <button
                    type="button"
                    onClick={() => onChangeLang('vi')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      isVi ? 'bg-[#C4B5FD] text-[#140E24]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
                    }`}
                  >
                    VI
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLang('en')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${
                      !isVi ? 'bg-[#C4B5FD] text-[#140E24]' : 'text-[#958CB3] hover:text-[#F5F3FF]'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Reset Demo Balance */}
              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setSettingsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#27223B] bg-[#181625] px-4 py-3 text-left text-sm font-semibold text-[#F5F3FF] hover:border-[#C4B5FD]/40 hover:bg-[#231F38] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-[#C4B5FD]" />
                  <span>{isVi ? 'Đặt lại vốn Demo $1,000' : 'Reset $1,000 Demo Balance'}</span>
                </span>
                <span className="font-mono text-xs font-bold text-[#34D399]">
                  ${user.demoBalance.toFixed(2)}
                </span>
              </button>

              {/* Profile & 2FA Shortcut */}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onChangeSection('profile');
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#27223B] bg-[#181625] px-4 py-3 text-left text-sm font-semibold text-[#F5F3FF] hover:border-[#C4B5FD]/40 hover:bg-[#231F38] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-[#34D399]" />
                  <span>{isVi ? 'Bảo mật 2FA & Xác minh KYC' : '2FA Security & KYC Verification'}</span>
                </span>
                <span className="text-xs font-bold text-[#C4B5FD]">
                  {user.twoFactorEnabled ? '2FA ON' : '2FA OFF'}
                </span>
              </button>

              {/* Support Contact */}
              <a
                href="mailto:support@raidenbo.io"
                className="flex w-full items-center justify-between rounded-xl border border-[#27223B] bg-[#181625] px-4 py-3 text-sm font-semibold text-[#F5F3FF] hover:border-[#C4B5FD]/40 hover:bg-[#231F38]"
              >
                <span className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-amber-300" />
                  <span>{isVi ? 'Hỗ trợ trực tuyến 24/7' : '24/7 Support Center'}</span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-[#C4B5FD]">
                  support@raidenbo.io
                </span>
              </a>

              {/* Logout */}
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onLogout();
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/15 py-3 text-sm font-bold text-[#FB7185] hover:bg-rose-500/25 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.navLogout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop Left Navigation Rail */}
        <aside
          aria-label={isVi ? 'Menu điều hướng chính' : 'Primary navigation'}
          className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#27223B] bg-[#0D0C14]"
        >
          {renderGroupedNavigation(false)}
        </aside>

        {/* Active Viewport Content */}
        <main
          className={`relative flex-1 overflow-x-hidden ${
            section === 'trade' || section === 'wallet' || section === 'bot'
              ? 'p-0 lg:p-5'
              : 'p-3.5 pb-6 lg:p-6'
          }`}
        >
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
};
