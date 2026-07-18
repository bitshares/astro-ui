import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getGeometry, ticketToCoords, explainHit } from "@/lib/airdropAlgos.js";
import AlgoGeometryView from "./AlgoGeometryView.jsx";
import AlgoMathExplanation from "./AlgoMathExplanation.jsx";

/**
 * Dialog opened when a user clicks a winner row in the results list.  Shows,
 * for every algorithm that hit this account, either a 3-D visualisation of
 * the draw (geometric algos) or a wordy maths breakdown (non-geometric
 * algos).  When several algos hit the account, they are presented as tabs so
 * the user switches between them rather than being overwhelmed by overlays.
 *
 * @param {object} props
 * @param {object|null} props.winner  The winner summary
 *   (`{id, name, tickets: Array<{ticket, algo, value}>}`).
 * @param {string} props.filteredSignature  Numeric seed used to draw.
 * @param {object} props.opts        Algorithm options (projectile/splinter…).
 * @param {string|null} [props.initialAlgo]  When the results list is filtered
 *   to a single algorithm, pre-select that algorithm's tab in the dialog even
 *   if it isn't first in the list.
 * @param {() => void} props.onClose
 */
export default function WinnerDetailDialog({
  winner,
  filteredSignature,
  opts,
  initialAlgo,
  onClose,
}) {
  const { t } = useTranslation("AirdropCalculate");
  const open = !!winner;

  const algoViews = useMemo(() => {
    if (!winner) return [];
    const tickets = winner.tickets || [];
    if (!tickets.length) return [];
    const byAlgo = {};
    for (const tk of tickets) {
      (byAlgo[tk.algo] = byAlgo[tk.algo] || []).push(tk);
    }
    return Object.entries(byAlgo).map(([algo, tickets]) => {
      const geometry = filteredSignature
        ? getGeometry(algo, filteredSignature, opts)
        : null;
      if (geometry) {
        const hits = tickets.map((tk) => ({
          ticket: tk.ticket,
          coords: ticketToCoords(tk.ticket),
        }));
        return { algo, tickets, geometry, hits, explanation: null };
      }
      const explanation = explainHit(algo, tickets[0].ticket, filteredSignature);
      return { algo, tickets, geometry: null, hits: [], explanation };
    });
  }, [winner, filteredSignature, opts]);

  if (!open) return null;

  if (!algoViews.length) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[760px] bg-card border border-border rounded-2xl p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-base">{winner.name || winner.id}</DialogTitle>
            <DialogDescription className="text-xs">
              {winner.id} · {t("AirdropCalculate:result.detailSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5 text-xs text-muted-foreground">
            {t("AirdropCalculate:result.noTicketDetail")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const single = algoViews.length === 1;

  // Pre-select the algorithm the user filtered the list by, when it applies.
  const initialTab =
    initialAlgo && algoViews.some((v) => v.algo === initialAlgo)
      ? initialAlgo
      : algoViews[0].algo;

  const renderBody = (view) => {
    if (view.geometry) {
      return (
        <div className="space-y-3">
          <AlgoGeometryView geometry={view.geometry} hits={view.hits} />
          <div className="px-1 text-xs text-muted-foreground">
            <div className="font-medium text-foreground/80">
              {t(`AirdropCalculate:algos.${view.algo}.name`)}
            </div>
            <p className="mt-1">{t(`AirdropCalculate:algos.${view.algo}.desc`)}</p>
            <div className="mt-2 font-mono">
              {t("AirdropCalculate:result.yourHit")}:{" "}
              {view.hits.map((h, i) => (
                <span key={i} className="mr-3 inline-block">
                  #{h.ticket} ({h.coords[0]}, {h.coords[1]}, {h.coords[2]})
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <AlgoMathExplanation
        explanation={view.explanation}
        ticket={view.tickets[0].ticket}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base">{winner.name || winner.id}</DialogTitle>
          <DialogDescription className="text-xs">
            {winner.id} · {t("AirdropCalculate:result.detailSubtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          {single ? (
            renderBody(algoViews[0])
          ) : (
            <Tabs key={`${winner.id}-${initialTab}`} defaultValue={initialTab}>
              <TabsList className="mb-3 flex flex-wrap">
                {algoViews.map((v) => (
                  <TabsTrigger key={v.algo} value={v.algo}>
                    {t(`AirdropCalculate:algos.${v.algo}.name`)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {algoViews.map((v) => (
                <TabsContent key={v.algo} value={v.algo}>
                  {renderBody(v)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
