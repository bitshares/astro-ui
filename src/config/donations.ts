/**
 * Shared constants for the "Monthly Referrer" donation reward feature.
 *
 * The top BTS donor to {@link DONATIONS_TARGET_NAME} over a rolling 30-day
 * window becomes the referrer/registrar for new accounts created through this
 * application (faucet method).  When no donations exist in the window, the
 * referrer falls back to {@link DONATIONS_DEFAULT_REFERRER_ID}.
 *
 * @module donations
 */

const DONATIONS_TARGET_NAME = "nft.artist";
const DONATIONS_TARGET_ID = "1.2.1804072";
/** User-facing label for the donation recipient (kept generic/aloof). */
const DONATIONS_TARGET_LABEL = "the creator of this application";

const DONATIONS_DEFAULT_REFERRER_ID = "1.2.1803677";
const DONATIONS_DEFAULT_REFERRER_NAME = "nftprofessional1";

/** Null-account used as fallback referrer on testnet. */
const DONATIONS_TESTNET_REFERRER_ID = "1.2.3";
const DONATIONS_TESTNET_REFERRER_NAME = "null-account";

const DONATIONS_ASSET_ID = "1.3.0";
const DONATIONS_ASSET_SYMBOL = "BTS";
const DONATIONS_ASSET_PRECISION = 8;

const DONATIONS_LIMIT = 100;
const DONATIONS_TOP_LIMIT = 1;
const DONATIONS_LOOKBACK_DAYS = 30;

export {
  DONATIONS_TARGET_NAME,
  DONATIONS_TARGET_ID,
  DONATIONS_TARGET_LABEL,
  DONATIONS_DEFAULT_REFERRER_ID,
  DONATIONS_DEFAULT_REFERRER_NAME,
  DONATIONS_TESTNET_REFERRER_ID,
  DONATIONS_TESTNET_REFERRER_NAME,
  DONATIONS_ASSET_ID,
  DONATIONS_ASSET_SYMBOL,
  DONATIONS_ASSET_PRECISION,
  DONATIONS_LIMIT,
  DONATIONS_TOP_LIMIT,
  DONATIONS_LOOKBACK_DAYS,
};