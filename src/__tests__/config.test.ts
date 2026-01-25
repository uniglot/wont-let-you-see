import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getConfig, resetConfig, isPatternEnabled } from "../config";

describe("Config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe("getConfig", () => {
    it("should return enabled by default", () => {
      const config = getConfig();
      expect(config.enabled).toBe(true);
    });

    it("should respect WONT_LET_YOU_SEE_ENABLED=false", () => {
      process.env.WONT_LET_YOU_SEE_ENABLED = "false";
      const config = getConfig();
      expect(config.enabled).toBe(false);
    });

    it("should respect WONT_LET_YOU_SEE_ENABLED=0", () => {
      process.env.WONT_LET_YOU_SEE_ENABLED = "0";
      const config = getConfig();
      expect(config.enabled).toBe(false);
    });

    it("should treat WONT_LET_YOU_SEE_ENABLED=true as enabled", () => {
      process.env.WONT_LET_YOU_SEE_ENABLED = "true";
      const config = getConfig();
      expect(config.enabled).toBe(true);
    });

    it("should parse WONT_LET_YOU_SEE_REVEALED_PATTERNS", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "eks-cluster,arn,vpc";
      const config = getConfig();
      expect(config.revealedPatterns).toEqual(["eks-cluster", "arn", "vpc"]);
    });

    it("should trim whitespace from revealed patterns", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS =
        " eks-cluster , arn , vpc ";
      const config = getConfig();
      expect(config.revealedPatterns).toEqual(["eks-cluster", "arn", "vpc"]);
    });

    it("should filter empty patterns", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "eks-cluster,,arn";
      const config = getConfig();
      expect(config.revealedPatterns).toEqual(["eks-cluster", "arn"]);
    });

    it("should cache config after first load", () => {
      const config1 = getConfig();
      process.env.WONT_LET_YOU_SEE_ENABLED = "false";
      const config2 = getConfig();
      expect(config1).toBe(config2);
      expect(config2.enabled).toBe(true);
    });
  });

  describe("resetConfig", () => {
    it("should clear cached config", () => {
      const config1 = getConfig();
      expect(config1.enabled).toBe(true);

      process.env.WONT_LET_YOU_SEE_ENABLED = "false";
      resetConfig();

      const config2 = getConfig();
      expect(config2.enabled).toBe(false);
    });
  });

  describe("isPatternEnabled", () => {
    it("should return true for enabled patterns", () => {
      expect(isPatternEnabled("vpc")).toBe(true);
    });

    it("should return false when plugin is disabled", () => {
      process.env.WONT_LET_YOU_SEE_ENABLED = "false";
      expect(isPatternEnabled("vpc")).toBe(false);
    });

    it("should return false for revealed patterns", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "eks-cluster,arn";
      expect(isPatternEnabled("eks-cluster")).toBe(false);
      expect(isPatternEnabled("arn")).toBe(false);
      expect(isPatternEnabled("vpc")).toBe(true);
    });
  });
});
