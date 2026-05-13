import Image from "next/image";

interface PropShortsLogoProps {
  className?: string;
}

export default function PropShortsLogo({ className = "" }: PropShortsLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="PropShorts"
        width={128}
        height={128}
        className="h-32 w-auto object-contain"
        priority
      />
    </div>
  );
}
