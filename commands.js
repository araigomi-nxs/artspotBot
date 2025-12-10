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
    .setName("setartchannel")
    .setDescription("Set the art channel where reactions give XP")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where art is posted and reactions give XP")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setquestchannel")
    .setDescription("Set the quest channel where users post for quest challenges")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where quest submissions will be posted")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setcanvaschannel")
    .setDescription("Set the canvas channel where Magma canvas links earn XP")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where canvas links will be tracked")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("Set the log channel for XP award notifications")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel where XP awards will be logged")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("View the XP leaderboard"),
  new SlashCommandBuilder()
    .setName("fanart")
    .setDescription("Send fanart to someone and let them rate it")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Who you drew fanart for")
        .setRequired(true),
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("Image file of the fanart")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View user stats including XP and archive count")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to view stats for (defaults to yourself)")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("create")
    .setDescription("Creates a new Magma drawing canvas")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Title of the drawing")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("project")
        .setDescription("Select a Magma project")
        .setAutocomplete(true)
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("addcard")
    .setDescription("Add a new TCG card to the collection")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the card")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("image")
        .setDescription("Image URL for the card")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("rarity")
        .setDescription("Rarity percentage (1-100, higher = more common)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),
  new SlashCommandBuilder()
    .setName("pull")
    .setDescription("Pull a random TCG card from the collection"),
    new SlashCommandBuilder()
      .setName("modifyxp")
      .setDescription("Modify a user's XP (mods only)")
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("User whose XP to modify")
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("Positive or negative XP change")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Reason for the XP change")
          .setRequired(false),
      ),
  new SlashCommandBuilder()
    .setName("setannouncementchannel")
    .setDescription("Set the announcement channel for artwork of the week")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel for announcements")
        .setRequired(true),
    ),
].map((command) => command.toJSON());

module.exports = { commands };
