import { GENERATED_NOTICE } from "../naming.ts";
import { busEvents, type OpcodeEntry, type ProtocolRegistry } from "../registry.ts";

export type TitleLookup = (schemaPath: string) => string;

function payloadMap(name: string, doc: string, entries: Array<{ name: string; payload: string | null }>, titleOf: TitleLookup): string {
  const body = entries.map((e) => `  ${e.name}: ${e.payload ? titleOf(e.payload) : "null"};`).join("\n");
  return `/** ${doc} */\nexport interface ${name} {\n${body}\n}\n`;
}

const opcodePayloads = (opcodes: OpcodeEntry[]) => opcodes.filter((o) => o.name !== "DISPATCH");

export function renderTsEvents(protocol: ProtocolRegistry, titleOf: TitleLookup): string {
  const referenced = new Set<string>();
  const track: TitleLookup = (path) => {
    const title = titleOf(path);
    referenced.add(title);
    return title;
  };
  const maps = [
    payloadMap("DispatchPayloads", "Payload (`d`) of every gateway dispatch event, keyed by `t`.", protocol.gateway.dispatch_events, track),
    payloadMap("BusPayloads", "Payload (`data`) of every event-bus event, keyed by `type`.", busEvents(protocol), track),
    payloadMap("GatewayPayloads", "Payload (`d`) of every non-dispatch gateway opcode, keyed by opcode name.", opcodePayloads(protocol.gateway.opcodes), track),
    payloadMap("VoicePayloads", "Payload (`d`) of every voice opcode, keyed by opcode name.", protocol.voice.opcodes, track),
  ];
  const imports = [...referenced, "EventEnvelope"].sort();
  return `// ${GENERATED_NOTICE}

import type { ${imports.join(", ")} } from "./models.js";
import type { GatewayOpcodes } from "./constants.js";

${maps.join("\n")}
export type DispatchEventName = keyof DispatchPayloads;
export type BusEventType = keyof BusPayloads;

/** A DISPATCH frame (op 0) with its payload typed by event name. */
export type DispatchFrame = {
  [K in DispatchEventName]: { op: typeof GatewayOpcodes.DISPATCH; s: number; t: K; d: DispatchPayloads[K] };
}[DispatchEventName];

/** An event envelope with \`data\` typed by \`type\`. */
export type TypedEventEnvelope = {
  [K in BusEventType]: Omit<EventEnvelope, "type" | "data"> & { type: K; data: BusPayloads[K] };
}[BusEventType];
`;
}
