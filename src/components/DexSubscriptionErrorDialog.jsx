import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function DexSubscriptionErrorDialog({ open, error, onOpenChange }) {
  const handleRedirect = () => {
    window.location.href = "/nodes.html";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Market subscription failed</AlertDialogTitle>
          <AlertDialogDescription>
            Live order book subscription failed{error?.message ? `: ${error.message}` : "."} Please try a different
            node. You will be redirected to the nodes page to change the connected node.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleRedirect}>Go to nodes page</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
