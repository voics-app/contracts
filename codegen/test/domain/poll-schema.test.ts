import { readFile, readdir } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { bundleSchemas } from "../../src/domain/schema-bundle.ts";
import type { JsonSchema } from "../../src/domain/json-schema.ts";

describe("poll contract bundling", () => {
  it("preserves viewer requirements, mutation preconditions and invalid fixtures", async () => {
    const directories = ["objects", "rest", "gateway/dispatch"];
    const sources = [];
    for (const directory of directories) {
      const base = new URL(`../../../schemas/${directory}/`, import.meta.url);
      for (const name of await readdir(base)) {
        if (!(name.startsWith("poll-") || name === "poll.json" || name.startsWith("message-poll-") || name === "snowflake.json")) continue;
        sources.push({ path: `${directory}/${name}`, schema: JSON.parse(await readFile(new URL(name, base), "utf8")) as JsonSchema });
      }
    }
    const { bundle, titleByPath } = bundleSchemas(sources);
    const ajv = new Ajv2020({ strict: false });
    addFormats.default(ajv);
    const fixtures = new URL("../../../fixtures/", import.meta.url);
    let checked = 0;
    for (const name of (await readdir(fixtures)).filter((name) => name.startsWith("poll-"))) {
      const fixture = JSON.parse(await readFile(new URL(name, fixtures), "utf8")) as { schema: string; data: unknown; valid?: boolean };
      const validate = ajv.compile({ ...bundle, $id: undefined, $ref: `#/$defs/${titleByPath.get(fixture.schema)}` });
      expect(validate(fixture.data), `${name}: ${JSON.stringify(validate.errors)}`).toBe(fixture.valid !== false);
      checked++;
    }
    expect(checked).toBe(17);
    expect(bundle.$defs.PollViewerResults?.required).toContain("vote_version");
    expect(bundle.$defs.PollViewerAnswerCount?.required).toContain("me_voted");
  });
});
