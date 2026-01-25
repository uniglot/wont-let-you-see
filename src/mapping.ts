import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

export interface MappingTable {
  version: number;
  entries: Record<string, string>;
}

interface SessionState {
  mapping: MappingTable;
  counters: Record<string, number>;
}

const sessionStates = new Map<string, SessionState>();

export function getSessionPath(sessionId: string): string {
  const projectRoot = process.cwd();
  const defaultPath = join(
    projectRoot,
    ".opencode",
    "sessions",
    sessionId,
    "wont-let-you-see-mapping.json",
  );

  if (existsSync(join(projectRoot, ".opencode")) || !existsSync(homedir())) {
    return defaultPath;
  }

  return join(
    homedir(),
    ".opencode",
    "sessions",
    sessionId,
    "wont-let-you-see-mapping.json",
  );
}

function ensureSessionDir(sessionPath: string): void {
  const dir = sessionPath.substring(0, sessionPath.lastIndexOf("/"));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getSessionState(sessionId: string): SessionState {
  let state = sessionStates.get(sessionId);

  if (!state) {
    const sessionPath = getSessionPath(sessionId);

    if (existsSync(sessionPath)) {
      const mapping = JSON.parse(
        readFileSync(sessionPath, "utf-8"),
      ) as MappingTable;
      const counters: Record<string, number> = {};

      for (const token of Object.keys(mapping.entries)) {
        const match = token.match(/^#\(([^-]+)-(\d+)\)$/);
        if (match && match[1] && match[2]) {
          const type = match[1];
          const num = match[2];
          counters[type] = Math.max(counters[type] || 0, parseInt(num, 10));
        }
      }

      state = { mapping, counters };
    } else {
      state = {
        mapping: { version: 1, entries: {} },
        counters: {},
      };
    }

    sessionStates.set(sessionId, state);
  }

  return state;
}

export function createMapping(sessionId: string): MappingTable {
  const state: SessionState = {
    mapping: { version: 1, entries: {} },
    counters: {},
  };

  sessionStates.set(sessionId, state);
  saveMapping(sessionId);

  return state.mapping;
}

export function loadMapping(sessionId: string): MappingTable {
  const state = getSessionState(sessionId);
  return state.mapping;
}

export function saveMapping(sessionId: string): void {
  const state = getSessionState(sessionId);
  const sessionPath = getSessionPath(sessionId);

  ensureSessionDir(sessionPath);

  const tempPath = `${sessionPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(state.mapping, null, 2), "utf-8");
  renameSync(tempPath, sessionPath);
}

export function addEntry(
  sessionId: string,
  type: string,
  originalValue: string,
): string {
  const state = getSessionState(sessionId);

  for (const [token, value] of Object.entries(state.mapping.entries)) {
    if (value === originalValue) {
      return token;
    }
  }

  const counter = (state.counters[type] || 0) + 1;
  state.counters[type] = counter;

  const token = `#(${type}-${counter})`;
  state.mapping.entries[token] = originalValue;

  saveMapping(sessionId);

  return token;
}

export function getOriginal(
  sessionId: string,
  token: string,
): string | undefined {
  const state = getSessionState(sessionId);
  return state.mapping.entries[token];
}

export function getToken(
  sessionId: string,
  originalValue: string,
): string | undefined {
  const state = getSessionState(sessionId);

  for (const [token, value] of Object.entries(state.mapping.entries)) {
    if (value === originalValue) {
      return token;
    }
  }

  return undefined;
}
