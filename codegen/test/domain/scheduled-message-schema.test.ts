import { readFile, readdir } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { bundleSchemas } from "../../src/domain/schema-bundle.ts";
import type { JsonSchema } from "../../src/domain/json-schema.ts";

describe("scheduled message contract bundling", () => {
  it("preserves the field types and status constraints in the distributed bundle", async () => {
    const paths = ["snowflake", "scheduled-message-id", "scheduled-message-revision", "scheduled-message-draft", "scheduled-message"];
    const sources = await Promise.all(paths.map(async (name) => ({
      path: `objects/${name}.json`,
      schema: JSON.parse(await readFile(new URL(`../../../schemas/objects/${name}.json`, import.meta.url), "utf8")) as JsonSchema,
    })));
    const { bundle } = bundleSchemas(sources);
    const ajv = new Ajv2020({ strict: false });
    addFormats.default(ajv);
    const validate = ajv.compile({ ...bundle, $ref: "#/$defs/ScheduledMessage" });
    const fixtures = new URL("../../../fixtures/", import.meta.url);
    for (const name of (await readdir(fixtures)).filter((name) => name.startsWith("scheduled-"))) {
      const fixture = JSON.parse(await readFile(new URL(name, fixtures), "utf8")) as { schema: string; data: unknown; valid?: boolean };
      if (fixture.schema !== "objects/scheduled-message.json") continue;
      expect(validate(fixture.data), `${name}: ${JSON.stringify(validate.errors)}`).toBe(fixture.valid !== false);
    }
    expect(bundle.$defs.ScheduledMessage?.properties).toMatchObject({
      id: { $ref: "#/$defs/ScheduledMessageId" },
      revision: { $ref: "#/$defs/ScheduledMessageRevision" },
      status: { type: "string" },
    });
  });
});
