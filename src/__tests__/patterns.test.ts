import { describe, it, expect, beforeEach } from "vitest";
import { loadPatterns, resetPatternCache, getPatternByName } from "../patterns";

function getPattern(name: string) {
  const p = getPatternByName(name);
  if (!p) throw new Error(`Pattern '${name}' not found`);
  return p.pattern;
}

describe("AWS Patterns", () => {
  beforeEach(() => {
    resetPatternCache();
  });

  describe("ARN", () => {
    it("should match aws partition", () => {
      expect(
        getPattern("arn").test("arn:aws:iam::123456789012:user/admin"),
      ).toBe(true);
    });

    it("should match aws-cn partition", () => {
      expect(getPattern("arn").test("arn:aws-cn:s3:::my-bucket")).toBe(true);
    });

    it("should match aws-us-gov partition", () => {
      expect(
        getPattern("arn").test(
          "arn:aws-us-gov:ec2:us-gov-west-1:123456789012:instance/i-123",
        ),
      ).toBe(true);
    });
  });

  describe("VPC resources", () => {
    it("should match vpc", () => {
      expect(getPattern("vpc").test("vpc-0123456789abcdef0")).toBe(true);
    });

    it("should match subnet", () => {
      expect(getPattern("subnet").test("subnet-0123456789abcdef0")).toBe(true);
    });

    it("should match security group", () => {
      expect(getPattern("security-group").test("sg-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match nat gateway", () => {
      expect(getPattern("nat-gateway").test("nat-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match network acl", () => {
      expect(getPattern("network-acl").test("acl-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match eni", () => {
      expect(getPattern("eni").test("eni-0123456789abcdef0")).toBe(true);
    });
  });

  describe("EC2 resources", () => {
    it("should match ebs volume", () => {
      expect(getPattern("ebs").test("vol-0123456789abcdef0")).toBe(true);
    });

    it("should match snapshot", () => {
      expect(getPattern("snapshot").test("snap-0123456789abcdef0")).toBe(true);
    });
  });

  describe("VPC networking resources", () => {
    it("should match vpc endpoint", () => {
      expect(getPattern("vpc-endpoint").test("vpce-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match transit gateway", () => {
      expect(getPattern("transit-gateway").test("tgw-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match customer gateway", () => {
      expect(getPattern("customer-gateway").test("cgw-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match vpn gateway", () => {
      expect(getPattern("vpn-gateway").test("vgw-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match vpn connection", () => {
      expect(getPattern("vpn-connection").test("vpn-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should NOT match invalid vpc endpoint", () => {
      expect(getPattern("vpc-endpoint").test("vpce-invalid")).toBe(false);
    });
  });

  describe("ECR resources", () => {
    it("should match ECR repo URI", () => {
      expect(
        getPattern("ecr-repo").test(
          "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with nested path", () => {
      expect(
        getPattern("ecr-repo").test(
          "123456789012.dkr.ecr.eu-central-1.amazonaws.com/org/app/service",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with dots and underscores", () => {
      expect(
        getPattern("ecr-repo").test(
          "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/my_repo.name",
        ),
      ).toBe(true);
    });

    it("should NOT match invalid ECR URI (wrong account ID length)", () => {
      expect(
        getPattern("ecr-repo").test(
          "12345.dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(false);
    });

    it("should NOT match non-ECR docker registry", () => {
      expect(getPattern("ecr-repo").test("docker.io/library/nginx")).toBe(
        false,
      );
    });

    it("should match ECR repo URI with masked account ID", () => {
      expect(
        getPattern("ecr-repo").test(
          "#(custom-1).dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with masked account ID (higher number)", () => {
      expect(
        getPattern("ecr-repo").test(
          "#(custom-123).dkr.ecr.us-east-1.amazonaws.com/app/service",
        ),
      ).toBe(true);
    });
  });

  describe("Account ID (contextual)", () => {
    it("should match OwnerId field", () => {
      expect(getPattern("account-id").test('"OwnerId": "123456789012"')).toBe(
        true,
      );
    });

    it("should match account_id field (terraform style)", () => {
      expect(
        getPattern("account-id").test('"account_id": "123456789012"'),
      ).toBe(true);
    });

    it("should NOT match bare number", () => {
      expect(getPattern("account-id").test("123456789012")).toBe(false);
    });
  });

  describe("Access Key ID", () => {
    it("should match AKIA prefix", () => {
      expect(getPattern("access-key-id").test(" AKIAIOSFODNN7EXAMPLE ")).toBe(
        true,
      );
    });

    it("should match ASIA prefix (temporary)", () => {
      expect(getPattern("access-key-id").test(" ASIAISAMPLEKEYID1234 ")).toBe(
        true,
      );
    });

    it("should NOT match random string", () => {
      expect(getPattern("access-key-id").test("RANDOMSTRING12345678")).toBe(
        false,
      );
    });
  });
});

describe("Kubernetes Patterns", () => {
  beforeEach(() => {
    resetPatternCache();
  });

  describe("Node Names", () => {
    it("should match AWS node name", () => {
      expect(
        getPattern("k8s-node").test("ip-10-0-1-123.us-west-2.compute.internal"),
      ).toBe(true);
    });
  });

  describe("Cluster Endpoints", () => {
    it("should match EKS endpoint", () => {
      expect(
        getPattern("k8s-endpoint").test(
          "https://ABCDEF1234567890ABCD.us-west-2.eks.amazonaws.com",
        ),
      ).toBe(true);
    });
  });
});

describe("Common Patterns", () => {
  beforeEach(() => {
    resetPatternCache();
  });

  describe("IPv4", () => {
    it("should match IPv4", () => {
      expect(getPattern("ipv4").test("192.168.1.1")).toBe(true);
    });

    it("should not match CIDR notation", () => {
      expect(getPattern("ipv4").test("10.0.0.0/8")).toBe(false);
    });
  });

  describe("Private Key", () => {
    const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MxszR0vOo
-----END RSA PRIVATE KEY-----`;

    const genericKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC
-----END PRIVATE KEY-----`;

    it("should match entire RSA private key block", () => {
      expect(getPattern("private-key").test(rsaKey)).toBe(true);
    });

    it("should match entire generic private key block", () => {
      expect(getPattern("private-key").test(genericKey)).toBe(true);
    });

    it("should not match header only", () => {
      expect(
        getPattern("private-key").test("-----BEGIN RSA PRIVATE KEY-----"),
      ).toBe(false);
    });
  });

  describe("API Key Field (contextual)", () => {
    it("should match api_key field", () => {
      expect(
        getPattern("api-key").test('"api_key": "sk-1234567890abcdef"'),
      ).toBe(true);
    });

    it("should match password field", () => {
      expect(getPattern("api-key").test('"password": "supersecret123"')).toBe(
        true,
      );
    });

    it("should match token field", () => {
      expect(getPattern("api-key").test('"token": "ghp_xxxxxxxxxxxx"')).toBe(
        true,
      );
    });
  });
});

describe("ReDoS safety", () => {
  beforeEach(() => {
    resetPatternCache();
  });

  it("should handle pathological input quickly", () => {
    const pathological = "a".repeat(1000) + "b";
    const start = performance.now();

    const allPatterns = loadPatterns();
    for (const { pattern } of allPatterns) {
      pattern.test(pathological);
    }

    expect(performance.now() - start).toBeLessThan(100);
  });
});

describe("loadPatterns", () => {
  beforeEach(() => {
    resetPatternCache();
  });

  it("should load patterns from JSON files", () => {
    const patterns = loadPatterns();
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("should load AWS patterns", () => {
    const patterns = loadPatterns();
    const vpcPattern = patterns.find((p) => p.name === "vpc");
    expect(vpcPattern).toBeDefined();
    expect(vpcPattern!.pattern.test("vpc-1234567890abcdef0")).toBe(true);
  });

  it("should load Kubernetes patterns", () => {
    const patterns = loadPatterns();
    const k8sNodePattern = patterns.find((p) => p.name === "k8s-node");
    expect(k8sNodePattern).toBeDefined();
  });

  it("should load common patterns", () => {
    const patterns = loadPatterns();
    const ipv4Pattern = patterns.find((p) => p.name === "ipv4");
    expect(ipv4Pattern).toBeDefined();
    expect(ipv4Pattern!.pattern.test("192.168.1.1")).toBe(true);
  });

  it("should mark contextual patterns correctly", () => {
    const patterns = loadPatterns();
    const accountIdPattern = patterns.find((p) => p.name === "account-id");
    expect(accountIdPattern).toBeDefined();
    expect(accountIdPattern!.isContextual).toBe(true);
  });

  it("should cache patterns after first load", () => {
    const patterns1 = loadPatterns();
    const patterns2 = loadPatterns();
    expect(patterns1).toBe(patterns2);
  });

  it("should reset cache on resetPatternCache()", () => {
    const patterns1 = loadPatterns();
    resetPatternCache();
    const patterns2 = loadPatterns();
    expect(patterns1).not.toBe(patterns2);
  });
});
