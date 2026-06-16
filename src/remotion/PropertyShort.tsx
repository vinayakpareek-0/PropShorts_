import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export interface PropertyShortProperty {
  id?: string;
  title?: string | null;
  area?: string | null;
  city?: string | null;
  price_label?: string | null;
  headline?: string | null;
  description?: string | null;
  highlights?: string[] | null;
  images?: string[] | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  size_label?: string | null;
}

export interface PropertyShortBrokerProfile {
  fullName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
}

export interface PropertyShortProps {
  title: string;
  clientName: string;
  script?: string;
  brokerProfile?: PropertyShortBrokerProfile;
  properties: PropertyShortProperty[];
}

const WIDTH = 720;
const HEIGHT = 1280;
const FPS = 24;
const INTRO_FRAMES = 4 * FPS;
const NUMBER_FRAMES = 1 * FPS;
const IMAGE_SLIDE_FRAMES = 56;
const PROPERTY_SECTION_FRAMES = 8 * FPS;
const PDF_OUTRO_FRAMES = 4 * FPS;
const CLOSE_OUTRO_FRAMES = 5 * FPS;
const BRAND_LOGO = staticFile("top_logo.png");

function fit(value: string | null | undefined, max = 72) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function wrapText(value: string | null | undefined, maxChars = 22, maxLines = 3) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [""];
  if (lines.length === maxLines) {
    lines[maxLines - 1] = fit(lines[maxLines - 1], Math.max(10, maxChars - 1));
  }
  return lines;
}

function getDurationInFrames(propertyCount: number) {
  return INTRO_FRAMES + Math.max(1, propertyCount) * PROPERTY_SECTION_FRAMES + PDF_OUTRO_FRAMES + CLOSE_OUTRO_FRAMES;
}

function brokerDefaults(profile?: PropertyShortBrokerProfile) {
  return {
    fullName: fit(profile?.fullName || "Your Property Expert", 28),
    companyName: fit(profile?.companyName || "PropShorts Real Estate", 28),
    phone: fit(profile?.phone || "Contact via broker", 22),
    photoUrl: profile?.photoUrl && /^https?:\/\//i.test(profile.photoUrl) ? profile.photoUrl : null,
  };
}

function normalizeProperties(properties: PropertyShortProperty[]) {
  return (properties.length > 0 ? properties : [{}]).slice(0, 5).map((property, index) => ({
    id: property.id || `property-${index + 1}`,
    title: fit(property.title || `Property ${index + 1}`, 40),
    area: property.area || null,
    city: property.city || null,
    price_label: property.price_label || null,
    headline: property.headline || null,
    description: property.description || null,
    highlights: Array.isArray(property.highlights) ? property.highlights.filter(Boolean).slice(0, 4) : [],
    images: Array.isArray(property.images) ? property.images.filter((image): image is string => Boolean(image && /^https?:\/\//i.test(image))).slice(0, 3) : [],
    bedrooms: typeof property.bedrooms === "number" ? property.bedrooms : null,
    bathrooms: typeof property.bathrooms === "number" ? property.bathrooms : null,
    sqft: typeof property.sqft === "number" ? property.sqft : null,
    size_label: property.size_label || null,
  }));
}

function metricLabel(property: ReturnType<typeof normalizeProperties>[number], imageIndex: number) {
  const metrics = [
    property.bedrooms ? `${property.bedrooms} BED` : null,
    property.size_label || (property.sqft ? `${Math.round(property.sqft)} SQFT` : null),
    property.price_label,
  ].filter(Boolean) as string[];

  return fit(metrics[imageIndex] || metrics[0] || "DETAILS IN PDF", 18).toUpperCase();
}

function propertyOrdinal(index: number) {
  return ["One", "Two", "Three", "Four", "Five"][index] || String(index + 1);
}

function locationLabel(property: ReturnType<typeof normalizeProperties>[number]) {
  return fit(property.area || property.city || compact([property.area, property.city]).join(", ") || "Location on request", 24);
}

function slideForFrame(frame: number, properties: ReturnType<typeof normalizeProperties>) {
  if (frame < INTRO_FRAMES) {
    return { type: "intro" as const, relativeFrame: frame };
  }

  let cursor = frame - INTRO_FRAMES;

  for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex += 1) {
    if (cursor < NUMBER_FRAMES) {
      return { type: "number" as const, relativeFrame: cursor, propertyIndex };
    }

    if (cursor < PROPERTY_SECTION_FRAMES) {
      const imageFrame = cursor - NUMBER_FRAMES;
      const imageIndex = Math.min(2, Math.max(0, Math.floor(imageFrame / IMAGE_SLIDE_FRAMES)));
      return {
        type: "property-image" as const,
        relativeFrame: imageFrame - imageIndex * IMAGE_SLIDE_FRAMES,
        propertyIndex,
        imageIndex,
      };
    }

    cursor -= PROPERTY_SECTION_FRAMES;
  }

  if (cursor < PDF_OUTRO_FRAMES) {
    return { type: "pdf-outro" as const, relativeFrame: cursor };
  }

  return { type: "closing" as const, relativeFrame: cursor - PDF_OUTRO_FRAMES };
}

function BrandFooter() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 58,
          fontFamily: "Poppins, Arial, Helvetica, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#111111",
        }}
      >
        PS 903
      </div>
      <div
        style={{
          position: "absolute",
          right: 64,
          bottom: 44,
          width: 122,
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Img src={BRAND_LOGO} style={{ width: 122, height: 54, objectFit: "contain" }} />
      </div>
    </>
  );
}

function PlaceholderAvatar() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 8,
        background: "#075c31",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#d6a753",
        fontFamily: "Poppins, Arial, Helvetica, sans-serif",
        fontSize: 42,
        fontWeight: 700,
      }}
    >
      PS
    </div>
  );
}

function BrokerBlock({
  compact = false,
  profile,
}: {
  compact?: boolean;
  profile: ReturnType<typeof brokerDefaults>;
}) {
  const avatarSize = compact ? 126 : 112;
  const textBaseY = compact ? 30 : 24;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 28,
        padding: compact ? "18px 20px" : 0,
        borderRadius: compact ? 12 : 0,
        background: compact ? "#f3f3f1" : "transparent",
      }}
    >
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {profile.photoUrl ? (
          <Img src={profile.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <PlaceholderAvatar />
        )}
      </div>
      <div
        style={{
          fontFamily: "Poppins, Arial, Helvetica, sans-serif",
          color: "#080808",
          lineHeight: 1.08,
          paddingTop: textBaseY,
        }}
      >
        <div style={{ fontSize: compact ? 34 : 32, fontWeight: 700 }}>{`${profile.fullName} @`}</div>
        <div style={{ fontSize: compact ? 34 : 31, fontWeight: 700, marginTop: 2 }}>{profile.companyName}</div>
        <div style={{ fontSize: compact ? 28 : 25, fontWeight: 600, marginTop: compact ? 10 : 12 }}>{profile.phone}</div>
      </div>
    </div>
  );
}

function ImagePanel({
  imageUrl,
  frame,
}: {
  imageUrl: string | null;
  frame: number;
}) {
  const scale = interpolate(frame, [0, IMAGE_SLIDE_FRAMES - 1], [1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 260,
        width: WIDTH,
        height: 570,
        overflow: "hidden",
        background: "linear-gradient(135deg, #e8ecf2 0%, #ccd8e7 48%, #dfe4c7 100%)",
      }}
    >
      {imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #dfe7f0 0%, #eef2f6 40%, #dfe4c7 100%)",
          }}
        />
      )}
    </div>
  );
}

export function PropertyShort({ title, clientName, properties, brokerProfile }: PropertyShortProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const normalizedProperties = normalizeProperties(properties);
  const activeSlide = slideForFrame(frame, normalizedProperties);
  const broker = brokerDefaults(brokerProfile);

  if (activeSlide.type === "intro") {
    const opacity = interpolate(activeSlide.relativeFrame, [0, 12, INTRO_FRAMES - 12, INTRO_FRAMES - 1], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <AbsoluteFill style={{ background: "#ffffff", fontFamily: "Poppins, Arial, Helvetica, sans-serif", color: "#080808" }}>
        <div style={{ position: "absolute", left: 116, top: 410, opacity }}>
          {wrapText(title || `Check out these properties for ${clientName}`, 10, 4).map((line) => (
            <div key={line} style={{ fontSize: 76, lineHeight: 0.92, fontWeight: 700 }}>
              {line}
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", left: 116, top: 860, width: 520 }}>
          <BrokerBlock profile={broker} />
        </div>

        <BrandFooter />
      </AbsoluteFill>
    );
  }

  if (activeSlide.type === "number") {
    const bubbleScale = spring({
      frame: activeSlide.relativeFrame,
      fps,
      config: { damping: 18, stiffness: 120 },
    });

    return (
      <AbsoluteFill style={{ background: "#ffffff", fontFamily: "Poppins, Arial, Helvetica, sans-serif" }}>
        <div
          style={{
            position: "absolute",
            left: 210,
            top: 460,
            width: 300,
            height: 300,
            borderRadius: 999,
            background: "#080808",
            transform: `scale(${bubbleScale})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ color: "#ffffff", fontSize: 172, fontWeight: 800 }}>{activeSlide.propertyIndex + 1}</div>
        </div>

        <BrandFooter />
      </AbsoluteFill>
    );
  }

  if (activeSlide.type === "property-image") {
    const property = normalizedProperties[activeSlide.propertyIndex];
    const imageUrl = property.images[activeSlide.imageIndex] || property.images[0] || null;
    const headlineLines = wrapText(property.headline || property.description || "A strong match for the brief.", 18, 3);
    const badge = metricLabel(property, activeSlide.imageIndex);
    const badgeWidth = Math.max(150, Math.min(340, badge.length * 14 + 52));
    const badgeSize = badge.length > 14 ? 23 : badge.length > 11 ? 26 : 31;

    return (
      <AbsoluteFill style={{ background: "#ffffff", fontFamily: "Poppins, Arial, Helvetica, sans-serif", color: "#080808" }}>
        <div style={{ position: "absolute", left: 58, top: 88, width: 602 }}>
          <BrokerBlock compact profile={broker} />
        </div>

        <ImagePanel imageUrl={imageUrl} frame={activeSlide.relativeFrame} />

        <div
          style={{
            position: "absolute",
            left: 64,
            top: 750,
            minWidth: badgeWidth,
            height: 64,
            padding: "0 24px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            fontSize: badgeSize,
            fontWeight: 700,
          }}
        >
          {badge}
        </div>

        <div style={{ position: "absolute", left: 64, top: 892, fontSize: 28, fontWeight: 500 }}>{`Property ${propertyOrdinal(activeSlide.propertyIndex)}`}</div>
        <div style={{ position: "absolute", left: 64, top: 936, fontSize: 40, fontWeight: 700 }}>{locationLabel(property)}</div>
        <div style={{ position: "absolute", left: 64, top: 994, width: 492, height: 2, background: "#111111" }} />

        <div style={{ position: "absolute", left: 64, top: 1046, width: 560 }}>
          {headlineLines.map((line) => (
            <div key={line} style={{ fontSize: 48, lineHeight: 0.99, fontWeight: 500 }}>
              {line}
            </div>
          ))}
        </div>

        <BrandFooter />
      </AbsoluteFill>
    );
  }

  if (activeSlide.type === "pdf-outro") {
    const opacity = interpolate(activeSlide.relativeFrame, [0, 10, PDF_OUTRO_FRAMES - 12, PDF_OUTRO_FRAMES - 1], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <AbsoluteFill style={{ background: "#ffffff", fontFamily: "Poppins, Arial, Helvetica, sans-serif", color: "#080808", opacity }}>
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 430,
            width: 500,
            height: 138,
            borderRadius: 13,
            background: "#080808",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 92,
            fontWeight: 500,
          }}
        >
          PDF
        </div>
        <div style={{ position: "absolute", left: 120, top: 640, width: 480, textAlign: "center" }}>
          {["Check out the PDF", "for the full property", "details!"].map((line) => (
            <div key={line} style={{ fontSize: 38, lineHeight: 1.08, fontWeight: 600 }}>
              {line}
            </div>
          ))}
        </div>
        <BrandFooter />
      </AbsoluteFill>
    );
  }

  const closeOpacity = interpolate(activeSlide.relativeFrame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#ffffff", fontFamily: "Poppins, Arial, Helvetica, sans-serif", color: "#080808", opacity: closeOpacity }}>
      <div style={{ position: "absolute", left: 160, top: 180, textAlign: "center" }}>
        <div style={{ fontSize: 158, lineHeight: 0.74, fontWeight: 800 }}>Call</div>
        <div style={{ fontSize: 158, lineHeight: 0.74, fontWeight: 800 }}>me.</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 286,
          top: 735,
          width: 148,
          height: 148,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {broker.photoUrl ? (
          <Img src={broker.photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <PlaceholderAvatar />
        )}
      </div>

      <div style={{ position: "absolute", left: 110, top: 940, width: 500, textAlign: "center" }}>
        <div style={{ fontSize: 43, lineHeight: 1.08, fontWeight: 600 }}>{`${broker.fullName} @`}</div>
        <div style={{ fontSize: 43, lineHeight: 1.08, fontWeight: 600 }}>{broker.companyName}</div>
        <div style={{ fontSize: 43, lineHeight: 1.08, fontWeight: 500 }}>{broker.phone}</div>
      </div>

      <BrandFooter />
    </AbsoluteFill>
  );
}

export const propertyShortDurationInFrames = (properties: PropertyShortProperty[]) => getDurationInFrames(properties.length);
