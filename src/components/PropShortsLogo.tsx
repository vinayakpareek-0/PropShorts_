import Image from "next/image";

interface PropShortsLogoProps {
  width?: number;
  className?: string;
}

export default function PropShortsLogo({ width = 200, className = "" }: PropShortsLogoProps) {
  return (
    <Image
      src="/tm.png"
      alt="PropShorts"
      width={width}
      height={width}
      className={`object-contain ${className}`}
      priority
    />
  );
}
