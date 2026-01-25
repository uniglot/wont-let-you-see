import { AWS_PATTERNS, K8S_PATTERNS, COMMON_PATTERNS } from "./patterns";
import { addEntry, getOriginal } from "./mapping";
import { getConfig, isPatternEnabled } from "./config";

interface PatternConfig {
  pattern: RegExp;
  type: string;
  isContextual?: boolean;
}

const PATTERN_ORDER: PatternConfig[] = [
  { pattern: AWS_PATTERNS.eksCluster, type: "eks-cluster" },
  { pattern: AWS_PATTERNS.arn, type: "arn" },
  { pattern: AWS_PATTERNS.accountId, type: "account-id", isContextual: true },
  { pattern: AWS_PATTERNS.accessKeyId, type: "access-key-id" },
  { pattern: AWS_PATTERNS.vpc, type: "vpc" },
  { pattern: AWS_PATTERNS.subnet, type: "subnet" },
  { pattern: AWS_PATTERNS.securityGroup, type: "security-group" },
  { pattern: AWS_PATTERNS.internetGateway, type: "internet-gateway" },
  { pattern: AWS_PATTERNS.routeTable, type: "route-table" },
  { pattern: AWS_PATTERNS.natGateway, type: "nat-gateway" },
  { pattern: AWS_PATTERNS.networkAcl, type: "network-acl" },
  { pattern: AWS_PATTERNS.eni, type: "eni" },
  { pattern: AWS_PATTERNS.ami, type: "ami" },
  { pattern: AWS_PATTERNS.ec2Instance, type: "ec2-instance" },
  { pattern: AWS_PATTERNS.ebs, type: "ebs" },
  { pattern: AWS_PATTERNS.snapshot, type: "snapshot" },

  { pattern: K8S_PATTERNS.serviceAccountToken, type: "k8s-token" },
  { pattern: K8S_PATTERNS.clusterEndpoint, type: "k8s-endpoint" },
  { pattern: K8S_PATTERNS.kubeconfigServer, type: "k8s-endpoint" },
  { pattern: K8S_PATTERNS.nodeNameAws, type: "k8s-node" },

  { pattern: COMMON_PATTERNS.privateKey, type: "private-key" },
  { pattern: COMMON_PATTERNS.apiKeyField, type: "api-key", isContextual: true },
  { pattern: COMMON_PATTERNS.ipv4, type: "ipv4" },
];

function removeAnchors(source: string): string {
  let result = source.replace(/^\^/, "").replace(/\$$/, "");
  if (!result.endsWith("\\b")) {
    result += "\\b";
  }
  return result;
}

export function mask(sessionId: string, text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  const config = getConfig();
  if (!config.enabled) {
    return text;
  }

  let result = text;

  for (const customPattern of config.customPatterns) {
    if (result.includes(customPattern)) {
      const token = addEntry(sessionId, "custom", customPattern);
      result = result.split(customPattern).join(token);
    }
  }

  for (const { pattern, type, isContextual } of PATTERN_ORDER) {
    if (!isPatternEnabled(type)) {
      continue;
    }
    if (isContextual) {
      result = result.replace(
        new RegExp(pattern.source, "g"),
        (match, capturedValue) => {
          const token = addEntry(sessionId, type, capturedValue);
          return match.replace(capturedValue, token);
        },
      );
    } else {
      const matches = new Set<string>();
      const globalPattern = new RegExp(removeAnchors(pattern.source), "g");

      let match;
      while ((match = globalPattern.exec(result)) !== null) {
        matches.add(match[0]);
      }

      for (const value of matches) {
        const token = addEntry(sessionId, type, value);
        result = result.split(value).join(token);
      }
    }
  }

  return result;
}

export function unmask(sessionId: string, text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;
  const tokenPattern = /#\([^)]+\)/g;
  const tokens = new Set<string>();

  let match;
  while ((match = tokenPattern.exec(text)) !== null) {
    tokens.add(match[0]);
  }

  for (const token of tokens) {
    const original = getOriginal(sessionId, token);

    if (original === undefined) {
      console.warn(`Unknown token: ${token}`);
    } else {
      result = result.split(token).join(original);
    }
  }

  return result;
}
