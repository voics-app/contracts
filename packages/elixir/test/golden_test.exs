defmodule Discordy.ContractsGoldenTest do
  use ExUnit.Case, async: true

  alias Discordy.Contracts.{GatewayOpcodes, Intents, Permissions}

  test "permission bits match Discord" do
    assert Permissions.administrator() == 8
    assert Permissions.view_channel() == 1024
    assert Permissions.connect() == 1_048_576
  end

  test "intent and opcode values match Discord" do
    assert Intents.guilds() == 1
    assert Intents.guild_messages() == 512
    assert GatewayOpcodes.dispatch() == 0
  end

  test "bundled schemas ship in priv" do
    assert File.exists?(Discordy.Contracts.schema_bundle_path())
  end
end
