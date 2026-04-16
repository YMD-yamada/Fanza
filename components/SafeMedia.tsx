"use client";

import Image from "next/image";

import { usePrivateModeEnabled } from "@/components/usePrivateMode";

const SAFETY_IMAGE = "/safe_mode_placeholder.svg";

type SafeThumbnailProps = {
  src?: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  fallbackText?: string;
};

export function SafeThumbnail({
  src,
  alt,
  className,
  fill = true,
  sizes,
  fallbackText = "NO IMAGE",
}: SafeThumbnailProps) {
  const privateMode = usePrivateModeEnabled();
  const resolvedSrc = privateMode ? SAFETY_IMAGE : src;
  if (!resolvedSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-xs text-neutral-500">
        {fallbackText}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Image
        src={resolvedSrc}
        alt={privateMode ? "safe-mode-image" : alt}
        fill={fill}
        className={className}
        sizes={sizes}
      />
      {privateMode && (
        <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-200">
          PRIVATE
        </span>
      )}
    </div>
  );
}

type SafeDetailImageProps = {
  imageUrl?: string;
  alt: string;
  className?: string;
};

export function SafeDetailImage({
  imageUrl,
  alt,
  className,
}: SafeDetailImageProps) {
  const privateMode = usePrivateModeEnabled();
  const src = privateMode ? SAFETY_IMAGE : imageUrl;
  if (!src) {
    return (
      <div className="flex h-64 w-44 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-500">
        NO IMAGE
      </div>
    );
  }

  return (
    <div className="relative">
      <Image
        src={src}
        alt={privateMode ? "safe-mode-image" : alt}
        width={420}
        height={600}
        className={className}
      />
      {privateMode && (
        <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-200">
          PRIVATE
        </span>
      )}
    </div>
  );
}

type SafeSampleImageProps = {
  imageUrl?: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
};

export function SafeSampleImage({
  imageUrl,
  alt,
  fill = true,
  className,
  sizes,
}: SafeSampleImageProps) {
  const privateMode = usePrivateModeEnabled();
  const src = privateMode ? SAFETY_IMAGE : imageUrl;
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-xs text-neutral-500">
        NO IMAGE
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Image
        src={src}
        alt={privateMode ? "safe-mode-image" : alt}
        fill={fill}
        className={className}
        sizes={sizes}
      />
      {privateMode && (
        <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-200">
          PRIVATE
        </span>
      )}
    </div>
  );
}
