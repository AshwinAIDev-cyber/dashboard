import { defineConfig } from "orval";

/**
 * Generates two packages from openapi.yaml:
 *   - lib/api-client-react/src/generated  → React Query hooks + fetch client
 *   - lib/api-zod/src/generated           → Zod schemas used by api-server
 *
 * Run with: pnpm --filter @workspace/api-spec run codegen
 */
export default defineConfig({
  client: {
    input: { target: "./openapi.yaml" },
    output: {
      target: "../api-client-react/src/generated/api.ts",
      schemas: "../api-client-react/src/generated/schemas",
      mode: "split",
      client: "react-query",
      httpClient: "fetch",
      baseUrl: "/api",
      clean: true,
      prettier: true,
      indexFiles: true,
      override: {
        mutator: {
          path: "../api-client-react/src/custom-fetch.ts",
          name: "customFetch",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
  zod: {
    input: { target: "./openapi.yaml" },
    output: {
      target: "../api-zod/src/generated/api.ts",
      mode: "single",
      client: "zod",
      clean: true,
      prettier: true,
      override: {
        zod: {
          coerce: {
            param: true,
            query: true,
          },
        },
      },
    },
  },
});
