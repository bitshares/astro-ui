import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..", "src", "content", "docs", "docs");

// Section -> { folder, heading, pages: [{ key, file, title, desc, live, note }] }
// `live` is the in-app route the LinkCard points to (/<key>/index.html form used by the app).
const SECTIONS = [
  {
    folder: "exchanging",
    heading: "Exchanging Funds",
    items: [
      { key: "dex", title: "DEX", desc: "Trade assets on the decentralized exchange with advanced market and limit orders.", live: "dex" },
      { key: "instant_trade", title: "Instant Trade", desc: "Swap one asset for another at the best available price in a single action.", live: "instant_trade" },
      { key: "swap", title: "Swap", desc: "Provide liquidity and swap between assets in a liquidity pool.", live: "swap" },
      { key: "stake", title: "Stake", desc: "Stake assets into a pool to earn rewards and support the network.", live: "stake" },
      { key: "barter", title: "Barter", desc: "Propose direct asset-for-asset trades with another party.", live: "barter" },
      { key: "tfund_user", title: "Tunnel Fund (User)", desc: "Manage your participation in a tunnel fund as a user.", live: "tfund_user" },
    ],
  },
  {
    folder: "transfer",
    heading: "Transferring Funds",
    items: [
      { key: "transfer", title: "Transfer", desc: "Send assets to another account instantly.", live: "transfer" },
      { key: "timed_transfer", title: "Timed Transfer", desc: "Schedule a transfer to execute at a future time.", live: "timed_transfer" },
      { key: "withdraw_permissions", title: "Withdraw Permissions", desc: "Grant another account permission to withdraw from your balance.", live: "withdraw_permissions" },
      { key: "htlc", title: "HTLC", desc: "Create hashed timelock contract escrow transfers.", live: "htlc" },
      { key: "create_vesting", title: "Create Vesting", desc: "Lock assets in a vesting balance released over time.", live: "create_vesting" },
      { key: "blind_transfers", title: "Blind Transfers", desc: "Send confidential, privacy-preserving transfers.", live: "blind_transfers" },
      { key: "airdrop_calculate", title: "Airdrop Calculator", desc: "Compute and broadcast an airdrop distribution to many accounts.", live: "airdrop_calculate" },
    ],
  },
  {
    folder: "debt",
    heading: "Forms of Debt",
    items: [
      { key: "borrow", title: "Borrow", desc: "Borrow against collateral by creating a debt position.", live: "borrow" },
      { key: "lend", title: "Lend", desc: "Provide credit offers to let others borrow from you.", live: "lend" },
      { key: "smartcoins", title: "SmartCoins", desc: "Browse and interact with market-pegged smartcoins.", live: "smartcoins" },
      { key: "tfunds", title: "Tunnel Funds", desc: "Explore and manage tunnel fund markets.", live: "tfunds" },
    ],
  },
  {
    folder: "asset-creation",
    heading: "Asset Creation",
    items: [
      { key: "create_uia", title: "Create UIA", desc: "Issue a new user-issued asset with custom flags and permissions.", live: "create_uia" },
      { key: "create_smartcoin", title: "Create SmartCoin", desc: "Launch a new market-pegged asset backed by a basket of collateral.", live: "create_smartcoin" },
      { key: "create_liquidity_pool", title: "Create Liquidity Pool", desc: "Deploy a new liquidity pool for swapping assets.", live: "create_pool" },
    ],
  },
  {
    folder: "account",
    heading: "Account Overviews",
    items: [
      { key: "balances", title: "Portfolio Balances", desc: "View the asset balances held by an account.", live: "balances" },
      { key: "open-orders", title: "Open Orders", desc: "Track the active orders placed by an account.", live: "open-orders" },
      { key: "call-orders", title: "Call Orders", desc: "Inspect margin call orders on debt positions.", live: "call-orders" },
      { key: "custom_authorities", title: "Custom Authorities", desc: "Manage custom account authorities and restrictions.", live: "custom_authorities" },
      { key: "favourites", title: "Favourites", desc: "Quick-access list of your favourite accounts and markets.", live: "favourites" },
      { key: "issued_assets", title: "Issued Assets", desc: "Overview of assets issued by an account.", live: "issued_assets" },
      { key: "offers", title: "Credit Offers", desc: "Browse active credit offers in the marketplace.", live: "offers" },
      { key: "deals", title: "Credit Deals", desc: "Review completed credit deals and their history.", live: "deals" },
      { key: "vesting", title: "Vesting Balances", desc: "View vesting balances and their unlock schedules.", live: "vesting" },
      { key: "proposals", title: "Proposals", desc: "List and inspect account proposals awaiting approval.", live: "proposals" },
      { key: "recent-activity", title: "Recent Activity", desc: "Browse the latest on-chain operations for an account.", live: "recent-activity" },
    ],
  },
  {
    folder: "blockchain",
    heading: "Blockchain Overviews",
    items: [
      { key: "blocks", title: "Blocks", desc: "Explore recent blocks and their transactions.", live: "blocks" },
      { key: "custom_pool_overview", title: "Custom Pool Tracker", desc: "Track a custom liquidity pool and its performance.", live: "custom_pool_overview" },
      { key: "pools", title: "Pools", desc: "Browse all liquidity pools and their stats.", live: "pools" },
      { key: "top-markets", title: "Top Markets", desc: "The most actively traded markets on the DEX.", live: "top-markets" },
      { key: "top-pools", title: "Top Pools", desc: "The highest-volume liquidity pools.", live: "top-pools" },
    ],
  },
  {
    folder: "governance",
    heading: "Governance",
    items: [
      { key: "vote", title: "Vote", desc: "Cast votes for witnesses, committee and workers.", live: "vote" },
      { key: "witnesses", title: "Witnesses", desc: "Overview of active and standby witnesses.", live: "witnesses" },
      { key: "committee", title: "Committee", desc: "View committee members and their proposals.", live: "committee" },
      { key: "governance", title: "Governance", desc: "General governance dashboard and parameters.", live: "governance" },
      { key: "create_worker", title: "Create Worker", desc: "Propose a new worker to be funded by the blockchain.", live: "create_worker" },
      { key: "create_ticket", title: "Create Ticket", desc: "Open a support or funding ticket.", live: "create_ticket" },
      { key: "ticket_leaderboard", title: "Ticket Leaderboard", desc: "See the top-ranked tickets by votes and funding.", live: "ticket_leaderboard" },
    ],
  },
  {
    folder: "invoicing",
    heading: "Invoicing",
    items: [
      { key: "invoice_inventory", title: "Invoice Inventory", desc: "Manage your stored invoices.", live: "invoice_inventory" },
      { key: "create_invoice", title: "Create Invoice", desc: "Generate a new invoice to request payment.", live: "create_invoice" },
      { key: "pay_invoice", title: "Pay Invoice", desc: "Pay an outstanding invoice.", live: "pay_invoice" },
      { key: "stored_invoices", title: "Stored Invoices", desc: "Browse invoices saved in local storage.", live: "stored_invoices" },
    ],
  },
  {
    folder: "settings",
    heading: "Settings",
    items: [
      { key: "account_lists", title: "Account Lists", desc: "Manage named lists of accounts for batch actions.", live: "account_lists" },
      { key: "blocked-users", title: "Blocked Users", desc: "Maintain a list of blocked accounts.", live: "blocked-users" },
      { key: "ltm", title: "Lifetime Membership", desc: "Upgrade an account to lifetime member status.", live: "ltm" },
      { key: "nodes", title: "Nodes", desc: "Configure and switch the API nodes you connect to.", live: "nodes" },
      { key: "create_account", title: "Create Account", desc: "Register a new account on the blockchain.", live: "create_account" },
      { key: "visuals", title: "Configure Visuals", desc: "Customize the look and feel of the interface.", live: "visuals" },
      { key: "theme", title: "Theme Customizer", desc: "Build and apply custom color themes.", live: "theme" },
      { key: "page_themes", title: "Per-Page Themes", desc: "Assign specific themes to individual pages.", live: "page_themes" },
    ],
  },
];

function pageTemplate(section, item) {
  const liveHref = `/${item.live}/index.html`;
  return `---
title: ${item.title}
description: ${item.desc}
sidebar:
  order: ${item.order}
---

import { LinkCard, Card, CardGrid, Aside, Steps, Badge, Icon } from '@astrojs/starlight/components';

${item.title} lets you ${item.desc.charAt(0).toLowerCase() + item.desc.slice(1)}

<Aside type="tip" title="Open it live">
  Jump straight into the tool from the app:
</Aside>

<LinkCard
  title="${item.title}"
  description="Open the ${item.title} page in the application"
  href="${liveHref}"
/>

## Overview

<CardGrid>
  <Card title="What it does">
    ${item.desc}
  </Card>
  <Card title="Where to find it">
    Listed under <strong>${section.heading}</strong> on the homepage, or open it directly via the link above.
  </Card>
</CardGrid>

## How to use

<Steps>

1. Open the ${item.title} page from the homepage or the navigation bar.

2. Connect your account and select the relevant asset or market.

3. Review the inputs and confirm the transaction through your Beet wallet.

4. Check the result in the related overview page.

</Steps>

## Notes

<Badge text="Requires account" variant="note" /> <Badge text="On-chain action" variant="caution" />

<Aside type="caution" title="Test on testnet first">
  For any action that broadcasts a transaction, try it on the testnet before using mainnet funds.
</Aside>

## Related

- [Homepage](/index.html)
- [Documentation index](/docs/docs-index.html)
`;
}

function sectionIndexTemplate(section) {
  const cards = section.items
    .map(
      (i) =>
        `<LinkCard title="${i.title}" description="${i.desc}" href="/docs/${section.folder}/${i.file}/" />`,
    )
    .join("\n");
  return `---
title: ${section.heading}
description: Documentation for the ${section.heading} section of the app.
sidebar:
  order: ${section.order}
---

import { LinkCard, CardGrid } from '@astrojs/starlight/components';

Pages in the **${section.heading}** section:

<CardGrid>
${cards}
</CardGrid>
`;
}

let order = 1;
const sidebar = [];

for (const section of SECTIONS) {
  section.order = order++;
  const dir = join(DOCS_ROOT, section.folder);
  mkdirSync(dir, { recursive: true });

  // section index
  writeFileSync(join(dir, "index.mdx"), sectionIndexTemplate(section));

  const items = [];
  let pageOrder = 1;
  for (const item of section.items) {
    item.file = item.key;
    item.order = pageOrder++;
    const tmpl = pageTemplate(section, item);
    writeFileSync(join(dir, `${item.file}.mdx`), tmpl);
    items.push({
      label: item.title,
      link: `/docs/${section.folder}/${item.file}/`,
    });
  }

  sidebar.push({
    label: section.heading,
    items,
  });
}

// Emit sidebar snippet for astro.config.mjs
const sidebarSnippet = `sidebar: ${JSON.stringify(sidebar, null, 2)}`;
writeFileSync(join(__dirname, "docs-sidebar.json"), sidebarSnippet + "\n");

console.log("Generated", SECTIONS.reduce((n, s) => n + s.items.length + 1, 0), "mdx files");
console.log("Sidebar written to scripts/docs-sidebar.json");
