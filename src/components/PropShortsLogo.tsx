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
        width={120}
        height={120}
        className="h-[120px] w-[120px] object-contain"
        priority
      />
      <span className="text-5xl font-semibold tracking-tight text-black lowercase">
        propshorts
      </span>
    </div>
  );
}
