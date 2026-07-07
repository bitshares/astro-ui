import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MediaRow = ({ index, style, nftMedia, setNFTMedia }) => {
  if (!nftMedia || !nftMedia.length || !nftMedia[index]) {
    return null;
  }

  const res = nftMedia[index];

  return (
    <div
      style={{ ...style }}
      key={`dialogrow-${index}`}
      className="grid grid-cols-4"
    >
      <div className="col-span-1">{res.type}</div>
      <div className="col-span-1">
        <Dialog>
          <DialogTrigger>
            <Button className="h-5" variant="outline">
              Full URL
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card w-full max-w-4xl">
            <DialogHeader>
              <DialogTitle>Full IPFS URL</DialogTitle>
            </DialogHeader>
            <p>{res.url}</p>
          </DialogContent>
        </Dialog>
      </div>
      <div className="col-span-1">{res.url.split("/").pop()}</div>
      <div className="col-span-1">
        <Button
          variant="outline"
          className="w-5 h-5"
          onClick={() => {
            setNFTMedia(nftMedia.filter((x) => x.url !== res.url));
          }}
        >
          ❌
        </Button>
      </div>
    </div>
  );
};

export default React.memo(MediaRow);
