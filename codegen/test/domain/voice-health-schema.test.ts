import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { bundleSchemas } from "../../src/domain/schema-bundle.ts";
import type { JsonSchema } from "../../src/domain/json-schema.ts";

describe("voice probe contract bundling", () => {
  it("preserves ordinary token types and the stricter probe constraints", async () => {
    const paths = ["objects/snowflake.json", "auth/voice-token-claims.json", "auth/probe-voice-token-claims.json"];
    const sources = await Promise.all(paths.map(async (path) => ({
      path,
      schema: JSON.parse(await readFile(new URL(`../../../schemas/${path}`, import.meta.url), "utf8")) as JsonSchema,
    })));
    const { bundle } = bundleSchemas(sources);
    const call = bundle.$defs.VoiceTokenClaims!;
    const probe = bundle.$defs.ProbeVoiceTokenClaims!;
    expect(call.properties).toMatchObject({ e2ee: { type: "boolean" }, node: { type: "string" } });
    expect(call.required).not.toContain("node_lease");
    expect(probe.required).toEqual(expect.arrayContaining(["node", "sub", "purpose", "node_lease", "probe_id", "e2ee"]));
    expect(probe.properties).toMatchObject({
      purpose: { type: "string", enum: ["probe"] },
      node_lease: { type: "string", pattern: "^[1-9][0-9]*$" },
      probe_id: { type: "string", format: "uuid" },
      e2ee: { type: "boolean", const: false },
    });
  });
});
