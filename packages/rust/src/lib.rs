//! Discordy wire contracts, generated from the `contracts` repository.
//!
//! - [`types`]: REST, gateway, event-bus and voice payloads (Discord v10 shapes plus Discordy extras).
//! - [`events`]: [`events::DispatchEvent`] (`{t, d}`) and [`events::BusEvent`] (`{type, data}`) unions.
//! - [`constants`]: permission and intent bits, opcodes, close codes, error codes, enums and protocol settings.

mod generated;

pub use generated::{constants, events, types};
