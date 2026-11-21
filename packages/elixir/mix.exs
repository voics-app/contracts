defmodule Discordy.Contracts.MixProject do
  use Mix.Project

  # x-release-please-start-version
  @version "0.1.0"
  # x-release-please-end

  def project do
    [
      app: :discordy_contracts,
      version: @version,
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      description:
        "Discordy contract constants (permissions, intents, opcodes, enums) and JSON Schemas.",
      source_url: "https://github.com/voics-app/contracts",
      docs: [main: "Discordy.Contracts"]
    ]
  end

  def application, do: []

  defp deps do
    [
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false}
    ]
  end
end
