import { describe, expect, it } from "vitest";
import { buildConstantGroups } from "../../src/domain/constant-groups.ts";
import { renderElixirConstants } from "../../src/domain/renderers/elixir-constants.ts";
import { renderRustConstants } from "../../src/domain/renderers/rust-constants.ts";
import { renderRustEvents } from "../../src/domain/renderers/rust-events.ts";
import { renderTsConstants } from "../../src/domain/renderers/ts-constants.ts";
import { renderTsEvents } from "../../src/domain/renderers/ts-events.ts";
import { sampleRegistries } from "./fixtures.ts";

const registries = sampleRegistries();
const groups = buildConstantGroups(registries);
const titleOf = (path: string) => ({ "gateway/dispatch/ready.json": "ReadyEvent", "objects/guild.json": "Guild", "events/usage-tick.json": "UsageTickEvent", "gateway/opcodes/hello.json": "HelloPayload", "voice/opcodes/hello.json": "VoiceHelloPayload" })[path] ?? "Missing";

describe("TypeScript constants", () => {
  const out = renderTsConstants(groups);
  it("renders permissions as bigint flags and intents as numbers", () => {
    expect(out).toContain("ADMINISTRATOR: 1n << 3n,");
    expect(out).toContain("GUILD_MEMBERS: 1 << 1,");
    expect(out).toContain("export const Permissions = {");
  });
  it("renders strings, settings and big settings", () => {
    expect(out).toContain('GUILD: "discordy.guild.v1",');
    expect(out).toContain("EPOCH_MS: 1767225600000,");
    expect(out).toContain('ACCESS_TOKEN_ISSUER: "discordy-api",');
  });
});

describe("Rust constants", () => {
  const out = renderRustConstants(groups);
  it("renders one module per group with typed consts", () => {
    expect(out).toContain("pub mod permissions {");
    expect(out).toContain("pub const ADMINISTRATOR: u64 = 1 << 3;");
    expect(out).toContain("pub const GUILD_MEMBERS: u32 = 1 << 1;");
    expect(out).toContain("pub const HELLO: u8 = 10;");
    expect(out).toContain('pub const GUILD: &str = "discordy.guild.v1";');
    expect(out).toContain("pub const EPOCH_MS: u64 = 1767225600000;");
    expect(out).toContain("pub mod channel_type {");
  });
  it("lists every entry for iteration", () => {
    expect(out).toContain('pub const ALL_ENTRIES: &[(&str, u64)] = &[("ADMINISTRATOR", ADMINISTRATOR), ("VIEW_CHANNEL", VIEW_CHANNEL), ("PIN_MESSAGES", PIN_MESSAGES)];');
  });
});

describe("Elixir constants", () => {
  const files = renderElixirConstants(groups);
  it("renders one module per group with zero-arity functions and a map", () => {
    const permissions = files.find((f) => f.module === "Discordy.Contracts.Permissions");
    expect(permissions?.path).toBe("permissions.ex");
    expect(permissions?.source).toContain("def administrator, do: 8");
    expect(permissions?.source).toContain("administrator: 8,");
    const topics = files.find((f) => f.module === "Discordy.Contracts.Topics");
    expect(topics?.source).toContain('def guild, do: "discordy.guild.v1"');
  });
});

describe("event unions", () => {
  it("renders TypeScript payload maps", () => {
    const out = renderTsEvents(registries.protocol, titleOf);
    expect(out).toContain("READY: ReadyEvent;");
    expect(out).toContain("RESUMED: null;");
    expect(out).toContain("USAGE_TICK: UsageTickEvent;");
    expect(out).toContain("HELLO: HelloPayload;");
  });
  it("renders adjacently tagged Rust enums", () => {
    const out = renderRustEvents(registries.protocol, titleOf);
    expect(out).toContain('#[serde(tag = "t", content = "d")]');
    expect(out).toContain('#[serde(rename = "READY")]\n    Ready(ReadyEvent),');
    expect(out).toContain('#[serde(rename = "RESUMED")]\n    Resumed(Option<serde_json::Value>),');
    expect(out).toContain('#[serde(tag = "type", content = "data")]');
    expect(out).toContain("UsageTick(UsageTickEvent),");
  });
});
