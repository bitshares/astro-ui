import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import {
  CopyIcon,
  ReloadIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  QuestionMarkCircledIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { createUserSearchStore } from "@/nanoeffects/UserSearch.ts";

import { $currentNode } from "@/stores/node.ts";
import { $currentUser } from "@/stores/users.ts";
import { debounce, copyToClipboard } from "@/lib/common";

import { UserPlus } from "lucide-react";

const CreateAccount = () => {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const usr = useStore($currentUser);

  const [method, setMethod] = useState("faucet");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [searched, setSearched] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const [accountCreated, setAccountCreated] = useState(false);

  const [loseAccessChecked, setLoseAccessChecked] = useState(false);
  const [noRecoveryChecked, setNoRecoveryChecked] = useState(false);
  const [writtenDownChecked, setWrittenDownChecked] = useState(false);

  const [deeplinkDialog, setDeeplinkDialog] = useState(false);
  const [passMode, setPassMode] = useState("show");

  const [itr, setItr] = useState(0);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  useEffect(() => {
    async function fetching() {
      let _key;
      try {
        _key = await window.electron.genKey();
      } catch (error) {
        console.log({ error });
        return;
      }

      setGeneratedPassword(("P" + _key).substring(0, 45));
    }

    fetching();
  }, [itr]);

  const checkUsernameAvailability = useCallback(
    debounce(async (username) => {
      if (usr && usr.chain && currentNode && username) {
        const usernameStore = createUserSearchStore([
          usr.chain,
          username,
          currentNode ? currentNode.url : null,
        ]);
        usernameStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setSearched(true);
          } else if (error) {
            console.log({ error });
            setUsernameAvailable();
            setSearched(false);
          }
        });
      }
    }, 1500),
    [usr, currentNode, username]
  );

  useEffect(() => {
    setSearched(false);
    setUsernameAvailable(null);
    setLoseAccessChecked(false);
    setNoRecoveryChecked(false);
    setWrittenDownChecked(false);
    setAccountCreated(false);
    //
    checkUsernameAvailability(username);
  }, [username, checkUsernameAvailability]);

  const [generatedAccountData, setGeneratedAccountData] = useState();
  useEffect(() => {
    async function generate() {
      let response;
      try {
        response = await window.electron.genAccount({
          userID: usr.id,
          username: username,
          password: password,
          method: method,
          nodeURL: currentNode ? currentNode.url : null,
        });
      } catch (error) {
        console.log({ error });
      }

      if (response) {
        setGeneratedAccountData(response);
      }
    }

    if (
      usr &&
      usr.id &&
      username &&
      password &&
      password === generatedPassword
    ) {
      generate();
    }
  }, [usr, username, password, generatedPassword, method]);

  const [faucetInProgress, setFaucetInProgress] = useState(false);
  //const [accountResponse, setAccountResponse] = useState();
  const faucetConfirm = async () => {
    setFaucetInProgress(true);
    let registeredAccount;
    try {
      registeredAccount = await window.electron.registerFaucetAccount({
        chain: usr.chain,
        bodyParameters: JSON.stringify(generatedAccountData),
      });
    } catch (error) {
      console.log({ error });
      window.electron.notify(t("CreateAccount:faucetError"));
    }
    setFaucetInProgress(false);

    if (registeredAccount) {
      setAccountCreated(true);
      console.log({ registeredAccount });
    }
  };

  const isFormValid =
    username &&
    username.length &&
    username.length < 64 &&
    username.split(".").length <= 2 &&
    !username.includes("--") &&
    !/[^a-zA-Z0-9-.]/.test(username) &&
    (method === "ltm" ||
      (method === "faucet" &&
        !isNaN(username[username.length - 1]) &&
        username[username.length - 1] !== ".")) &&
    password &&
    generatedPassword &&
    password === generatedPassword &&
    generatedAccountData &&
    loseAccessChecked &&
    noRecoveryChecked &&
    writtenDownChecked;

  return (
    <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4 text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-green-500" />
          <CardHeader className="pb-5">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 flex-shrink-0">
                <UserPlus className="h-5 w-5 text-emerald-400" />
              </span>
              {t("CreateAccount:createAccount")}
            </CardTitle>
            <CardDescription className="text-muted-foreground ml-11">
              {t("CreateAccount:description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:username")}
                </label>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                  className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60"
                />
                {username &&
                username.length &&
                searched &&
                (usernameAvailable === null || usernameAvailable === false) ? (
                  <p className="mt-2 text-sm text-rose-400">
                    {t("CreateAccount:usernameUnavailable")}
                  </p>
                ) : null}
                {username &&
                username.length &&
                (username.length > 63 ||
                  (method === "faucet" &&
                    isNaN(username[username.length - 1])) ||
                  username[username.length - 1] === "." ||
                  username.includes("--") ||
                  username.split(".").length > 2 ||
                  /[^a-zA-Z0-9-.]/.test(username)) ? (
                  <p className="mt-2 text-sm text-rose-400">
                    {t("CreateAccount:invalidUsername")}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/70 flex items-center mb-1.5">
                  {t("CreateAccount:generatedPassword")}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <QuestionMarkCircledIcon className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-card border-border text-foreground text-sm">
                      <p className="text-foreground/70">{t("CreateAccount:genPassAbout")}</p>
                    </HoverCardContent>
                  </HoverCard>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4 md:col-span-3">
                    <Input
                      type={passMode === "hide" ? "password" : "text"}
                      value={generatedPassword}
                      disabled
                      className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground disabled:opacity-60"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        setPassMode(passMode === "show" ? "hide" : "show");
                      }}
                    >
                      {passMode === "hide" ? (
                        <EyeClosedIcon className="h-4 w-4" />
                      ) : (
                        <EyeOpenIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        copyToClipboard(generatedPassword);
                      }}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border text-muted-foreground hover:bg-accent/60"
                      onClick={() => {
                        setItr(itr + 1);
                      }}
                    >
                      <ReloadIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:confirmPasswordTitle")}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                  {t("CreateAccount:method")}
                </label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value)}
                >
                  <SelectTrigger className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground/70">
                    <SelectValue className="text-foreground/70" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border shadow-2xl dark:shadow-black/40 shadow-black/15">
                    <SelectGroup>
                      <SelectItem value="faucet" className="text-foreground/70 focus:bg-accent focus:text-accent-foreground">
                        {t("CreateAccount:faucetMethod")}
                      </SelectItem>
                      <SelectItem value="ltm" className="text-foreground/70 focus:bg-accent focus:text-accent-foreground">
                        {t("CreateAccount:ltmMethod")}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: "checkbox1", checked: loseAccessChecked, set: setLoseAccessChecked, label: t("CreateAccount:loseAccess") },
                  { id: "checkbox2", checked: noRecoveryChecked, set: setNoRecoveryChecked, label: t("CreateAccount:noRecovery") },
                  { id: "checkbox3", checked: writtenDownChecked, set: setWrittenDownChecked, label: t("CreateAccount:writtenDown") },
                ].map(({ id, checked, set, label }) => (
                  <div key={id} className="flex items-center">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onClick={() => set(!checked)}
                      className="border-foreground/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <label htmlFor={id} className="ml-2 mb-0 text-sm text-foreground/70">
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {isFormValid ? (
                  <>
                    {method === "ltm" && !deeplinkDialog ? (
                      <Button
                        onClick={() => setDeeplinkDialog(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-foreground"
                      >
                        {t("CreateAccount:generateDeeplink")}
                      </Button>
                    ) : null}
                    {method === "faucet" ? (
                      <Button onClick={faucetConfirm} className="bg-emerald-600 hover:bg-emerald-500 text-foreground">
                        {t("CreateAccount:submit")}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button className="bg-accent/40 text-muted-foreground" disabled>
                    {t("CreateAccount:submit")}
                  </Button>
                )}
              </div>
            </div>
            {accountCreated ? (
              <p className="mt-4 text-emerald-400 text-sm">{t("CreateAccount:accountCreated")}</p>
            ) : null}
            {faucetInProgress ? (
              <p className="mt-4 text-muted-foreground text-sm">{t("CreateAccount:faucetInProgress")}</p>
            ) : null}
          </CardContent>
        </Card>
        {method === "ltm" && deeplinkDialog && generatedAccountData ? (
          <DeepLinkDialog
            operationNames={["account_create"]}
            username={usr && usr.username ? usr.username : ""}
            usrChain={usr && usr.chain ? usr.chain : "bitshares"}
            userID={usr.id}
            dismissCallback={setDeeplinkDialog}
            key={`creatingAccount${method}${username}`}
            headerText={t("CreateAccount:deeplinkHeaderText")}
            trxJSON={[generatedAccountData]}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CreateAccount;
