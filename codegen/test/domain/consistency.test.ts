import { describe, expect, it } from "vitest";
import { checkConsistency } from "../../src/domain/consistency.ts";
import { sampleRegistries } from "./fixtures.ts";

const schemaPaths = new Set([
  "gateway/opcodes/hello.json",
  "gateway/dispatch/ready.json",
  "objects/guild.json",
  "events/usage-tick.json",
  "voice/opcodes/hello.json",
  "voice/sfu/close-session.json",
  "voice/sfu/stats.json",
]);

describe("checkConsistency", () => {
  it("accepts consistent registries", () => {
    expect(checkConsistency(sampleRegistries(), schemaPaths, ["standard", "p2p"])).toEqual([]);
  });

  it("reports payload paths without a schema", () => {
    const registries = sampleRegistries();
    registries.protocol.gateway.opcodes[1]!.payload = "gateway/opcodes/missing.json";
    expect(checkConsistency(registries, schemaPaths, ["standard", "p2p"])).toEqual(["gateway opcode HELLO: payload schema gateway/opcodes/missing.json does not exist"]);
  });

  it("reports bit values that do not match their bit position", () => {
    const registries = sampleRegistries();
    registries.permissions.permissions[0]!.value = "9";
    registries.intents.intents[1]!.value = 3;
    expect(checkConsistency(registries, schemaPaths, ["standard", "p2p"])).toEqual([
      "permission ADMINISTRATOR: value 9 is not 1 << 3",
      "intent GUILD_MEMBERS: value 3 is not 1 << 1",
    ]);
  });

  it("reports intent events that are not dispatch events and mismatched delivery modes", () => {
    const registries = sampleRegistries();
    registries.intents.intents[0]!.events.push("NOPE");
    expect(checkConsistency(registries, schemaPaths, ["standard", "ephemeral", "p2p"])).toEqual([
      "intent GUILDS: event NOPE is not a dispatch event",
      "delivery_modes [standard, p2p] differ from the DeliveryMode schema [standard, ephemeral, p2p]",
    ]);
  });

  it("reports duplicate names and opcodes", () => {
    const registries = sampleRegistries();
    registries.protocol.gateway.opcodes[1]!.op = 0;
    registries.protocol.gateway.dispatch_events.push({ ...registries.protocol.gateway.dispatch_events[0]! });
    expect(checkConsistency(registries, schemaPaths, ["standard", "p2p"])).toEqual(["gateway opcodes: duplicate 0", "dispatch events: duplicate READY"]);
  });
});
