/**
 * Discordy wire contracts.
 *
 * - Model types (`User`, `Channel`, `IdentifyPayload`, `EventEnvelope`, ...) from the JSON Schemas.
 * - `paths` / `operations` / `components` for the public REST API (openapi-typescript).
 * - Constants: `Permissions` (bigint flags), `Intents`, `GatewayOpcodes`, `ErrorCodes`, enums and settings.
 * - Payload maps and typed frames: `DispatchPayloads`, `DispatchFrame`, `TypedEventEnvelope`, ...
 *
 * The bundled JSON Schemas ship under `@voics-app/contracts/schemas/*.json`.
 */
export * from "./generated/models.js";
export * from "./generated/constants.js";
export * from "./generated/events.js";
export type { paths, operations, components } from "./generated/openapi.js";
export type * as InternalApi from "./generated/internal-openapi.js";
export { hasPermission, permissionsFromString, permissionsToString } from "./permissions.js";
