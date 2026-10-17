export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface JsonSchema {
  [key: string]: JsonValue | undefined;
  title?: string;
  description?: string;
  $ref?: string;
}

export function isObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively copies a JSON value, applying `visit` to every object node before descending. */
export function mapObjects(value: JsonValue, visit: (node: Record<string, JsonValue>) => Record<string, JsonValue>): JsonValue {
  if (Array.isArray(value)) return value.map((item) => mapObjects(item, visit));
  if (!isObject(value)) return value;
  const visited = visit(value);
  const out: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(visited)) out[key] = mapObjects(child, visit);
  return out;
}

/** Returns a copy of `record` with its keys sorted, for deterministic output. */
export function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
