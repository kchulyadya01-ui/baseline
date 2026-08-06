/**
 * Stationery specifications, in millimetres.
 *
 * Real trim sizes, real bleed, real safe margins — the numbers a printer will
 * actually ask you for. Most free mockup tools skip all of this and hand you a
 * pretty JPEG that cannot be printed, which is a fun way to find out about
 * bleed at the worst possible moment.
 *
 * Pure data and arithmetic, no framework: the studio renders it and the
 * exporter measures it, and neither needs to know about the other.
 */

export interface StationerySpec {
  id: string;
  label: string;
  /** Trim size — what you get after cutting. */
  width: number;
  height: number;
  /** Ink beyond the trim, so a 1mm cutting drift does not show white. */
  bleed: number;
  /** Keep anything important inside this margin from the trim edge. */
  safe: number;
  note: string;
  /** Two-sided items get a back face. */
  hasBack: boolean;
}

export const SPECS: StationerySpec[] = [
  {
    id: "business-card",
    label: "Business card",
    width: 85,
    height: 55,
    bleed: 3,
    safe: 4,
    note: "85 × 55 mm — the European standard. The US uses 89 × 51 mm.",
    hasBack: true,
  },
  {
    id: "business-card-us",
    label: "Business card · US",
    width: 88.9,
    height: 50.8,
    bleed: 3,
    safe: 4,
    note: "3.5 × 2 in. Slightly wider and shorter than the European card.",
    hasBack: true,
  },
  {
    id: "letterhead",
    label: "Letterhead",
    width: 210,
    height: 297,
    bleed: 3,
    safe: 15,
    note: "A4. The safe margin is generous because a letter has to be readable, not just printable.",
    hasBack: false,
  },
  {
    id: "compliment-slip",
    label: "Compliment slip",
    width: 210,
    height: 99,
    bleed: 3,
    safe: 8,
    note: "DL, a third of A4. Fits a DL envelope without folding.",
    hasBack: false,
  },
  {
    id: "envelope-dl",
    label: "Envelope · DL",
    width: 220,
    height: 110,
    bleed: 3,
    // Postal sorting machines read the lower right; keep design out of it.
    safe: 10,
    note: "DL, 220 × 110 mm. Leave the lower right clear — that is where the sorting machine reads.",
    hasBack: false,
  },
  {
    id: "postcard-a6",
    label: "Postcard · A6",
    width: 148,
    height: 105,
    bleed: 3,
    safe: 5,
    note: "A6 landscape. Half an A5, quarter of an A4.",
    hasBack: true,
  },
];

export function getSpec(id: string): StationerySpec {
  return SPECS.find((s) => s.id === id) ?? SPECS[0];
}

/** Millimetres to pixels at a given DPI. 300 is the print standard. */
export function mmToPx(mm: number, dpi: number): number {
  return (mm / 25.4) * dpi;
}

export type LayoutId =
  | "classic"
  | "centred"
  | "sidebar"
  | "minimal"
  | "banner";

export const LAYOUTS: { id: LayoutId; label: string; note: string }[] = [
  { id: "classic", label: "Classic", note: "Name top-left, details beneath" },
  { id: "centred", label: "Centred", note: "Everything on the centre axis" },
  { id: "sidebar", label: "Sidebar", note: "Colour block down one edge" },
  { id: "minimal", label: "Minimal", note: "Name only, details on the back" },
  { id: "banner", label: "Banner", note: "Full-bleed colour band" },
];

export interface StationeryContent {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export const DEFAULT_CONTENT: StationeryContent = {
  name: "Anisha Bajracharya",
  role: "Graphic Designer",
  company: "Studio Baseline",
  email: "hello@studiobaseline.com",
  phone: "+977 1 4123456",
  website: "studiobaseline.com",
  address: "Jhamsikhel, Lalitpur, Nepal",
};

export interface StationeryStyle {
  displayFont: string;
  bodyFont: string;
  /** Background of the piece. */
  surface: string;
  /** Primary text. */
  ink: string;
  /** Rules, blocks, the sidebar. */
  accent: string;
  /** Secondary text — details, address. */
  muted: string;
}

export const DEFAULT_STYLE: StationeryStyle = {
  displayFont: "Playfair Display",
  bodyFont: "Inter",
  surface: "#faf7f2",
  ink: "#1c1917",
  accent: "#9a3412",
  muted: "#78716c",
};
