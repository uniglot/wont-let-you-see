import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Pattern definition in JSON files.
 * Can be:
 * - A regex string: "^vpc-[0-9a-f]{8,17}$"
 * - An object with pattern and optional contextual flag: { "pattern": "...", "contextual": true }
 * - An object with exact string match: { "exact": "literal-value" }
 */
export type PatternDefinition =
  | string
  | { pattern: string; contextual?: boolean }
  | { exact: string };

export interface PatternFile {
  [patternName: string]: PatternDefinition;
}

export interface LoadedPattern {
  name: string;
  pattern: RegExp;
  isContextual: boolean;
  isExact: boolean;
}

let cachedPatterns: LoadedPattern[] | null = null;

function getPackagePatternsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const srcDir = dirname(currentFile);
  const packageRoot = dirname(srcDir);
  return join(packageRoot, "patterns");
}

function parsePatternDefinition(
  name: string,
  definition: PatternDefinition,
): LoadedPattern {
  if (typeof definition === "string") {
    return {
      name,
      pattern: new RegExp(definition),
      isContextual: false,
      isExact: false,
    };
  }

  if ("exact" in definition) {
    const escaped = definition.exact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      name,
      pattern: new RegExp(escaped),
      isContextual: false,
      isExact: true,
    };
  }

  return {
    name,
    pattern: new RegExp(definition.pattern),
    isContextual: definition.contextual ?? false,
    isExact: false,
  };
}

function loadPatternFile(filePath: string): LoadedPattern[] {
  const content = readFileSync(filePath, "utf-8");
  const data: PatternFile = JSON.parse(content);
  const patterns: LoadedPattern[] = [];

  for (const [name, definition] of Object.entries(data)) {
    patterns.push(parsePatternDefinition(name, definition));
  }

  return patterns;
}

export function loadPatterns(): LoadedPattern[] {
  if (cachedPatterns) {
    return cachedPatterns;
  }

  const patternsDir = getPackagePatternsDir();
  const patterns: LoadedPattern[] = [];

  const files = readdirSync(patternsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of files) {
    const filePath = join(patternsDir, file);
    const filePatterns = loadPatternFile(filePath);
    patterns.push(...filePatterns);
  }

  cachedPatterns = patterns;
  return patterns;
}

export function resetPatternCache(): void {
  cachedPatterns = null;
}

export function getPatternByName(name: string): LoadedPattern | undefined {
  return loadPatterns().find((p) => p.name === name);
}
