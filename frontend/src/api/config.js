// Mock mode is ON when VITE_MOCK is truthy ("1", "true").
// Default: OFF (uses the real backend).
export const MOCK = ["1", "true", "yes"].includes(
  String(import.meta.env.VITE_MOCK || "").toLowerCase()
);
