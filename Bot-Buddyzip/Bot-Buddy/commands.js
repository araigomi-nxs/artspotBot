const { SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("prompt")
    .setDescription("Manage your prompts")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new prompt to the list")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("The prompt text to add")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("show")
        .setDescription("Display all prompts in the list"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("random")
        .setDescription("Get and remove a random prompt from the list"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a specific prompt by its number")
        .addIntegerOption((option) =>
          option
            .setName("number")
            .setDescription(
              "The prompt number to remove (use /prompt show to see numbers)",
            )
            .setRequired(true)
            .setMinValue(1),
        ),
    ),
  new SlashCommandBuilder()
    .setName("setarchive")
    .setDescription("Set the channel for archived images")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to post archived images to")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("View the XP leaderboard"),
].map((command) => command.toJSON());

module.exports = { commands };
