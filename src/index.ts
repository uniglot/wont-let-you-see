import type { Plugin, Hooks, PluginInput } from "@opencode-ai/plugin";
import { unmask, mask } from "./masker";
import { getConfig } from "./config";

const INFRA_COMMAND_PATTERN =
  /\b(aws|terraform|kubectl|helm|pulumi|tofu|terragrunt|vault|eksctl)\s/;

const SYSTEM_PROMPT_INJECTION = `
<wont-let-you-see-plugin>
This session uses the "wont-let-you-see" plugin that masks sensitive infrastructure values.

## What You See
- Sensitive values (VPCs, ARNs, IPs, keys, etc.) are replaced with tokens like \`#(vpc-1)\`, \`#(arn-2)\`, \`#(ipv4-3)\`
- You NEVER see the real values—only these masked tokens
- The plugin automatically unmasks tokens when you run infrastructure commands

## When Writing Commands
- Use the masked tokens you've seen (e.g., \`aws ec2 describe-vpcs --vpc-ids #(vpc-1)\`)
- The plugin will substitute the real values before execution

## When You Need a Value You Haven't Seen
If you need to write a sensitive value that wasn't shown to you (e.g., user provides a description but not the actual value):
1. Write a placeholder: \`#(FILL:description)\` where "description" explains what value is needed
2. Tell the user to replace the placeholder with the actual value
3. Example: "Please replace \`#(FILL:your-vpc-id)\` with your actual VPC ID"

## Important
- NEVER guess or fabricate sensitive values
- NEVER ask the user to reveal masked values to you—you don't need them
- The masking is intentional for security; work with the tokens as-is
</wont-let-you-see-plugin>
`.trim();

export const plugin: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const infraCommands = new Map<string, boolean>();

  return {
    "experimental.chat.system.transform": async (_hookInput, output) => {
      const config = getConfig();
      if (!config.enabled) {
        return;
      }
      output.system.push(SYSTEM_PROMPT_INJECTION);
    },

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
