/** Shapes produced by scripts/ingest-fonts.ts and consumed across the app. */

export interface FontAxis {
  tag: string;
  min: number;
  max: number;
  default: number;
}

export interface FontLicense {
  id: "OFL-1.1" | "Apache-2.0" | "UFL-1.0";
  name: string;
  url: string;
  redistributable: boolean;
  commercialUse: boolean;
  embedding: boolean;
  modification: boolean;
  /** Can you sell the font file itself? OFL says no. This is the one people get wrong. */
  sellingFontItself: boolean;
}

export interface FontProvenance {
  source: string;
  path: string;
  licenseFile: string;
}

export interface FontRecord {
  slug: string;
  family: string;
  category: FontCategory;
  designers: string[];
  subsets: string[];
  weights: number[];
  hasItalic: boolean;
  axes: FontAxis[];
  isVariable: boolean;
  /** 1 = most popular. Google's own ranking. */
  popularity: number;
  dateAdded: string;
  lastModified: string;
  sizeBytes: number;
  isNoto: boolean;
  license: FontLicense;
  provenance: FontProvenance;
}

export type FontCategory =
  | "Sans Serif"
  | "Serif"
  | "Display"
  | "Handwriting"
  | "Monospace";

export interface FontCatalogue {
  ingestedAt: string;
  source: { metadata: string; repository: string };
  count: number;
  fonts: FontRecord[];
}

export type SortKey = "popular" | "newest" | "name" | "size";

export interface FontQuery {
  q?: string;
  category?: FontCategory | "all";
  subset?: string;
  variable?: boolean;
  italic?: boolean;
  license?: FontLicense["id"] | "all";
  sort?: SortKey;
  page?: number;
  perPage?: number;
}
