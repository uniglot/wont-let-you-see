# Contributing

Patterns are defined in JSON files under the [`patterns/`](patterns/) directory:

- `patterns/aws.json` — AWS resource patterns
- `patterns/kubernetes.json` — Kubernetes patterns
- `patterns/common.json` — Common patterns (IPs, keys, etc.)

You can request to add new files for resources of different categories.

## Pattern Format

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

## Adding New Patterns

1. Fork the repository
2. Add your pattern to the appropriate JSON file
3. Add tests in `src/__tests__/patterns.test.ts`
4. Submit a pull request
