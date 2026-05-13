export default function GradientCta() {
  return (
    <div
      className="relative flex h-[220px] w-[220px] items-center justify-center rounded-full transition-transform duration-300 hover:scale-105"
      style={{
        background:
          "conic-gradient(from 180deg at 50% 50%, #d387f5 0deg, #e6d85c 90deg, #43e97b 180deg, #4facfe 270deg, #d387f5 360deg)",
        filter: "blur(0.5px)",
      }}
    >
      {/* Inner depth shadow overlay */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)" }}
      />
      {/* Black inner circle with plus icon */}
      <div className="relative z-10 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-black">
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 5v14m7-7H5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
        </svg>
      </div>
    </div>
  );
}
