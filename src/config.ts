import { existsSync, readFileSync } from "fs";
import { join, dirname, parse } from "path";
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

function findConfigInAncestors(startDir: string): string | null {
  const home = homedir();
  let currentDir = startDir;

  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return configPath;
    }

    if (currentDir === home) {
      break;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

function loadJsonConfig(): Partial<Config> {
  // First, search up from cwd to find nearest config
  const ancestorConfig = findConfigInAncestors(process.cwd());
  if (ancestorConfig) {
    try {
      const content = readFileSync(ancestorConfig, "utf-8");
      return JSON.parse(content);
    } catch {}
  }

  // Fall back to home directory
  const homeConfig = join(homedir(), CONFIG_FILENAME);
  if (existsSync(homeConfig)) {
    try {
      const content = readFileSync(homeConfig, "utf-8");
      return JSON.parse(content);
    } catch {}
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
