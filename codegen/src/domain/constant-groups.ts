import { busEvents, scalarsOf, type EnumValue, type Registries, type Scalar } from "./registry.ts";

/**
 * Language-neutral constants. `type` fixes the integer width for typed languages;
 * `mixed` groups hold scalar settings whose type follows each value (number or string).
 */
export type ConstantType = "u64" | "u32" | "u16" | "u8" | "str" | "mixed";

export interface ConstantEntry {
  name: string;
  value: bigint | Scalar;
  doc?: string;
  bit?: number;
}

export interface ConstantGroup {
  name: string;
  doc: string;
  type: ConstantType;
  entries: ConstantEntry[];
}

const upper = (key: string): string => key.toUpperCase();
const topicConstantName = (topic: string): string => topic.replace(/^discordy\./, "").replace(/\.v\d+$/, "").toUpperCase();
const enumEntries = (values: EnumValue[]): ConstantEntry[] => values.map(({ name, value }) => ({ name, value }));
const scalarEntries = (section: object): ConstantEntry[] => scalarsOf(section).map(([key, value]) => ({ name: upper(key), value }));
const stringEntries = (names: string[]): ConstantEntry[] => names.map((name) => ({ name, value: name }));

export function buildConstantGroups({ permissions, intents, protocol }: Registries): ConstantGroup[] {
  const permissionEntries = permissions.permissions.map((p) => ({ name: p.name, value: 1n << BigInt(p.bit), doc: p.description, bit: p.bit }));
  const intentEntries = intents.intents.map((i) => ({
    name: i.name,
    value: 1 << i.bit,
    doc: `${i.privileged ? "Privileged. " : ""}Events: ${i.events.length ? i.events.join(", ") : "none (gates data, not events)"}.`,
    bit: i.bit,
  }));
  const orAll = (values: number[]): number => values.reduce((acc, v) => acc | v, 0);

  const snowflakeRanges = protocol.snowflake.worker_ranges.flatMap((r) => [
    { name: `${upper(r.component)}_WORKER_MIN`, value: r.min },
    { name: `${upper(r.component)}_WORKER_MAX`, value: r.max },
  ]);

  return [
    { name: "Permissions", doc: "Permission bit flags (Discord values). Serialize permission sets as decimal strings.", type: "u64", entries: permissionEntries },
    { name: "PermissionSets", doc: "Derived permission sets.", type: "u64", entries: [{ name: "ALL", value: permissionEntries.reduce((acc, p) => acc | p.value, 0n), doc: "Every known permission." }] },
    { name: "Intents", doc: "Gateway intent bit flags (Discord values).", type: "u32", entries: intentEntries },
    {
      name: "IntentSets",
      doc: "Derived intent sets.",
      type: "u32",
      entries: [
        { name: "PRIVILEGED", value: orAll(intents.intents.filter((i) => i.privileged).map((i) => 1 << i.bit)), doc: "Intents that require approval for bots." },
        { name: "ALL", value: orAll(intents.intents.map((i) => 1 << i.bit)), doc: "Every known intent (implicit for user sessions)." },
      ],
    },
    { name: "GatewayOpcodes", doc: "Gateway opcodes.", type: "u8", entries: protocol.gateway.opcodes.map((o) => ({ name: o.name, value: o.op, doc: o.description })) },
    { name: "GatewayCloseCodes", doc: "Gateway WebSocket close codes.", type: "u16", entries: protocol.gateway.close_codes.map((c) => ({ name: c.name, value: c.code, doc: `${c.description} Reconnect: ${c.reconnect ? "yes" : "no"}.` })) },
    { name: "DispatchEvents", doc: "Gateway dispatch event names (`t`).", type: "str", entries: stringEntries(protocol.gateway.dispatch_events.map((e) => e.name)) },
    { name: "VoiceOpcodes", doc: "Voice WebSocket opcodes.", type: "u8", entries: protocol.voice.opcodes.map((o) => ({ name: o.name, value: o.op, doc: o.description })) },
    { name: "SpeakingFlags", doc: "Voice SPEAKING bitmask flags.", type: "u8", entries: enumEntries(protocol.voice.speaking_flags) },
    { name: "SfuCommands", doc: "SFU control commands (`cmd`).", type: "str", entries: protocol.voice.sfu_commands.map((c) => ({ name: upper(c.name), value: c.name, doc: c.description })) },
    { name: "SfuEvents", doc: "SFU control events (`evt`).", type: "str", entries: protocol.voice.sfu_events.map((e) => ({ name: upper(e.name), value: e.name, doc: e.description })) },
    { name: "Topics", doc: "Redpanda topics.", type: "str", entries: protocol.events.topics.map((t) => ({ name: topicConstantName(t.name), value: t.name, doc: `Key: ${t.key}. Producers: ${t.producers.join(", ")}.` })) },
    { name: "EventTopics", doc: "Default topic of every event-bus event type.", type: "str", entries: busEvents(protocol).map((e) => ({ name: e.name, value: e.topic })) },
    { name: "ErrorCodes", doc: "REST error codes (`code` in the error envelope).", type: "u32", entries: protocol.rest.error_codes.map((e) => ({ name: e.name, value: e.code, doc: `HTTP ${e.http_status}. ${e.description}` })) },
    ...Object.entries(protocol.enums).map(([name, entry]) => ({ name, doc: entry.description, type: "u8" as const, entries: enumEntries(entry.values) })),
    { name: "DeliveryModeStrictness", doc: "Delivery-mode strictness; the effective DM mode is the strictest participant setting.", type: "u8", entries: protocol.delivery_modes.map((m) => ({ name: upper(m.name), value: m.strictness })) },
    { name: "DeliveryModeLimits", doc: "Delivery-mode membership limits.", type: "mixed", entries: scalarEntries(protocol.delivery_mode_limits) },
    { name: "Snowflake", doc: "Snowflake layout and worker ranges.", type: "mixed", entries: [...scalarEntries(protocol.snowflake), ...snowflakeRanges] },
    { name: "Auth", doc: "Token settings.", type: "mixed", entries: scalarEntries(protocol.auth) },
    { name: "Gateway", doc: "Gateway protocol settings.", type: "mixed", entries: scalarEntries(protocol.gateway) },
    { name: "Voice", doc: "Voice protocol settings.", type: "mixed", entries: scalarEntries(protocol.voice) },
    { name: "Events", doc: "Event bus settings.", type: "mixed", entries: scalarEntries(protocol.events) },
    { name: "Rest", doc: "REST settings.", type: "mixed", entries: scalarEntries(protocol.rest) },
  ];
}
