import type { ComponentType } from "react";
import { Composition } from "remotion";
import { PropertyShort, propertyShortDurationInFrames, type PropertyShortProps } from "./PropertyShort";

const defaultProps: PropertyShortProps = {
  title: "PropShort",
  clientName: "Client",
  script: "",
  brokerProfile: {
    fullName: "Your Property Expert",
    companyName: "PropShorts Real Estate",
    phone: "Contact via broker",
    photoUrl: null,
  },
  properties: [],
};

export function RemotionRoot() {
  return (
    <Composition
      id="PropertyShort"
      component={PropertyShort as unknown as ComponentType<Record<string, unknown>>}
      width={720}
      height={1280}
      fps={24}
      durationInFrames={propertyShortDurationInFrames(defaultProps.properties)}
      calculateMetadata={({ props }) => ({
        durationInFrames: propertyShortDurationInFrames(Array.isArray(props.properties) ? props.properties : []),
      })}
      defaultProps={defaultProps}
    />
  );
}
