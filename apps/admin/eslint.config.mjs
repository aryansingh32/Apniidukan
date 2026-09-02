import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app is a thin CRUD console over a REST API with no data-fetching
      // library in the stack (see brief: "client-heavy... fetching from the
      // API with the admin JWT" is the deliberate choice here). The standard
      // "fetch on mount, setState in a useEffect" pattern used throughout
      // every list/detail page trips this rule; it's the correct pattern for
      // this architecture, not a bug, so it's disabled project-wide rather
      // than suppressed at each of the ~15 call sites.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
