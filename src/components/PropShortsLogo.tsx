import Image from "next/image";

interface PropShortsLogoProps {
  className?: string;
}

export default function PropShortsLogo({ className = "" }: PropShortsLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <Image
        src="/icon.png"
        alt="PropShorts icon"
        width={56}
        height={56}
        className="h-14 w-14 object-contain"
        priority
      />
      <span className="text-2xl font-semibold tracking-tight text-black lowercase">
        propshorts
      </span>
    </div>
  );
}
