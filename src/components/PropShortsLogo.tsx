import Image from "next/image";

interface PropShortsLogoProps {
  className?: string;
}

export default function PropShortsLogo({ className = "" }: PropShortsLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Image
        src="/icon.png"
        alt="PropShorts icon"
        width={96}
        height={96}
        className="h-24 w-24 object-contain"
        priority
      />
      <span className="text-4xl font-semibold tracking-tight text-black lowercase">
        propshorts
      </span>
    </div>
  );
}
