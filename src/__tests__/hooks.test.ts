import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addEntry } from "../mapping";
import { plugin } from "../index";
import { resetConfig } from "../config";
import type { Hooks } from "@opencode-ai/plugin";

describe("tool.execute.before hook", () => {
  const sessionId = "test-session-hooks";
  const originalEnv = { ...process.env };
  let hooks: Hooks;

  beforeEach(async () => {
    process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "";
    resetConfig();
    hooks = await plugin({} as any);

    addEntry(sessionId, "vpc", "vpc-abc123");
    addEntry(sessionId, "subnet", "subnet-xyz789");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe("AWS command detection", () => {
    it("should detect aws commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-1" };
      const output = { args: { command: "aws ec2 describe-vpcs" } };

      const hook = hooks["tool.execute.before"];
      expect(hook).toBeDefined();

      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("aws ec2 describe-vpcs");
      }
    });

    it("should ignore non-aws commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-2" };
      const output = { args: { command: "ls -la" } };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("ls -la");
      }
    });

    it("should ignore git commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-3" };
      const output = { args: { command: "git status" } };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("git status");
      }
    });

    it("should ignore non-bash tools", async () => {
      const input = { tool: "read", sessionID: sessionId, callID: "call-4" };
      const output = { args: { command: "aws ec2 describe-vpcs" } };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("aws ec2 describe-vpcs");
      }
    });
  });

  describe("Token unmasking", () => {
    it("should unmask single token in aws command", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-5" };
      const output = {
        args: { command: "aws ec2 describe-vpcs --vpc-ids #(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "aws ec2 describe-vpcs --vpc-ids vpc-abc123",
        );
      }
    });

    it("should unmask multiple tokens in aws command", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-6" };
      const output = {
        args: {
          command:
            "aws ec2 describe-subnets --subnet-ids #(subnet-1) --filters Name=vpc-id,Values=#(vpc-1)",
        },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "aws ec2 describe-subnets --subnet-ids subnet-xyz789 --filters Name=vpc-id,Values=vpc-abc123",
        );
      }
    });

    it("should handle unknown tokens with warning", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const input = { tool: "bash", sessionID: sessionId, callID: "call-7" };
      const output = {
        args: { command: "aws ec2 describe-vpcs --vpc-ids #(vpc-999)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);

        expect(warnSpy).toHaveBeenCalledWith("Unknown token: #(vpc-999)");

        expect(output.args.command).toBe(
          "aws ec2 describe-vpcs --vpc-ids #(vpc-999)",
        );
      }

      warnSpy.mockRestore();
    });

    it("should not modify command structure", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-8" };
      const output = {
        args: {
          command: "aws ec2 describe-vpcs --vpc-ids #(vpc-1) --output json",
        },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);

        expect(output.args.command).toBe(
          "aws ec2 describe-vpcs --vpc-ids vpc-abc123 --output json",
        );
        expect(output.args.command).toContain("--output json");
        expect(output.args.command).toContain("--vpc-ids");
      }
    });

    it("should handle aws commands without tokens", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-9" };
      const output = { args: { command: "aws ec2 describe-vpcs" } };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("aws ec2 describe-vpcs");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle aws command with mixed content", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-10" };
      const output = {
        args: {
          command:
            "aws ec2 create-tags --resources #(vpc-1) --tags Key=Name,Value=MyVPC",
        },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "aws ec2 create-tags --resources vpc-abc123 --tags Key=Name,Value=MyVPC",
        );
      }
    });

    it("should handle command starting with whitespace", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-11" };
      const output = {
        args: { command: "  aws ec2 describe-vpcs --vpc-ids #(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "  aws ec2 describe-vpcs --vpc-ids vpc-abc123",
        );
      }
    });

    it("should handle AWS in uppercase", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-12" };
      const output = {
        args: { command: "AWS ec2 describe-vpcs --vpc-ids #(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "AWS ec2 describe-vpcs --vpc-ids #(vpc-1)",
        );
      }
    });

    it("should detect aws in piped commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-13" };
      const output = {
        args: { command: "cat data.json | aws s3 cp - s3://bucket/#(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "cat data.json | aws s3 cp - s3://bucket/vpc-abc123",
        );
      }
    });

    it("should detect aws after environment variables", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-14" };
      const output = {
        args: {
          command: "AWS_PROFILE=prod aws ec2 describe-vpcs --vpc-ids #(vpc-1)",
        },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "AWS_PROFILE=prod aws ec2 describe-vpcs --vpc-ids vpc-abc123",
        );
      }
    });

    it("should detect aws in chained commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-15" };
      const output = {
        args: {
          command:
            "echo 'starting' && aws ec2 describe-vpcs --vpc-ids #(vpc-1)",
        },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "echo 'starting' && aws ec2 describe-vpcs --vpc-ids vpc-abc123",
        );
      }
    });

    it("should detect terraform commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-16" };
      const output = {
        args: { command: "terraform plan -var vpc_id=#(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "terraform plan -var vpc_id=vpc-abc123",
        );
      }
    });

    it("should detect kubectl commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-17" };
      const output = {
        args: { command: "kubectl get pods -n #(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe("kubectl get pods -n vpc-abc123");
      }
    });

    it("should detect helm commands", async () => {
      const input = { tool: "bash", sessionID: sessionId, callID: "call-18" };
      const output = {
        args: { command: "helm install myapp --set vpc=#(vpc-1)" },
      };

      const hook = hooks["tool.execute.before"];
      if (hook) {
        await hook(input, output);
        expect(output.args.command).toBe(
          "helm install myapp --set vpc=vpc-abc123",
        );
      }
    });
  });
});

describe("tool.execute.after hook", () => {
  const sessionId = "test-session-after-hooks";
  const originalEnv = { ...process.env };
  let hooks: Hooks;

  beforeEach(async () => {
    process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "";
    resetConfig();
    hooks = await plugin({} as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe("AWS CLI JSON output masking", () => {
    it("should mask AWS resource IDs in JSON output", async () => {
      const callID = "call-after-1";
      const input = { tool: "bash", sessionID: sessionId, callID };

      // Simulate before hook to mark this as an AWS command
      const beforeOutput = { args: { command: "aws ec2 describe-vpcs" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: JSON.stringify({
          Vpcs: [{ VpcId: "vpc-0abc1234", CidrBlock: "10.0.0.0/16" }],
        }),
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      expect(hook).toBeDefined();

      if (hook) {
        await hook(input, output);

        const parsed = JSON.parse(output.output);
        expect(parsed.Vpcs[0].VpcId).toMatch(/^#\(vpc-\d+\)$/);
        expect(parsed.Vpcs[0].CidrBlock).toMatch(/^#\(ipv4-\d+\)\/16$/);
      }
    });

    it("should preserve JSON validity after masking", async () => {
      const callID = "call-after-2";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = { args: { command: "aws ec2 describe-subnets" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: JSON.stringify({
          Subnets: [{ SubnetId: "subnet-9abcd890", VpcId: "vpc-0abc1234" }],
        }),
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(() => JSON.parse(output.output)).not.toThrow();

        const parsed = JSON.parse(output.output);
        expect(parsed.Subnets).toBeDefined();
        expect(parsed.Subnets[0].SubnetId).toMatch(/^#\(subnet-\d+\)$/);
      }
    });
  });

  describe("AWS CLI text output masking", () => {
    it("should mask AWS resource IDs in text output", async () => {
      const callID = "call-after-3";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = { args: { command: "aws ec2 describe-vpcs" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: "VPC ID: vpc-0abc1234\nSubnet ID: subnet-9abcd890",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toMatch(/VPC ID: #\(vpc-\d+\)/);
        expect(output.output).toMatch(/Subnet ID: #\(subnet-\d+\)/);
        expect(output.output).not.toContain("vpc-0abc1234");
        expect(output.output).not.toContain("subnet-9abcd890");
      }
    });

    it("should mask IP addresses in text output", async () => {
      const callID = "call-after-4";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = { args: { command: "aws ec2 describe-instances" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: "Instance IP: 192.168.1.100\nCIDR: 10.0.0.0/16",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toMatch(/Instance IP: #\(ipv4-\d+\)/);
        expect(output.output).toMatch(/CIDR: #\(ipv4-\d+\)\/16/);
      }
    });
  });

  describe("AWS CLI error output masking", () => {
    it("should mask AWS resource IDs in error messages", async () => {
      const callID = "call-after-5";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = {
        args: { command: "aws ec2 describe-vpcs --vpc-ids vpc-0abc1234" },
      };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Error",
        output: "Error: VPC vpc-0abc1234 not found",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toMatch(/Error: VPC #\(vpc-\d+\) not found/);
        expect(output.output).not.toContain("vpc-0abc1234");
      }
    });
  });

  describe("Idempotent behavior", () => {
    it("should not double-mask already masked output", async () => {
      const callID = "call-after-6";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = { args: { command: "aws ec2 describe-vpcs" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: "VPC ID: #(vpc-1)",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toBe("VPC ID: #(vpc-1)");
      }
    });

    it("should handle mixed masked and unmasked content", async () => {
      const callID = "call-after-7";
      const input = { tool: "bash", sessionID: sessionId, callID };

      const beforeOutput = { args: { command: "aws ec2 describe-subnets" } };
      const beforeHook = hooks["tool.execute.before"];
      if (beforeHook) {
        await beforeHook(input, beforeOutput);
      }

      const output = {
        title: "AWS CLI Output",
        output: "VPC ID: #(vpc-1), Subnet ID: subnet-9abcd890",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toContain("#(vpc-1)");
        expect(output.output).toMatch(/Subnet ID: #\(subnet-\d+\)/);
        expect(output.output).not.toContain("subnet-9abcd890");
      }
    });
  });

  describe("Non-AWS command handling", () => {
    it("should not mask output from non-bash tools", async () => {
      const input = {
        tool: "read",
        sessionID: sessionId,
        callID: "call-after-8",
      };
      const output = {
        title: "File Content",
        output: "VPC ID: vpc-abc123",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toBe("VPC ID: vpc-abc123");
      }
    });

    it("should not mask output from non-AWS bash commands", async () => {
      const input = {
        tool: "bash",
        sessionID: sessionId,
        callID: "call-after-9",
      };
      const output = {
        title: "Git Status",
        output: "On branch main\nnothing to commit",
        metadata: {},
      };

      const hook = hooks["tool.execute.after"];
      if (hook) {
        await hook(input, output);

        expect(output.output).toBe("On branch main\nnothing to commit");
      }
    });
  });
});
describe("chat.message hook (UserPromptSubmit)", () => {
  const sessionId = "test-session-chat-message";
  const originalEnv = { ...process.env };
  let hooks: Hooks;

  beforeEach(async () => {
    process.env.WONT_LET_YOU_SEE_REVEALED_PATTERNS = "";
    resetConfig();
    hooks = await plugin({} as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfig();
  });

  describe("User prompt masking", () => {
    it("should mask sensitive data in user prompt", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "Check VPC vpc-0abc1234 and subnet subnet-9abc7890",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      expect(hook).toBeDefined();

      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(/Check VPC #\(vpc-\d+\)/);
        expect(output.parts[0].text).toMatch(/subnet #\(subnet-\d+\)/);
        expect(output.parts[0].text).not.toContain("vpc-0abc1234");
        expect(output.parts[0].text).not.toContain("subnet-9abc7890");
      }
    });

    it("should handle ARNs pasted by user", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "Check this ARN: arn:aws:ec2:us-east-1:123456789012:vpc/vpc-abc123",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(/Check this ARN: #\(arn-\d+\)/);
        expect(output.parts[0].text).not.toContain(
          "arn:aws:ec2:us-east-1:123456789012:vpc/vpc-abc123",
        );
      }
    });

    it("should handle VPC IDs pasted by user", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "I need help with vpc-0abc1234def5678",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(/I need help with #\(vpc-\d+\)/);
        expect(output.parts[0].text).not.toContain("vpc-0abc1234def5678");
      }
    });

    it("should handle IP addresses pasted by user", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          { type: "text" as const, text: "Server at 192.168.1.100 is down" },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(/Server at #\(ipv4-\d+\) is down/);
        expect(output.parts[0].text).not.toContain("192.168.1.100");
      }
    });

    it("should handle CIDR blocks pasted by user", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          { type: "text" as const, text: "Configure network with 10.0.0.0/16" },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(
          /Configure network with #\(ipv4-\d+\)\/16/,
        );
        expect(output.parts[0].text).not.toContain("10.0.0.0");
      }
    });
  });

  describe("Idempotent behavior", () => {
    it("should not double-mask already masked prompts", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          { type: "text" as const, text: "Check VPC #(vpc-1) status" },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toBe("Check VPC #(vpc-1) status");
      }
    });

    it("should handle mixed masked and unmasked content", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "VPC #(vpc-1) and subnet subnet-9abc7890",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toContain("#(vpc-1)");
        expect(output.parts[0].text).toMatch(/subnet #\(subnet-\d+\)/);
        expect(output.parts[0].text).not.toContain("subnet-9abc7890");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty message content", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [{ type: "text" as const, text: "" }] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toBe("");
      }
    });

    it("should handle message with no sensitive data", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [{ type: "text" as const, text: "Hello, how are you?" }] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toBe("Hello, how are you?");
      }
    });

    it("should handle multiple sensitive items in one prompt", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "Check vpc-0abc1234, subnet-9abc7890, and IP 192.168.1.100",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        expect(output.parts[0].text).toMatch(/#\(vpc-\d+\)/);
        expect(output.parts[0].text).toMatch(/#\(subnet-\d+\)/);
        expect(output.parts[0].text).toMatch(/#\(ipv4-\d+\)/);
        expect(output.parts[0].text).not.toContain("vpc-0abc1234");
        expect(output.parts[0].text).not.toContain("subnet-9abc7890");
        expect(output.parts[0].text).not.toContain("192.168.1.100");
      }
    });

    it("should not modify prompt structure beyond masking", async () => {
      const input = { sessionID: sessionId };
      const output = {
        message: { role: "user" } as any,
        parts: [
          {
            type: "text" as const,
            text: "Line 1: vpc-0abc1234\nLine 2: subnet-9abc7890\nLine 3: Done",
          },
        ] as any,
      };

      const hook = hooks["chat.message"];
      if (hook) {
        await hook(input, output);

        const lines = output.parts[0].text.split("\n");
        expect(lines).toHaveLength(3);
        expect(lines[0]).toMatch(/Line 1: #\(vpc-\d+\)/);
        expect(lines[1]).toMatch(/Line 2: #\(subnet-\d+\)/);
        expect(lines[2]).toBe("Line 3: Done");
      }
    });
  });
});
