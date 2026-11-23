import { describe, it, expect } from "vitest";
import { fitSize } from "./photo";

describe("fitSize", () => {
  it("shrinks the long side to 1600", () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
  it("never enlarges small photos", () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
