# discordy-voics/contracts

Single source of truth for every Discordy wire contract: the public REST API (OpenAPI 3.1), the internal
service API, JSON Schemas for gateway opcodes and dispatches, the Redpanda event envelope, voice frames,
and the permission/intent/protocol registries. Codegen turns these sources into packages for TypeScript,
Rust and Elixir, and into the protocol reference docs.

## Layout

Template links can resolve `GET /guilds/templates/{code}` without a session;
creating a guild remains authenticated. `GuildTemplate.is_dirty` compares the
current template-visible structure with the saved snapshot until explicit sync.

| Path | Content |
| --- | --- |
| `openapi/discordy.yaml`, `openapi/internal.yaml` | OpenAPI 3.1 (public / service-to-service) |
| `schemas/` | JSON Schema 2020-12: `objects`, `rest`, `gateway`, `events`, `voice`, `auth`, `internal`, `registry` |
| `permissions.json`, `intents.json`, `protocol.json` | Registries (exact Discord bit values, opcodes, topics, settings) |
| `fixtures/` | Valid and invalid sample payloads checked by `pnpm validate` |
| `codegen/` | Validation and generation pipeline (TypeScript, Clean Architecture) |
| `packages/ts` | npm `@discordy-voics/contracts` |
| `packages/rust` | crate `discordy-contracts` |
| `packages/snowflake` | shared fallible `voics-snowflake` interval issuer (API/messages) |
| `packages/elixir` | Hex-style package `discordy_contracts` (`Discordy.Contracts.*`) |
| `reference/*.md` | Generated protocol docs (`rest`, `gateway`, `events`, `voice`) to copy into the docs repo |
| `dist/` | Generated bundles (`openapi.json`, `schemas.bundle.json`, registries) |

Everything under `dist/`, `reference/`, `packages/*/src/generated`, `packages/ts/schemas`,
`packages/elixir/lib/discordy/contracts` and `packages/elixir/priv` is generated. Never edit it by hand.

## Run locally

Requires Node 24, pnpm 10, Rust (stable) and Elixir 1.20 / OTP 29.

```sh
pnpm install
pnpm validate   # redocly lint, ajv compile of every schema, registry and cross-file checks, fixtures
pnpm codegen    # validate, then regenerate every artifact
```

## Test

```sh
make test   # codegen unit tests, golden tests in TS / Rust / Elixir
make lint   # eslint, tsc, clippy -D warnings, mix format, mix credo --strict
make check-generated   # regenerate and fail when the working tree drifts
```

Golden tests assert `ADMINISTRATOR == 8`, `VIEW_CHANNEL == 1024` and `CONNECT == 1048576` in all three languages.

## Consuming

Generated DTOs describe field shapes, not every validation rule. The published JSON
Schemas and OpenAPI retain conditional status/certification constraints. Typify cannot
generate these `if`/`then`/`else` validations, so only its private type-generation input
omits them. Validate wire payloads against the schemas and enforce domain rules at the
service boundary; successful Rust deserialization alone is not schema validation.

Read-state certification is additive: `GET /internal/v1/users/{user_id}/read-states`
keeps its array shape and adds `read_state_version` strings plus header
`X-Read-State-Versioned: 1`. Gateway subscribes before fetching for READY and
refreshes during resume, emitting READ_STATE_SYNC before RESUMED. Certified
clients compare per-channel versions in MESSAGE_ACK, READ_STATE_UPDATE and sync;
they do not increment standard counts from MESSAGE_CREATE. Legacy peers retain
the existing behavior. Private decrypted counts remain local. Lost publication
converges on a newer snapshot or successful reconnect; failed accounting before
commit is not repaired. Fence unversioned writers during rollout, and invalidate
gateway sessions/resume buffers after database restore before fresh READY.

Scheduled-message contracts propose user-only Standard text/TTS/reply/silent
drafts under `/channels/{channel_id}/messages/scheduled`. A random UUID request
key identifies one intent, and revisions fence edits/cancellation against dispatch.
The scheduler must recheck current permissions/mode at send time. Ambiguous sends
become `delivery_unknown`; this contract does not permit automatic redispatch or
claim exactly-once event delivery. No scheduled-state gateway event is introduced.
Schemas and fixtures prepare messages#61; they do not implement or enable a scheduler.

Voice discovery supports optional `probe_required` rollout, leased `VoiceNodeHealth`
observations fenced to the node registration's etcd lease, and persistent node/region
blacklists. `purpose: "probe"` voice tokens use the separate `VOICE_PROBE_TOKEN_SECRET`
and require the stricter `ProbeVoiceTokenClaims` schema, including `node_lease` and a
random `probe_id`. Signaling must isolate those sessions from user rooms and reject stale node leases.
Probe success does not override draining or a manual blacklist. See the generated
[voice protocol](reference/voice.md) for paths and compatibility rules. These contracts
prepare active probing; publishing them does not deploy a prober or enable enforcement.

`GET /internal/v1/channels/{id}/notification-recipients?author_id=...` defines a
token-independent directory for mention accounting. `limit` (1–200, default100)
bounds candidates examined. Continue with `after=next_after` until null, including
after an empty page filtered by channel permissions. Only current channel viewers
other than the author are returned; private delivery modes return no recipients.
Each page resolves level, active mutes, role/everyone suppression and presence at
its reported `evaluated_at`; it is not a historical or cross-page snapshot.
No push tokens or other device identifiers are exposed. Consumers still apply
message eligibility, mention/silent/reply policy and idempotent counter updates.
This contract does not by itself implement or migrate stored mention counts.

Refresh requests may include a random `request_id` UUID. Persist it with the
current refresh token before sending and reuse the exact pair after response
loss. For five minutes, a live session can recover only its immediate unused,
unexpired successor without extending expiry. Remove the ID only after durably
saving successor credentials. Missing/mismatched IDs and stale or used successors
retain strict reuse detection; revoked sessions cannot recover. Do not log these
IDs or tokens. The optional field keeps legacy clients compatible.

Guild audit policy is exposed as optional `audit_log_enabled` (default true)
and `audit_log_retention_days` (30, 90 or 365; default 90) fields. Only owners
and administrators can change them with `PATCH /guilds/{id}`. Policy changes
are always audited. `VIEW_AUDIT_LOG` continues to control reads, including
existing entries while logging is disabled.

Guild administrators can read or change a permanent invitation through
`GET|PATCH /guilds/{guild_id}/vanity-url`. The required `code` is null to remove
it, or 2–32 ASCII letters, digits and hyphens. Codes resolve case-insensitively
through the existing invite preview and accept routes. A public text channel is
required; bans and membership limits apply to joins just as for ordinary invites.

- TypeScript: `@discordy-voics/contracts` from GitHub Packages (`import { Permissions, type User } from "@discordy-voics/contracts"`).
- Rust: `discordy-contracts = { git = "https://github.com/discordy-voics/contracts", tag = "vX.Y.Z" }`.
- Elixir: `{:discordy_contracts, github: "discordy-voics/contracts", tag: "vX.Y.Z", sparse: "packages/elixir"}`.

## Configuration

Community is configured through `PATCH /guilds/{guild_id}` with `features: ["COMMUNITY"]`
and rules/updates channel IDs. Discovery requires Community; disabling it removes the
listing. Signed-in users can report public listings with
`POST /discovery/guilds/{guild_id}/reports`; only public listing text becomes evidence.
Reports require moderation review and never automatically delist a guild.

Message edits accept partial attachment metadata changes by existing attachment ID. Omitted
files and fields are retained; `description: null` clears alt text and `flags: 0` clears the
spoiler without moving the stored object. Clients must treat an explicit attachment `flags`
value as authoritative and infer spoilers from `SPOILER_` only when flags are absent.
Message creation accepts `tts: true` with `SEND_TTS_MESSAGES`; messages store and return this
value in history and gateway events. See the REST schemas for validation and permission rules.

P7 presence accepts an optional `background` boolean on opcode 3 and IDENTIFY presence.
It defaults to false, so existing clients retain their current behavior. Mobile user sessions
may keep their effective presence across OS suspension for a bounded gateway lease (24 hours
by default); foreground/resume, logout, revocation and expiry clear the lease. This indicates
availability, not a guarantee that an iOS process is still running. Explicit Online is a mobile
device choice; DND and Invisible retain their existing aggregation semantics.

This repository reads no environment variables and holds no secrets.

Profile customization adds public pronouns (40 characters), two RGB theme colors and validated
profile accent colors. User and guild-member banner/avatar writes use image data URIs; responses
carry CDN hashes. Members may change only their own server avatar, banner and bio, with existing
nickname permissions retained. Omitted fields stay unchanged and null restores global/default
appearance. Member changes use the existing `GUILD_MEMBER_UPDATE` dispatch.

## Releases

release-please keeps `packages/ts`, `packages/rust` and `packages/elixir` versions aligned. A `vX.Y.Z` tag
publishes the npm package; the tag itself is the Rust and Elixir release.

## Pending owner actions

- Create the `discordy-voics/contracts` GitHub repository and push `main`, `develop`.
- Allow `GITHUB_TOKEN` package publishing for the organization, so `release.yml` can publish to GitHub Packages.

## Git hooks

Tests run locally, not in CI. Install [lefthook](https://github.com/evilmartians/lefthook) once and run `make hooks` (or `lefthook install`) to enable the pre-push hook in `lefthook.yml`: it runs this repository's lint and unit tests before every push. CI repeats only the slim gate on pull requests. Skip once with `LEFTHOOK=0 git push`.

## Passkey second factors

The additive WebAuthn MFA routes retain password login, TOTP and hashed, single-use recovery codes. See the generated REST reference for registration and login ceremonies. Clients convert WebAuthn binary fields to/from unpadded base64url; the API stores ceremony state with a five-minute expiry and consumes it atomically. Passkey names and last-used timestamps are account-private.
