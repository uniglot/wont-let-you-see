import {
  existsSync as nodeExistsSync,
  readFileSync as nodeReadFileSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

export interface Config {
  enabled: boolean;
  revealedPatterns: string[];
  customPatterns: string[];
}

interface FsAdapter {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf-8") => string;
}

let fsAdapter: FsAdapter = {
  existsSync: nodeExistsSync,
  readFileSync: nodeReadFileSync,
};

export function setFsAdapter(adapter: FsAdapter): void {
  fsAdapter = adapter;
}

export function resetFsAdapter(): void {
  fsAdapter = { existsSync: nodeExistsSync, readFileSync: nodeReadFileSync };
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
    if (fsAdapter.existsSync(configPath)) {
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
  const ancestorConfig = findConfigInAncestors(process.cwd());
  if (ancestorConfig) {
    try {
      const content = fsAdapter.readFileSync(ancestorConfig, "utf-8");
      return JSON.parse(content);
    } catch {}
  }

  const homeConfig = join(homedir(), CONFIG_FILENAME);
  if (fsAdapter.existsSync(homeConfig)) {
    try {
      const content = fsAdapter.readFileSync(homeConfig, "utf-8");
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
