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

# Mask custom values with regex patterns
WONT_LET_YOU_SEE_CUSTOM_PATTERNS="regex:token-[A-Z]{8},123456789012" opencode
```

## How It Works

The plugin hooks into three points of the OpenCode lifecycle:

1. **Before command execution**: Tokens in your command are replaced with original values
2. **After command execution**: Sensitive data in output is masked with tokens
3. **User messages**: Sensitive data you type is masked before reaching the LLM

Masking is applied to output from `aws`, `terraform`, `kubectl`, and `helm` commands. Other commands are passed through unmodified.

Sensitive data is replaced with tokens in the format `#(type-N)`, for example, `vpc-0a1b2c3d4e5f6g7h8` becomes `#(vpc-1)`. The mapping between tokens and real values persists across session restarts.

## Supported Patterns

**AWS**: ARNs, EKS cluster ARNs, account IDs (contextual), access key IDs, secret access keys, VPC/subnet/security group IDs, internet/NAT/VPN/customer/transit gateways, route tables, network ACLs, EC2 instances, AMIs, EBS volumes, snapshots, ENIs, VPC endpoints, ECR repository URIs

**Kubernetes**: EKS cluster API endpoints, node names

**Common**: IPv4 addresses (CIDR-aware: `10.0.0.0/16` → `#(ipv4-1)/16`), private key blocks, API keys (contextual), phone numbers (US, KR, international), email addresses, UUIDs, JWTs, base64-encoded secrets (contextual)

See [`patterns/`](patterns/) for the full pattern definitions.

## Verifying the Plugin

After running an AWS command, ask the LLM:

```
What was the actual VPC ID from the last command?
```

The LLM should only know the token (e.g., `#(vpc-1)`), not the real value.

## Limitations

- **S3 Buckets**: Bucket names are not masked (often public/intentional).
- **Account IDs**: Only masked in contextual JSON fields. Add to `customPatterns` for full coverage.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new patterns.

## License

MIT
