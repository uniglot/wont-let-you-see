import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getConfig, resetConfig, isPatternEnabled } from "../config";
import * as path from "path";

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

describe("Config", () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd;

  beforeEach(() => {
    resetConfig();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue("{}");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.cwd = originalCwd;
    resetConfig();
    vi.clearAllMocks();
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

  describe("ancestor directory config lookup", () => {
    it("should find config in parent directory when cwd is subdirectory", () => {
      process.cwd = () => "/project/packages/app";

      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join("/project", ".wont-let-you-see.json");
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ enabled: false, customPatterns: ["secret123"] }),
      );

      const config = getConfig();
      expect(config.enabled).toBe(false);
      expect(config.customPatterns).toEqual(["secret123"]);
    });

    it("should find config in grandparent directory", () => {
      process.cwd = () => "/project/packages/app/src/components";

      mockExistsSync.mockImplementation((p: string) => {
        return p === path.join("/project", ".wont-let-you-see.json");
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ revealedPatterns: ["ipv4"] }),
      );

      const config = getConfig();
      expect(config.revealedPatterns).toEqual(["ipv4"]);
    });

    it("should prefer config in closer ancestor over distant ancestor", () => {
      process.cwd = () => "/project/packages/app";

      mockExistsSync.mockImplementation((p: string) => {
        return (
          p === path.join("/project/packages/app", ".wont-let-you-see.json") ||
          p === path.join("/project", ".wont-let-you-see.json")
        );
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (
          p === path.join("/project/packages/app", ".wont-let-you-see.json")
        ) {
          return JSON.stringify({ customPatterns: ["app-secret"] });
        }
        return JSON.stringify({ customPatterns: ["root-secret"] });
      });

      const config = getConfig();
      expect(config.customPatterns).toEqual(["app-secret"]);
    });

    it("should prefer cwd config over parent config", () => {
      process.cwd = () => "/project/subdir";

      mockExistsSync.mockImplementation((p: string) => {
        return (
          p === path.join("/project/subdir", ".wont-let-you-see.json") ||
          p === path.join("/project", ".wont-let-you-see.json")
        );
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === path.join("/project/subdir", ".wont-let-you-see.json")) {
          return JSON.stringify({ enabled: false });
        }
        return JSON.stringify({ enabled: true });
      });

      const config = getConfig();
      expect(config.enabled).toBe(false);
    });
  });
});
