import React, { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";

const SUPPORTED_LANGUAGES = [
  { code: "en", English: "English" },
  { code: "da", English: "Danish" },
  { code: "de", English: "German" },
  { code: "es", English: "Spanish" },
  { code: "et", English: "Estonian" },
  { code: "fr", English: "French" },
  { code: "it", English: "Italian" },
  { code: "ja", English: "Japanese" },
  { code: "ko", English: "Korean" },
  { code: "pt", English: "Portuguese" },
  { code: "th", English: "Thai" },
];

function getOwnLanguageName(code) {
  try {
    const dn = new Intl.DisplayNames([code], { type: "language" });
    const maybe = dn.of(code);
    if (maybe && maybe !== code) return maybe;
  } catch (e) {
    // Intl may not support every code; fall through
  }
  const fallback = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return fallback?.English || code;
}

function LanguageRow({ language, nativeName, englishName, currentLanguage, loadingLanguage, onSelect }) {
  const [hover, setHover] = useState(false);

  const isLoading = loadingLanguage === language;
  const isCurrentLanguage = language === currentLanguage;

  return (
    <CommandItem
      onSelect={() => onSelect(language)}
      className={cn(
        "text-foreground/85",
        "data-[selected=true]:!bg-accent/50 data-[selected=true]:!text-accent-foreground",
        "hover:bg-accent/50 hover:text-accent-foreground",
        isCurrentLanguage && "!bg-accent/50 !text-accent-foreground"
      )}
      title={`${englishName} (${language})`}
    >
      <span className="grid grid-cols-8 w-full items-center">
        <span className="col-span-6 flex items-center gap-2">
          {nativeName}
          <span className="sr-only">{englishName}</span>
        </span>
        <span className="col-span-1 text-right flex justify-end">
          {isLoading ? <Spinner /> : isCurrentLanguage ? "✓" : ""}
        </span>
      </span>
    </CommandItem>
  );
}

export default function LanguageSelector({ className }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [loadingLanguage, setLoadingLanguage] = useState(null);
  const currentLocale = useSyncExternalStore(
    locale.subscribe,
    locale.get,
    () => locale.get(),
  );

  const languages = SUPPORTED_LANGUAGES.map(({ code, English }) => ({
    code,
    nativeName: getOwnLanguageName(code),
    englishName: English,
  }));

  const handleLanguageChange = async (lang) => {
    setLoadingLanguage(lang);
    i18nInstance.changeLanguage(lang);
    locale.set(lang);

    const path = window.location.pathname;
    const isAboutPage = path === "/about/" || path === "/about";

    if (isAboutPage) {
      const localePrefix = lang === "en" ? "" : `/${lang}`;
      window.location.href = `${localePrefix}/about/`;
    } else {
      window.location.reload();
    }

    setLoadingLanguage(null);
  };

  const searchPlaceholder = t("PageHeader:commandSearchPlaceholder", { defaultValue: "Type a command or search..." });
  const noResultsLabel = t("PageHeader:noResultsFound", { defaultValue: "No results found." });

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="relative h-12 w-12 bg-card/55 backdrop-blur-xl dark:text-white text-foreground border border-border hover:border-[hsl(var(--accent-1)/0.5)] hover:bg-card/60 transition-all duration-200 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            variant="outline"
            style={{
              "--lang-accent": "#22d3ee",
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 top-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, #22d3eecc, transparent)",
              }}
            />
            <svg
              viewBox="0 0 512 512"
              fill="currentColor"
              height="1.25em"
              width="1.25em"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={32}
                d="M48 112h288M192 64v48M272 448l96-224 96 224M301.5 384h133M281.3 112S257 206 199 277 80 384 80 384"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={32}
                d="M256 336s-35-27-72-75-56-85-56-85"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="end"
          align="end"
          sideOffset={8}
          className={cn(
            "mt-10 p-0 overflow-hidden rounded-2xl",
            "!bg-card border border-border",
            "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"
          />
          <Command
            className="rounded-2xl bg-transparent border-0 shadow-none"
          >
            <CommandInput
              placeholder={searchPlaceholder}
              className={cn(
                "[&_[cmdk-input-wrapper]]:border-border",
                "[&_svg]:text-muted-foreground [&_svg]:opacity-100",
                "text-foreground placeholder:text-muted-foreground"
              )}
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {noResultsLabel}
              </CommandEmpty>
              <CommandGroup
                className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:tracking-wide"
              >
                {languages.map((lang) => (
                  <LanguageRow
                    key={lang.code}
                    language={lang.code}
                    nativeName={lang.nativeName}
                    englishName={lang.englishName}
                    currentLanguage={currentLocale}
                    loadingLanguage={loadingLanguage}
                    onSelect={handleLanguageChange}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
