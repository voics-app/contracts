import type { Registries } from "../../src/domain/registry.ts";

/** A minimal but structurally complete set of registries for unit tests. */
export function sampleRegistries(): Registries {
  return {
    permissions: {
      permissions: [
        { name: "ADMINISTRATOR", bit: 3, value: "8", description: "Admin", channel_types: [], requires_mfa: true },
        { name: "VIEW_CHANNEL", bit: 10, value: "1024", description: "View", channel_types: ["text"], requires_mfa: false },
        { name: "PIN_MESSAGES", bit: 51, value: "2251799813685248", description: "Pin", channel_types: ["text"], requires_mfa: false },
      ],
    },
    intents: {
      intents: [
        { name: "GUILDS", bit: 0, value: 1, privileged: false, scope: "guild", events: ["GUILD_CREATE"] },
        { name: "GUILD_MEMBERS", bit: 1, value: 2, privileged: true, scope: "guild", events: [] },
      ],
    },
    protocol: {
      snowflake: { epoch_ms: 1767225600000, timestamp_bits: 42, worker_bits: 10, sequence_bits: 12, bucket_size_ms: 864000000, worker_ranges: [{ component: "api", min: 0, max: 63 }] },
      auth: { access_token_issuer: "discordy-api", access_token_ttl_s: 900 },
      gateway: {
        version: 1,
        heartbeat_interval_ms: 41250,
        opcodes: [
          { op: 0, name: "DISPATCH", direction: "receive", payload: null, description: "Dispatch." },
          { op: 10, name: "HELLO", direction: "receive", payload: "gateway/opcodes/hello.json", description: "Hello." },
        ],
        close_codes: [{ code: 4004, name: "AUTHENTICATION_FAILED", description: "Bad token.", reconnect: false }],
        dispatch_events: [
          { name: "READY", payload: "gateway/dispatch/ready.json", source: "gateway", topic: null, description: "Ready." },
          { name: "RESUMED", payload: null, source: "gateway", topic: null, description: "Resumed." },
          { name: "GUILD_CREATE", payload: "objects/guild.json", source: "api", topic: "discordy.guild.v1", description: "Guild." },
        ],
      },
      events: {
        envelope_version: 1,
        topics: [
          { name: "discordy.guild.v1", key: "guild_id", producers: ["api"] },
          { name: "discordy.telemetry.v1", key: "node_id", producers: ["voice"] },
        ],
        user_topic_events: [],
        bus_only_events: [{ name: "USAGE_TICK", payload: "events/usage-tick.json", topic: "discordy.telemetry.v1", description: "Tick." }],
      },
      voice: {
        path: "/voice",
        heartbeat_interval_ms: 13750,
        speaking_flags: [{ name: "MICROPHONE", value: 1 }],
        opcodes: [{ op: 8, name: "HELLO", direction: "receive", payload: "voice/opcodes/hello.json", description: "Hello." }],
        sfu_commands: [{ name: "close_session", payload: "voice/sfu/close-session.json", description: "Close." }],
        sfu_events: [{ name: "stats", payload: "voice/sfu/stats.json", description: "Stats." }],
      },
      rest: {
        base_path: "/api/v1",
        internal_base_path: "/internal/v1",
        rate_limit_headers: ["X-RateLimit-Limit"],
        error_codes: [{ code: 50160, name: "DELIVERY_MODE_CONFLICT", http_status: 409, description: "Conflict." }],
      },
      delivery_modes: [
        { name: "standard", strictness: 0 },
        { name: "p2p", strictness: 2 },
      ],
      delivery_mode_limits: { p2p_max_group_dm_members: 10 },
      enums: { ChannelType: { description: "Channel types.", values: [{ name: "GUILD_TEXT", value: 0 }] } },
    },
  };
}
