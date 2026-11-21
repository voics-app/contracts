use discordy_contracts::constants::{gateway_opcodes, intents, permissions};
use discordy_contracts::types::{NotificationRecipientPage, ScheduledMessage};

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

#[test]
fn scheduled_state_fixtures_round_trip_with_typed_fields_and_draft_defaults() {
    for fixture in [
        include_str!("../../../fixtures/scheduled-pending-valid.json"),
        include_str!("../../../fixtures/scheduled-dispatching-valid.json"),
        include_str!("../../../fixtures/scheduled-sent-valid.json"),
        include_str!("../../../fixtures/scheduled-failed-valid.json"),
        include_str!("../../../fixtures/scheduled-cancelled-valid.json"),
        include_str!("../../../fixtures/scheduled-unknown-valid.json"),
    ] {
        let fixture: serde_json::Value = serde_json::from_str(fixture).unwrap();
        let mut expected = fixture["data"].clone();
        if let Some(draft) = expected["message"].as_object_mut() {
            for (field, value) in [("tts", false), ("replied_user", true), ("silent", false)] {
                draft.entry(field).or_insert(serde_json::Value::Bool(value));
            }
        }
        let job: ScheduledMessage = serde_json::from_value(expected.clone()).unwrap();
        assert_eq!(job.status.to_string(), expected["status"].as_str().unwrap());
        assert_eq!(serde_json::to_value(job).unwrap(), expected);
    }
}
