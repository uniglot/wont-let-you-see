import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mask, unmask } from "../masker";
import { createMapping } from "../mapping";
import { resetConfig } from "../config";
import { resetPatternCache } from "../patterns";

describe("masker", () => {
  const sessionId = "test-session-masker";
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "";
    resetConfig();
    resetPatternCache();
    createMapping(sessionId);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
    resetPatternCache();
  });

  describe("mask()", () => {
    it("should replace sensitive values with tokens", () => {
      const input = "VPC: vpc-1234567890abcdef0";
      const result = mask(sessionId, input);

      expect(result).toMatch(/VPC: #\(vpc-\d+\)/);
      expect(result).not.toContain("vpc-1234567890abcdef0");
    });

    it("should handle multiple different values with different tokens", () => {
      const input =
        "VPC1: vpc-1111111111111111, VPC2: vpc-2222222222222222, VPC3: vpc-3333333333333333, VPC4: vpc-4444444444444444, VPC5: vpc-5555555555555555";
      const result = mask(sessionId, input);

      // Extract all tokens
      const tokens = result.match(/#\(vpc-\d+\)/g) || [];
      expect(tokens).toHaveLength(5);

      // Verify all tokens are unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });

    it("should be idempotent (masking twice returns same result)", () => {
      const input = "VPC: vpc-1234567890abcdef0";
      const masked1 = mask(sessionId, input);
      const masked2 = mask(sessionId, masked1);

      expect(masked1).toBe(masked2);
    });

    it("should apply patterns in priority order (ARN before Account ID)", () => {
      const input =
        '{"OwnerId": "123456789012", "ClusterArn": "arn:aws:eks:us-east-1:123456789012:cluster/my-cluster"}';
      const result = mask(sessionId, input);

      // ARN should be masked as eks-cluster (not as arn containing account-id)
      expect(result).toMatch(/#\(eks-cluster-\d+\)/);
      // Account ID in JSON field should be masked separately
      expect(result).toMatch(/"OwnerId":\s*"#\(account-id-\d+\)"/);

      // Verify no double-masking (no tokens inside tokens)
      expect(result).not.toMatch(/#\([^)]*#\(/);
    });

    it("should preserve JSON validity after masking", () => {
      const input =
        '{"VpcId": "vpc-1234567890abcdef0", "SubnetId": "subnet-abcdef1234567890", "CidrBlock": "10.0.0.0/16"}';
      const result = mask(sessionId, input);

      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed.VpcId).toMatch(/#\(vpc-\d+\)/);
      expect(parsed.SubnetId).toMatch(/#\(subnet-\d+\)/);
      expect(parsed.CidrBlock).toMatch(/#\(ipv4-\d+\)\/16/);
    });

    it("should handle mixed content with multiple pattern types", () => {
      const input =
        "Instance i-1234567890abcdef0 in VPC vpc-abcdef1234567890 with IP 10.0.1.5 and CIDR 10.0.0.0/16";
      const result = mask(sessionId, input);

      expect(result).toMatch(/Instance #\(ec2-instance-\d+\)/);
      expect(result).toMatch(/VPC #\(vpc-\d+\)/);
      expect(result).toMatch(/IP #\(ipv4-\d+\)/);
      expect(result).toMatch(/CIDR #\(ipv4-\d+\)\/16/);
    });

    it("should mask IP portion of CIDR while preserving subnet mask", () => {
      const input = "CIDR: 10.0.0.0/16, IP: 10.0.1.5";
      const result = mask(sessionId, input);

      expect(result).toMatch(/CIDR: #\(ipv4-\d+\)\/16/);
      expect(result).toMatch(/IP: #\(ipv4-\d+\)/);
    });
  });

  describe("unmask()", () => {
    it("should replace tokens with original values", () => {
      const original = "VPC: vpc-1234567890abcdef0";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should handle unknown tokens with console.warn", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const input = "Unknown token: #(vpc-999)";
      const result = unmask(sessionId, input);

      // Should return literal token when unknown
      expect(result).toBe("Unknown token: #(vpc-999)");

      // Should log warning
      expect(warnSpy).toHaveBeenCalledWith("Unknown token: #(vpc-999)");

      warnSpy.mockRestore();
    });

    it("should not warn for valid tokens", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const original = "VPC: vpc-1234567890abcdef0";
      const masked = mask(sessionId, original);
      unmask(sessionId, masked);

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("config integration", () => {
    it("should not mask when plugin is disabled", () => {
      process.env.WONT_LET_YOU_SEE_ENABLED = "false";
      resetConfig();

      const input = "VPC: vpc-1234567890abcdef0";
      const result = mask(sessionId, input);

      expect(result).toBe(input);
    });

    it("should skip revealed patterns", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "vpc,subnet";
      resetConfig();

      const input = "VPC: vpc-1234567890abcdef0, SG: sg-abcdef1234567890";
      const result = mask(sessionId, input);

      expect(result).toContain("vpc-1234567890abcdef0");
      expect(result).toMatch(/SG: #\(security-group-\d+\)/);
    });

    it("should skip eks-cluster but fall back to generic ARN pattern", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "eks-cluster";
      resetConfig();

      const input =
        "EKS: arn:aws:eks:us-east-1:123456789012:cluster/my-cluster";
      const result = mask(sessionId, input);

      expect(result).toMatch(/EKS: #\(arn-\d+\)/);
      expect(result).not.toMatch(/#\(eks-cluster-/);
    });

    it("should not mask ARN when both eks-cluster and arn are revealed", () => {
      process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "eks-cluster,arn";
      resetConfig();

      const input =
        "EKS: arn:aws:eks:us-east-1:123456789012:cluster/my-cluster";
      const result = mask(sessionId, input);

      expect(result).toContain(
        "arn:aws:eks:us-east-1:123456789012:cluster/my-cluster",
      );
    });
  });

  describe("customPatterns with regex support", () => {
    it("should mask exact string patterns", () => {
      process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS = "my-secret-value";
      resetConfig();

      const input = "Secret: my-secret-value";
      const result = mask(sessionId, input);

      expect(result).toMatch(/Secret: #\(custom-\d+\)/);
      expect(result).not.toContain("my-secret-value");
    });

    it("should mask regex patterns with regex: prefix", () => {
      process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS =
        "regex:secret-[a-z]{3}-\\d{4}";
      resetConfig();

      const input = "Keys: secret-abc-1234, secret-xyz-5678";
      const result = mask(sessionId, input);

      expect(result).toMatch(/#\(custom-\d+\)/);
      expect(result).not.toContain("secret-abc-1234");
      expect(result).not.toContain("secret-xyz-5678");
    });

    it("should treat patterns without regex: prefix as literal strings", () => {
      process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS = "literal-value";
      resetConfig();

      const input = "Value: literal-value, Other: literal-values";
      const result = mask(sessionId, input);

      expect(result).toMatch(/Value: #\(custom-\d+\)/);
      expect(result).toContain("literal-values");
    });

    it("should round-trip custom regex patterns", () => {
      process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS = "regex:token-[A-Z]{8}";
      resetConfig();

      const original = "Auth: token-ABCDEFGH";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should support multiple custom patterns including regex", () => {
      process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS =
        "exact-secret,regex:pattern-\\d+";
      resetConfig();

      const input = "Secrets: exact-secret, pattern-123, pattern-456";
      const result = mask(sessionId, input);

      expect(result).not.toContain("exact-secret");
      expect(result).not.toContain("pattern-123");
      expect(result).not.toContain("pattern-456");
    });
  });

  describe("round-trip integrity", () => {
    it("should maintain round-trip integrity for VPC", () => {
      const original = "vpc-1234567890abcdef0";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should maintain round-trip integrity for ARN", () => {
      const original = "arn:aws:eks:us-east-1:123456789012:cluster/my-cluster";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should maintain round-trip integrity for Account ID in JSON", () => {
      const original = '{"OwnerId": "123456789012"}';
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should maintain round-trip integrity for CIDR (IP portion masked)", () => {
      const original = "10.0.0.0/16";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should maintain round-trip integrity for IPv4", () => {
      const original = "10.0.1.5";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });

    it("should maintain round-trip integrity for complex JSON", () => {
      const original =
        '{"VpcId": "vpc-1234567890abcdef0", "SubnetId": "subnet-abcdef1234567890", "CidrBlock": "10.0.0.0/16", "OwnerId": "123456789012"}';
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);

      // Verify JSON validity is preserved
      expect(() => JSON.parse(unmasked)).not.toThrow();
      expect(JSON.parse(unmasked)).toEqual(JSON.parse(original));
    });

    it("should maintain round-trip integrity for mixed content", () => {
      const original =
        "Instance i-1234567890abcdef0 in VPC vpc-abcdef1234567890 with IP 10.0.1.5 and CIDR 10.0.0.0/16";
      const masked = mask(sessionId, original);
      const unmasked = unmask(sessionId, masked);

      expect(unmasked).toBe(original);
    });
  });
});
