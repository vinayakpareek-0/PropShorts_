import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface PropertyShortProperty {
  id?: string;
  title?: string | null;
  area?: string | null;
  city?: string | null;
  price_label?: string | null;
  headline?: string | null;
  description?: string | null;
  highlights?: string[] | null;
}

export interface PropertyShortProps {
  title: string;
  clientName: string;
  script: string;
  properties: PropertyShortProperty[];
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function fit(value: string, max = 72) {
  return value.length > max ? `${value.slice(0, max - 1).trim()}...` : value;
}

function propertyForFrame(properties: PropertyShortProperty[], frame: number) {
  if (frame < 180) return null;
  const index = Math.min(properties.length - 1, Math.floor((frame - 180) / 180));
  return properties[index] || null;
}

export function PropertyShort({ title, clientName, script, properties }: PropertyShortProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeProperty = propertyForFrame(properties, frame);
  const introOpacity = interpolate(frame, [0, 30, 150, 190], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardScale = spring({ frame: Math.max(0, frame - 180), fps, config: { damping: 18, stiffness: 90 } });
  const progress = interpolate(frame, [0, 900], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroOpacity = interpolate(frame, [760, 820], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#f6f6f3", fontFamily: "Inter, Arial, sans-serif", color: "#080808" }}>
      <AbsoluteFill
        style={{
          background: "linear-gradient(145deg, #d489ff 0%, #8ecae6 52%, #c8cc7c 100%)",
          opacity: 0.95,
        }}
      />
      <AbsoluteFill style={{ padding: 72 }}>
        <div
          style={{
            height: "100%",
            borderRadius: 56,
            background: "rgba(255,255,255,0.78)",
            padding: 58,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 30px 80px rgba(0,0,0,0.14)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 62, height: 62, borderRadius: 22, background: "#080808" }} />
              <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: 7, textTransform: "uppercase", color: "rgba(0,0,0,0.48)" }}>
                PropShorts
              </div>
            </div>

            <div style={{ marginTop: 74, opacity: introOpacity }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "rgba(0,0,0,0.42)" }}>Hi {clientName}.</div>
              <div style={{ marginTop: 28, fontSize: 104, lineHeight: 0.95, letterSpacing: 0, fontWeight: 900 }}>
                {fit(title, 48)}
              </div>
              <div style={{ marginTop: 32, fontSize: 38, lineHeight: 1.28, color: "rgba(0,0,0,0.56)" }}>
                I found a few properties that match what you are looking for.
              </div>
            </div>
          </div>

          {activeProperty ? (
            <div
              style={{
                transform: `scale(${0.96 + cardScale * 0.04})`,
                background: "#ffffff",
                borderRadius: 42,
                padding: 46,
                boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, textTransform: "uppercase", color: "#8e64d9" }}>
                Recommended Property
              </div>
              <div style={{ marginTop: 28, fontSize: 76, lineHeight: 0.98, fontWeight: 900 }}>
                {fit(activeProperty.title || "Property recommendation", 54)}
              </div>
              <div style={{ marginTop: 26, fontSize: 36, lineHeight: 1.25, color: "rgba(0,0,0,0.55)" }}>
                {compact([activeProperty.area, activeProperty.city, activeProperty.price_label]).join(" - ") || "Details available in the PDF report"}
              </div>
              <div style={{ marginTop: 38, fontSize: 44, lineHeight: 1.18, fontWeight: 750 }}>
                {fit(activeProperty.headline || activeProperty.description || "A strong match for the brief.", 88)}
              </div>
              <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 16 }}>
                {(activeProperty.highlights || []).slice(0, 4).map((highlight) => (
                  <div key={highlight} style={{ borderRadius: 22, background: "#f3f3f0", padding: "18px 24px", fontSize: 31, fontWeight: 700 }}>
                    {fit(highlight, 54)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ opacity: outroOpacity }}>
            <div style={{ fontSize: 72, lineHeight: 1.02, fontWeight: 900 }}>PDF report is ready.</div>
            <div style={{ marginTop: 22, fontSize: 35, lineHeight: 1.28, color: "rgba(0,0,0,0.58)" }}>
              {script ? fit(script, 126) : "Let me know which one stands out and I will take care of the next steps."}
            </div>
          </div>

          <div>
            <div style={{ height: 22, borderRadius: 999, background: "rgba(0,0,0,0.10)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #d489ff, #2da7df, #c8cc7c)",
                }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
