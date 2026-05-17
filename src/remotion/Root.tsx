import type { ComponentType } from "react";
import { Composition } from "remotion";
import { PropertyShort, type PropertyShortProps } from "./PropertyShort";

const defaultProps: PropertyShortProps = {
  title: "PropShort",
  clientName: "Client",
  script: "",
  properties: [],
};

export function RemotionRoot() {
  return (
    <Composition
      id="PropertyShort"
      component={PropertyShort as unknown as ComponentType<Record<string, unknown>>}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
  );
}
