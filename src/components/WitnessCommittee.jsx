import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Shield, Users, Eye, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts"; // To fetch witness/committee details if needed

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";

/**
 * GovernanceActions component enables users to register or update their
 * status as a Bitshares witness or committee member.
 */
export default function GovernanceActions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const { _globalParamsBTS, _globalParamsTEST } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  // State for Witness actions
  const [witnessUrl, setWitnessUrl] = useState("");
  const [witnessSigningKey, setWitnessSigningKey] = useState("");
  const [newWitnessUrl, setNewWitnessUrl] = useState("");
  const [newWitnessSigningKey, setNewWitnessSigningKey] = useState("");

  // State for Committee actions
  const [committeeUrl, setCommitteeUrl] = useState("");
  const [newCommitteeUrl, setNewCommitteeUrl] = useState("");

  // State to track existing witness/committee status
  const [witnessData, setWitnessData] = useState(null);
  const [committeeData, setCommitteeData] = useState(null);

  // State for deeplink dialogs
  const [showWitnessCreateDialog, setShowWitnessCreateDialog] = useState(false);
  const [showWitnessUpdateDialog, setShowWitnessUpdateDialog] = useState(false);
  const [showCommitteeCreateDialog, setShowCommitteeCreateDialog] =
    useState(false);
  const [showCommitteeUpdateDialog, setShowCommitteeUpdateDialog] =
    useState(false);

  // Fetch witness and committee member objects associated with the current user
  useEffect(() => {
    if (!usr || !usr.id || !currentNode) return;

    async function fetchWitnessAndCommittee() {
      const witnessStore = createObjectStore([
        usr.chain,
        JSON.stringify([`1.6.${usr.id.split(".")[2]}`]), // Assuming witness ID format 1.6.x from account ID 1.2.x
        currentNode.url,
      ]);

      witnessStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading && data[0]) {
          setWitnessData(data[0]);
          setNewWitnessUrl(data[0].url); // Pre-fill update form
          setNewWitnessSigningKey(data[0].signing_key); // Pre-fill update form
        } else {
          setWitnessData(null); // Reset if not found or error
        }
      });

      const committeeStore = createObjectStore([
        usr.chain,
        JSON.stringify([`1.5.${usr.id.split(".")[2]}`]), // Assuming committee ID format 1.5.x from account ID 1.2.x
        currentNode.url,
      ]);

      committeeStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading && data[0]) {
          setCommitteeData(data[0]);
          setNewCommitteeUrl(data[0].url); // Pre-fill update form
        } else {
          setCommitteeData(null); // Reset if not found or error
        }
      });
    }

    fetchWitnessAndCommittee();
  }, [usr, currentNode]);

  // Transaction JSON builders
  const witnessCreateTrx = useMemo(
    () => ({
      fee: { amount: 0, asset_id: "1.3.0" },
      witness_account: usr?.id ?? "1.2.x",
      url: witnessUrl,
      block_signing_key: witnessSigningKey,
      extensions: [],
    }),
    [usr, witnessUrl, witnessSigningKey]
  );

  const witnessUpdateTrx = useMemo(
    () => ({
      fee: { amount: 0, asset_id: "1.3.0" },
      witness: witnessData?.id ?? "1.6.x",
      witness_account: usr?.id ?? "1.2.x",
      new_url: newWitnessUrl,
      new_signing_key: newWitnessSigningKey,
      extensions: [],
    }),
    [usr, witnessData, newWitnessUrl, newWitnessSigningKey]
  );

  const committeeCreateTrx = useMemo(
    () => ({
      fee: { amount: 0, asset_id: "1.3.0" },
      committee_member_account: usr?.id ?? "1.2.x",
      url: committeeUrl,
      extensions: [],
    }),
    [usr, committeeUrl]
  );

  const committeeUpdateTrx = useMemo(
    () => ({
      fee: { amount: 0, asset_id: "1.3.0" },
      committee_member: committeeData?.id ?? "1.5.x",
      committee_member_account: usr?.id ?? "1.2.x",
      new_url: newCommitteeUrl,
      extensions: [],
    }),
    [usr, committeeData, newCommitteeUrl]
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-indigo-950/20">
          <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 blur-3xl" />
          <div className="h-1 w-full bg-gradient-to-r from-indigo-400/70 via-violet-400/70 to-indigo-400/70" />
          <CardHeader className="pb-0">
            <CardTitle className="text-lg bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              {t("GovernanceActions:title")}
            </CardTitle>
            <CardDescription>{t("GovernanceActions:description")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="relative overflow-hidden border-indigo-500/15 bg-card/60 backdrop-blur-xl shadow-md shadow-indigo-950/10">
                <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 blur-3xl" />
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-400/50 via-cyan-400/50 to-indigo-400/50" />
                <CardHeader className="pb-0">
                  <CardTitle className="text-base bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-500" />
                    {t("GovernanceActions:witnessActions")}
                  </CardTitle>
                  <CardDescription>{t("GovernanceActions:witnessDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {!witnessData ? (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                      <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {t("GovernanceActions:registerWitness")}
                      </h3>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:urlInfo")}
                          header={t("GovernanceActions:urlInfoHeader")}
                        />
                        <Input
                          id="witnessUrl"
                          placeholder="https://your-witness-info.com"
                          value={witnessUrl}
                          onChange={(e) => setWitnessUrl(e.target.value)}
                          className="border-indigo-500/20 bg-card/60 focus-visible:ring-indigo-400/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:signingKeyInfo")}
                          header={t("GovernanceActions:signingKeyInfoHeader")}
                        />
                        <Input
                          id="witnessSigningKey"
                          placeholder="BTS..."
                          value={witnessSigningKey}
                          onChange={(e) => setWitnessSigningKey(e.target.value)}
                          className="border-indigo-500/20 bg-card/60 focus-visible:ring-indigo-400/40"
                        />
                      </div>
                      <Button
                        onClick={() => setShowWitnessCreateDialog(true)}
                        disabled={!witnessUrl || !witnessSigningKey}
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/40 active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        {t("GovernanceActions:registerWitnessButton")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {t("GovernanceActions:updateWitness")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {witnessData
                          ? t("GovernanceActions:currentWitnessInfo", {
                              witnessId: witnessData.id,
                            })
                          : t("GovernanceActions:notCurrentlyWitness")}
                      </p>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:newUrlInfo")}
                          header={t("GovernanceActions:newUrlInfoHeader")}
                        />
                        <Input
                          id="newWitnessUrl"
                          placeholder="https://your-new-witness-info.com"
                          value={newWitnessUrl}
                          onChange={(e) => setNewWitnessUrl(e.target.value)}
                          disabled={!witnessData}
                          className="border-indigo-500/20 bg-card/60 focus-visible:ring-indigo-400/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:newSigningKeyInfo")}
                          header={t("GovernanceActions:newSigningKeyInfoHeader")}
                        />
                        <Input
                          id="newWitnessSigningKey"
                          placeholder="BTS..."
                          value={newWitnessSigningKey}
                          onChange={(e) => setNewWitnessSigningKey(e.target.value)}
                          disabled={!witnessData}
                          className="border-indigo-500/20 bg-card/60 focus-visible:ring-indigo-400/40"
                        />
                      </div>
                      <Button
                        onClick={() => setShowWitnessUpdateDialog(true)}
                        disabled={
                          !witnessData ||
                          (!newWitnessUrl && !newWitnessSigningKey)
                        }
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/40 active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        {t("GovernanceActions:updateWitnessButton")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-violet-500/15 bg-card/60 backdrop-blur-xl shadow-md shadow-violet-950/10">
                <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/15 to-purple-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/15 to-violet-500/15 blur-3xl" />
                <div className="h-0.5 w-full bg-gradient-to-r from-violet-400/50 via-purple-400/50 to-violet-400/50" />
                <CardHeader className="pb-0">
                  <CardTitle className="text-base bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-500" />
                    {t("GovernanceActions:committeeActions")}
                  </CardTitle>
                  <CardDescription>{t("GovernanceActions:committeeDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {!committeeData ? (
                    <>
                      <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                      <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {t("GovernanceActions:registerCommittee")}
                      </h3>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:urlInfo")}
                          header={t("GovernanceActions:urlInfoHeader")}
                        />
                        <Input
                          id="committeeUrl"
                          placeholder="https://your-committee-info.com"
                          value={committeeUrl}
                          onChange={(e) => setCommitteeUrl(e.target.value)}
                          className="border-violet-500/20 bg-card/60 focus-visible:ring-violet-400/40"
                        />
                      </div>
                      <Button
                        onClick={() => setShowCommitteeCreateDialog(true)}
                        disabled={!committeeUrl}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/20 hover:from-violet-400 hover:to-purple-400 hover:shadow-violet-500/40 active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        {t("GovernanceActions:registerCommitteeButton")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {t("GovernanceActions:updateCommittee")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {committeeData
                          ? t("GovernanceActions:currentCommitteeInfo", {
                              committeeId: committeeData.id,
                            })
                          : t("GovernanceActions:notCurrentlyCommittee")}
                      </p>
                      <div className="space-y-2">
                        <HoverInfo
                          content={t("GovernanceActions:newUrlInfo")}
                          header={t("GovernanceActions:newUrlInfoHeader")}
                        />
                        <Input
                          id="newCommitteeUrl"
                          placeholder="https://your-new-committee-info.com"
                          value={newCommitteeUrl}
                          onChange={(e) => setNewCommitteeUrl(e.target.value)}
                          disabled={!committeeData}
                          className="border-violet-500/20 bg-card/60 focus-visible:ring-violet-400/40"
                        />
                      </div>
                      <Button
                        onClick={() => setShowCommitteeUpdateDialog(true)}
                        disabled={!committeeData || !newCommitteeUrl}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/20 hover:from-violet-400 hover:to-purple-400 hover:shadow-violet-500/40 active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        {t("GovernanceActions:updateCommitteeButton")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {showWitnessCreateDialog && usr ? (
        <DeepLinkDialog
          operationNames={["witness_create"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowWitnessCreateDialog}
          key={`WitnessCreate_${usr.id}`}
          headerText={t("GovernanceActions:witnessCreateHeader")}
          trxJSON={[witnessCreateTrx]}
        />
      ) : null}

      {showWitnessUpdateDialog && usr ? (
        <DeepLinkDialog
          operationNames={["witness_update"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowWitnessUpdateDialog}
          key={`WitnessUpdate_${witnessData?.id}`}
          headerText={t("GovernanceActions:witnessUpdateHeader")}
          trxJSON={[witnessUpdateTrx]}
        />
      ) : null}

      {showCommitteeCreateDialog && usr ? (
        <DeepLinkDialog
          operationNames={["committee_member_create"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowCommitteeCreateDialog}
          key={`CommitteeCreate_${usr.id}`}
          headerText={t("GovernanceActions:committeeCreateHeader")}
          trxJSON={[committeeCreateTrx]}
        />
      ) : null}

      {showCommitteeUpdateDialog && usr ? (
        <DeepLinkDialog
          operationNames={["committee_member_update"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={setShowCommitteeUpdateDialog}
          key={`CommitteeUpdate_${committeeData?.id}`}
          headerText={t("GovernanceActions:committeeUpdateHeader")}
          trxJSON={[committeeUpdateTrx]}
        />
      ) : null}
    </>
  );
}
