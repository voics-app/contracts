defmodule Discordy.Contracts do
  @moduledoc """
  Discordy wire contracts for Elixir services.

  Every constant group from `permissions.json`, `intents.json` and `protocol.json`
  is generated as a module under `Discordy.Contracts.*` (for example
  `Discordy.Contracts.Permissions.administrator/0` or
  `Discordy.Contracts.GatewayOpcodes.dispatch/0`). Each module also exposes
  `entries/0` (a map keyed by atom) and `fetch/1`.

  The bundled JSON Schemas and OpenAPI documents ship in `priv/` for runtime validation.
  """

  @doc "Absolute path of a file shipped in `priv/` (for example `\"schemas.bundle.json\"`)."
  @spec priv_path(String.t()) :: String.t()
  def priv_path(file), do: Path.join(:code.priv_dir(:discordy_contracts), file)

  @doc "Path of the JSON Schema bundle whose `$defs` are keyed by schema title."
  @spec schema_bundle_path() :: String.t()
  def schema_bundle_path, do: priv_path("schemas.bundle.json")
end
