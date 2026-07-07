import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import {
  WhitelistAuthorityRow,
  BlacklistAuthorityRow,
} from "./AuthorityRow.jsx";

export default function AuthorityListsSection({
  flagWhiteList,
  whitelistAuthorities,
  setWhitelistAuthorities,
  blacklistAuthorities,
  setBlacklistAuthorities,
  whitelistAuthorityDialogOpen,
  setWhitelistAuthorityDialogOpen,
  blacklistAuthorityDialogOpen,
  setBlacklistAuthorityDialogOpen,
  usr,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  if (!flagWhiteList) return null;

  return (
    <>
      <div className="col-span-2 mb-3">
        <HoverInfo
          content={t("AssetCommon:whitelist.header_content")}
          header={t("AssetCommon:whitelist.header")}
          type="header"
        />
        <div className="grid grid-cols-12 mt-1">
          <span className="col-span-9 border border-border rounded">
            <div className="w-full max-h-[210px] overflow-auto">
              <List
                rowComponent={WhitelistAuthorityRow}
                rowCount={whitelistAuthorities.length}
                rowHeight={100}
                rowProps={{
                  items: whitelistAuthorities,
                  onRemove: (id) => {
                    setWhitelistAuthorities(
                      whitelistAuthorities.filter((x) => x.id !== id)
                    );
                  },
                }}
              />
            </div>
          </span>
          <span className="col-span-3 ml-3 text-center">
            <Dialog
              open={whitelistAuthorityDialogOpen}
              onOpenChange={(open) => {
                setWhitelistAuthorityDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-3 mt-1">
                  ➕ {t("CreditOfferEditor:addUser")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[375px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {!usr || !usr.chain
                      ? t("Transfer:bitsharesAccountSearch")
                      : null}
                    {usr && usr.chain === "bitshares"
                      ? t("Transfer:bitsharesAccountSearchBTS")
                      : null}
                    {usr && usr.chain !== "bitshares"
                      ? t("Transfer:bitsharesAccountSearchTEST")
                      : null}
                  </DialogTitle>
                </DialogHeader>
                <AccountSearch
                  chain={usr && usr.chain ? usr.chain : "bitshares"}
                  excludedUsers={
                    usr && usr.username && usr.username.length
                      ? [usr]
                      : []
                  }
                  setChosenAccount={(_account) => {
                    if (
                      _account &&
                      !whitelistAuthorities.find(
                        (_usr) => _usr.id === _account.id
                      )
                    ) {
                      setWhitelistAuthorities(
                        whitelistAuthorities &&
                          whitelistAuthorities.length
                          ? [...whitelistAuthorities, _account]
                          : [_account]
                      );
                    }
                    setWhitelistAuthorityDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </span>
        </div>
      </div>

      <div className="col-span-2 mb-3">
        <HoverInfo
          content={t("AssetCommon:blacklist.header_content")}
          header={t("AssetCommon:blacklist.header")}
          type="header"
        />
        <div className="grid grid-cols-12 mt-1">
          <span className="col-span-9 border border-border rounded">
            <div className="w-full max-h-[210px] overflow-auto">
              <List
                rowComponent={BlacklistAuthorityRow}
                rowCount={blacklistAuthorities.length}
                rowHeight={75}
                rowProps={{
                  items: blacklistAuthorities,
                  onRemove: (id) => {
                    setBlacklistAuthorities(
                      blacklistAuthorities.filter((x) => x.id !== id)
                    );
                  },
                }}
              />
            </div>
          </span>
          <span className="col-span-3 ml-3 text-center">
            <Dialog
              open={blacklistAuthorityDialogOpen}
              onOpenChange={(open) => {
                setBlacklistAuthorityDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-3 mt-1">
                  ➕ {t("CreditOfferEditor:addUser")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[375px] bg-card">
                <DialogHeader>
                  <DialogTitle>
                    {!usr || !usr.chain
                      ? t("Transfer:bitsharesAccountSearch")
                      : null}
                    {usr && usr.chain === "bitshares"
                      ? t("Transfer:bitsharesAccountSearchBTS")
                      : null}
                    {usr && usr.chain !== "bitshares"
                      ? t("Transfer:bitsharesAccountSearchTEST")
                      : null}
                  </DialogTitle>
                </DialogHeader>
                <AccountSearch
                  chain={usr && usr.chain ? usr.chain : "bitshares"}
                  excludedUsers={
                    usr && usr.username && usr.username.length
                      ? [usr]
                      : []
                  }
                  setChosenAccount={(_account) => {
                    if (
                      _account &&
                      !blacklistAuthorities.find(
                        (_usr) => _usr.id === _account.id
                      )
                    ) {
                      setBlacklistAuthorities(
                        blacklistAuthorities &&
                          blacklistAuthorities.length
                          ? [...blacklistAuthorities, _account]
                          : [_account]
                      );
                    }
                    setBlacklistAuthorityDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </span>
        </div>
      </div>
    </>
  );
}
