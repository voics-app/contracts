import { describe, expect, it } from "vitest";
import { bundleSchemas, type SourceSchema } from "../../src/domain/schema-bundle.ts";

const snowflake = { path: "objects/snowflake.json", schema: { $id: "x", title: "Snowflake", type: "string" } };

describe("bundleSchemas", () => {
  it("keys every schema by its title and rewrites relative file refs", () => {
    const user = {
      path: "objects/user.json",
      schema: { $schema: "s", $id: "u", title: "User", type: "object", properties: { id: { $ref: "./snowflake.json" } } },
    };

    const { bundle, titleByPath } = bundleSchemas([snowflake, user]);

    expect(Object.keys(bundle.$defs)).toEqual(["Snowflake", "User"]);
    expect(bundle.$defs.User).toEqual({ title: "User", type: "object", properties: { id: { $ref: "#/$defs/Snowflake" } } });
    expect(titleByPath.get("objects/user.json")).toBe("User");
  });

  it("hoists nested $defs and resolves local and cross-file fragment refs", () => {
    const settings = {
      path: "objects/settings.json",
      schema: {
        title: "Settings",
        type: "object",
        properties: { status: { $ref: "#/$defs/CustomStatus" } },
        $defs: { CustomStatus: { title: "CustomStatus", type: "object" } },
      },
    };
    const patch = {
      path: "rest/patch.json",
      schema: { title: "Patch", properties: { status: { $ref: "../objects/settings.json#/$defs/CustomStatus" } } },
    };

    const { bundle } = bundleSchemas([settings, patch]);

    expect(bundle.$defs.CustomStatus).toEqual({ title: "CustomStatus", type: "object" });
    expect(bundle.$defs.Settings).not.toHaveProperty("$defs");
    expect(bundle.$defs.Patch?.properties).toEqual({ status: { $ref: "#/$defs/CustomStatus" } });
  });

  it("flattens allOf compositions of objects into a single object", () => {
    const base = { path: "objects/base.json", schema: { title: "Base", type: "object", required: ["id"], properties: { id: { type: "string" } } } };
    const derived: SourceSchema = {
      path: "gateway/derived.json",
      schema: {
        title: "Derived",
        description: "d",
        allOf: [{ $ref: "../objects/base.json" }, { type: "object", required: ["guild_id"], properties: { guild_id: { type: "string" } } }],
      },
    };

    const { bundle } = bundleSchemas([base, derived]);

    expect(bundle.$defs.Derived).toEqual({
      title: "Derived",
      description: "d",
      type: "object",
      required: ["id", "guild_id"],
      properties: { id: { type: "string" }, guild_id: { type: "string" } },
    });
  });

  it("rejects refs that point to unknown schemas", () => {
    const broken = { path: "objects/broken.json", schema: { title: "Broken", properties: { x: { $ref: "./missing.json" } } } };
    expect(() => bundleSchemas([broken])).toThrow(/objects\/missing.json/);
  });

  it("rejects duplicate and missing titles", () => {
    expect(() => bundleSchemas([snowflake, { path: "objects/other.json", schema: { title: "Snowflake" } }])).toThrow(/Duplicate title/);
    expect(() => bundleSchemas([{ path: "objects/untitled.json", schema: { type: "string" } }])).toThrow(/title/);
  });
});
