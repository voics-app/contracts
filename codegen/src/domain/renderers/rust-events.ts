import { GENERATED_NOTICE, screamingToPascal } from "../naming.ts";
import { busEvents, type ProtocolRegistry } from "../registry.ts";
import type { TitleLookup } from "./ts-events.ts";

interface Variant {
  name: string;
  payload: string | null;
}

function renderEnum(name: string, doc: string, tag: string, content: string, variants: Variant[], titleOf: TitleLookup): string {
  const arms = variants
    .map((v) => `    #[serde(rename = "${v.name}")]\n    ${screamingToPascal(v.name)}(${v.payload ? titleOf(v.payload) : "Option<serde_json::Value>"}),`)
    .join("\n");
  const names = variants.map((v) => `            Self::${screamingToPascal(v.name)}(_) => "${v.name}",`).join("\n");
  return `/// ${doc}
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "${tag}", content = "${content}")]
#[allow(clippy::large_enum_variant)]
pub enum ${name} {
${arms}
}

impl ${name} {
    /// The wire name of the event (\`${tag}\`).
    pub fn name(&self) -> &'static str {
        match self {
${names}
        }
    }
}
`;
}

export function renderRustEvents(protocol: ProtocolRegistry, titleOf: TitleLookup): string {
  const dispatch = renderEnum("DispatchEvent", "A gateway dispatch event: serializes as `{\"t\": name, \"d\": payload}`.", "t", "d", protocol.gateway.dispatch_events, titleOf);
  const bus = renderEnum("BusEvent", "An event-bus event: serializes as `{\"type\": name, \"data\": payload}` (flatten into an envelope).", "type", "data", busEvents(protocol), titleOf);
  return `// ${GENERATED_NOTICE}

#![allow(missing_docs)]

use crate::types::*;

${dispatch}
${bus}`;
}
