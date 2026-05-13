import Image from "next/image";

interface PropShortsLogoProps {
  className?: string;
}

export default function PropShortsLogo({ className = "" }: PropShortsLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Image
        src="/icon.png"
        alt="PropShorts icon"
        width={80}
        height={80}
        className="h-20 w-20 object-contain"
        priority
      />
      <span
        className="text-6xl font-bold tracking-tight text-black lowercase"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        propshorts
      </span>
    </div>
  );
}
