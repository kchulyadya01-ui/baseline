// opentype.js ships no type declarations. This covers only the surface that
// scripts/index-glyphs.ts actually uses.
declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Path {
    commands: {
      type: "M" | "L" | "C" | "Q" | "Z";
      x?: number;
      y?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    }[];
  }

  export interface Glyph {
    unicode?: number;
    getPath(x: number, y: number, fontSize: number): Path;
    getBoundingBox(): BoundingBox;
  }

  export interface Font {
    unitsPerEm: number;
    tables?: { os2?: { sxHeight?: number; sCapHeight?: number } };
    charToGlyph(character: string): Glyph;
  }

  export function parse(buffer: ArrayBuffer): Font;

  const opentype: { parse: typeof parse };
  export default opentype;
}
