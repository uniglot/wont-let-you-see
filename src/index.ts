import type { Plugin, Hooks, PluginInput } from "@opencode-ai/plugin";
import { unmask, mask } from "./masker";

const INFRA_COMMAND_PATTERN = /\b(aws|terraform|kubectl|helm)\s/;

export const plugin: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const infraCommands = new Map<string, boolean>();

  return {
    "tool.execute.before": async (hookInput, output) => {
      if (hookInput.tool !== "bash") {
        return;
      }

      const command = output.args.command;
      if (!INFRA_COMMAND_PATTERN.test(command)) {
        return;
      }

      infraCommands.set(hookInput.callID, true);
      output.args.command = unmask(hookInput.sessionID, command);
    },

    "tool.execute.after": async (hookInput, output) => {
      if (hookInput.tool !== "bash") {
        return;
      }

      if (!infraCommands.get(hookInput.callID)) {
        return;
      }

      // Mask output sent to LLM
      output.output = mask(hookInput.sessionID, output.output);

      // Also mask TUI display (metadata.output is used as fallback in TUI rendering)
      if (output.metadata?.output) {
        output.metadata.output = mask(
          hookInput.sessionID,
          output.metadata.output,
        );
      }
    },

    "chat.message": async (hookInput, output) => {
      for (const part of output.parts) {
        if (part.type === "text" && part.text) {
          part.text = mask(hookInput.sessionID, part.text);
        }
      }
    },
  };
};
