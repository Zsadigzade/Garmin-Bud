import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildGarminBudServerEntry,
  mergeGarminBudConfig,
  readMcpConfig,
  writeMcpConfig,
} from "../src/mcpConfig.js";

describe("mcpConfig", () => {
  it("builds a stdio server entry with normalized paths", () => {
    const entry = buildGarminBudServerEntry({
      email: "runner@example.com",
      password: "secret",
      distIndexPath: "C:\\Projects\\garmin-bud\\dist\\index.js",
    });

    assert.equal(entry.command, "node");
    assert.deepEqual(entry.args, ["C:/Projects/garmin-bud/dist/index.js", "start"]);
    assert.deepEqual(entry.env, {
      GARMIN_EMAIL: "runner@example.com",
      GARMIN_PASSWORD: "secret",
    });
  });

  it("merges garmin-bud into an existing MCP config without removing other servers", () => {
    const merged = mergeGarminBudConfig(
      {
        mcpServers: {
          existing: {
            command: "node",
            args: ["existing.js"],
          },
        },
      },
      {
        email: "runner@example.com",
        password: "secret",
        distIndexPath: "/tmp/garmin-bud/dist/index.js",
      }
    );

    assert.ok(merged.mcpServers.existing);
    assert.ok(merged.mcpServers["garmin-bud"]);
    assert.equal(merged.mcpServers["garmin-bud"]?.args?.[0], "/tmp/garmin-bud/dist/index.js");
  });

  it("reads and writes MCP config files", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garminbud-mcp-"));
    const configPath = path.join(tempDir, "mcp.json");

    writeMcpConfig(configPath, {
      mcpServers: {
        "garmin-bud": buildGarminBudServerEntry({
          email: "runner@example.com",
          password: "secret",
          distIndexPath: "/tmp/garmin-bud/dist/index.js",
        }),
      },
    });

    const parsed = readMcpConfig(configPath);
    assert.ok(parsed.mcpServers["garmin-bud"]);
  });
});
