export const AWS_PATTERNS = {
  arn: /^arn:(?:aws|aws-cn|aws-us-gov):[a-zA-Z0-9-]+:[a-z0-9-]*:(?:[0-9]{12})?:.+$/,
  eksCluster:
    /^arn:(?:aws|aws-cn|aws-us-gov):eks:[a-z0-9-]+:[0-9]{12}:cluster\/.+$/,
  vpc: /^vpc-[0-9a-f]{8,17}$/,
  subnet: /^subnet-[0-9a-f]{8,17}$/,
  securityGroup: /^sg-[0-9a-f]{8,17}$/,
  internetGateway: /^igw-[0-9a-f]{8,17}$/,
  routeTable: /^rtb-[0-9a-f]{8,17}$/,
  natGateway: /^nat-[0-9a-f]{8,17}$/,
  networkAcl: /^acl-[0-9a-f]{8,17}$/,
  ec2Instance: /^i-[0-9a-f]{8,17}$/,
  ami: /^ami-[0-9a-f]{8,17}$/,
  ebs: /^vol-[0-9a-f]{8,17}$/,
  snapshot: /^snap-[0-9a-f]{8,17}$/,
  eni: /^eni-[0-9a-f]{8,17}$/,
  vpcEndpoint: /^vpce-[0-9a-f]{8,17}$/,
  transitGateway: /^tgw-[0-9a-f]{8,17}$/,
  customerGateway: /^cgw-[0-9a-f]{8,17}$/,
  vpnGateway: /^vgw-[0-9a-f]{8,17}$/,
  vpnConnection: /^vpn-[0-9a-f]{8,17}$/,
  accountId: /"(?:OwnerId|AccountId|Owner|account_id)":\s*"(\d{12})"/,
  ecrRepoUri: /^\d{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9._\/-]+$/,
  accessKeyId:
    /(?:^|[^A-Z0-9])(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}(?:[^A-Z0-9]|$)/,
} as const;

export const K8S_PATTERNS = {
  serviceAccountToken: /^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/,
  nodeNameAws: /^ip-(?:\d{1,3}-){3}\d{1,3}\.[a-z0-9-]+\.compute\.internal$/,
  clusterEndpoint: /^https:\/\/[A-Z0-9]+\.[a-z0-9-]+\.eks\.amazonaws\.com$/,
  kubeconfigServer:
    /^https:\/\/[0-9A-F]{32}\.[a-z]{2}-[a-z]+-\d\.eks\.amazonaws\.com$/i,
} as const;

export const COMMON_PATTERNS = {
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  // Private key blocks (entire key including body and footer)
  privateKey:
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  // Generic API keys/tokens (contextual - in JSON/YAML fields)
  apiKeyField:
    /"(?:api_key|apiKey|secret_key|secretKey|access_token|auth_token|password|token)":\s*"([^"]+)"/,
} as const;
