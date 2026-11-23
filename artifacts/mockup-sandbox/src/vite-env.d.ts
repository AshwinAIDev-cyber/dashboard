/// <reference types="vite/client" />

declare module "virtual:mockups" {
  import type { ComponentType } from "react";
  export const mockups: Record<string, () => Promise<{ default: ComponentType }>>;
}
