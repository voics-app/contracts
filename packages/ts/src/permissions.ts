import { PermissionSets, Permissions } from "./generated/constants.js";

/** Parses a permission set serialized as a decimal string. */
export function permissionsFromString(value: string): bigint {
  if (!/^[0-9]{1,20}$/.test(value)) throw new TypeError(`Invalid permission set: ${value}`);
  return BigInt(value) & PermissionSets.ALL;
}

/** Serializes a permission set as a decimal string. */
export function permissionsToString(value: bigint): string {
  return value.toString();
}

/** True when `set` contains `permission`, or ADMINISTRATOR. */
export function hasPermission(set: bigint, permission: bigint): boolean {
  if ((set & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) return true;
  return (set & permission) === permission;
}
