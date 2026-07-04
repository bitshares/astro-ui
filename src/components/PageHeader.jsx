import React, { useState, useEffect, useSyncExternalStore, lazy, Suspense } from "react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

const LanguageSelector = lazy(() => import("./LanguageSelector.jsx"));
import ThemeToggle from "@/components/ui/theme-toggle.jsx";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "@/components/ui/hover-card";

import {
  ChevronDown,
  Sparkles,
  Send,
  LineChart,
  Wallet,
  ClipboardList,
  Star,
  Info,
  Server,
  UserPlus,
  Palette,
  Repeat,
  Zap,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Gem,
  Globe,
  Vote,
  FileText,
  Receipt,
  SlidersHorizontal,
  Shield,
  Lock,
  Banknote,
  Coins,
  HandCoins,
  Landmark,
  Pickaxe,
  BarChart3,
  Ticket,
  Trophy,
  FilePlus,
  FileCheck,
  FileClock,
  FileStack,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CurrentUser from "./common/CurrentUser.jsx";
import WaveBackground from "./WaveBackground.jsx";

import { $currentUser } from "@/stores/users.ts";

const ICONS = {
  dex: LineChart,
  instant_trade: Zap,
  swap: ArrowLeftRight,
  stake: Lock,
  barter: Repeat,
  tfund_user: Banknote,
  transfer: Send,
  timed_transfer: FileClock,
  withdraw_permissions: FileCheck,
  htlc: Shield,
  create_vesting: Lock,
  borrow: HandCoins,
  lend: Coins,
  smartcoins: Gem,
  tfunds: Landmark,
  portfolio_balances: Wallet,
  portfolio_open_orders: ClipboardList,
  favourites: Star,
  issued_assets: Gem,
  offers: BarChart3,
  deals: Repeat,
  vesting: Lock,
  proposals: FileText,
  blocks: Globe,
  custom_pool_tracker: BarChart3,
  pools: Coins,
  vote: Vote,
  witnesses: Pickaxe,
  committee: Shield,
  governance: Vote,
  create_worker: FilePlus,
  create_ticket: Ticket,
  ticket_leaderboard: Trophy,
  invoice_inventory: Receipt,
  create_invoice: FilePlus,
  pay_invoice: FileCheck,
  stored_invoices: FileStack,
  accountLists: ClipboardList,
  ltm: Shield,
  nodes: Server,
  create_account: UserPlus,
  configure_visuals: Palette,
};

const ACCENTS = {
  dex: { color: "dark:text-indigo-300 text-indigo-600", bg: "dark:bg-indigo-500/15 bg-indigo-100/80", border: "group-hover/navitem:dark:border-indigo-400/30 group-hover/navitem:border-indigo-400/50" },
  instant_trade: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  swap: { color: "dark:text-blue-300 text-blue-600 dark:text-blue-400", bg: "dark:bg-blue-500/15 bg-blue-100/80", border: "group-hover/navitem:dark:border-blue-400/30 group-hover/navitem:border-blue-400/50" },
  stake: { color: "dark:text-cyan-300 text-cyan-600", bg: "dark:bg-cyan-500/15 bg-cyan-100/80", border: "group-hover/navitem:dark:border-cyan-400/30 group-hover/navitem:border-cyan-400/50" },
  barter: { color: "dark:text-sky-300 text-sky-600", bg: "dark:bg-sky-500/15 bg-sky-100/80", border: "group-hover/navitem:dark:border-sky-400/30 group-hover/navitem:border-sky-400/50" },
  tfund_user: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  transfer: { color: "dark:text-sky-300 text-sky-600", bg: "dark:bg-sky-500/15 bg-sky-100/80", border: "group-hover/navitem:dark:border-sky-400/30 group-hover/navitem:border-sky-400/50" },
  timed_transfer: { color: "dark:text-cyan-300 text-cyan-600", bg: "dark:bg-cyan-500/15 bg-cyan-100/80", border: "group-hover/navitem:dark:border-cyan-400/30 group-hover/navitem:border-cyan-400/50" },
  withdraw_permissions: { color: "dark:text-blue-300 text-blue-600 dark:text-blue-400", bg: "dark:bg-blue-500/15 bg-blue-100/80", border: "group-hover/navitem:dark:border-blue-400/30 group-hover/navitem:border-blue-400/50" },
  htlc: { color: "dark:text-violet-300 text-violet-600", bg: "dark:bg-violet-500/15 bg-violet-100/80", border: "group-hover/navitem:dark:border-violet-400/30 group-hover/navitem:border-violet-400/50" },
  create_vesting: { color: "dark:text-fuchsia-300 text-fuchsia-600", bg: "dark:bg-fuchsia-500/15 bg-fuchsia-100/80", border: "group-hover/navitem:dark:border-fuchsia-400/30 group-hover/navitem:border-fuchsia-400/50" },
  borrow: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  lend: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  smartcoins: { color: "dark:text-indigo-300 text-indigo-600", bg: "dark:bg-indigo-500/15 bg-indigo-100/80", border: "group-hover/navitem:dark:border-indigo-400/30 group-hover/navitem:border-indigo-400/50" },
  tfunds: { color: "dark:text-rose-300 text-rose-600", bg: "dark:bg-rose-500/15 bg-rose-100/80", border: "group-hover/navitem:dark:border-rose-400/30 group-hover/navitem:border-rose-400/50" },
  portfolio_balances: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  portfolio_open_orders: { color: "dark:text-cyan-300 text-cyan-600", bg: "dark:bg-cyan-500/15 bg-cyan-100/80", border: "group-hover/navitem:dark:border-cyan-400/30 group-hover/navitem:border-cyan-400/50" },
  favourites: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  issued_assets: { color: "dark:text-violet-300 text-violet-600", bg: "dark:bg-violet-500/15 bg-violet-100/80", border: "group-hover/navitem:dark:border-violet-400/30 group-hover/navitem:border-violet-400/50" },
  offers: { color: "dark:text-sky-300 text-sky-600", bg: "dark:bg-sky-500/15 bg-sky-100/80", border: "group-hover/navitem:dark:border-sky-400/30 group-hover/navitem:border-sky-400/50" },
  deals: { color: "dark:text-blue-300 text-blue-600 dark:text-blue-400", bg: "dark:bg-blue-500/15 bg-blue-100/80", border: "group-hover/navitem:dark:border-blue-400/30 group-hover/navitem:border-blue-400/50" },
  vesting: { color: "dark:text-fuchsia-300 text-fuchsia-600", bg: "dark:bg-fuchsia-500/15 bg-fuchsia-100/80", border: "group-hover/navitem:dark:border-fuchsia-400/30 group-hover/navitem:border-fuchsia-400/50" },
  proposals: { color: "dark:text-rose-300 text-rose-600", bg: "dark:bg-rose-500/15 bg-rose-100/80", border: "group-hover/navitem:dark:border-rose-400/30 group-hover/navitem:border-rose-400/50" },
  blocks: { color: "dark:text-slate-300 text-muted-foreground", bg: "dark:bg-accent/15 bg-accent/80", border: "group-hover/navitem:dark:border-slate-400/30 group-hover/navitem:border-slate-400/50" },
  custom_pool_tracker: { color: "dark:text-teal-300 text-teal-600", bg: "dark:bg-teal-500/15 bg-teal-100/80", border: "group-hover/navitem:dark:border-teal-400/30 group-hover/navitem:border-teal-400/50" },
  pools: { color: "dark:text-cyan-300 text-cyan-600", bg: "dark:bg-cyan-500/15 bg-cyan-100/80", border: "group-hover/navitem:dark:border-cyan-400/30 group-hover/navitem:border-cyan-400/50" },
  vote: { color: "dark:text-indigo-300 text-indigo-600", bg: "dark:bg-indigo-500/15 bg-indigo-100/80", border: "group-hover/navitem:dark:border-indigo-400/30 group-hover/navitem:border-indigo-400/50" },
  witnesses: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  committee: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  governance: { color: "dark:text-violet-300 text-violet-600", bg: "dark:bg-violet-500/15 bg-violet-100/80", border: "group-hover/navitem:dark:border-violet-400/30 group-hover/navitem:border-violet-400/50" },
  create_worker: { color: "dark:text-sky-300 text-sky-600", bg: "dark:bg-sky-500/15 bg-sky-100/80", border: "group-hover/navitem:dark:border-sky-400/30 group-hover/navitem:border-sky-400/50" },
  create_ticket: { color: "dark:text-fuchsia-300 text-fuchsia-600", bg: "dark:bg-fuchsia-500/15 bg-fuchsia-100/80", border: "group-hover/navitem:dark:border-fuchsia-400/30 group-hover/navitem:border-fuchsia-400/50" },
  ticket_leaderboard: { color: "dark:text-rose-300 text-rose-600", bg: "dark:bg-rose-500/15 bg-rose-100/80", border: "group-hover/navitem:dark:border-rose-400/30 group-hover/navitem:border-rose-400/50" },
  invoice_inventory: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  create_invoice: { color: "dark:text-cyan-300 text-cyan-600", bg: "dark:bg-cyan-500/15 bg-cyan-100/80", border: "group-hover/navitem:dark:border-cyan-400/30 group-hover/navitem:border-cyan-400/50" },
  pay_invoice: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  stored_invoices: { color: "dark:text-sky-300 text-sky-600", bg: "dark:bg-sky-500/15 bg-sky-100/80", border: "group-hover/navitem:dark:border-sky-400/30 group-hover/navitem:border-sky-400/50" },
  accountLists: { color: "dark:text-slate-300 text-muted-foreground", bg: "dark:bg-accent/15 bg-accent/80", border: "group-hover/navitem:dark:border-slate-400/30 group-hover/navitem:border-slate-400/50" },
  ltm: { color: "dark:text-amber-300 text-amber-600", bg: "dark:bg-amber-500/15 bg-amber-100/80", border: "group-hover/navitem:dark:border-amber-400/30 group-hover/navitem:border-amber-400/50" },
  nodes: { color: "dark:text-slate-300 text-muted-foreground", bg: "dark:bg-accent/15 bg-accent/80", border: "group-hover/navitem:dark:border-slate-400/30 group-hover/navitem:border-slate-400/50" },
  create_account: { color: "dark:text-emerald-300 text-emerald-600", bg: "dark:bg-emerald-500/15 bg-emerald-100/80", border: "group-hover/navitem:dark:border-emerald-400/30 group-hover/navitem:border-emerald-400/50" },
  configure_visuals: { color: "dark:text-violet-300 text-violet-600", bg: "dark:bg-violet-500/15 bg-violet-100/80", border: "group-hover/navitem:dark:border-violet-400/30 group-hover/navitem:border-violet-400/50" },
};

const SECTION_ACCENT = {
  exchanging: { bar: "from-cyan-500 via-sky-400 to-blue-500", chip: "dark:bg-cyan-500/20 dark:text-cyan-200 dark:border-cyan-400/30 bg-cyan-100 text-cyan-700 border-cyan-300", dot: "bg-cyan-400" },
  transfer: { bar: "from-sky-500 via-blue-400 to-indigo-500", chip: "dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-400/30 bg-sky-100 text-sky-700 border-sky-300", dot: "bg-sky-400" },
  debt: { bar: "from-emerald-500 via-teal-400 to-cyan-500", chip: "dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/30 bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-400" },
  assetCreation: { bar: "from-violet-500 via-fuchsia-400 to-pink-500", chip: "dark:bg-violet-500/20 dark:text-violet-200 dark:border-violet-400/30 bg-violet-100 text-violet-700 border-violet-300", dot: "bg-violet-400" },
  account: { bar: "from-emerald-500 via-cyan-400 to-sky-500", chip: "dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/30 bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-400" },
  blockchain: { bar: "from-slate-500 via-gray-400 to-zinc-500", chip: "dark:bg-accent/20 dark:text-slate-200 dark:border-slate-400/30 bg-accent text-foreground border-slate-300", dot: "bg-slate-400" },
  governance: { bar: "from-indigo-500 via-violet-400 to-purple-500", chip: "dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-400/30 bg-indigo-100 text-indigo-700 border-indigo-300", dot: "bg-indigo-400" },
  invoicing: { bar: "from-amber-500 via-orange-400 to-yellow-500", chip: "dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/30 bg-amber-100 text-amber-700 border-amber-300", dot: "bg-amber-400" },
  settings: { bar: "from-violet-500 via-fuchsia-500 to-rose-500", chip: "dark:bg-violet-500/20 dark:text-violet-200 dark:border-violet-400/30 bg-violet-100 text-violet-700 border-violet-300", dot: "bg-violet-400" },
};

function NavPanel({ section, accent, t }) {
  const SectionIcon = section.icon;

  return (
    <div
      className="relative w-full bg-popover"
      style={{ backgroundColor: "hsl(var(--popover))" }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r",
          accent.bar
        )}
      />
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b dark:border-white/5 border-border/50">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md border",
            accent.chip
          )}
        >
          <SectionIcon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold dark:text-white text-popover-foreground tracking-tight truncate">
          {t(section.label)}
        </h3>
      </div>
      <ul className="p-2 grid grid-cols-1 gap-1 min-w-[320px] max-w-[420px]">
        {section.items.map((item) => {
          const Icon = ICONS[item.slug] || Sparkles;
          const itemAccent = ACCENTS[item.slug] || { color: "dark:text-white/80 text-muted-foreground", bg: "dark:bg-white/10 bg-accent", border: "" };
          const cleanHref = item.href.replace(/\/index\.html$/, "/");
          const isCurrent = typeof window !== "undefined" && window.location.pathname.startsWith(cleanHref);
          return (
            <li key={item.slug} className="group/navitem">
              <a
                href={item.href}
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border border-transparent p-2.5",
                  "dark:bg-white/[0.02] dark:hover:bg-white/[0.06] hover:bg-accent/50",
                  "transition-all duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 dark:focus-visible:ring-white/30 focus-visible:ring-ring",
                  itemAccent.border,
                  isCurrent && "dark:bg-white/[0.08] dark:border-white/15 bg-accent border-border"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border dark:border-white/10 border-border",
                    itemAccent.bg
                  )}
                >
                  <Icon className={cn("h-4 w-4", itemAccent.color)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold dark:text-white text-popover-foreground truncate">
                      {t(item.title)}
                    </span>
                    {isCurrent && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full dark:bg-white/80 bg-popover-foreground/80" />
                    )}
                  </span>
                  <span className="block mt-0.5 text-[12px] leading-snug dark:text-white/55 text-muted-foreground line-clamp-2">
                    {t(item.description)}
                  </span>
                </span>
                <ArrowUpRight
                  className={cn(
                    "h-4 w-4 shrink-0 dark:text-white/0 text-transparent -translate-x-1 translate-y-1",
                    "group-hover/navitem:dark:text-white/70 group-hover/navitem:text-muted-foreground group-hover/navitem:translate-x-0 group-hover/navitem:translate-y-0",
                    "transition-all duration-200 ease-out"
                  )}
                  aria-hidden="true"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HoverPopover({ section, accent, t, children }) {
  return (
      <HoverCard openDelay={60} closeDelay={180}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          sideOffset={10}
          align="center"
          className={cn(
            "w-auto p-0 overflow-hidden rounded-2xl",
            "dark:border-white/10 border-border",
            "!bg-popover",
            "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          )}
        >
          <NavPanel section={section} accent={accent} t={t} />
        </HoverCardContent>
      </HoverCardPortal>
      </HoverCard>
  );
}

export default function PageHeader(properties) {
  const { page, backURL } = properties;
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );

  const NAV_SECTIONS = [
    {
      id: "exchanging",
      label: "PageHeader:exchangingFundsHeading",
      icon: Repeat,
      items: [
        { slug: "dex", title: "Home:dex.title", description: "Home:dex.subtitle", href: "/dex/index.html" },
        { slug: "instant_trade", title: "Home:instant_trade.title", description: "Home:instant_trade.subtitle", href: "/instant_trade/index.html" },
        { slug: "swap", title: "Home:swap.title", description: "Home:swap.subtitle", href: "/swap/index.html" },
        { slug: "stake", title: "Home:stake.title", description: "Home:stake.subtitle", href: "/stake/index.html" },
        { slug: "barter", title: "Home:barter.title", description: "Home:barter.subtitle", href: "/barter/index.html" },
        { slug: "tfund_user", title: "Home:tfund_user.title", description: "Home:tfund_user.subtitle", href: "/tfund_user/index.html" },
      ],
    },
    {
      id: "transfer",
      label: "PageHeader:transferFundsHeading",
      icon: Send,
      items: [
        { slug: "transfer", title: "Home:transfer.title", description: "Home:transfer.subtitle", href: "/transfer/index.html" },
        { slug: "timed_transfer", title: "Home:timed_transfer.title", description: "Home:timed_transfer.subtitle", href: "/timed_transfer/index.html" },
        { slug: "withdraw_permissions", title: "Home:withdraw_permission.title", description: "Home:withdraw_permission.subtitle", href: "/withdraw_permissions/index.html" },
        { slug: "htlc", title: "Home:htlc.title", description: "Home:htlc.subtitle", href: "/htlc/index.html" },
        { slug: "create_vesting", title: "Home:create_vesting.title", description: "Home:create_vesting.subtitle", href: "/create_vesting/index.html" },
      ],
    },
    {
      id: "debt",
      label: "PageHeader:formsOfDebtHeading",
      icon: Coins,
      items: [
        { slug: "borrow", title: "Home:borrow.title", description: "Home:borrow.subtitle", href: "/borrow/index.html" },
        { slug: "lend", title: "Home:lend.title", description: "Home:lend.subtitle", href: "/lend/index.html" },
        { slug: "smartcoins", title: "Home:smartcoins.title", description: "Home:smartcoins.subtitle", href: "/smartcoins/index.html" },
        { slug: "tfunds", title: "Home:tfunds.title", description: "Home:tfunds.subtitle", href: "/tfunds/index.html" },
      ],
    },
    {
      id: "assetCreation",
      label: "PageHeader:assetCreation",
      icon: Gem,
      items: [
        { slug: "create_uia", title: "Home:create_uia.title", description: "Home:create_uia.subtitle", href: "/create_uia/index.html" },
        { slug: "create_smartcoin", title: "Home:create_smartcoin.title", description: "Home:create_smartcoin.subtitle", href: "/create_smartcoin/index.html" },
        { slug: "create_liquidity_pool", title: "Home:create_liquidity_pool.title", description: "Home:create_liquidity_pool.subtitle", href: "/create_pool/index.html" },
      ],
    },
    {
      id: "account",
      label: "PageHeader:accountOverviewsHeading",
      icon: Wallet,
      items: [
        { slug: "portfolio_balances", title: "Home:portfolio_balances.title", description: "Home:portfolio_balances.subtitle", href: "/balances/index.html" },
        { slug: "portfolio_open_orders", title: "Home:portfolio_open_orders.title", description: "Home:portfolio_open_orders.subtitle", href: "/open-orders/index.html" },
        { slug: "favourites", title: "Home:favourites.title", description: "Home:favourites.subtitle", href: "/favourites/index.html" },
        { slug: "issued_assets", title: "Home:issued_assets.title", description: "Home:issued_assets.subtitle", href: "/issued_assets/index.html" },
        { slug: "offers", title: "Home:offers.title", description: "Home:offers.subtitle", href: "/offers/index.html" },
        { slug: "deals", title: "Home:deals.title", description: "Home:deals.subtitle", href: "/deals/index.html" },
        { slug: "vesting", title: "Home:vesting.title", description: "Home:vesting.subtitle", href: "/vesting/index.html" },
        { slug: "proposals", title: "Home:proposals.title", description: "Home:proposals.subtitle", href: "/proposals/index.html" },
      ],
    },
    {
      id: "blockchain",
      label: "PageHeader:blockchainOverviewsHeading",
      icon: Globe,
      items: [
        { slug: "blocks", title: "Home:blocks.title", description: "Home:blocks.subtitle", href: "/blocks/index.html" },
        { slug: "custom_pool_tracker", title: "Home:custom_pool_tracker.title", description: "Home:custom_pool_tracker.subtitle", href: "/custom_pool_overview/index.html" },
        { slug: "pools", title: "Home:pools.title", description: "Home:pools.subtitle", href: "/pools/index.html" },
      ],
    },
    {
      id: "governance",
      label: "PageHeader:governanceHeading",
      icon: Vote,
      items: [
        { slug: "vote", title: "Home:vote.title", description: "Home:vote.subtitle", href: "/vote/index.html" },
        { slug: "witnesses", title: "Home:witnesses.title", description: "Home:witnesses.subtitle", href: "/witnesses/index.html" },
        { slug: "committee", title: "Home:committee.title", description: "Home:committee.subtitle", href: "/committee/index.html" },
        { slug: "governance", title: "Home:governance.title", description: "Home:governance.subtitle", href: "/governance/index.html" },
        { slug: "create_worker", title: "Home:create_worker.title", description: "Home:create_worker.subtitle", href: "/create_worker/index.html" },
        { slug: "create_ticket", title: "Home:create_ticket.title", description: "Home:create_ticket.subtitle", href: "/create_ticket/index.html" },
        { slug: "ticket_leaderboard", title: "Home:ticket_leaderboard.title", description: "Home:ticket_leaderboard.subtitle", href: "/ticket_leaderboard/index.html" },
      ],
    },
    {
      id: "invoicing",
      label: "PageHeader:invoicingHeading",
      icon: Receipt,
      items: [
        { slug: "invoice_inventory", title: "Home:invoice_inventory.title", description: "Home:invoice_inventory.subtitle", href: "/invoice_inventory/index.html" },
        { slug: "create_invoice", title: "Home:create_invoice.title", description: "Home:create_invoice.subtitle", href: "/create_invoice/index.html" },
        { slug: "pay_invoice", title: "Home:pay_invoice.title", description: "Home:pay_invoice.subtitle", href: "/pay_invoice/index.html" },
        { slug: "stored_invoices", title: "Home:stored_invoices.title", description: "Home:stored_invoices.subtitle", href: "/stored_invoices/index.html" },
      ],
    },
    {
      id: "settings",
      label: "PageHeader:settingsHeading",
      icon: SlidersHorizontal,
      items: [
        { slug: "accountLists", title: "Home:accountLists.title", description: "Home:accountLists.subtitle", href: "/account_lists/index.html" },
        { slug: "ltm", title: "Home:ltm.title", description: "Home:ltm.subtitle", href: "/ltm/index.html" },
        { slug: "nodes", title: "Home:nodes.title", description: "Home:nodes.subtitle", href: "/nodes/index.html" },
        { slug: "create_account", title: "Home:create_account.title", description: "Home:create_account.subtitle", href: "/create_account/index.html" },
        { slug: "configure_visuals", title: "Home:configure_visuals.title", description: "Home:configure_visuals.subtitle", href: "/visuals/index.html" },
      ],
    },
  ];

  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "",
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setCurrentPath(window.location.pathname);
    update();
    document.addEventListener("astro:after-swap", update);
    window.addEventListener("popstate", update);
    return () => {
      document.removeEventListener("astro:after-swap", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  const isActiveSection = (section) =>
    section.items.some((item) => currentPath.startsWith(item.href.replace(/\/index\.html$/, "/")));

  return (
    <div key={`header`}>
      <div className="mb-3 relative min-h-[195px]">
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border border-border dark:border-white/[0.06] bg-gradient-to-br from-indigo-50/80 via-sky-50/60 to-fuchsia-50/50 dark:from-transparent dark:via-transparent dark:to-transparent"
        >
          <WaveBackground />
        </div>
        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          <div className="grid grid-cols-12 gap-3 items-center min-h-[195px]">
            <div className="col-span-12 md:col-span-3 mt-2 flex items-center gap-2 relative z-10">
              <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded" />}>
                <LanguageSelector />
              </Suspense>
              <ThemeToggle />

              <Button
                size="icon"
                className="lg:hidden inline-flex align-middle h-7 w-7"
                onClick={() =>
                  window.__toggleSidebar && window.__toggleSidebar()
                }
                aria-label="Toggle Sidebar"
                title="Toggle Sidebar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M3 4h18M3 12h18M3 20h18" />
                </svg>
              </Button>
            </div>

            <div className="col-span-12 md:col-span-6 text-center relative z-10">
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground dark:text-white dark:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9),_0_2px_12px_rgba(0,0,0,0.7),_0_0_24px_rgba(0,0,0,0.5)]">
                  <a href="/index.html">
                    {page && page === "index"
                      ? t("PageHeader:welcomeMessage")
                      : ""}
                    <span>
                      {t("PageHeader:uiName")}
                    </span>
                  </a>
                </h2>
                <span
                  aria-hidden="true"
                  className="mx-auto mt-2 block h-[3px] w-2/5 max-w-[220px] rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(99,102,241,0) 0%, rgba(99,102,241,0.95) 25%, rgba(34,211,238,0.95) 50%, rgba(236,72,153,0.95) 75%, rgba(236,72,153,0) 100%)",
                    boxShadow:
                      "0 0 10px rgba(99,102,241,0.7), 0 0 20px rgba(34,211,238,0.5), 0 0 30px rgba(236,72,153,0.35)",
                  }}
                />
                <h4 className="mt-1 text-sm sm:text-base font-medium text-foreground dark:text-white dark:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9),_0_2px_12px_rgba(0,0,0,0.7),_0_0_24px_rgba(0,0,0,0.5)]">
                  {t(`PageHeader:descText.${page}`)}
                </h4>
              </div>
            </div>

            <div className="col-span-12 md:col-span-3 text-center md:text-right mt-2 relative z-10">
              {usr && usr.username && usr.username.length ? (
                <CurrentUser usr={usr} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto mb-4 px-3 sm:px-4 hidden lg:flex justify-center">
        <div
          className="inline-flex w-auto max-w-full items-center gap-1 rounded-2xl dark:border-white/10 border-border dark:bg-slate-950/55 bg-card/80 backdrop-blur-xl p-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        >
          {NAV_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const accent = SECTION_ACCENT[section.id];
            const active = isActiveSection(section);
            return (
              <HoverPopover key={section.id} section={section} accent={accent} t={t}>
                <button
                  type="button"
                  className={cn(
                    "group/navtrigger relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium",
                    "dark:text-white/80 dark:hover:text-white text-muted-foreground hover:text-foreground",
                    "border border-transparent dark:hover:border-white/10 hover:border-border",
                    "dark:bg-white/0 dark:hover:bg-white/[0.06] hover:bg-accent/50",
                    "transition-all duration-200 ease-out",
                    "data-[state=open]:dark:text-white data-[state=open]:dark:bg-white/[0.08] data-[state=open]:dark:border-white/15 data-[state=open]:text-foreground data-[state=open]:bg-accent data-[state=open]:border-border",
                    "focus-visible:outline-none focus-visible:ring-2 dark:focus-visible:ring-white/30 focus-visible:ring-ring",
                    active && "dark:text-white dark:border-white/10 dark:bg-white/[0.07] text-foreground border-border bg-accent"
                  )}
                >
                  <SectionIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "dark:text-white text-foreground" : "dark:text-white/70 dark:group-hover/navtrigger:text-white text-muted-foreground group-hover/navtrigger:text-foreground"
                    )}
                  />
                  <span className="whitespace-nowrap">{t(section.label)}</span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 dark:text-white/60 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:dark:text-white group-data-[state=open]:text-foreground"
                    aria-hidden="true"
                  />
                  {active && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-1/2 -bottom-[6px] -translate-x-1/2 h-1.5 w-1.5 rounded-full",
                        "shadow-[0_0_10px_2px_currentColor]",
                        accent.dot
                      )}
                    />
                  )}
                </button>
              </HoverPopover>
            );
          })}
        </div>
      </div>
    </div>
  );
}
