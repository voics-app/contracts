/** Typed views of permissions.json, intents.json and protocol.json. */

export interface PermissionEntry {
  name: string;
  bit: number;
  value: string;
  description: string;
  channel_types: Array<"text" | "voice" | "stage">;
  requires_mfa: boolean;
}

export interface PermissionsRegistry {
  permissions: PermissionEntry[];
}

export interface IntentEntry {
  name: string;
  bit: number;
  value: number;
  privileged: boolean;
  scope: "guild" | "direct" | "content";
  discord_name?: string;
  events: string[];
}

export interface IntentsRegistry {
  intents: IntentEntry[];
}

export type Direction = "send" | "receive" | "both";

export interface OpcodeEntry {
  op: number;
  name: string;
  direction: Direction;
  payload: string | null;
  description: string;
}

export interface CloseCodeEntry {
  code: number;
  name: string;
  description: string;
  reconnect: boolean;
}

export interface DispatchEventEntry {
  name: string;
  payload: string | null;
  source: "gateway" | "api" | "messages";
  topic: string | null;
  description: string;
}

export interface BusOnlyEventEntry {
  name: string;
  payload: string;
  topic: string;
  description: string;
}

export interface NamedPayloadEntry {
  name: string;
  payload: string;
  description: string;
}

export interface EnumValue {
  name: string;
  value: number;
}

export interface EnumEntry {
  description: string;
  values: EnumValue[];
}

export interface ErrorCodeEntry {
  code: number;
  name: string;
  http_status: number;
  description: string;
}

export interface TopicEntry {
  name: string;
  key: string;
  producers: string[];
}

export type Scalar = number | string;

export interface ProtocolRegistry {
  snowflake: {
    epoch_ms: number;
    timestamp_bits: number;
    worker_bits: number;
    sequence_bits: number;
    bucket_size_ms: number;
    worker_ranges: Array<{ component: string; min: number; max: number }>;
  };
  auth: Record<string, Scalar>;
  gateway: {
    opcodes: OpcodeEntry[];
    close_codes: CloseCodeEntry[];
    dispatch_events: DispatchEventEntry[];
  } & Record<string, unknown>;
  events: {
    envelope_version: number;
    topics: TopicEntry[];
    user_topic_events: string[];
    bus_only_events: BusOnlyEventEntry[];
  };
  voice: {
    path: string;
    heartbeat_interval_ms: number;
    speaking_flags: EnumValue[];
    opcodes: OpcodeEntry[];
    sfu_commands: NamedPayloadEntry[];
    sfu_events: NamedPayloadEntry[];
  };
  rest: {
    base_path: string;
    internal_base_path: string;
    rate_limit_headers: string[];
    error_codes: ErrorCodeEntry[];
  };
  delivery_modes: Array<{ name: string; strictness: number }>;
  delivery_mode_limits: Record<string, number>;
  enums: Record<string, EnumEntry>;
}

export interface Registries {
  permissions: PermissionsRegistry;
  intents: IntentsRegistry;
  protocol: ProtocolRegistry;
}

/** Scalar settings of a registry section (everything that is a number or a string). */
export function scalarsOf(section: object): Array<[string, Scalar]> {
  return Object.entries(section).filter((entry): entry is [string, Scalar] => typeof entry[1] === "number" || typeof entry[1] === "string");
}

/** Every event type that can appear in an event envelope, with its payload schema path. */
export function busEvents(protocol: ProtocolRegistry): Array<{ name: string; payload: string | null; topic: string }> {
  const dispatched = protocol.gateway.dispatch_events
    .filter((event): event is DispatchEventEntry & { topic: string } => event.topic !== null)
    .map(({ name, payload, topic }) => ({ name, payload, topic }));
  const busOnly = protocol.events.bus_only_events.map(({ name, payload, topic }) => ({ name, payload, topic }));
  return [...dispatched, ...busOnly];
}
