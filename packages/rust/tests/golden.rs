use discordy_contracts::constants::{gateway_opcodes, intents, permissions};

#[test]
fn permission_bits_match_discord() {
    assert_eq!(permissions::ADMINISTRATOR, 8);
    assert_eq!(permissions::VIEW_CHANNEL, 1024);
    assert_eq!(permissions::CONNECT, 1_048_576);
}

#[test]
fn intent_and_opcode_values_match_discord() {
    assert_eq!(intents::GUILDS, 1);
    assert_eq!(intents::GUILD_MESSAGES, 512);
    assert_eq!(gateway_opcodes::DISPATCH, 0);
}
