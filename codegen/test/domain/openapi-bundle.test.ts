import { describe, expect, it } from "vitest";
import { bundleOpenApi } from "../../src/domain/openapi-bundle.ts";
import { bundleSchemas } from "../../src/domain/schema-bundle.ts";

const sources = [
  { path: "objects/snowflake.json", schema: { title: "Snowflake", type: "string" } },
  { path: "objects/user.json", schema: { title: "User", type: "object", properties: { id: { $ref: "./snowflake.json" } } } },
  { path: "objects/unused.json", schema: { title: "Unused", type: "string" } },
];

describe("bundleOpenApi", () => {
  it("replaces external schema refs with component refs and embeds the reachable schemas", () => {
    const { bundle, titleByPath } = bundleSchemas(sources);
    const doc = {
      openapi: "3.1.0",
      paths: { "/users/@me": { get: { responses: { "200": { content: { "application/json": { schema: { $ref: "../schemas/objects/user.json" } } } } } } } },
      components: { responses: { NotFound: { description: "x" } } },
    };

    const result = bundleOpenApi(doc, "openapi/discordy.yaml", bundle, titleByPath);

    const response = (result.paths as Record<string, { get: { responses: Record<string, { content: Record<string, { schema: unknown }> }> } }>)["/users/@me"]!.get.responses["200"]!;
    expect(response.content["application/json"]!.schema).toEqual({ $ref: "#/components/schemas/User" });
    expect(result.components).toEqual({
      responses: { NotFound: { description: "x" } },
      schemas: {
        Snowflake: { title: "Snowflake", type: "string" },
        User: { title: "User", type: "object", properties: { id: { $ref: "#/components/schemas/Snowflake" } } },
      },
    });
  });
});
