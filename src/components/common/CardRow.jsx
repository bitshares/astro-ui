import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { HelpCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CardRow(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleTooltipClick = (e) => {
    e.stopPropagation();
    if (!dialogOpen) {
      setDialogOpen(true);
    }
  };

  return (
    <div className="col-span-1" key={`${properties.dialogtitle}`}>
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-accent/20 px-3 py-2 hover:bg-accent/30 transition-colors">
        <div className="col-span-4 text-xs text-muted-foreground font-medium min-w-0 shrink-0">
          {properties.title}
        </div>
        <div className="flex-1 min-w-0 text-xs font-mono font-semibold text-foreground/85 truncate">
          {properties.button}
        </div>
        <div className="shrink-0">
          <TooltipProvider>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                setTooltipOpen(false);
              }}
            >
              <DialogContent className="sm:max-w-[400px] !bg-background !border !text-card-foreground">
                <DialogHeader>
                  <DialogTitle>{properties.dialogtitle}</DialogTitle>
                  {properties.dialogdescription}
                </DialogHeader>
              </DialogContent>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  open={tooltipOpen}
                  onMouseOver={() => {
                    setTooltipOpen(true);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/40 rounded-md"
                      onClick={handleTooltipClick}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                {tooltipOpen && (
                  <TooltipContent className="!bg-background !border !text-card-foreground">
                    {properties.tooltip}
                  </TooltipContent>
                )}
              </Tooltip>
            </Dialog>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
