import { describe, expect, it } from "vitest";
import { GatewayOpcodes, Intents, Permissions, hasPermission, permissionsFromString } from "../src/index.js";

describe("golden constants", () => {
  it("matches the Discord permission bit values", () => {
    expect(Permissions.ADMINISTRATOR).toBe(8n);
    expect(Permissions.VIEW_CHANNEL).toBe(1024n);
    expect(Permissions.CONNECT).toBe(1048576n);
  });

  it("matches the Discord intent and opcode values", () => {
    expect(Intents.GUILDS).toBe(1);
    expect(Intents.GUILD_MESSAGES).toBe(512);
    expect(GatewayOpcodes.DISPATCH).toBe(0);
  });

  it("treats ADMINISTRATOR as every permission", () => {
    expect(hasPermission(Permissions.ADMINISTRATOR, Permissions.CONNECT)).toBe(true);
    expect(hasPermission(Permissions.VIEW_CHANNEL, Permissions.CONNECT)).toBe(false);
  });

  it("parses decimal permission strings", () => {
    expect(permissionsFromString("1024")).toBe(Permissions.VIEW_CHANNEL);
    expect(() => permissionsFromString("abc")).toThrow(TypeError);
  });
});
