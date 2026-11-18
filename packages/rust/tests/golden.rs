use discordy_contracts::constants::{gateway_opcodes, intents, permissions};
use discordy_contracts::types::NotificationRecipientPage;

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

#[test]
fn notification_recipient_page_fixtures_round_trip_without_losing_fields() {
    for fixture in [
        include_str!("../../../fixtures/notification-recipients-valid.json"),
        include_str!("../../../fixtures/notification-recipients-filtered-valid.json"),
        include_str!("../../../fixtures/notification-recipients-private-valid.json"),
    ] {
        let fixture: serde_json::Value = serde_json::from_str(fixture).unwrap();
        let page: NotificationRecipientPage =
            serde_json::from_value(fixture["data"].clone()).unwrap();
        assert_eq!(serde_json::to_value(page).unwrap(), fixture["data"]);
    }
}
