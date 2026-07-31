import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // User-uploaded images are served straight from the Vercel Blob CDN with a
    // plain <img>, deliberately not through next/image.
    //
    // next/image would run attacker-supplied bytes through sharp/libvips, which
    // currently ships with unpatched CVEs (see `npm audit`) and has no fixed
    // release available in any Next 16 line. The blob is already CDN-cached and
    // we record intrinsic dimensions at upload time, so the optimiser buys
    // almost nothing here and costs a real attack surface.
    //
    // Revisit when sharp is patched upstream.
    files: [
      "src/components/community/**/*.tsx",
      "src/app/community/**/*.tsx",
      "src/app/u/**/*.tsx",
      "src/app/collections/**/*.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
