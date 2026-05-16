export type PropertyCategory = "residential" | "commercial" | "land";
export type RentOrBuy = "rent" | "buy" | "unknown";
export type PackageStatus = "draft" | "processing" | "completed" | "failed";
export type PropertyImageRole = "hero" | "interior" | "amenity" | "other";

export interface AgentProfileInput {
  agentName: string;
  brokerageName: string;
  agentPhone: string;
  agentEmail: string;
  agentLogoUrl?: string | null;
  agentProfilePhotoUrl?: string | null;
  brandColors?: {
    primary?: string | null;
    secondary?: string | null;
  };
}

export interface PropertyImageReference {
  id: string;
  url: string;
  alt: string;
  role: PropertyImageRole;
}

export interface ClientSafeProperty {
  propertyId: string;
  displayTitle: string | null;
  area: string | null;
  city: string | null;
  propertyCategory: PropertyCategory;
  propertyType: string | null;
  rentOrBuy: RentOrBuy;
  price: string | null;
  currency: string | null;
  bedrooms: string | number | null;
  bathrooms: string | number | null;
  size: string | null;
  shortHeadline: string;
  shortDescription: string;
  highlights: string[];
  images: PropertyImageReference[];
}

export interface InternalPropertyTrace {
  propertyId: string;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  listingReferenceId: string | null;
  originalListingAgentName: string | null;
  originalListingAgentPhone: string | null;
  originalListingAgentEmail: string | null;
  internalNotes: string | null;
}

export interface PropertyHandoffNotes {
  propertyId: string;
  strongestValueAngle: string;
  suggestedVoiceoverAngle: string;
  bestImageOrder: string[];
  missingDataWarnings: string[];
  clientSafeConfirmed: boolean;
}

export interface PropertySearchResult {
  searchSummary: {
    interpretedBrief: string;
    assumptions: string[];
    propertyCategory: PropertyCategory;
    warnings: string[];
  };
  clientSafeProperties: ClientSafeProperty[];
  internalTraceability: InternalPropertyTrace[];
  handoffNotes: PropertyHandoffNotes[];
}

export interface GeneratePackageInput {
  clientName: string;
  agentProfile: AgentProfileInput;
  clientRequirement: string;
  rejectionReason?: string | null;
  rejectedPropertyUrl?: string | null;
  manualProperties?: ClientSafeProperty[];
}

export interface VideoPlanScene {
  sceneId: string;
  type:
    | "introGreeting"
    | "introContext"
    | "propertyNumber"
    | "propertyImage"
    | "outroPdf"
    | "outroClosing";
  startFrame: number;
  durationFrames: number;
  propertyId?: string;
  onScreenText?: string | null;
  voiceover?: string | null;
}

export interface PropShortsVideoPlan {
  durationSeconds: 60;
  fps: 30;
  format: "vertical";
  resolution: {
    width: 1080;
    height: 1920;
  };
  scenes: VideoPlanScene[];
  voiceoverScript: {
    intro: string;
    properties: Array<{
      propertyId: string;
      voiceover: string;
    }>;
    outroPdf: string;
    outroClosing: string;
  };
  clientSafeConfirmed: boolean;
}

export interface PackageGenerationResult {
  success: boolean;
  packageId: string;
  searchSummary: PropertySearchResult["searchSummary"];
  clientSafeProperties: ClientSafeProperty[];
  internalTraceability: InternalPropertyTrace[];
  videoPlan: PropShortsVideoPlan | null;
  pdfUrl: string | null;
  videoRender: {
    status: PackageStatus;
    videoUrl: string | null;
    jobId: string | null;
  };
  warnings: string[];
}
