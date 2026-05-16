import type { ClientSafeProperty, InternalPropertyTrace, PropertyImageReference } from "./types";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){8,}\d/g;
const URL_PATTERN = /\bhttps?:\/\/[^\s)]+/gi;

const INTERNAL_TERMS = [
  "agent",
  "broker",
  "brokerage",
  "contact",
  "listing platform",
  "source url",
  "whatsapp",
];

function cleanText(value: string | null | undefined): string | null {
  if (!value) return value ?? null;

  return value
    .replace(EMAIL_PATTERN, "")
    .replace(PHONE_PATTERN, "")
    .replace(URL_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanTextArray(values: string[]): string[] {
  return values
    .map((value) => cleanText(value))
    .filter((value): value is string => Boolean(value));
}

function cleanImages(images: PropertyImageReference[]): PropertyImageReference[] {
  return images.map((image, index) => ({
    id: image.id || `image-${index + 1}`,
    url: image.url,
    alt: cleanText(image.alt) || "Property image",
    role: image.role || "other",
  }));
}

function removeInternalTerms(value: string | null): string | null {
  if (!value) return value;

  const lower = value.toLowerCase();
  if (INTERNAL_TERMS.some((term) => lower.includes(term))) {
    return cleanText(value.replace(/agent|brokerage|broker|contact|whatsapp/gi, ""));
  }

  return value;
}

export function sanitizeClientSafeProperty(property: ClientSafeProperty): ClientSafeProperty {
  return {
    ...property,
    displayTitle: removeInternalTerms(cleanText(property.displayTitle)),
    area: cleanText(property.area),
    city: cleanText(property.city),
    propertyType: cleanText(property.propertyType),
    price: cleanText(property.price),
    currency: cleanText(property.currency),
    size: cleanText(property.size),
    shortHeadline: removeInternalTerms(cleanText(property.shortHeadline)) || "Recommended property",
    shortDescription:
      removeInternalTerms(cleanText(property.shortDescription)) || "A curated option matching the brief.",
    highlights: cleanTextArray(property.highlights),
    images: cleanImages(property.images),
  };
}

export function sanitizeClientSafeData(properties: ClientSafeProperty[]): ClientSafeProperty[] {
  return properties.map(sanitizeClientSafeProperty);
}

export function stripInternalTraceability(trace: InternalPropertyTrace[]): never[] {
  void trace;
  return [];
}
