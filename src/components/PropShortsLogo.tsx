interface PropShortsLogoProps {
  className?: string;
}

export default function PropShortsLogo({ className = "" }: PropShortsLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="PropShorts"
      >
        {/* Outer filled circle */}
        <circle cx="28" cy="28" r="28" fill="black" />
        {/* Film reel spoke dividers */}
        <line x1="28" y1="4" x2="28" y2="52" stroke="white" strokeWidth="1.5" />
        <line x1="4" y1="28" x2="52" y2="28" stroke="white" strokeWidth="1.5" />
        <line x1="10.1" y1="10.1" x2="45.9" y2="45.9" stroke="white" strokeWidth="1.5" />
        <line x1="45.9" y1="10.1" x2="10.1" y2="45.9" stroke="white" strokeWidth="1.5" />
        {/* Center hub */}
        <circle cx="28" cy="28" r="9" fill="black" stroke="white" strokeWidth="1.5" />
        {/* Four reel holes */}
        <circle cx="28" cy="12" r="4" fill="white" />
        <circle cx="44" cy="28" r="4" fill="white" />
        <circle cx="28" cy="44" r="4" fill="white" />
        <circle cx="12" cy="28" r="4" fill="white" />
      </svg>
      <span className="text-2xl font-semibold tracking-tight text-black lowercase">
        propshorts
      </span>
    </div>
  );
}
