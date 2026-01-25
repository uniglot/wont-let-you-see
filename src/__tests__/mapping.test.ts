import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  createMapping,
  addEntry,
  getOriginal,
  getToken,
  loadMapping,
  saveMapping,
  getSessionPath,
} from "../mapping";

describe("Session Mapping Table", () => {
  const testSessionId = "test-session-mapping";
  const testSessionId2 = "test-session-mapping-2";

  beforeEach(() => {
    // Clean up test session directories before each test
    const sessionPath = getSessionPath(testSessionId);
    const sessionPath2 = getSessionPath(testSessionId2);
    const sessionDir = sessionPath.substring(0, sessionPath.lastIndexOf("/"));
    const sessionDir2 = sessionPath2.substring(
      0,
      sessionPath2.lastIndexOf("/"),
    );

    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    if (existsSync(sessionDir2)) {
      rmSync(sessionDir2, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test session directories after each test
    const sessionPath = getSessionPath(testSessionId);
    const sessionPath2 = getSessionPath(testSessionId2);
    const sessionDir = sessionPath.substring(0, sessionPath.lastIndexOf("/"));
    const sessionDir2 = sessionPath2.substring(
      0,
      sessionPath2.lastIndexOf("/"),
    );

    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }
    if (existsSync(sessionDir2)) {
      rmSync(sessionDir2, { recursive: true, force: true });
    }
  });

  describe("Test 1: createMapping initializes empty mapping", () => {
    it("should create an empty mapping for a new session", () => {
      const mapping = createMapping(testSessionId);

      expect(mapping).toBeDefined();
      expect(mapping.version).toBe(1);
      expect(mapping.entries).toEqual({});
    });

    it("should persist empty mapping to disk", () => {
      createMapping(testSessionId);

      const sessionPath = getSessionPath(testSessionId);
      expect(existsSync(sessionPath)).toBe(true);

      const fileContent = readFileSync(sessionPath, "utf-8");
      const parsed = JSON.parse(fileContent);

      expect(parsed.version).toBe(1);
      expect(parsed.entries).toEqual({});
    });
  });

  describe("Test 2: addEntry returns token #(type-N)", () => {
    it("should return token in format #(type-N) for first entry", () => {
      createMapping(testSessionId);
      const token = addEntry(testSessionId, "file", "/path/to/secret.txt");

      expect(token).toBe("#(file-1)");
    });

    it("should increment counter for same type", () => {
      createMapping(testSessionId);
      const token1 = addEntry(testSessionId, "file", "/path/to/secret1.txt");
      const token2 = addEntry(testSessionId, "file", "/path/to/secret2.txt");

      expect(token1).toBe("#(file-1)");
      expect(token2).toBe("#(file-2)");
    });

    it("should maintain separate counters for different types", () => {
      createMapping(testSessionId);
      const fileToken = addEntry(testSessionId, "file", "/path/to/secret.txt");
      const urlToken = addEntry(testSessionId, "url", "https://example.com");
      const fileToken2 = addEntry(testSessionId, "file", "/another/file.txt");

      expect(fileToken).toBe("#(file-1)");
      expect(urlToken).toBe("#(url-1)");
      expect(fileToken2).toBe("#(file-2)");
    });
  });

  describe("Test 3: getOriginal returns original value or undefined", () => {
    it("should return original value for valid token", () => {
      createMapping(testSessionId);
      const token = addEntry(testSessionId, "file", "/path/to/secret.txt");

      const original = getOriginal(testSessionId, token);
      expect(original).toBe("/path/to/secret.txt");
    });

    it("should return undefined for non-existent token", () => {
      createMapping(testSessionId);

      const original = getOriginal(testSessionId, "#(file-999)");
      expect(original).toBeUndefined();
    });

    it("should return undefined for invalid token format", () => {
      createMapping(testSessionId);

      const original = getOriginal(testSessionId, "invalid-token");
      expect(original).toBeUndefined();
    });
  });

  describe("Test 4: getToken returns existing token or undefined", () => {
    it("should return token for existing original value", () => {
      createMapping(testSessionId);
      const originalValue = "/path/to/secret.txt";
      const addedToken = addEntry(testSessionId, "file", originalValue);

      const foundToken = getToken(testSessionId, originalValue);
      expect(foundToken).toBe(addedToken);
      expect(foundToken).toBe("#(file-1)");
    });

    it("should return undefined for non-existent original value", () => {
      createMapping(testSessionId);
      addEntry(testSessionId, "file", "/path/to/secret.txt");

      const token = getToken(testSessionId, "/non/existent/path.txt");
      expect(token).toBeUndefined();
    });
  });

  describe("Test 5: Persistence - mapping survives reload", () => {
    it("should persist entries to disk and reload them", () => {
      createMapping(testSessionId);
      const token1 = addEntry(testSessionId, "file", "/path/to/secret.txt");
      const token2 = addEntry(testSessionId, "url", "https://example.com");

      // Load mapping from disk (simulating reload)
      const reloadedMapping = loadMapping(testSessionId);

      expect(reloadedMapping).toBeDefined();
      expect(reloadedMapping.entries[token1]).toBe("/path/to/secret.txt");
      expect(reloadedMapping.entries[token2]).toBe("https://example.com");
    });

    it("should maintain counter state after reload", () => {
      createMapping(testSessionId);
      addEntry(testSessionId, "file", "/path/to/secret1.txt");
      addEntry(testSessionId, "file", "/path/to/secret2.txt");

      // Add another entry after reload
      const token3 = addEntry(testSessionId, "file", "/path/to/secret3.txt");

      expect(token3).toBe("#(file-3)");
    });

    it("should verify JSON file structure on disk", () => {
      createMapping(testSessionId);
      addEntry(testSessionId, "file", "/path/to/secret.txt");

      const sessionPath = getSessionPath(testSessionId);
      const fileContent = readFileSync(sessionPath, "utf-8");
      const parsed = JSON.parse(fileContent);

      expect(parsed.version).toBe(1);
      expect(parsed.entries).toBeDefined();
      expect(typeof parsed.entries).toBe("object");
      expect(parsed.entries["#(file-1)"]).toBe("/path/to/secret.txt");
    });
  });

  describe("Test 6: Isolation - session A mappings don't affect session B", () => {
    it("should maintain separate mappings for different sessions", () => {
      createMapping(testSessionId);
      createMapping(testSessionId2);

      const tokenA = addEntry(testSessionId, "file", "/session-a/secret.txt");
      const tokenB = addEntry(testSessionId2, "file", "/session-b/secret.txt");

      expect(tokenA).toBe("#(file-1)");
      expect(tokenB).toBe("#(file-1)");

      const originalA = getOriginal(testSessionId, tokenA);
      const originalB = getOriginal(testSessionId2, tokenB);

      expect(originalA).toBe("/session-a/secret.txt");
      expect(originalB).toBe("/session-b/secret.txt");
    });

    it("should not find tokens from other sessions", () => {
      createMapping(testSessionId);
      createMapping(testSessionId2);

      const tokenA = addEntry(testSessionId, "file", "/session-a/secret.txt");

      // Try to get token from session A using session B
      const originalInB = getOriginal(testSessionId2, tokenA);
      expect(originalInB).toBeUndefined();
    });

    it("should create separate files for different sessions", () => {
      createMapping(testSessionId);
      createMapping(testSessionId2);

      addEntry(testSessionId, "file", "/session-a/secret.txt");
      addEntry(testSessionId2, "file", "/session-b/secret.txt");

      const pathA = getSessionPath(testSessionId);
      const pathB = getSessionPath(testSessionId2);

      expect(existsSync(pathA)).toBe(true);
      expect(existsSync(pathB)).toBe(true);
      expect(pathA).not.toBe(pathB);

      const contentA = JSON.parse(readFileSync(pathA, "utf-8"));
      const contentB = JSON.parse(readFileSync(pathB, "utf-8"));

      expect(contentA.entries["#(file-1)"]).toBe("/session-a/secret.txt");
      expect(contentB.entries["#(file-1)"]).toBe("/session-b/secret.txt");
    });
  });

  describe("Test 7: Idempotency - adding same value twice returns same token", () => {
    it("should return same token when adding identical value", () => {
      createMapping(testSessionId);
      const originalValue = "/path/to/secret.txt";

      const token1 = addEntry(testSessionId, "file", originalValue);
      const token2 = addEntry(testSessionId, "file", originalValue);

      expect(token1).toBe(token2);
      expect(token1).toBe("#(file-1)");
    });

    it("should not increment counter for duplicate values", () => {
      createMapping(testSessionId);
      const originalValue = "/path/to/secret.txt";

      addEntry(testSessionId, "file", originalValue);
      addEntry(testSessionId, "file", originalValue);
      const token3 = addEntry(testSessionId, "file", "/different/path.txt");

      expect(token3).toBe("#(file-2)");
    });

    it("should maintain single entry in mapping for duplicate values", () => {
      createMapping(testSessionId);
      const originalValue = "/path/to/secret.txt";

      addEntry(testSessionId, "file", originalValue);
      addEntry(testSessionId, "file", originalValue);

      const mapping = loadMapping(testSessionId);
      const entries = Object.entries(mapping.entries);

      expect(entries.length).toBe(1);
      expect(entries[0]?.[0]).toBe("#(file-1)");
      expect(entries[0]?.[1]).toBe(originalValue);
    });
  });
});
