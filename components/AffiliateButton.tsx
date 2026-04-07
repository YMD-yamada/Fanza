"use client";

type AffiliateButtonProps = {
  href: string;
  itemId: string;
  title: string;
  className?: string;
};

export function AffiliateButton({ href, itemId, title, className }: AffiliateButtonProps) {
  const onClick = async () => {
    try {
      await fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, title }),
      });
    } catch {
      // Ignore tracking failures to avoid blocking user navigation.
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className ?? "inline-flex rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"}
    >
      購入ページへ
    </a>
  );
}
