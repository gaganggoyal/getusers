/**
 * Renders an advertiser-supplied prize image. Uses a plain <img> (not
 * next/image) because the URLs come from arbitrary external hosts and we don't
 * want to maintain a per-domain allowlist.
 */
export default function PrizeImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
    />
  );
}
