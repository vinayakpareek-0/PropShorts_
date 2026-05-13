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
        width={50}
        height={50}
        className="h-[50px] w-[50px] object-contain"
        priority
      />
      <span className="text-2xl font-semibold tracking-tight text-black lowercase">
        propshorts
      </span>
    </div>
  );
}
