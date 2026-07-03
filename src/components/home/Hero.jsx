import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function Hero() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <section
      className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-border bg-gradient-to-br from-indigo-100/60 via-slate-50/40 to-fuchsia-100/30 dark:from-indigo-900/40 dark:via-slate-900/40 dark:to-fuchsia-900/30 p-6 sm:p-10"
      aria-label={t("Home:hero.title")}
    >
      <div
        aria-hidden
        className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl"
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground dark:text-white leading-[1.1] dark:[text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]">
          {t("Home:hero.title")}
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg dark:text-white/80 text-foreground/80 max-w-2xl mx-auto leading-relaxed">
          {t("Home:hero.subtitle")}
        </p>
        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <a
            href="/dex/index.html"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm sm:text-base px-5 py-2.5 transition-colors shadow-sm shadow-black/30"
          >
            {t("Home:hero.ctaPrimary")}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/swap/index.html"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/40 dark:border-white/20 bg-accent/30 dark:bg-white/5 hover:bg-accent/40 dark:hover:bg-white/10 dark:text-white text-foreground font-semibold text-sm sm:text-base px-5 py-2.5 transition-colors"
          >
            {t("Home:hero.ctaSecondary")}
          </a>
        </div>
        <a
          href="#jump-in"
          aria-label={t("Home:hero.scrollForMore")}
          className="hidden sm:inline-flex mt-6 sm:mt-8 items-center justify-center w-8 h-8 rounded-full border dark:border-white/15 border-border/40 dark:bg-white/5 bg-accent/30 dark:text-white/60 text-muted-foreground dark:hover:text-white hover:text-accent-foreground dark:hover:bg-white/10 hover:bg-accent/40 transition-colors animate-bounce"
        >
          <ChevronDown className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
