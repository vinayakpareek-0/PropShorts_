export type InputType = "text" | "voice" | "url";

export type RunStatus = "draft" | "processing" | "completed" | "failed";

export interface BrokerProfile {
  id: string;
  userId: string;
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  role: "broker";
  createdAt: string;
  updatedAt: string;
}

export interface ClientRequirements {
  location: string;
  budget: number;
  currency: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  purpose: "buy" | "rent";
  sqftMin?: number;
  sqftMax?: number;
  additionalNotes?: string;
}

export interface ClientRequirement {
  id: string;
  userId: string;
  clientName: string;
  inputType: InputType;
  rawInput: string;
  sourceUrl?: string;
  audioFileUrl?: string;
  transcribedText?: string;
  requirementsJson?: ClientRequirements;
  refinedRequirementsJson?: ClientRequirements;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyHighlight {
  label: string;
}

export interface PropertyRecommendation {
  id: string;
  userId: string;
  runId: string;
  externalPropertyId?: string;
  title: string;
  area: string;
  city: string;
  propertyType: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  headline: string;
  description: string;
  highlights: string[];
  images: string[];
  sortOrder: number;
  createdAt: string;
}

export interface PropertyInternalTrace {
  id: string;
  recommendationId: string;
  sourceUrl?: string;
  platform?: string;
  listingId?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
}

export interface GeneratedVideo {
  id: string;
  userId: string;
  runId: string;
  recommendationId: string;
  provider?: string;
  providerJobId?: string;
  videoUrl?: string;
  script?: string;
  status: RunStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface GeneratedPdf {
  id: string;
  userId: string;
  runId: string;
  pdfUrl?: string;
  status: RunStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RecommendationRun {
  id: string;
  userId: string;
  requirementId: string;
  status: RunStatus;
  searchSummary?: SearchSummary;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface SearchSummary {
  interpretedBrief: string;
  assumptions: string[];
  propertyCategory: string;
}

export interface RecommendationPackage {
  id: string;
  userId: string;
  requirementId: string;
  runId: string;
  pdfId?: string;
  packageTitle: string;
  shareSlug: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PackageDetail extends RecommendationPackage {
  requirement: ClientRequirement;
  properties: PropertyRecommendation[];
  videos: GeneratedVideo[];
  pdf?: GeneratedPdf;
}

export type OutputType = "propshort_and_pdf" | "pdf_only";

export type {
  AgentProfileInput,
  ClientSafeProperty,
  GeneratePackageInput,
  InternalPropertyTrace,
  PackageGenerationResult,
  PackageStatus,
  PropertyCategory,
  PropertyHandoffNotes,
  PropertyImageReference,
  PropertySearchResult,
  PropShortsVideoPlan,
  RentOrBuy,
  VideoPlanScene,
} from "@/lib/propshorts/types";
