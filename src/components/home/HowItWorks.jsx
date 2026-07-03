import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Search, Target, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    titleKey: "Home:howItWorks.step1Title",
    bodyKey: "Home:howItWorks.step1Body",
  },
  {
    icon: Target,
    titleKey: "Home:howItWorks.step2Title",
    bodyKey: "Home:howItWorks.step2Body",
  },
  {
    icon: Trophy,
    titleKey: "Home:howItWorks.step3Title",
    bodyKey: "Home:howItWorks.step3Body",
  },
];

export default function HowItWorks() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <section className="mt-12 sm:mt-16" aria-label={t("Home:howItWorks.heading")}>
      <h2 className="text-lg sm:text-xl font-semibold dark:text-white text-foreground mb-4 sm:mb-6 text-center">
        {t("Home:howItWorks.heading")}
      </h2>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <li
              key={s.titleKey}
              className="relative rounded-xl border dark:border-white/10 border-border dark:bg-white/[0.04] bg-accent/40 p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 dark:text-indigo-300 text-indigo-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider dark:text-white/50 text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-base font-semibold dark:text-white text-foreground mb-1">
                {t(s.titleKey)}
              </h3>
              <p className="text-sm dark:text-white/70 text-foreground/70 leading-relaxed">
                {t(s.bodyKey)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
