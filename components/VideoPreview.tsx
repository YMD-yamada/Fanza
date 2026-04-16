type VideoPreviewProps = {
  url?: string;
  privateMode?: boolean;
};

export function VideoPreview({ url, privateMode = false }: VideoPreviewProps) {
  if (privateMode) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
        プライベートモード中のためサンプル動画は非表示です。
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
        サンプル動画は提供されていません。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black">
      <iframe
        src={url}
        className="aspect-video w-full"
        allowFullScreen
        allow="autoplay; encrypted-media"
        title="サンプル動画"
      />
    </div>
  );
}
