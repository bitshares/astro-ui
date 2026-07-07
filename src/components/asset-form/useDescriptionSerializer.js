import { useMemo } from "react";

/**
 * Custom hook that serializes the asset description JSON string,
 * including NFT metadata when enabled.
 *
 * @param {Object} options
 * @param {string} options.desc - Main description text
 * @param {string} options.shortName - Short name
 * @param {string} options.market - Preferred market symbol
 * @param {boolean} options.enabledNFT - Whether NFT fields are enabled
 * @param {Object} options.nftFields - All NFT metadata fields
 * @param {Array} options.nftMedia - Array of { url, type } media entries
 * @returns {string} JSON string of the description
 */
export function useDescriptionSerializer({
  desc,
  shortName,
  market,
  enabledNFT,
  nftFields = {},
  nftMedia = [],
}) {
  return useMemo(() => {
    let _description = { main: desc, short_name: shortName, market };

    if (enabledNFT) {
      const {
        acknowledgements = "",
        artist = "",
        attestation = "",
        holderLicense = "",
        license = "",
        narrative = "",
        title = "",
        tags = "",
        type = "",
      } = nftFields;

      const nft_object = {
        acknowledgements,
        artist,
        attestation,
        encoding: "ipfs",
        holder_license: holderLicense,
        license,
        narrative,
        title,
        tags,
        type,
      };

      nftMedia.forEach((image) => {
        const imageType = image.type;
        if (!nft_object[`media_${imageType}_multihash`]) {
          nft_object[`media_${imageType}_multihash`] = image.url;
        }

        const sameTypeFiles = nftMedia.filter((img) => img.type === imageType);
        if (sameTypeFiles && sameTypeFiles.length > 1) {
          if (!nft_object[`media_${imageType}_multihashes`]) {
            nft_object[`media_${imageType}_multihashes`] = [
              { url: image.url },
            ];
          } else {
            nft_object[`media_${imageType}_multihashes`].push({
              url: image.url,
            });
          }
        }
      });

      _description["nft_object"] = nft_object;
    }

    return JSON.stringify(_description);
  }, [
    desc,
    shortName,
    market,
    enabledNFT,
    nftFields.acknowledgements,
    nftFields.artist,
    nftFields.attestation,
    nftFields.holderLicense,
    nftFields.license,
    nftFields.narrative,
    nftFields.title,
    nftFields.tags,
    nftFields.type,
    nftMedia,
  ]);
}
