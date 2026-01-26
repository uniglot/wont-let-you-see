import { describe, it, expect } from "vitest";
import { AWS_PATTERNS, K8S_PATTERNS, COMMON_PATTERNS } from "../patterns";

describe("AWS_PATTERNS", () => {
  describe("ARN", () => {
    it("should match aws partition", () => {
      expect(
        AWS_PATTERNS.arn.test("arn:aws:iam::123456789012:user/admin"),
      ).toBe(true);
    });

    it("should match aws-cn partition", () => {
      expect(AWS_PATTERNS.arn.test("arn:aws-cn:s3:::my-bucket")).toBe(true);
    });

    it("should match aws-us-gov partition", () => {
      expect(
        AWS_PATTERNS.arn.test(
          "arn:aws-us-gov:ec2:us-gov-west-1:123456789012:instance/i-123",
        ),
      ).toBe(true);
    });
  });

  describe("VPC resources", () => {
    it("should match vpc", () => {
      expect(AWS_PATTERNS.vpc.test("vpc-0123456789abcdef0")).toBe(true);
    });

    it("should match subnet", () => {
      expect(AWS_PATTERNS.subnet.test("subnet-0123456789abcdef0")).toBe(true);
    });

    it("should match security group", () => {
      expect(AWS_PATTERNS.securityGroup.test("sg-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match nat gateway", () => {
      expect(AWS_PATTERNS.natGateway.test("nat-0123456789abcdef0")).toBe(true);
    });

    it("should match network acl", () => {
      expect(AWS_PATTERNS.networkAcl.test("acl-0123456789abcdef0")).toBe(true);
    });

    it("should match eni", () => {
      expect(AWS_PATTERNS.eni.test("eni-0123456789abcdef0")).toBe(true);
    });
  });

  describe("EC2 resources", () => {
    it("should match ebs volume", () => {
      expect(AWS_PATTERNS.ebs.test("vol-0123456789abcdef0")).toBe(true);
    });

    it("should match snapshot", () => {
      expect(AWS_PATTERNS.snapshot.test("snap-0123456789abcdef0")).toBe(true);
    });
  });

  describe("VPC networking resources", () => {
    it("should match vpc endpoint", () => {
      expect(AWS_PATTERNS.vpcEndpoint.test("vpce-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match transit gateway", () => {
      expect(AWS_PATTERNS.transitGateway.test("tgw-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match customer gateway", () => {
      expect(AWS_PATTERNS.customerGateway.test("cgw-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should match vpn gateway", () => {
      expect(AWS_PATTERNS.vpnGateway.test("vgw-0123456789abcdef0")).toBe(true);
    });

    it("should match vpn connection", () => {
      expect(AWS_PATTERNS.vpnConnection.test("vpn-0123456789abcdef0")).toBe(
        true,
      );
    });

    it("should NOT match invalid vpc endpoint", () => {
      expect(AWS_PATTERNS.vpcEndpoint.test("vpce-invalid")).toBe(false);
    });
  });

  describe("ECR resources", () => {
    it("should match ECR repo URI", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with nested path", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "123456789012.dkr.ecr.eu-central-1.amazonaws.com/org/app/service",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with dots and underscores", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/my_repo.name",
        ),
      ).toBe(true);
    });

    it("should NOT match invalid ECR URI (wrong account ID length)", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "12345.dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(false);
    });

    it("should NOT match non-ECR docker registry", () => {
      expect(AWS_PATTERNS.ecrRepoUri.test("docker.io/library/nginx")).toBe(
        false,
      );
    });

    it("should match ECR repo URI with masked account ID", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "#(custom-1).dkr.ecr.us-west-2.amazonaws.com/my-repo",
        ),
      ).toBe(true);
    });

    it("should match ECR repo URI with masked account ID (higher number)", () => {
      expect(
        AWS_PATTERNS.ecrRepoUri.test(
          "#(custom-123).dkr.ecr.us-east-1.amazonaws.com/app/service",
        ),
      ).toBe(true);
    });
  });

  describe("Account ID (contextual)", () => {
    it("should match OwnerId field", () => {
      expect(AWS_PATTERNS.accountId.test('"OwnerId": "123456789012"')).toBe(
        true,
      );
    });

    it("should match account_id field (terraform style)", () => {
      expect(AWS_PATTERNS.accountId.test('"account_id": "123456789012"')).toBe(
        true,
      );
    });

    it("should NOT match bare number", () => {
      expect(AWS_PATTERNS.accountId.test("123456789012")).toBe(false);
    });
  });

  describe("Access Key ID", () => {
    it("should match AKIA prefix", () => {
      expect(AWS_PATTERNS.accessKeyId.test(" AKIAIOSFODNN7EXAMPLE ")).toBe(
        true,
      );
    });

    it("should match ASIA prefix (temporary)", () => {
      expect(AWS_PATTERNS.accessKeyId.test(" ASIAISAMPLEKEYID1234 ")).toBe(
        true,
      );
    });

    it("should NOT match random string", () => {
      expect(AWS_PATTERNS.accessKeyId.test("RANDOMSTRING12345678")).toBe(false);
    });
  });
});

describe("K8S_PATTERNS", () => {
  describe("Service Account Token", () => {
    it("should match JWT format", () => {
      const jwt =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4tYWJjZGUiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.signature";
      expect(K8S_PATTERNS.serviceAccountToken.test(jwt)).toBe(true);
    });
  });

  describe("Node Names", () => {
    it("should match AWS node name", () => {
      expect(
        K8S_PATTERNS.nodeNameAws.test(
          "ip-10-0-1-123.us-west-2.compute.internal",
        ),
      ).toBe(true);
    });
  });

  describe("Cluster Endpoints", () => {
    it("should match EKS endpoint", () => {
      expect(
        K8S_PATTERNS.clusterEndpoint.test(
          "https://ABCDEF1234567890ABCD.us-west-2.eks.amazonaws.com",
        ),
      ).toBe(true);
    });
  });
});

describe("COMMON_PATTERNS", () => {
  describe("IPv4", () => {
    it("should match IPv4", () => {
      expect(COMMON_PATTERNS.ipv4.test("192.168.1.1")).toBe(true);
    });

    it("should not match CIDR notation", () => {
      expect(COMMON_PATTERNS.ipv4.test("10.0.0.0/8")).toBe(false);
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
      expect(COMMON_PATTERNS.privateKey.test(rsaKey)).toBe(true);
    });

    it("should match entire generic private key block", () => {
      expect(COMMON_PATTERNS.privateKey.test(genericKey)).toBe(true);
    });

    it("should not match header only", () => {
      expect(
        COMMON_PATTERNS.privateKey.test("-----BEGIN RSA PRIVATE KEY-----"),
      ).toBe(false);
    });
  });

  describe("API Key Field (contextual)", () => {
    it("should match api_key field", () => {
      expect(
        COMMON_PATTERNS.apiKeyField.test('"api_key": "sk-1234567890abcdef"'),
      ).toBe(true);
    });

    it("should match password field", () => {
      expect(
        COMMON_PATTERNS.apiKeyField.test('"password": "supersecret123"'),
      ).toBe(true);
    });

    it("should match token field", () => {
      expect(
        COMMON_PATTERNS.apiKeyField.test('"token": "ghp_xxxxxxxxxxxx"'),
      ).toBe(true);
    });
  });
});

describe("ReDoS safety", () => {
  it("should handle pathological input quickly", () => {
    const pathological = "a".repeat(1000) + "b";
    const start = performance.now();

    const allPatterns = [
      ...Object.values(AWS_PATTERNS),
      ...Object.values(K8S_PATTERNS),
      ...Object.values(COMMON_PATTERNS),
    ];

    for (const pattern of allPatterns) {
      pattern.test(pathological);
    }

    expect(performance.now() - start).toBeLessThan(100);
  });
});
