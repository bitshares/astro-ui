import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { useSyncExternalStore } from "react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Separator } from "@/components/ui/separator";

import Hero from "./home/Hero";

import {
  Activity,
  Hourglass,
  BookOpen,
  Briefcase,
  TrendingUp,
  Sparkles,
  Send,
  Wallet,
  ClipboardList,
  Star,
  LineChart,
  Info,
  Server,
  UserX,
  UserPlus,
  Palette,
  ArrowUpRight,
  Repeat,
  Wrench,
  Zap,
  ArrowLeftRight,
  ShieldCheck,
  Coins,
  Landmark,
  Vote,
  Globe,
  Receipt,
  Gem,
  Lock,
  Banknote,
  HandCoins,
  FileText,
  Pickaxe,
  BarChart3,
  Ticket,
  Trophy,
  FilePlus,
  FileCheck,
  FileClock,
  FileStack,
  Timer,
  Handshake,
  Crown,
  Eye,
  Droplets,
  Package,
  CreditCard,
  Database,
  ListOrdered,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $blockList, updateBlockList } from "@/stores/blocklist.ts";

import { createBlockedAccountStore } from "@/nanoeffects/BlockedAccounts.ts";

const ITEM_ICONS = {
  dex: LineChart,
  instant_trade: Zap,
  swap: ArrowLeftRight,
  stake: Lock,
  barter: Handshake,
  tfund_user: Banknote,
  transfer: Send,
  timed_transfer: Timer,
  withdraw_permissions: FileCheck,
  htlc: ShieldCheck,
  create_vesting: Clock,
  borrow: HandCoins,
  lend: Coins,
  smartcoins: Gem,
  tfunds: Landmark,
  portfolio_balances: Wallet,
  portfolio_open_orders: ListOrdered,
  favourites: Star,
  issued_assets: Gem,
  offers: FileText,
  deals: Handshake,
  vesting: Clock,
  proposals: FileText,
  blocks: Database,
  custom_pool_tracker: BarChart3,
  pools: Droplets,
  vote: Vote,
  witnesses: Eye,
  committee: ShieldCheck,
  governance: Vote,
  create_worker: Pickaxe,
  create_ticket: Ticket,
  ticket_leaderboard: Trophy,
  invoice_inventory: Package,
  create_invoice: FilePlus,
  pay_invoice: CreditCard,
  stored_invoices: FileStack,
  accountLists: ClipboardList,
  ltm: Crown,
  nodes: Server,
  create_account: UserPlus,
  configure_visuals: Palette,
  about: Info,
  create_uia: Gem,
  create_smartcoin: Gem,
  create_liquidity_pool: Droplets,
};

const ITEM_ACCENTS = {
  dex: { bar: "from-indigo-500 to-cyan-500", chip: "bg-indigo-500/30 text-indigo-100 border-indigo-400/50", glow: "bg-indigo-500/30", text: "dark:text-indigo-200 text-indigo-700" },
  instant_trade: { bar: "from-amber-500 to-orange-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  swap: { bar: "from-blue-500 to-indigo-500", chip: "bg-blue-500/30 text-blue-100 border-blue-400/50", glow: "bg-blue-500/30", text: "dark:text-blue-200 text-blue-700" },
  stake: { bar: "from-cyan-500 to-sky-500", chip: "bg-cyan-500/30 text-cyan-100 border-cyan-400/50", glow: "bg-cyan-500/30", text: "dark:text-cyan-200 text-cyan-700" },
  barter: { bar: "from-sky-500 to-blue-500", chip: "bg-sky-500/30 text-sky-100 border-sky-400/50", glow: "bg-sky-500/30", text: "dark:text-sky-200 text-sky-700" },
  tfund_user: { bar: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  transfer: { bar: "from-sky-500 to-blue-500", chip: "bg-sky-500/30 text-sky-100 border-sky-400/50", glow: "bg-sky-500/30", text: "dark:text-sky-200 text-sky-700" },
  timed_transfer: { bar: "from-cyan-500 to-sky-500", chip: "bg-cyan-500/30 text-cyan-100 border-cyan-400/50", glow: "bg-cyan-500/30", text: "dark:text-cyan-200 text-cyan-700" },
  withdraw_permissions: { bar: "from-blue-500 to-indigo-500", chip: "bg-blue-500/30 text-blue-100 border-blue-400/50", glow: "bg-blue-500/30", text: "dark:text-blue-200 text-blue-700" },
  htlc: { bar: "from-violet-500 to-purple-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  create_vesting: { bar: "from-fuchsia-500 to-pink-500", chip: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-400/50", glow: "bg-fuchsia-500/30", text: "dark:text-fuchsia-200 text-fuchsia-700" },
  borrow: { bar: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  lend: { bar: "from-amber-500 to-orange-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  smartcoins: { bar: "from-indigo-500 to-cyan-500", chip: "bg-indigo-500/30 text-indigo-100 border-indigo-400/50", glow: "bg-indigo-500/30", text: "dark:text-indigo-200 text-indigo-700" },
  tfunds: { bar: "from-rose-500 to-red-500", chip: "bg-rose-500/30 text-rose-100 border-rose-400/50", glow: "bg-rose-500/30", text: "dark:text-rose-200 text-rose-700" },
  portfolio_balances: { bar: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  portfolio_open_orders: { bar: "from-cyan-500 to-sky-500", chip: "bg-cyan-500/30 text-cyan-100 border-cyan-400/50", glow: "bg-cyan-500/30", text: "dark:text-cyan-200 text-cyan-700" },
  favourites: { bar: "from-amber-500 to-yellow-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  issued_assets: { bar: "from-violet-500 to-purple-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  offers: { bar: "from-sky-500 to-blue-500", chip: "bg-sky-500/30 text-sky-100 border-sky-400/50", glow: "bg-sky-500/30", text: "dark:text-sky-200 text-sky-700" },
  deals: { bar: "from-blue-500 to-indigo-500", chip: "bg-blue-500/30 text-blue-100 border-blue-400/50", glow: "bg-blue-500/30", text: "dark:text-blue-200 text-blue-700" },
  vesting: { bar: "from-fuchsia-500 to-pink-500", chip: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-400/50", glow: "bg-fuchsia-500/30", text: "dark:text-fuchsia-200 text-fuchsia-700" },
  proposals: { bar: "from-rose-500 to-red-500", chip: "bg-rose-500/30 text-rose-100 border-rose-400/50", glow: "bg-rose-500/30", text: "dark:text-rose-200 text-rose-700" },
  blocks: { bar: "from-slate-500 to-gray-500", chip: "bg-accent/30 text-slate-100 border-slate-400/50", glow: "bg-accent/30", text: "dark:text-slate-200 text-slate-700" },
  custom_pool_tracker: { bar: "from-teal-500 to-cyan-500", chip: "bg-teal-500/30 text-teal-100 border-teal-400/50", glow: "bg-teal-500/30", text: "dark:text-teal-200 text-teal-700" },
  pools: { bar: "from-cyan-500 to-sky-500", chip: "bg-cyan-500/30 text-cyan-100 border-cyan-400/50", glow: "bg-cyan-500/30", text: "dark:text-cyan-200 text-cyan-700" },
  vote: { bar: "from-indigo-500 to-violet-500", chip: "bg-indigo-500/30 text-indigo-100 border-indigo-400/50", glow: "bg-indigo-500/30", text: "dark:text-indigo-200 text-indigo-700" },
  witnesses: { bar: "from-amber-500 to-orange-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  committee: { bar: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  governance: { bar: "from-violet-500 to-purple-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  create_worker: { bar: "from-sky-500 to-blue-500", chip: "bg-sky-500/30 text-sky-100 border-sky-400/50", glow: "bg-sky-500/30", text: "dark:text-sky-200 text-sky-700" },
  create_ticket: { bar: "from-fuchsia-500 to-pink-500", chip: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-400/50", glow: "bg-fuchsia-500/30", text: "dark:text-fuchsia-200 text-fuchsia-700" },
  ticket_leaderboard: { bar: "from-rose-500 to-red-500", chip: "bg-rose-500/30 text-rose-100 border-rose-400/50", glow: "bg-rose-500/30", text: "dark:text-rose-200 text-rose-700" },
  invoice_inventory: { bar: "from-amber-500 to-orange-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  create_invoice: { bar: "from-cyan-500 to-sky-500", chip: "bg-cyan-500/30 text-cyan-100 border-cyan-400/50", glow: "bg-cyan-500/30", text: "dark:text-cyan-200 text-cyan-700" },
  pay_invoice: { bar: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  stored_invoices: { bar: "from-sky-500 to-blue-500", chip: "bg-sky-500/30 text-sky-100 border-sky-400/50", glow: "bg-sky-500/30", text: "dark:text-sky-200 text-sky-700" },
  accountLists: { bar: "from-slate-500 to-gray-500", chip: "bg-accent/30 text-slate-100 border-slate-400/50", glow: "bg-accent/30", text: "dark:text-slate-200 text-slate-700" },
  ltm: { bar: "from-amber-500 to-yellow-500", chip: "bg-amber-500/30 text-amber-100 border-amber-400/50", glow: "bg-amber-500/30", text: "dark:text-amber-200 text-amber-700" },
  nodes: { bar: "from-teal-500 to-cyan-500", chip: "bg-teal-500/30 text-teal-100 border-teal-400/50", glow: "bg-teal-500/30", text: "dark:text-teal-200 text-teal-700" },
  create_account: { bar: "from-emerald-500 to-green-500", chip: "bg-emerald-500/30 text-emerald-100 border-emerald-400/50", glow: "bg-emerald-500/30", text: "dark:text-emerald-200 text-emerald-700" },
  configure_visuals: { bar: "from-violet-500 to-fuchsia-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  about: { bar: "from-blue-500 to-indigo-500", chip: "bg-blue-500/30 text-blue-100 border-blue-400/50", glow: "bg-blue-500/30", text: "dark:text-blue-200 text-blue-700" },
  create_uia: { bar: "from-violet-500 to-fuchsia-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  create_smartcoin: { bar: "from-violet-500 to-purple-500", chip: "bg-violet-500/30 text-violet-100 border-violet-400/50", glow: "bg-violet-500/30", text: "dark:text-violet-200 text-violet-700" },
  create_liquidity_pool: { bar: "from-fuchsia-500 to-pink-500", chip: "bg-fuchsia-500/30 text-fuchsia-100 border-fuchsia-400/50", glow: "bg-fuchsia-500/30", text: "dark:text-fuchsia-200 text-fuchsia-700" },
};

const SECTION_STYLES = {
  exchanging: {
    icon: Repeat,
    titleKey: "PageHeader:exchangingFundsHeading",
    subtitleKey: "Home:sections.exchangingSubtitle",
    border: "border-cyan-400/20",
    bg: "from-cyan-500/15 dark:via-slate-900/20 via-slate-100/40 to-blue-500/10",
    iconBg: "bg-cyan-500/15",
    iconBorder: "border-cyan-400/25",
    iconText: "dark:text-cyan-200 text-cyan-700",
    blobA: "bg-cyan-500/30",
    blobB: "bg-blue-500/20",
    underline: "from-cyan-500/0 via-cyan-400/60 to-blue-500/0",
  },
  transfer: {
    icon: Send,
    titleKey: "PageHeader:transferFundsHeading",
    subtitleKey: "Home:sections.transferSubtitle",
    border: "border-sky-400/20",
    bg: "from-sky-500/15 dark:via-slate-900/20 via-slate-100/40 to-blue-500/10",
    iconBg: "bg-sky-500/15",
    iconBorder: "border-sky-400/25",
    iconText: "dark:text-sky-200 text-sky-700",
    blobA: "bg-sky-500/30",
    blobB: "bg-blue-500/20",
    underline: "from-sky-500/0 via-sky-400/60 to-blue-500/0",
  },
  debt: {
    icon: Coins,
    titleKey: "PageHeader:formsOfDebtHeading",
    subtitleKey: "Home:sections.debtSubtitle",
    border: "border-emerald-400/20",
    bg: "from-emerald-500/15 dark:via-slate-900/20 via-slate-100/40 to-teal-500/10",
    iconBg: "bg-emerald-500/15",
    iconBorder: "border-emerald-400/25",
    iconText: "dark:text-emerald-200 text-emerald-700",
    blobA: "bg-emerald-500/30",
    blobB: "bg-teal-500/20",
    underline: "from-emerald-500/0 via-emerald-400/60 to-teal-500/0",
  },
  assetCreation: {
    icon: Gem,
    titleKey: "PageHeader:assetCreation",
    subtitleKey: "Home:sections.assetCreationSubtitle",
    border: "border-violet-400/20",
    bg: "from-violet-500/15 dark:via-slate-900/20 via-slate-100/40 to-fuchsia-500/10",
    iconBg: "bg-violet-500/15",
    iconBorder: "border-violet-400/25",
    iconText: "dark:text-violet-200 text-violet-700",
    blobA: "bg-violet-500/30",
    blobB: "bg-fuchsia-500/20",
    underline: "from-violet-500/0 via-violet-400/60 to-fuchsia-500/0",
  },
  account: {
    icon: Wallet,
    titleKey: "PageHeader:accountOverviewsHeading",
    subtitleKey: "Home:sections.accountSubtitle",
    border: "border-emerald-400/20",
    bg: "from-emerald-500/15 dark:via-slate-900/20 via-slate-100/40 to-sky-500/10",
    iconBg: "bg-emerald-500/15",
    iconBorder: "border-emerald-400/25",
    iconText: "dark:text-emerald-200 text-emerald-700",
    blobA: "bg-emerald-500/30",
    blobB: "bg-sky-500/20",
    underline: "from-emerald-500/0 via-emerald-400/60 to-sky-500/0",
  },
  blockchain: {
    icon: Globe,
    titleKey: "PageHeader:blockchainOverviewsHeading",
    subtitleKey: "Home:sections.blockchainSubtitle",
    border: "border-slate-400/20",
    bg: "from-slate-500/15 dark:via-slate-900/20 via-slate-100/40 to-gray-500/10",
    iconBg: "bg-accent/15",
    iconBorder: "border-slate-400/25",
    iconText: "dark:text-slate-200 text-foreground",
    blobA: "bg-accent/30",
    blobB: "bg-card0/20",
    underline: "from-slate-500/0 via-slate-400/60 to-gray-500/0",
  },
  governance: {
    icon: Vote,
    titleKey: "PageHeader:governanceHeading",
    subtitleKey: "Home:sections.governanceSubtitle",
    border: "border-indigo-400/20",
    bg: "from-indigo-500/15 dark:via-slate-900/20 via-slate-100/40 to-violet-500/10",
    iconBg: "bg-indigo-500/15",
    iconBorder: "border-indigo-400/25",
    iconText: "dark:text-indigo-200 text-indigo-700",
    blobA: "bg-indigo-500/30",
    blobB: "bg-violet-500/20",
    underline: "from-indigo-500/0 via-indigo-400/60 to-violet-500/0",
  },
  invoicing: {
    icon: Receipt,
    titleKey: "PageHeader:invoicingHeading",
    subtitleKey: "Home:sections.invoicingSubtitle",
    border: "border-amber-400/20",
    bg: "from-amber-500/15 dark:via-slate-900/20 via-slate-100/40 to-orange-500/10",
    iconBg: "bg-amber-500/15",
    iconBorder: "border-amber-400/25",
    iconText: "dark:text-amber-200 text-amber-700",
    blobA: "bg-amber-500/30",
    blobB: "bg-orange-500/20",
    underline: "from-amber-500/0 via-amber-400/60 to-orange-500/0",
  },
  settings: {
    icon: Wrench,
    titleKey: "PageHeader:settingsHeading",
    subtitleKey: "Home:sections.settingsSubtitle",
    border: "border-violet-400/20",
    bg: "from-violet-500/15 dark:via-slate-900/20 via-slate-100/40 to-rose-500/10",
    iconBg: "bg-violet-500/15",
    iconBorder: "border-violet-400/25",
    iconText: "dark:text-violet-200 text-violet-700",
    blobA: "bg-violet-500/30",
    blobB: "bg-rose-500/20",
    underline: "from-violet-500/0 via-violet-400/60 to-rose-500/0",
  },
};

export default function Home(properties) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true,
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true,
  );
  const currentNode = useStore($currentNode);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);
  useEffect(() => {
    if (
      blocklist &&
      blocklist.timestamp &&
      usr &&
      usr.chain &&
      usr.chain === "bitshares" &&
      currentNode &&
      currentNode.url
    ) {
      const currentTime = Date.now();
      const isOlderThan24Hours =
        currentTime - blocklist.timestamp > 24 * 60 * 60 * 1000;
      if (isOlderThan24Hours || !blocklist.users.length) {
        const blockListStore = createBlockedAccountStore([
          usr.chain,
          currentNode.url,
        ]);
        const unsub = blockListStore.subscribe((result) => {
          if (result.error) {
            console.error(result.error);
          }
          if (!result.loading && result.data) {
            updateBlockList(result.data);
          }
        });
        return () => {
          unsub();
        };
      }
    }
  }, [usr, currentNode]);

  const exchangingFunds = [
    { key: "dex", href: "/dex/index.html", titleKey: "Home:dex.title", subtitleKey: "Home:dex.subtitle", hoverKeys: ["Home:dex.hover1", "Home:dex.hover2", "Home:dex.hover3", "Home:dex.hover4"] },
    { key: "instant_trade", href: "/instant_trade/index.html", titleKey: "Home:instant_trade.title", subtitleKey: "Home:instant_trade.subtitle", hoverKeys: ["Home:instant_trade.hover1", "Home:instant_trade.hover2", "Home:instant_trade.hover3"] },
    { key: "swap", href: "/swap/index.html", titleKey: "Home:swap.title", subtitleKey: "Home:swap.subtitle", hoverKeys: ["Home:swap.hover1", "Home:swap.hover2", "Home:swap.hover3"] },
    { key: "stake", href: "/stake/index.html", titleKey: "Home:stake.title", subtitleKey: "Home:stake.subtitle", hoverKeys: ["Home:stake.hover1", "Home:stake.hover2", "Home:stake.hover3"] },
    { key: "barter", href: "/barter/index.html", titleKey: "Home:barter.title", subtitleKey: "Home:barter.subtitle", hoverKeys: ["Home:barter.hover1", "Home:barter.hover2", "Home:barter.hover3"] },
    { key: "tfund_user", href: "/tfund_user/index.html", titleKey: "Home:tfund_user.title", subtitleKey: "Home:tfund_user.subtitle", hoverKeys: ["Home:tfund_user.hover1", "Home:tfund_user.hover2", "Home:tfund_user.hover3"] },
  ];

  const transferFunds = [
    { key: "transfer", href: "/transfer/index.html", titleKey: "Home:transfer.title", subtitleKey: "Home:transfer.subtitle", hoverKeys: ["Home:transfer.hover1"] },
    { key: "timed_transfer", href: "/timed_transfer/index.html", titleKey: "Home:timed_transfer.title", subtitleKey: "Home:timed_transfer.subtitle", hoverKeys: ["Home:timed_transfer.hover1"] },
    { key: "withdraw_permissions", href: "/withdraw_permissions/index.html", titleKey: "Home:withdraw_permission.title", subtitleKey: "Home:withdraw_permission.subtitle", hoverKeys: ["Home:withdraw_permission.hover1", "Home:withdraw_permission.hover2"] },
    { key: "htlc", href: "/htlc/index.html", titleKey: "Home:htlc.title", subtitleKey: "Home:htlc.subtitle", hoverKeys: ["Home:htlc.hover1", "Home:htlc.hover2", "Home:htlc.hover3"] },
    { key: "create_vesting", href: "/create_vesting/index.html", titleKey: "Home:create_vesting.title", subtitleKey: "Home:create_vesting.subtitle", hoverKeys: ["Home:create_vesting.hover1", "Home:create_vesting.hover2", "Home:create_vesting.hover3", "Home:create_vesting.hover4"] },
  ];

  const formsOfDebt = [
    { key: "borrow", href: "/borrow/index.html", titleKey: "Home:borrow.title", subtitleKey: "Home:borrow.subtitle", hoverKeys: ["Home:borrow.hover1", "Home:borrow.hover2", "Home:borrow.hover3"] },
    { key: "lend", href: "/lend/index.html", titleKey: "Home:lend.title", subtitleKey: "Home:lend.subtitle", hoverKeys: ["Home:lend.hover1", "Home:lend.hover2", "Home:lend.hover3"] },
    { key: "smartcoins", href: "/smartcoins/index.html", titleKey: "Home:smartcoins.title", subtitleKey: "Home:smartcoins.subtitle", hoverKeys: ["Home:smartcoins.hover1", "Home:smartcoins.hover2", "Home:smartcoins.hover3", "Home:smartcoins.hover4"] },
    { key: "tfunds", href: "/tfunds/index.html", titleKey: "Home:tfunds.title", subtitleKey: "Home:tfunds.subtitle", hoverKeys: ["Home:tfunds.hover1", "Home:tfunds.hover2", "Home:tfunds.hover3", "Home:tfunds.hover4"] },
  ];

  const assetCreation = [
    { key: "create_uia", href: "/create_uia/index.html", titleKey: "Home:create_uia.title", subtitleKey: "Home:create_uia.subtitle", hoverKeys: ["Home:create_uia.hover1", "Home:create_uia.hover2", "Home:create_uia.hover3"] },
    { key: "create_smartcoin", href: "/create_smartcoin/index.html", titleKey: "Home:create_smartcoin.title", subtitleKey: "Home:create_smartcoin.subtitle", hoverKeys: ["Home:create_smartcoin.hover1", "Home:create_smartcoin.hover2", "Home:create_smartcoin.hover3"] },
    { key: "create_liquidity_pool", href: "/create_pool/index.html", titleKey: "Home:create_liquidity_pool.title", subtitleKey: "Home:create_liquidity_pool.subtitle", hoverKeys: ["Home:create_liquidity_pool.hover1", "Home:create_liquidity_pool.hover2", "Home:create_liquidity_pool.hover3"] },
  ];

  const accountOverviews = [
    { key: "portfolio_balances", href: "/balances/index.html", titleKey: "Home:portfolio_balances.title", subtitleKey: "Home:portfolio_balances.subtitle", hoverKeys: ["Home:portfolio_balances.hover1", "Home:portfolio_balances.hover2", "Home:portfolio_balances.hover3"] },
    { key: "portfolio_open_orders", href: "/open-orders/index.html", titleKey: "Home:portfolio_open_orders.title", subtitleKey: "Home:portfolio_open_orders.subtitle", hoverKeys: ["Home:portfolio_open_orders.hover1", "Home:portfolio_open_orders.hover2", "Home:portfolio_open_orders.hover3"] },
    { key: "favourites", href: "/favourites/index.html", titleKey: "Home:favourites.title", subtitleKey: "Home:favourites.subtitle", hoverKeys: ["Home:favourites.hover1", "Home:favourites.hover2"] },
    { key: "issued_assets", href: "/issued_assets/index.html", titleKey: "Home:issued_assets.title", subtitleKey: "Home:issued_assets.subtitle", hoverKeys: ["Home:issued_assets.hover1", "Home:issued_assets.hover2", "Home:issued_assets.hover3"] },
    { key: "offers", href: "/offers/index.html", titleKey: "Home:offers.title", subtitleKey: "Home:offers.subtitle", hoverKeys: ["Home:offers.hover1", "Home:offers.hover2"] },
    { key: "deals", href: "/deals/index.html", titleKey: "Home:deals.title", subtitleKey: "Home:deals.subtitle", hoverKeys: ["Home:deals.hover1", "Home:deals.hover2"] },
    { key: "vesting", href: "/vesting/index.html", titleKey: "Home:vesting.title", subtitleKey: "Home:vesting.subtitle", hoverKeys: ["Home:vesting.hover1", "Home:vesting.hover2"] },
    { key: "proposals", href: "/proposals/index.html", titleKey: "Home:proposals.title", subtitleKey: "Home:proposals.subtitle", hoverKeys: ["Home:proposals.hover1", "Home:proposals.hover2"] },
  ];

  const blockchainOverviews = [
    { key: "blocks", href: "/blocks/index.html", titleKey: "Home:blocks.title", subtitleKey: "Home:blocks.subtitle", hoverKeys: ["Home:blocks.hover1", "Home:blocks.hover2", "Home:blocks.hover3"] },
    { key: "custom_pool_tracker", href: "/custom_pool_overview/index.html", titleKey: "Home:custom_pool_tracker.title", subtitleKey: "Home:custom_pool_tracker.subtitle", hoverKeys: ["Home:custom_pool_tracker.hover1", "Home:custom_pool_tracker.hover2"] },
    { key: "pools", href: "/pools/index.html", titleKey: "Home:pools.title", subtitleKey: "Home:pools.subtitle", hoverKeys: ["Home:pools.hover1", "Home:pools.hover2", "Home:pools.hover3"] },
  ];

  const governance = [
    { key: "vote", href: "/vote/index.html", titleKey: "Home:vote.title", subtitleKey: "Home:vote.subtitle", hoverKeys: ["Home:vote.hover1", "Home:vote.hover2", "Home:vote.hover3"] },
    { key: "witnesses", href: "/witnesses/index.html", titleKey: "Home:witnesses.title", subtitleKey: "Home:witnesses.subtitle", hoverKeys: ["Home:witnesses.hover1", "Home:witnesses.hover2", "Home:witnesses.hover3"] },
    { key: "committee", href: "/committee/index.html", titleKey: "Home:committee.title", subtitleKey: "Home:committee.subtitle", hoverKeys: ["Home:committee.hover1", "Home:committee.hover2", "Home:committee.hover3"] },
    { key: "governance", href: "/governance/index.html", titleKey: "Home:governance.title", subtitleKey: "Home:governance.subtitle", hoverKeys: ["Home:governance.hover1", "Home:governance.hover2"] },
    { key: "create_worker", href: "/create_worker/index.html", titleKey: "Home:create_worker.title", subtitleKey: "Home:create_worker.subtitle", hoverKeys: ["Home:create_worker.hover1", "Home:create_worker.hover2", "Home:create_worker.hover3"] },
    { key: "create_ticket", href: "/create_ticket/index.html", titleKey: "Home:create_ticket.title", subtitleKey: "Home:create_ticket.subtitle", hoverKeys: ["Home:create_ticket.hover1", "Home:create_ticket.hover2", "Home:create_ticket.hover3"] },
    { key: "ticket_leaderboard", href: "/ticket_leaderboard/index.html", titleKey: "Home:ticket_leaderboard.title", subtitleKey: "Home:ticket_leaderboard.subtitle", hoverKeys: ["Home:ticket_leaderboard.hover1", "Home:ticket_leaderboard.hover2", "Home:ticket_leaderboard.hover3"] },
  ];

  const invoicing = [
    { key: "invoice_inventory", href: "/invoice_inventory/index.html", titleKey: "Home:invoice_inventory.title", subtitleKey: "Home:invoice_inventory.subtitle", hoverKeys: ["Home:invoice_inventory.hover1"] },
    { key: "create_invoice", href: "/create_invoice/index.html", titleKey: "Home:create_invoice.title", subtitleKey: "Home:create_invoice.subtitle", hoverKeys: ["Home:create_invoice.hover1"] },
    { key: "pay_invoice", href: "/pay_invoice/index.html", titleKey: "Home:pay_invoice.title", subtitleKey: "Home:pay_invoice.subtitle", hoverKeys: ["Home:pay_invoice.hover1", "Home:pay_invoice.hover2"] },
    { key: "stored_invoices", href: "/stored_invoices/index.html", titleKey: "Home:stored_invoices.title", subtitleKey: "Home:stored_invoices.subtitle", hoverKeys: ["Home:stored_invoices.hover1", "Home:stored_invoices.hover2", "Home:stored_invoices.hover3"] },
  ];

  const settings = [
    { key: "accountLists", href: "/account_lists/index.html", titleKey: "Home:accountLists.title", subtitleKey: "Home:accountLists.subtitle", hoverKeys: ["Home:accountLists.hover1", "Home:accountLists.hover2", "Home:accountLists.hover3"] },
    { key: "ltm", href: "/ltm/index.html", titleKey: "Home:ltm.title", subtitleKey: "Home:ltm.subtitle", hoverKeys: ["Home:ltm.hover1", "Home:ltm.hover2", "Home:ltm.hover3", "Home:ltm.hover4"] },
    { key: "nodes", href: "/nodes/index.html", titleKey: "Home:nodes.title", subtitleKey: "Home:nodes.subtitle", hoverKeys: ["Home:nodes.hover1", "Home:nodes.hover2"] },
    { key: "create_account", href: "/create_account/index.html", titleKey: "Home:create_account.title", subtitleKey: "Home:create_account.subtitle", hoverKeys: ["Home:create_account.hover1", "Home:create_account.hover2"] },
    { key: "configure_visuals", href: "/visuals/index.html", titleKey: "Home:configure_visuals.title", subtitleKey: "Home:configure_visuals.subtitle", hoverKeys: ["Home:configure_visuals.hover1", "Home:configure_visuals.hover2"] },
  ];

  const renderHoverCard = (card) => {
    const Icon = ITEM_ICONS[card.key] || Sparkles;
    const accent = ITEM_ACCENTS[card.key] || {
      bar: "from-border/40 to-border/20",
      chip: "bg-accent/30 dark:bg-white/[0.05] text-foreground/80 border-foreground/15",
      glow: "bg-accent/30 dark:bg-white/[0.05]",
      text: "text-foreground/80",
    };
    return (
      <HoverCard key={card.key} openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <a
            href={card.href}
            className={cn(
              "group relative overflow-hidden block rounded-2xl",
              "border border-border bg-card/30",
              "p-4 sm:p-5",
              "transition-all duration-200 ease-out",
              "hover:border-border hover:bg-accent/50",
              "hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity",
                accent.bar
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-300",
                accent.glow
              )}
            />
            <div className="relative flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  accent.chip
                )}
              >
                <Icon className={cn("h-5 w-5", accent.text)} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {t(card.titleKey)}
                </h3>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground line-clamp-2">
                  {t(card.subtitleKey)}
                </p>
              </div>
              <ArrowUpRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground/60 -translate-x-0.5 translate-y-0.5",
                  "group-hover:text-foreground/80 group-hover:translate-x-0 group-hover:translate-y-0",
                  "transition-all duration-200 ease-out"
                )}
                aria-hidden="true"
              />
            </div>
          </a>
        </HoverCardTrigger>
        {card.hoverKeys && card.hoverKeys.length ? (
          <HoverCardContent
            sideOffset={10}
            align="center"
            className={cn(
              "w-80 overflow-hidden rounded-2xl border border-border p-4 text-sm",
              "!bg-card text-muted-foreground",
              "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
            )}
          >
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r opacity-80",
                accent.bar
              )}
            />
            <ul className="ml-4 list-disc [&>li]:mt-2 marker:text-muted-foreground">
              {card.hoverKeys.map((hoverKey, index) => (
                <li key={`${card.key}-hover-${index}`} className="leading-relaxed">
                  {t(hoverKey)}
                </li>
              ))}
            </ul>
          </HoverCardContent>
        ) : null}
      </HoverCard>
    );
  };

  const renderCardGrid = (cards, gridColsClass = "lg:grid-cols-3") => (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-3 sm:gap-4`}>
      {cards.map((card) => renderHoverCard(card))}
    </div>
  );

  const renderSection = (cards, sectionKey) => {
    const style = SECTION_STYLES[sectionKey] || SECTION_STYLES.settings;
    const SectionIcon = style.icon;
    return (
      <section className="mt-10 sm:mt-14">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
            "bg-gradient-to-br",
            style.border,
            style.bg
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full blur-3xl",
              style.blobA
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full blur-3xl",
              style.blobB
            )}
          />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <span
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                style.iconBg,
                style.iconBorder
              )}
            >
              <SectionIcon className={cn("h-5 w-5", style.iconText)} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight">
                {t(style.titleKey)}
              </h2>
              <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground leading-snug">
                {t(style.subtitleKey)}
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden md:flex items-center gap-1 pr-1"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", style.iconBg.replace("/15", "/80"))} />
              <span className={cn("h-1.5 w-1.5 rounded-full opacity-60", style.iconBg.replace("/15", "/60"))} />
              <span className={cn("h-1.5 w-1.5 rounded-full opacity-30", style.iconBg.replace("/15", "/40"))} />
            </div>
          </div>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r",
              style.underline
            )}
          />
        </div>
        <div className="mt-3 sm:mt-4">
          {renderCardGrid(cards, sectionKey === "account" ? "lg:grid-cols-3" : "lg:grid-cols-3")}
        </div>
      </section>
    );
  };

  return (
    <div className="container mx-auto mt-3 mb-5 px-3 sm:px-4">
      {renderSection(exchangingFunds, "exchanging")}
      {renderSection(transferFunds, "transfer")}
      {renderSection(formsOfDebt, "debt")}
      {renderSection(assetCreation, "assetCreation")}
      {renderSection(accountOverviews, "account")}
      {renderSection(blockchainOverviews, "blockchain")}
      {renderSection(governance, "governance")}
      {renderSection(invoicing, "invoicing")}
      {renderSection(settings, "settings")}
    </div>
  );
}
