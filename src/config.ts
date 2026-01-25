import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Config {
  enabled: boolean;
  revealedPatterns: string[];
  customPatterns: string[];
}

const DEFAULT_CONFIG: Config = {
  enabled: true,
  revealedPatterns: [],
  customPatterns: [],
};

const CONFIG_FILENAME = ".wont-let-you-see.json";

function loadJsonConfig(): Partial<Config> {
  const paths = [
    join(process.cwd(), CONFIG_FILENAME),
    join(homedir(), CONFIG_FILENAME),
  ];

  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content);
      } catch {}
    }
  }

  return {};
}

function loadEnvConfig(): Partial<Config> {
  const config: Partial<Config> = {};

  const enabled = process.env.WONT_LET_YOU_SEE_ENABLED;
  if (enabled !== undefined) {
    config.enabled = enabled.toLowerCase() !== "false" && enabled !== "0";
  }

  const revealedPatterns = process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS;
  if (revealedPatterns !== undefined) {
    config.revealedPatterns = revealedPatterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const customPatterns = process.env.WONT_LET_YOU_SEE_CUSTOM_PATTERNS;
  if (customPatterns !== undefined) {
    config.customPatterns = customPatterns
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  return config;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const jsonConfig = loadJsonConfig();
  const envConfig = loadEnvConfig();

  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...jsonConfig,
    ...envConfig,
  };

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export function isPatternEnabled(patternType: string): boolean {
  const config = getConfig();
  if (!config.enabled) {
    return false;
  }
  return !config.revealedPatterns.includes(patternType);
}
