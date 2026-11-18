import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expect, it } from "vitest";
import { loadContracts, payloadSchemas } from "../../src/application/load-contracts.ts";
import { bundleSchemas } from "../../src/domain/schema-bundle.ts";
import { NodeRepositoryFiles } from "../../src/infrastructure/node-repository-files.ts";

it("keeps canonical fixture validation identical in the distributed schema bundle", async () => {
  const contracts = await loadContracts(new NodeRepositoryFiles(fileURLToPath(new URL("../../../", import.meta.url))));
  const { bundle, titleByPath } = bundleSchemas(payloadSchemas(contracts));
  const ajv = new Ajv2020({ strict: false });
  addFormats.default(ajv);
  ajv.addSchema(bundle, "bundle");
  for (const fixture of contracts.fixtures) {
    const title = titleByPath.get(fixture.schema);
    if (!title) continue;
    const validate = ajv.compile({ $ref: `bundle#/$defs/${title}` });
    expect(validate(fixture.data), `${fixture.file}: ${JSON.stringify(validate.errors)}`).toBe(fixture.valid);
  }
});
