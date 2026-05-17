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
      durationInFrames={360}
      fps={24}
      width={720}
      height={1280}
      defaultProps={defaultProps}
    />
  );
}
