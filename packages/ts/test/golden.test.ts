import { describe, expect, it } from "vitest";
import { GatewayOpcodes, Intents, Permissions, hasPermission, permissionsFromString } from "../src/index.js";
import type { NotificationRecipientPage } from "../src/index.js";

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

describe("notification recipient page types", () => {
  it("preserves the typed fields for a standard directory page", () => {
    const page: NotificationRecipientPage = {
      channel_id: "200", guild_id: "100", delivery_mode: "standard",
      evaluated_at: "2026-11-18T10:00:00Z", next_after: "20",
      recipients: [{ user_id: "20", role_ids: ["300"], online: false, level: 1,
        muted: false, suppress_everyone: true, suppress_roles: false }],
    };
    expect(page.recipients.map((recipient) => recipient.user_id)).toEqual(["20"]);
    expect(page.next_after).toBe("20");
  });

  it("preserves the empty private-mode shape", () => {
    const page: NotificationRecipientPage = {
      channel_id: "200", guild_id: null, delivery_mode: "p2p",
      evaluated_at: "2026-11-18T10:00:00Z", next_after: null, recipients: [],
    };
    expect(page.recipients).toEqual([]);
    expect(page.next_after).toBeNull();
  });
});
