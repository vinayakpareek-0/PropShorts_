interface BrokerCardProps {
  bgColor: string;
  propertyTitle: string;
  details: string;
  refLine: string;
  brokerName: string;
  brokerage: string;
  phone: string;
}

export default function BrokerCard({
  bgColor,
  propertyTitle,
  details,
  refLine,
  brokerName,
  brokerage,
  phone,
}: BrokerCardProps) {
  return (
    <div
      className="flex flex-col items-start justify-between gap-6 rounded-2xl p-5 transition-transform duration-200 active:scale-[0.98] sm:flex-row sm:items-center sm:p-8"
      style={{ background: bgColor }}
    >
      {/* Property + broker info */}
      <div className="flex flex-col gap-1">
        <h3 className="text-[20px] font-bold leading-tight text-black">{propertyTitle}</h3>
        <p className="text-[15px] font-normal text-black">{details}</p>
        <p className="text-[13px] font-medium text-black/70">{refLine}</p>
        <div className="mt-3">
          <p className="text-[17px] font-bold text-black">{brokerName}</p>
          <p className="text-[15px] font-normal text-black">{brokerage}</p>
        </div>
      </div>

      {/* Phone button */}
      <a
        href={`tel:${phone}`}
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        aria-label={`Call ${brokerName}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
      </a>
    </div>
  );
}
