import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import starlight from "@astrojs/starlight";

export default defineConfig({
  outDir: "./astroDist",
  publicDir: './src/data',
  build: { format: 'file' },
  integrations: [
    react(),
    starlight({
      title: 'Bitshares Astro UI Docs',
      sidebar: [
        { label: 'Overview', slug: 'docs/docs-index' },
        {
          label: 'Exchanging Funds',
          items: [
            { label: 'DEX', link: '/docs/exchanging/dex/' },
            { label: 'Instant Trade', link: '/docs/exchanging/instant_trade/' },
            { label: 'Swap', link: '/docs/exchanging/swap/' },
            { label: 'Stake', link: '/docs/exchanging/stake/' },
            { label: 'Barter', link: '/docs/exchanging/barter/' },
            { label: 'Tunnel Fund (User)', link: '/docs/exchanging/tfund_user/' },
          ],
        },
        {
          label: 'Transferring Funds',
          items: [
            { label: 'Transfer', link: '/docs/transfer/transfer/' },
            { label: 'Timed Transfer', link: '/docs/transfer/timed_transfer/' },
            { label: 'Withdraw Permissions', link: '/docs/transfer/withdraw_permissions/' },
            { label: 'HTLC', link: '/docs/transfer/htlc/' },
            { label: 'Create Vesting', link: '/docs/transfer/create_vesting/' },
            { label: 'Blind Transfers', link: '/docs/transfer/blind_transfers/' },
            { label: 'Airdrop Calculator', link: '/docs/transfer/airdrop_calculate/' },
          ],
        },
        {
          label: 'Forms of Debt',
          items: [
            { label: 'Borrow', link: '/docs/debt/borrow/' },
            { label: 'Lend', link: '/docs/debt/lend/' },
            { label: 'SmartCoins', link: '/docs/debt/smartcoins/' },
            { label: 'Tunnel Funds', link: '/docs/debt/tfunds/' },
          ],
        },
        {
          label: 'Asset Creation',
          items: [
            { label: 'Create UIA', link: '/docs/asset-creation/create_uia/' },
            { label: 'Create SmartCoin', link: '/docs/asset-creation/create_smartcoin/' },
            { label: 'Create Liquidity Pool', link: '/docs/asset-creation/create_liquidity_pool/' },
          ],
        },
        {
          label: 'Account Overviews',
          items: [
            { label: 'Portfolio Balances', link: '/docs/account/balances/' },
            { label: 'Open Orders', link: '/docs/account/open-orders/' },
            { label: 'Call Orders', link: '/docs/account/call-orders/' },
            { label: 'Custom Authorities', link: '/docs/account/custom_authorities/' },
            { label: 'Favourites', link: '/docs/account/favourites/' },
            { label: 'Issued Assets', link: '/docs/account/issued_assets/' },
            { label: 'Credit Offers', link: '/docs/account/offers/' },
            { label: 'Credit Deals', link: '/docs/account/deals/' },
            { label: 'Vesting Balances', link: '/docs/account/vesting/' },
            { label: 'Proposals', link: '/docs/account/proposals/' },
            { label: 'Recent Activity', link: '/docs/account/recent-activity/' },
          ],
        },
        {
          label: 'Blockchain Overviews',
          items: [
            { label: 'Blocks', link: '/docs/blockchain/blocks/' },
            { label: 'Custom Pool Tracker', link: '/docs/blockchain/custom_pool_overview/' },
            { label: 'Pools', link: '/docs/blockchain/pools/' },
            { label: 'Top Markets', link: '/docs/blockchain/top-markets/' },
            { label: 'Top Pools', link: '/docs/blockchain/top-pools/' },
          ],
        },
        {
          label: 'Governance',
          items: [
            { label: 'Vote', link: '/docs/governance/vote/' },
            { label: 'Witnesses', link: '/docs/governance/witnesses/' },
            { label: 'Committee', link: '/docs/governance/committee/' },
            { label: 'Governance', link: '/docs/governance/governance/' },
            { label: 'Create Worker', link: '/docs/governance/create_worker/' },
            { label: 'Create Ticket', link: '/docs/governance/create_ticket/' },
            { label: 'Ticket Leaderboard', link: '/docs/governance/ticket_leaderboard/' },
          ],
        },
        {
          label: 'Invoicing',
          items: [
            { label: 'Invoice Inventory', link: '/docs/invoicing/invoice_inventory/' },
            { label: 'Create Invoice', link: '/docs/invoicing/create_invoice/' },
            { label: 'Pay Invoice', link: '/docs/invoicing/pay_invoice/' },
            { label: 'Stored Invoices', link: '/docs/invoicing/stored_invoices/' },
          ],
        },
        {
          label: 'Settings',
          items: [
            { label: 'Account Lists', link: '/docs/settings/account_lists/' },
            { label: 'Blocked Users', link: '/docs/settings/blocked-users/' },
            { label: 'Lifetime Membership', link: '/docs/settings/ltm/' },
            { label: 'Nodes', link: '/docs/settings/nodes/' },
            { label: 'Create Account', link: '/docs/settings/create_account/' },
            { label: 'Configure Visuals', link: '/docs/settings/visuals/' },
            { label: 'Theme Customizer', link: '/docs/settings/theme/' },
            { label: 'Per-Page Themes', link: '/docs/settings/page_themes/' },
          ],
        },
      ],
    })
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});