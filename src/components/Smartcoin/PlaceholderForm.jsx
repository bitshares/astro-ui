import { useForm } from "react-hook-form";
import { LockOpen2Icon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>
          {t("Smartcoin:collateralDebtPositionFormTitle")}
        </CardTitle>
        <CardDescription>
          {t("Smartcoin:collateralDebtPositionFormDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                      className="mb-3 mt-3"
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
                        <Badge>{t("Smartcoin:changeAsset")}</Badge>
                      </span>
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled
                      placeholder="Bitshares smartcoin (1.3.x)"
                      className="mb-3 mt-3"
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
                      className="mb-3 mt-3"
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
                      className="mb-3 mt-3"
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
                        <Toggle variant="outline">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-9">
                        <Input
                          placeholder="0"
                          className="mb-3"
                          disabled
                          readOnly
                        />
                      </span>
                      <span className="col-span-2 ml-3">
                        <Button variant="outline">
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
                        <Toggle variant="outline">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-9">
                        <Input
                          placeholder="0"
                          className="mb-3"
                          disabled
                          readOnly
                        />
                      </span>
                      <span className="col-span-2 ml-3">
                        <Button variant="outline">
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
                        <Toggle variant="outline">
                          <LockOpen2Icon className="h-4 w-4" />
                        </Toggle>
                      </span>
                      <span className="col-span-11">
                        <Input
                          value={ratioValue}
                          placeholder={ratioValue}
                          className="mb-3"
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
                    <Input disabled readOnly />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              className="mt-5 mb-3"
              variant="outline"
              disabled
              type="submit"
            >
              Submit
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
