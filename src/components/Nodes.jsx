import React, { useState, useEffect, useSyncExternalStore } from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { useInitCache } from "@/nanoeffects/Init.ts";

import {
  $currentNode,
  $nodes,
  setCurrentNode,
  updateNodes,
} from "@/stores/node";
import { $currentUser } from "@/stores/users.ts";
import { chains } from "@/config/chains";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Server } from "lucide-react";

export default function Nodes(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const nodes = useStore($nodes);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [inputURL, setInputURL] = useState("");

  const NodeRow = ({ index, style }) => {
    const [open, setOpen] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState(null);
    // attempt is bumped to re-run the ping (used by Retry)
    const [attempt, setAttempt] = useState(0);

    const nodeUrl = nodes[usr.chain][index].url;

    useEffect(() => {
      let cancelled = false;

      async function runPing() {
        if (!open) return;
        setPinging(true);
        setPingResult(null);

        // Use async/await to call the preload bridge (backend handles timeout)
        try {
          let res;
          if (window?.electron?.ping) {
            // backend should resolve with { ok: true, ms } on success
            // or { ok: false, error: "timeout" } on timeout
            res = await window.electron.ping(nodeUrl);
          } else {
            res = { ok: false, error: "no_bridge" };
          }

          if (cancelled) return;
          setPingResult(res);
        } catch (err) {
          if (cancelled) return;
          setPingResult({ ok: false, error: err?.message || String(err) });
        } finally {
          if (!cancelled) setPinging(false);
        }
      }

      runPing();

      return () => {
        cancelled = true;
      };
    }, [open, index, attempt]);

    // retry is disabled only while a ping is in progress (handled by `pinging`)
    return (
      <div style={{ ...style }} key={`acard-${index}`}>
        <Card className="ml-2 mr-2">
          <CardHeader
            className={`pb-0 pt-0 ${index === 0 ? "bg-[hsl(var(--accent-success))] dark:bg-[hsl(var(--accent-success)/0.15)]" : ""}`}
          >
            <CardTitle>
              <div className={`grid grid-cols-4 gap-2 items-center mt-0 pt-0`}>
                <div className="col-span-4 md:col-span-3">
                  {nodes[usr.chain][index].url}
                </div>
                <div className="col-span-4 md:col-span-1 text-right flex items-center justify-end">
                  <Button
                    className="mr-2"
                    variant="none"
                    onClick={() => {
                      const updatedNodes = [...nodes[usr.chain]];
                      const [selectedNode] = updatedNodes.splice(index, 1);
                      updateNodes(usr.chain, [selectedNode, ...updatedNodes]);
                    }}
                  >
                    ⬆️
                  </Button>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button variant="none" className="mr-2">
                        📶
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px] bg-card">
                      <DialogHeader>
                        <DialogTitle>Ping node</DialogTitle>
                        <DialogDescription>
                          Checking reachability for{" "}
                          {nodes[usr.chain][index].url}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {pinging ? (
                          <div className="flex items-center gap-2">
                            <Spinner />
                            <div> Pinging... </div>
                          </div>
                        ) : pingResult && pingResult.ok ? (
                          <div className="text-[hsl(var(--accent-success-fg))] dark:text-[hsl(var(--accent-success-fg))]">
                            Node is reachable!
                            {pingResult &&
                            typeof pingResult.ms !== "undefined" ? (
                              <span className="ml-2 text-sm">
                                Ping: {pingResult.ms} ms
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]">
                            Node appears temporarily unreachable. You will be
                            alerted if it becomes reachable again.
                            {pingResult && pingResult.error ? (
                              <div className="text-sm text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] mt-2">
                                {pingResult.error}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          className="mr-2"
                          onClick={() => setAttempt((a) => a + 1)}
                          disabled={pinging}
                        >
                          Retry
                        </Button>
                        <Button onClick={() => setOpen(false)}>Close</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="none"
                    onClick={() => {
                      const updatedNodes = [...nodes[usr.chain]];
                      updatedNodes.splice(index, 1);
                      updateNodes(usr.chain, updatedNodes);
                    }}
                  >
                    ❌
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4">
        <div className="grid grid-cols-1 gap-3">
          <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-1)/0.2)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.1)] blur-3xl"
            />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                  <Server className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                    {t("Nodes:pageTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t("Nodes:pageDescription")}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Nodes:cardTitle")}</CardTitle>
              <CardDescription>{t("Nodes:cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {usr &&
              usr.chain &&
              nodes[usr.chain] &&
              nodes[usr.chain].length ? (
                <>
                  <div className="hidden md:block w-full max-h-[250px] overflow-auto">
                    <List
                      rowComponent={NodeRow}
                      rowCount={nodes[usr.chain].length}
                      rowHeight={50}
                      rowProps={{}}
                    />
                  </div>
                  <div className="md:hidden w-full max-h-[250px] overflow-auto">
                    <List
                      rowComponent={NodeRow}
                      rowCount={nodes[usr.chain].length}
                      rowHeight={75}
                      rowProps={{}}
                    />
                  </div>
                </>
              ) : (
                <p>{t("Nodes:none")}</p>
              )}
              <br />
              <div>
                <p>{t("Nodes:addDescription")}</p>
                <Input
                  name="searchInput"
                  placeholder="wss://url/ws"
                  className="mb-3 mt-3 w-full"
                  onChange={(event) => {
                    setInputURL(event.target.value);
                  }}
                  onKeyPress={(event) => {
                    if (
                      event.key !== "Enter" ||
                      !inputURL ||
                      nodes[usr.chain].findIndex(
                        (node) => node.url === inputURL
                      ) !== -1 ||
                      !/^wss?:\/\/[a-zA-Z0-9.-]+\/ws$/.test(inputURL)
                    ) {
                      return;
                    }

                    updateNodes(usr.chain, [
                      ...nodes[usr.chain],
                      { url: inputURL },
                    ]);
                  }}
                />
                <Button
                  className="mr-2"
                  onClick={() => {
                    if (
                      !inputURL ||
                      nodes[usr.chain].findIndex(
                        (node) => node.url === inputURL
                      ) !== -1 ||
                      !/^wss?:\/\/[a-zA-Z0-9.:\/\-]+$/.test(inputURL) ||
                      inputURL.includes("..")
                    ) {
                      return;
                    }
                    updateNodes(usr.chain, [
                      ...nodes[usr.chain],
                      { url: inputURL },
                    ]);
                  }}
                >
                  {t("Nodes:add")}
                </Button>
                <Button
                  onClick={() =>
                    updateNodes(usr.chain, chains[usr.chain].nodeList)
                  }
                >
                  {t("Nodes:reset")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
