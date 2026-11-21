import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parse } from "yaml";
import { expect, it } from "vitest";

it("uses the @me-or-Snowflake target schema for both thread membership operations", async () => {
  const root = new URL("../../../", import.meta.url);
  const spec = parse(await readFile(new URL("openapi/discordy.yaml", root), "utf8"));
  const path = spec.paths["/channels/{channel_id}/thread-members/{user_id}"];
  const schema = JSON.parse(await readFile(new URL("schemas/rest/thread-member-target.json", root), "utf8"));
  const validate = new Ajv2020({ strict: false }).compile(schema);
  for (const operation of [path.put, path.delete]) {
    const target = operation.parameters.find((parameter: { name?: string }) => parameter.name === "user_id");
    expect(target.schema.$ref).toBe("../schemas/rest/thread-member-target.json");
    for (const name of ["thread-member-me-valid.json", "thread-member-id-valid.json", "thread-member-target-invalid.json"]) {
      const fixture = JSON.parse(await readFile(new URL(`fixtures/${name}`, root), "utf8"));
      expect(validate(fixture.data), `${name}: ${JSON.stringify(validate.errors)}`).toBe(fixture.valid !== false);
    }
  }
});
