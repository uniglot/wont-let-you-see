# Won't Let You See

I won't let those LLMs to see sensitive cloud infrastructure data!

`wont-let-you-see` is an OpenCode plugin that masks that kinds of data. It automatically intercepts and masks AWS resources, Kubernetes secrets, and other credentials, replacing them with safe tokens. LLMs don't get any bare tokens from the tool outputs, and from you.

> **Note**: Currently supports AWS only. GCP and Azure support may be added in the future.

## Installation

```bash
npm install @uniglot/wont-let-you-see
```

## Configuration

Add the plugin to your OpenCode configuration:

```json
{
  "plugins": ["@uniglot/wont-let-you-see"]
}
```

### Runtime Configuration

Configure via environment variables or JSON config file. Environment variables take precedence.

#### Environment Variables

| Variable                             | Description                                                                | Default |
| ------------------------------------ | -------------------------------------------------------------------------- | ------- |
| `WONT_LET_YOU_SEE_ENABLED`           | Set to `false` or `0` to disable masking                                   | `true`  |
| `WONT_LET_YOU_SEE_REVEALED_PATTERNS` | Comma-separated list of pattern types to reveal                            | (none)  |
| `WONT_LET_YOU_SEE_CUSTOM_PATTERNS`   | Comma-separated list of custom patterns to mask (supports `regex:` prefix) | (none)  |

#### JSON Config File

Create `.wont-let-you-see.json` in your project root, `~/.config/opencode/`, or home directory:

```json
{
  "enabled": true,
  "revealedPatterns": ["ipv4"],
  "customPatterns": ["123456789012", "my-secret-value"]
}
```

> **Tip**: Add your AWS account ID to `customPatterns`. The built-in `account-id` pattern only matches contextual fields like `"OwnerId": "123456789012"`, but may miss bare account IDs in terraform output or other contexts.

Custom patterns support both literal strings and regular expressions. Prefix with `regex:` to use regex:

```json
{
  "customPatterns": [
    "123456789012",
    "my-secret-value",
    "regex:secret-[a-z]{3}-\\d{4}"
  ]
}
```

#### Examples

```bash
# Disable the plugin entirely
WONT_LET_YOU_SEE_ENABLED=false opencode

# Reveal specific patterns (don't mask them)
WONT_LET_YOU_SEE_REVEALED_PATTERNS=eks-cluster,ipv4 opencode

# Mask custom values (e.g., AWS account ID)
WONT_LET_YOU_SEE_CUSTOM_PATTERNS=123456789012,my-secret opencode

# Mask with regex patterns
WONT_LET_YOU_SEE_CUSTOM_PATTERNS="regex:token-[A-Z]{8},my-literal-secret" opencode
```

## Supported Commands

The plugin automatically masks output from:

- `aws` - AWS CLI
- `terraform` - Terraform (AWS resources)
- `kubectl` - Kubernetes CLI
- `helm` - Helm package manager

## Supported Patterns

### AWS Resources

| Pattern Type        | Description                  | Example                                                 |
| ------------------- | ---------------------------- | ------------------------------------------------------- |
| `arn`               | Generic AWS ARNs             | `arn:aws:iam::123456789012:user/admin`                  |
| `eks-cluster`       | EKS Cluster ARNs             | `arn:aws:eks:us-west-2:123456789012:cluster/my-cluster` |
| `account-id`        | AWS Account IDs (contextual) | `"OwnerId": "123456789012"`                             |
| `access-key-id`     | AWS Access Key IDs           | `AKIAIOSFODNN7EXAMPLE`                                  |
| `secret-access-key` | AWS Secret Access Keys       | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`              |
| `vpc`               | VPC IDs                      | `vpc-0123456789abcdef0`                                 |
| `subnet`            | Subnet IDs                   | `subnet-0123456789abcdef0`                              |
| `security-group`    | Security Group IDs           | `sg-0123456789abcdef0`                                  |
| `internet-gateway`  | Internet Gateway IDs         | `igw-0123456789abcdef0`                                 |
| `route-table`       | Route Table IDs              | `rtb-0123456789abcdef0`                                 |
| `nat-gateway`       | NAT Gateway IDs              | `nat-0123456789abcdef0`                                 |
| `network-acl`       | Network ACL IDs              | `acl-0123456789abcdef0`                                 |
| `ec2-instance`      | EC2 Instance IDs             | `i-0123456789abcdef0`                                   |
| `ami`               | AMI IDs                      | `ami-0123456789abcdef0`                                 |
| `ebs`               | EBS Volume IDs               | `vol-0123456789abcdef0`                                 |
| `snapshot`          | EBS Snapshot IDs             | `snap-0123456789abcdef0`                                |
| `eni`               | Network Interface IDs        | `eni-0123456789abcdef0`                                 |
| `vpc-endpoint`      | VPC Endpoint IDs             | `vpce-0123456789abcdef0`                                |
| `transit-gateway`   | Transit Gateway IDs          | `tgw-0123456789abcdef0`                                 |
| `customer-gateway`  | Customer Gateway IDs         | `cgw-0123456789abcdef0`                                 |
| `vpn-gateway`       | VPN Gateway IDs              | `vgw-0123456789abcdef0`                                 |
| `vpn-connection`    | VPN Connection IDs           | `vpn-0123456789abcdef0`                                 |
| `ecr-repo`          | ECR Repository URIs          | `123456789012.dkr.ecr.us-west-2.amazonaws.com/my-repo`  |

### Kubernetes Resources (EKS)

| Pattern Type   | Description               | Example                            |
| -------------- | ------------------------- | ---------------------------------- |
| `k8s-endpoint` | EKS Cluster API Endpoints | `https://ABC123.eks.amazonaws.com` |
| `k8s-node`     | EKS Node Names            | `ip-10-0-1-123.compute.internal`   |

### Common Patterns

| Pattern Type          | Description                                   | Example                                                           |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `ipv4`                | IPv4 Addresses (including IP portion of CIDR) | `192.168.1.1`, `10.0.0.0/16` → `#(ipv4-1)/16`                     |
| `private-key`         | Private Key Blocks (entire key)               | `-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----` |
| `api-key`             | API Keys (contextual)                         | `"api_key": "sk-..."`                                             |
| `phone-us`            | US Phone Numbers                              | `+1-555-123-4567`, `(555) 123-4567`                               |
| `phone-kr`            | South Korean Phone Numbers                    | `010-1234-5678`, `+82-10-1234-5678`                               |
| `phone-international` | International Phone Numbers                   | `+44 20 7946 0958`                                                |
| `email`               | Email Addresses                               | `user@example.com`                                                |
| `uuid`                | UUID/GUID                                     | `550e8400-e29b-41d4-a716-446655440000`                            |
| `jwt`                 | JWT Tokens                                    | `eyJhbGciOiJIUzI1NiIs...`                                         |
| `base64-secret`       | Base64-encoded Secrets (contextual)           | `"secret": "SGVsbG8gV29ybGQ="`                                    |

## Token Format

Sensitive data is replaced with tokens: `#(type-N)`

Examples:

- `vpc-0a1b2c3d4e5f6g7h8` → `#(vpc-1)`
- `10.0.0.1` → `#(ipv4-1)`
- `10.0.0.0/16` → `#(ipv4-1)/16` (subnet mask preserved)
- `AKIAIOSFODNN7EXAMPLE` → `#(access-key-id-1)`
- `wJalrXUtnFEMI/K7MDENG...` → `#(secret-access-key-1)`
- `user@example.com` → `#(email-1)`
- `+1-555-123-4567` → `#(phone-us-1)`
- `eyJhbGciOiJIUzI1NiIs...` → `#(jwt-1)`
- Entire private key block → `#(private-key-1)`

## How It Works

1. **Before command execution**: Tokens in your command are replaced with original values
2. **After command execution**: Sensitive data in output is masked with tokens
3. **User messages**: Sensitive data you type is masked before reaching the LLM

The mapping persists across session restarts.

## Verifying the Plugin

The OpenCode UI shows original values, but the LLM only sees masked tokens.

**Quick test**: After running an AWS command, ask the LLM:

```
What was the actual VPC ID from the last command?
```

The LLM should only know the token (e.g., `#(vpc-1)`), not the real value.

## Contributing Patterns

Patterns are defined in JSON files under the `patterns/` directory:

- `patterns/aws.json` - AWS resource patterns
- `patterns/kubernetes.json` - Kubernetes patterns
- `patterns/common.json` - Common patterns (IPs, keys, etc.)

You can request to add new files for resources of different categories.

### Pattern Format

Each pattern can be defined as:

```json
{
  "pattern-name": "^regex-pattern$",

  "contextual-pattern": {
    "pattern": "\"field\":\\s*\"(captured-value)\"",
    "contextual": true
  },

  "literal-match": {
    "exact": "literal-string-to-match"
  }
}
```

- **Simple regex**: Just a string with the regex pattern
- **Contextual**: For patterns where only a captured group should be masked (e.g., JSON fields)
- **Exact match**: For literal strings that should be escaped

### Adding New Patterns

1. Fork the repository
2. Add your pattern to the appropriate JSON file
3. Add tests in `src/__tests__/patterns.test.ts`
4. Submit a pull request

## Limitations

- **AWS only**: Currently supports AWS. GCP and Azure are not yet supported. Do you need them? Feel free to contribute!
- **S3 Buckets**: Bucket names are not masked (often public/intentional).
- **Account IDs**: Only masked in contextual JSON fields. Add to `customPatterns` for full coverage.
- **UI display**: The UI shows original values (OpenCode limitation).

## License

MIT
