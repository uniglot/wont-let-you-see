import { loadPatterns, type LoadedPattern } from "./patterns";
import { addEntry, getOriginal } from "./mapping";
import { getConfig, isPatternEnabled } from "./config";

function removeAnchors(source: string): string {
  let result = source.replace(/^\^/, "").replace(/\$$/, "");
  if (!result.endsWith("\\b")) {
    result += "\\b";
  }
  return result;
}

const REGEX_PREFIX = "regex:";

function applyCustomPatterns(
  sessionId: string,
  text: string,
  customPatterns: string[],
): string {
  let result = text;

  for (const customPattern of customPatterns) {
    if (customPattern.startsWith(REGEX_PREFIX)) {
      const regexStr = customPattern.slice(REGEX_PREFIX.length);
      const regex = new RegExp(removeAnchors(regexStr), "g");
      const matches = new Set<string>();
      let match;
      while ((match = regex.exec(result)) !== null) {
        matches.add(match[0]);
      }
      for (const value of matches) {
        const token = addEntry(sessionId, "custom", value);
        result = result.split(value).join(token);
      }
    } else {
      const escaped = customPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const literalRegex = new RegExp(escaped + "(?![\\w])", "g");
      if (literalRegex.test(result)) {
        const token = addEntry(sessionId, "custom", customPattern);
        result = result.replace(literalRegex, token);
      }
    }
  }

  return result;
}

function applyLoadedPatterns(
  sessionId: string,
  text: string,
  patterns: LoadedPattern[],
): string {
  let result = text;

  for (const { name, pattern, isContextual } of patterns) {
    if (!isPatternEnabled(name)) {
      continue;
    }

    if (isContextual) {
      result = result.replace(
        new RegExp(pattern.source, "g"),
        (match, capturedValue) => {
          const token = addEntry(sessionId, name, capturedValue);
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
        const token = addEntry(sessionId, name, value);
        result = result.split(value).join(token);
      }
    }
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

  result = applyCustomPatterns(sessionId, result, config.customPatterns);

  const patterns = loadPatterns();
  result = applyLoadedPatterns(sessionId, result, patterns);

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
