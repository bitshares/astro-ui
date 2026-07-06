import { useForm } from "react-hook-form";
import { LockOpen2Icon } from "@radix-ui/react-icons";
import { Landmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PlaceholderForm({ form, ratioValue }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="rounded-xl border border-indigo-500/15 bg-card/60">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 dark:text-indigo-200 text-indigo-700 flex-shrink-0">
            <Landmark className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              {t("Smartcoin:collateralDebtPositionFormTitle")}
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {t("Smartcoin:collateralDebtPositionFormDescription")}
            </p>
          </div>
        </div>
        <Form {...form}>
          <form>
            <FormField
              control={form.control}
              name="account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Smartcoin:account")}</FormLabel>{" "}
                  <FormControl>
                    <Input
                      disabled
                      placeholder="Bitshares account (1.2.x)"
                      className="mb-3 mt-3 border-indigo-500/20 bg-card/60"
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="borrowAsset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="grid grid-cols-2 mt-2">
                      <span className="col-span-1 mt-1">
                        {t("Smartcoin:assetToBorrow")}
                      </span>
                      <span className="col-span-1 text-right">
                        <Badge className="border-indigo-400/30 bg-indigo-500/10 dark:text-indigo-200 text-indigo-700">{t("Smartcoin:changeAsset")}</Badge>
                      </span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled
                      placeholder="Bitshares smartcoin (1.3.x)"
                      className="mb-3 mt-3 border-indigo-500/20 bg-card/60"
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>current feed price</FormLabel>
                  <FormControl>
                    <Input
                      disabled
                      className="mb-3 mt-3 border-indigo-500/20 bg-card/60"
                      placeholder=""
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="callPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Smartcoin:yourCallPrice")}</FormLabel>{" "}
                  <FormControl>
                    <Input
                      disabled
                      className="mb-3 mt-3 border-indigo-500/20 bg-card/60"
                      value=""
                      readOnly
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debtAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Debt amount</FormLabel>
                  <FormDescription
                    style={{ marginTop: 0, paddingTop: 0 }}
                  >
                    <span className="grid grid-cols-3 mt-0 pt-0">
                      <span className="col-span-2 mt-0 pt-0 text-sm">
                        {t("Smartcoin:amountToBorrowDescription")}
                      </span>
                      <span className="col-span-1 text-right text-sm">
                        {t("Smartcoin:availableToBorrow", {
                          available: 0,
                        })}
                      </span>
                    </span>
                  </FormDescription>
                  <FormControl>
                    <span className="grid grid-cols-12 gaps-2">
                      <span className="col-span-1">
                        <Toggle variant="outline" className="border-indigo-400/20 text-muted-foreground">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-9">
                        <Input
                          placeholder="0"
                          className="mb-3 border-indigo-500/20 bg-card/60"
                          disabled
                          readOnly
                        />
                      </span>
                      <span className="col-span-2 ml-3">
                        <Button variant="outline" className="border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/20 transition-colors">
                          {t("Smartcoin:change")}
                        </Button>{" "}
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collateralAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Smartcoin:collateralAmountPlaceholder")}
                  </FormLabel>
                  <FormDescription className="mt-0 pt-0">
                    <span className="grid grid-cols-3 mt-0 pt-0">
                      <span className="col-span-2 mt-0 pt-0 text-sm">
                        {t(
                          "Smartcoin:collateralAmountDescriptionPlaceholder"
                        )}
                      </span>
                      <span className="col-span-1 text-right text-sm">
                        {t("Smartcoin:availableCollateral", {
                          available: 0,
                        })}
                      </span>
                    </span>
                  </FormDescription>
                  <FormControl>
                    <span className="grid grid-cols-12 gaps-2">
                      <span className="col-span-1">
                        <Toggle variant="outline" className="border-indigo-400/20 text-muted-foreground">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-9">
                        <Input
                          placeholder="0"
                          className="mb-3 border-indigo-500/20 bg-card/60"
                          disabled
                          readOnly
                        />
                      </span>
                      <span className="col-span-2 ml-3">
                        <Button variant="outline" className="border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/20 transition-colors">
                          {t("Smartcoin:change")}
                        </Button>
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ratioValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("Smartcoin:ratioOfCollateralToDebt")}
                  </FormLabel>{" "}
                  <FormControl>
                    <span className="grid grid-cols-12">
                      <span className="col-span-1">
                        <Toggle variant="outline" className="border-indigo-400/20 text-muted-foreground">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-11">
                        <Input
                          value={ratioValue}
                          placeholder={ratioValue}
                          className="mb-3 border-indigo-500/20 bg-card/60"
                          disabled
                          readOnly
                        />
                      </span>
                    </span>
                  </FormControl>
                </FormItem>
              )}
            />
            <Slider defaultValue={[2]} max={20} min={1.4} step={0.01} />
            <br />
            <span className="items-top flex space-x-2">
              <Checkbox id="terms1" />
              <span className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms1"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("Smartcoin:enableTargetCollateralRatio")}
                </label>
              </span>
            </span>

            <FormField
              control={form.control}
              name="networkFee"
              render={({ field }) => (
                <FormItem className="mb-1 mt-3">
                  <FormLabel>
                    {t("Smartcoin:networkBroadcastFee")}
                  </FormLabel>
                  <FormDescription>
                    {t("Smartcoin:networkBroadcastFeeDescription")}
                  </FormDescription>
                  <FormControl>
                    <Input disabled readOnly className="border-indigo-500/20 bg-card/60" />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              className="mt-5 mb-3 bg-muted text-muted-foreground cursor-not-allowed"
              variant="outline"
              disabled
              type="submit"
            >
              Submit
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
