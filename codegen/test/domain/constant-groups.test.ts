import { describe, expect, it } from "vitest";
import { buildConstantGroups, type ConstantGroup } from "../../src/domain/constant-groups.ts";
import { sampleRegistries } from "./fixtures.ts";

const group = (groups: ConstantGroup[], name: string): ConstantGroup => {
  const found = groups.find((g) => g.name === name);
  if (!found) throw new Error(`missing group ${name}`);
  return found;
};

describe("buildConstantGroups", () => {
  const groups = buildConstantGroups(sampleRegistries());

  it("exposes permissions as 64-bit flags", () => {
    const permissions = group(groups, "Permissions");
    expect(permissions.type).toBe("u64");
    expect(permissions.entries.find((e) => e.name === "ADMINISTRATOR")).toMatchObject({ value: 8n, bit: 3 });
    expect(permissions.entries.find((e) => e.name === "PIN_MESSAGES")?.value).toBe(1n << 51n);
  });

  it("derives permission and intent sets", () => {
    expect(group(groups, "PermissionSets").entries).toEqual([{ name: "ALL", value: 8n + 1024n + (1n << 51n), doc: "Every known permission." }]);
    const intentSets = group(groups, "IntentSets").entries;
    expect(intentSets.find((e) => e.name === "PRIVILEGED")?.value).toBe(2);
    expect(intentSets.find((e) => e.name === "ALL")?.value).toBe(3);
  });

  it("includes opcodes, close codes, enums, topics and event routing", () => {
    expect(group(groups, "GatewayOpcodes").entries.map((e) => [e.name, e.value])).toEqual([["DISPATCH", 0], ["HELLO", 10]]);
    expect(group(groups, "GatewayCloseCodes").entries[0]).toMatchObject({ name: "AUTHENTICATION_FAILED", value: 4004 });
    expect(group(groups, "ChannelType").entries[0]).toMatchObject({ name: "GUILD_TEXT", value: 0 });
    expect(group(groups, "Topics").entries[0]).toMatchObject({ name: "GUILD", value: "discordy.guild.v1" });
    expect(group(groups, "EventTopics").entries.map((e) => [e.name, e.value])).toEqual([["GUILD_CREATE", "discordy.guild.v1"], ["USAGE_TICK", "discordy.telemetry.v1"]]);
    expect(group(groups, "DispatchEvents").entries.map((e) => e.value)).toEqual(["READY", "RESUMED", "GUILD_CREATE"]);
  });

  it("exposes scalar protocol settings with a type per entry", () => {
    const gateway = group(groups, "Gateway");
    expect(gateway.type).toBe("mixed");
    expect(gateway.entries).toContainEqual({ name: "HEARTBEAT_INTERVAL_MS", value: 41250 });
    expect(group(groups, "Auth").entries).toContainEqual({ name: "ACCESS_TOKEN_ISSUER", value: "discordy-api" });
    expect(group(groups, "DeliveryModeStrictness").entries).toContainEqual({ name: "P2P", value: 2 });
  });
});
