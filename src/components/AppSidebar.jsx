import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useSidebar } from "@/components/ui/sidebar";

import {
  Repeat,
  Send,
  Coins,
  Gem,
  Wallet,
  Globe,
  Vote,
  Receipt,
  SlidersHorizontal,
  Info,
  Settings,
  Zap,
  ArrowLeftRight,
  Lock,
  Layers,
  Handshake,
  Hourglass,
  Banknote,
  Timer,
  FileCheck,
  LockKeyhole,
  Users,
  CircleDollarSign,
  Boxes,
  Calculator,
  Gavel,
  FileSignature,
  Clock,
  HandCoins,
  Landmark,
  ListOrdered,
  Star,
  FileText,
  Database,
  BarChart3,
  Droplets,
  Eye,
  Pickaxe,
  Ticket,
  Trophy,
  Package,
  FilePlus,
  CreditCard,
  FileStack,
  ClipboardList,
  Crown,
  Server,
  UserPlus,
  UserX,
  Palette,
  LineChart,
  Sparkles,
  Home,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@nanostores/react";
import { useTheme } from "next-themes";
import { $customTheme, $currentPage, getThemeForPage, resolveSectionAccent } from "@/stores/customTheme.ts";
import { getNavAccentStyles } from "@/lib/accentStyles.js";

// Maps AppSidebar's local section keys to canonical nav section ids.
const CANONICAL_SECTION = {
  exchanging: "exchanging",
  transfer: "transfer",
  debt: "debt",
  assets: "assetCreation",
  accounts: "account",
  chain: "blockchain",
  gov: "governance",
  invoicing: "invoicing",
  settings: "settings",
};

const SECTION_ICONS = {
  exchanging: Repeat,
  transfer: Send,
  debt: Coins,
  assets: Gem,
  accounts: Wallet,
  chain: Globe,
  gov: Vote,
  invoicing: Receipt,
  settings: SlidersHorizontal,
};

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
  htlc: LockKeyhole,
  create_vesting: Clock,
  borrow: HandCoins,
  lend: Coins,
  smartcoins: CircleDollarSign,
  tfunds: Landmark,
  portfolio_balances: Wallet,
  portfolio_open_orders: ListOrdered,
  favourites: Star,
  issued_assets: Boxes,
  offers: FileText,
  deals: FileSignature,
  vesting: Hourglass,
  proposals: Gavel,
  blocks: Database,
  custom_pool_tracker: BarChart3,
  pools: Droplets,
  vote: Vote,
  witnesses: Eye,
  committee: Users,
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
  blocked_users: UserX,
  configure_visuals: Palette,
  theme_customizer: Palette,
  page_themes: Layers,
  home: Home,
  create_uia: Gem,
  create_smartcoin: Gem,
  create_liquidity_pool: Droplets,
  airdrop_calculate: Calculator,
  recent_activity: Activity,
  top_markets: TrendingUp,
  top_pools: Droplets,
};

export default function AppSidebar() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const exchangingFundsHeading = [
    { slug: "dex", title: "Home:dex.title", href: "/dex/index.html" },
    { slug: "instant_trade", title: "Home:instant_trade.title", href: "/instant_trade/index.html" },
    { slug: "swap", title: "Home:swap.title", href: "/swap/index.html" },
    { slug: "stake", title: "Home:stake.title", href: "/stake/index.html" },
    { slug: "barter", title: "Home:barter.title", href: "/barter/index.html" },
    { slug: "tfund_user", title: "Home:tfund_user.title", href: "/tfund_user/index.html" },
  ];

  const transferFundsHeading = [
    { slug: "transfer", title: "Home:transfer.title", href: "/transfer/index.html" },
    { slug: "timed_transfer", title: "Home:timed_transfer.title", href: "/timed_transfer/index.html" },
    { slug: "htlc", title: "Home:htlc.title", href: "/htlc/index.html" },
    {
      slug: "withdraw_permissions",
      title: "Home:withdraw_permission.title",
      href: "/withdraw_permissions/index.html",
    },
    { slug: "create_vesting", title: "Home:create_vesting.title", href: "/create_vesting/index.html" },
    { slug: "airdrop_calculate", title: "Home:airdrop_calculate.title", href: "/airdrop_calculate/index.html" },
  ];

  const formsOfDebtHeading = [
    { slug: "borrow", title: "Home:borrow.title", href: "/borrow/index.html" },
    { slug: "lend", title: "Home:lend.title", href: "/lend/index.html" },
    { slug: "smartcoins", title: "Home:smartcoins.title", href: "/smartcoins/index.html" },
    { slug: "tfunds", title: "Home:tfunds.title", href: "/tfunds/index.html" },
  ];

  const assetCreation = [
    { slug: "create_uia", title: "Home:create_uia.title", href: "/create_uia/index.html" },
    {
      slug: "create_smartcoin",
      title: "Home:create_smartcoin.title",
      href: "/create_smartcoin/index.html",
    },
    {
      slug: "create_liquidity_pool",
      title: "Home:create_liquidity_pool.title",
      href: "/create_pool/index.html",
    },
  ];

  const accountOverviewsHeading = [
    { slug: "portfolio_balances", title: "Home:portfolio_balances.title", href: "/balances/index.html" },
    {
      slug: "portfolio_open_orders",
      title: "Home:portfolio_open_orders.title",
      href: "/open-orders/index.html",
    },
    {
      slug: "call_orders",
      title: "CallOrders:title",
      href: "/call-orders/index.html",
    },
    { slug: "favourites", title: "Home:favourites.title", href: "/favourites/index.html" },
    { slug: "issued_assets", title: "Home:issued_assets.title", href: "/issued_assets/index.html" },
    { slug: "offers", title: "Home:offers.title", href: "/offers/index.html" },
    { slug: "deals", title: "Home:deals.title", href: "/deals/index.html" },
    { slug: "vesting", title: "Home:vesting.title", href: "/vesting/index.html" },
    { slug: "proposals", title: "Home:proposals.title", href: "/proposals/index.html" },
    { slug: "recent_activity", title: "Home:recent_activity.title", href: "/recent-activity/index.html" },
  ];

  const blockchainOverviewsHeading = [
    { slug: "blocks", title: "Home:blocks.title", href: "/blocks/index.html" },
    {
      slug: "custom_pool_tracker",
      title: "Home:custom_pool_tracker.title",
      href: "/custom_pool_overview/index.html",
    },
    { slug: "pools", title: "Home:pools.title", href: "/pools/index.html" },
    { slug: "top_markets", title: "Home:top_markets.title", href: "/top-markets/index.html" },
    { slug: "top_pools", title: "Home:top_pools.title", href: "/top-pools/index.html" },
  ];

  const governanceHeading = [
    { slug: "vote", title: "Home:vote.title", href: "/vote/index.html" },
    { slug: "witnesses", title: "Home:witnesses.title", href: "/witnesses/index.html" },
    { slug: "committee", title: "Home:committee.title", href: "/committee/index.html" },
    { slug: "governance", title: "Home:governance.title", href: "/governance/index.html" },
    { slug: "create_worker", title: "Home:create_worker.title", href: "/create_worker/index.html" },
    { slug: "create_ticket", title: "Home:create_ticket.title", href: "/create_ticket/index.html" },
    {
      slug: "ticket_leaderboard",
      title: "Home:ticket_leaderboard.title",
      href: "/ticket_leaderboard/index.html",
    },
  ];

  const settingsHeading = [
    { slug: "home", title: "Home:home_link.title", href: "/index.html" },
    { slug: "accountLists", title: "Home:accountLists.title", href: "/account_lists/index.html" },
    { slug: "blocked_users", title: "Home:blocked_users.title", href: "/blocked-users/index.html" },
    { slug: "ltm", title: "Home:ltm.title", href: "/ltm/index.html" },
    { slug: "nodes", title: "Home:nodes.title", href: "/nodes/index.html" },
    { slug: "create_account", title: "Home:create_account.title", href: "/create_account/index.html" },
    { slug: "configure_visuals", title: "Home:configure_visuals.title", href: "/visuals/index.html" },
    { slug: "theme_customizer", title: "Home:theme_customizer.title", href: "/theme/index.html" },
    { slug: "page_themes", title: "Home:page_themes.title", href: "/page_themes/index.html" },
  ];

  const invoicingHeading = [
    {
      slug: "invoice_inventory",
      title: "Home:invoice_inventory.title",
      href: "/invoice_inventory/index.html",
    },
    {
      slug: "create_invoice",
      title: "Home:create_invoice.title",
      href: "/create_invoice/index.html",
    },
    {
      slug: "pay_invoice",
      title: "Home:pay_invoice.title",
      href: "/pay_invoice/index.html",
    },
    {
      slug: "stored_invoices",
      title: "Home:stored_invoices.title",
      href: "/stored_invoices/index.html",
    },
  ];

  const sections = [
    {
      key: "exchanging",
      label: t("PageHeader:exchangingFundsHeading"),
      items: exchangingFundsHeading,
    },
    {
      key: "transfer",
      label: t("PageHeader:transferFundsHeading"),
      items: transferFundsHeading,
    },
    {
      key: "debt",
      label: t("PageHeader:formsOfDebtHeading"),
      items: formsOfDebtHeading,
    },
    {
      key: "assets",
      label: t("PageHeader:assetCreation"),
      items: assetCreation,
    },
    {
      key: "accounts",
      label: t("PageHeader:accountOverviewsHeading"),
      items: accountOverviewsHeading,
    },
    {
      key: "invoicing",
      label: t("PageHeader:invoicingHeading"),
      items: invoicingHeading,
    },
    {
      key: "gov",
      label: t("PageHeader:governanceHeading"),
      items: governanceHeading,
    },
    {
      key: "chain",
      label: t("PageHeader:blockchainOverviewsHeading"),
      items: blockchainOverviewsHeading,
    },
    {
      key: "settings",
      label: t("PageHeader:settingsHeading"),
      items: settingsHeading,
    },
  ];

  useStore($customTheme);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const pageSlug = useStore($currentPage);
  const themeForPage = getThemeForPage(pageSlug);
  const accentFor = (key) => {
    const pair = resolveSectionAccent(themeForPage, CANONICAL_SECTION[key]);
    const a = getNavAccentStyles(pair.primary, isDark);
    return { fg: a.color, bg: a.chipBg };
  };

  const { openMobile, isMobile, setOpenMobile, setOpen } = useSidebar();
  const [accValue, setAccValue] = React.useState(sections[0].key);

  React.useEffect(() => {
    if (isMobile && openMobile) {
      setAccValue(sections[0].key);
    }
  }, [isMobile, openMobile]);

  return (
    <Sidebar className="dark:!bg-slate-950/80 !bg-card dark:!border-r-white/[0.06] !border-r-border">
      <SidebarContent className="dark:!bg-slate-950/80 !bg-card">
        <Accordion
          type="single"
          collapsible
          value={accValue}
          onValueChange={setAccValue}
          className="w-full"
        >
          {sections.map((section) => {
            const SectionIcon = SECTION_ICONS[section.key] || Settings;
            const sectionAccent = accentFor(section.key);
            return (
              <AccordionItem
                key={section.key}
                value={section.key}
                className="dark:border-b-white/[0.06] border-b-sidebar-border"
              >
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <SidebarGroupLabel className="px-2 py-0.5 text-[13px]">
                    <span className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded" style={sectionAccent.bg}>
                      <SectionIcon className="h-3 w-3" style={sectionAccent.fg} />
                    </span>
                    <span className="dark:text-white/70 text-sidebar-foreground/70">{section.label}</span>
                  </SidebarGroupLabel>
                </AccordionTrigger>
                <AccordionContent>
                  <SidebarGroup>
                    <SidebarGroupContent className="ml-3 pl-3 border-l dark:border-white/[0.08] border-sidebar-border">
                      <SidebarMenu>
                        {section.items.map((it) => {
                          const ItemIcon = ITEM_ICONS[it.slug] || Sparkles;
                          const itemAccent = sectionAccent;
                          return (
                            <SidebarMenuItem key={it.href}>
                              <SidebarMenuButton
                                asChild
                                className="dark:!text-white/60 dark:hover:!text-white dark:hover:!bg-white/[0.06] !text-sidebar-foreground/60 hover:!text-sidebar-foreground hover:!bg-sidebar-accent !bg-transparent focus-visible:ring-0"
                              >
                                <a
                                  href={it.href}
                                  className="flex items-center gap-2"
                                  onClick={() => {
                                    if (isMobile) setOpenMobile(false);
                                    else setOpen(false);
                                  }}
                                >
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded" style={itemAccent.bg}>
                                    <ItemIcon className="h-3 w-3" style={itemAccent.fg} />
                                  </span>
                                  <span>{t(it.title)}</span>
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </SidebarContent>
    </Sidebar>
  );
}
