"use client";

import { SafeThumbnail } from "@/components/SafeMedia";
import { usePrivateModeEnabled } from "@/components/usePrivateMode";

type ItemCardThumbnailProps = {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
};

export function ItemCardThumbnail({ src, alt, className, sizes }: ItemCardThumbnailProps) {
  const privateMode = usePrivateModeEnabled();
  return (
    <SafeThumbnail
      src={src}
      alt={alt}
      fallbackText={privateMode ? "SAFE MODE" : "NO IMAGE"}
      fill
      sizes={sizes}
      className={className}
    />
  );
}
