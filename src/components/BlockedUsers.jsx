import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";

import { Ban, ShieldOff, Trash2, UserX, Plus } from "lucide-react";

import {
  $blockList,
  $userBlockList,
  addBlockedUser,
  removeBlockedUser,
} from "@/stores/blocklist.ts";

import { $currentUser } from "@/stores/users.ts";

import AccountSearch from "@/components/AccountSearch.jsx";

function RemoveButton({ onClick, label }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function BlockedUsers() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );

  const userBlockList = useSyncExternalStore(
    $userBlockList.subscribe,
    $userBlockList.get,
    () => true
  );

  const currentUser = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const _chain = useMemo(() => {
    if (currentUser && currentUser.chain) return currentUser.chain;
    return "bitshares";
  }, [currentUser]);

  const committeeCount = useMemo(() => {
    if (!blocklist || !blocklist.users) return 0;
    return blocklist.users.length;
  }, [blocklist]);

  const chainUserBlockList = useMemo(() => {
    if (!userBlockList) return [];
    return userBlockList[_chain] ?? [];
  }, [userBlockList, _chain]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState();

  useEffect(() => {
    if (!selectedUser) return;
    addBlockedUser(_chain, { name: selectedUser.name, id: selectedUser.id });
    setSelectedUser(undefined);
    setAddDialogOpen(false);
  }, [selectedUser, _chain]);

  const renderCard = (item, style) => {
    if (!item) return null;
    return (
      <Card className="mb-2 bg-card/60 border-border hover:bg-accent/30 hover:border-border transition-all rounded-xl">
        <CardHeader className="px-4 py-3 flex flex-row items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm text-foreground truncate">
              <span className="font-semibold">{item.name}</span>
              <span className="ml-2 text-xs font-mono font-normal text-muted-foreground/60">
                {item.id}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <RemoveButton
              onClick={() => removeBlockedUser(_chain, item)}
              label={t("Blocklist:remove")}
            />
          </div>
        </CardHeader>
      </Card>
    );
  };

  const Row = ({ index, style }) => {
    const item = chainUserBlockList[index];
    return <div style={{ ...style, paddingRight: "10px" }}>{renderCard(item, style)}</div>;
  };

  return (
    <div className="container mx-auto mt-5 mb-10 max-w-4xl text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-danger))]" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                <ShieldOff className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
              </span>
              {t("Blocklist:committeeHeader")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 ml-11">
              {t("Blocklist:committeeCount", { count: committeeCount })}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("Blocklist:committeeDescription")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-danger))]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--accent-1)/0.15)] flex-shrink-0">
                    <Ban className="h-5 w-5 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("Blocklist:usersHeader")}
                </CardTitle>
                {chainUserBlockList && chainUserBlockList.length ? (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-11">
                    {chainUserBlockList.length}
                  </p>
                ) : null}
              </div>
              <Dialog
                open={addDialogOpen}
                onOpenChange={(open) => setAddDialogOpen(open)}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {t("Blocklist:addUser")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)]">
                        <UserX className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                      </div>
                      <div>
                        <DialogTitle>{t("Blocklist:addUserDialogTitle")}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          {t("Blocklist:addUserDialogDescription")}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <AccountSearch
                    chain={_chain}
                    excludedUsers={[]}
                    setChosenAccount={setSelectedUser}
                    skipCheck={true}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {chainUserBlockList && chainUserBlockList.length ? (
              <>
                <div className="w-full max-h-[420px] overflow-auto block md:hidden">
                  <List
                    rowComponent={Row}
                    rowCount={chainUserBlockList.length}
                    rowHeight={88}
                    rowProps={{}}
                  />
                </div>
                <div className="w-full max-h-[420px] overflow-auto hidden md:block">
                  <List
                    rowComponent={Row}
                    rowCount={chainUserBlockList.length}
                    rowHeight={72}
                    rowProps={{}}
                  />
                </div>
              </>
            ) : (
              <Empty className="mt-2 border border-border/60 rounded-xl bg-accent/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
                    <Ban className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground/80">{t("Blocklist:usersEmptyTitle")}</EmptyTitle>
                  <EmptyDescription className="text-muted-foreground">
                    {t("Blocklist:usersEmptyDescription")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
