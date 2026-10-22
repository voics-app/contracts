import { busEvents, type Registries } from "./registry.ts";

/** Cross-file rules that JSON Schema cannot express. Returns one message per violation. */
export function checkConsistency(registries: Registries, schemaPaths: Set<string>, deliveryModeEnum: string[]): string[] {
  const { permissions, intents, protocol } = registries;
  const problems: string[] = [];

  const payloadOwners: Array<[string, string | null]> = [
    ...protocol.gateway.opcodes.map((o) => [`gateway opcode ${o.name}`, o.payload] as [string, string | null]),
    ...protocol.gateway.dispatch_events.map((e) => [`dispatch event ${e.name}`, e.payload] as [string, string | null]),
    ...protocol.events.bus_only_events.map((e) => [`bus event ${e.name}`, e.payload] as [string, string | null]),
    ...protocol.voice.opcodes.map((o) => [`voice opcode ${o.name}`, o.payload] as [string, string | null]),
    ...[...protocol.voice.sfu_commands, ...protocol.voice.sfu_events].map((c) => [`sfu message ${c.name}`, c.payload] as [string, string | null]),
  ];
  for (const [owner, payload] of payloadOwners) {
    if (payload !== null && !schemaPaths.has(payload)) problems.push(`${owner}: payload schema ${payload} does not exist`);
  }

  for (const p of permissions.permissions) {
    if (p.value !== (1n << BigInt(p.bit)).toString()) problems.push(`permission ${p.name}: value ${p.value} is not 1 << ${p.bit}`);
  }
  for (const i of intents.intents) {
    if (i.value !== 2 ** i.bit) problems.push(`intent ${i.name}: value ${i.value} is not 1 << ${i.bit}`);
  }

  const dispatchNames = new Set(protocol.gateway.dispatch_events.map((e) => e.name));
  for (const i of intents.intents) {
    for (const event of i.events) if (!dispatchNames.has(event)) problems.push(`intent ${i.name}: event ${event} is not a dispatch event`);
  }

  const modes = protocol.delivery_modes.map((m) => m.name);
  if (modes.join() !== deliveryModeEnum.join()) {
    problems.push(`delivery_modes [${modes.join(", ")}] differ from the DeliveryMode schema [${deliveryModeEnum.join(", ")}]`);
  }

  const topics = new Set(protocol.events.topics.map((t) => t.name));
  for (const e of busEvents(protocol)) if (!topics.has(e.topic)) problems.push(`event ${e.name}: unknown topic ${e.topic}`);

  const uniqueness: Array<[string, Array<string | number>]> = [
    ["permissions", permissions.permissions.map((p) => p.name)],
    ["permission bits", permissions.permissions.map((p) => p.bit)],
    ["intents", intents.intents.map((i) => i.name)],
    ["gateway opcodes", protocol.gateway.opcodes.map((o) => o.op)],
    ["voice opcodes", protocol.voice.opcodes.map((o) => o.op)],
    ["close codes", protocol.gateway.close_codes.map((c) => c.code)],
    ["dispatch events", protocol.gateway.dispatch_events.map((e) => e.name)],
    ["error codes", protocol.rest.error_codes.map((e) => e.code)],
  ];
  for (const [label, values] of uniqueness) {
    const seen = new Set<string | number>();
    for (const value of values) {
      if (seen.has(value)) problems.push(`${label}: duplicate ${value}`);
      seen.add(value);
    }
  }
  return problems;
}
