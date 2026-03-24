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
        .setName("list")
        .setDescription("Display the prompt list"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("random")
        .setDescription("Get a random prompt from the list")
        .addBooleanOption((option) =>
          option
            .setName("remove")
            .setDescription("Remove the prompt from the list (true) or keep it (false)")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a specific prompt by its number")
        .addIntegerOption((option) =>
          option
            .setName("number")
            .setDescription(
              "The prompt number to remove (use /prompt list to see numbers)",
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
    .setName("modifyseeds")
    .setDescription("Modify a user's seeds (mods only)")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User whose seeds to modify")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Positive or negative seed change")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the seed change")
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
  new SlashCommandBuilder()
    .setName("setmodrole")
    .setDescription("Add a moderator role for the bot (you can add multiple)")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role that has moderator permissions")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("setpromptrole")
    .setDescription("Set the role to ping when using /prompt random")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to mention for random prompts")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("settierrole")
    .setDescription("Assign a Discord role to a tier (1-10)")
    .addIntegerOption((option) =>
      option
        .setName("tier")
        .setDescription("Tier number (1-10)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10),
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to assign for this tier")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("toggletierroles")
    .setDescription("Enable or disable automatic tier role assignment")
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Enable (true) or disable (false) tier role system")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("artoftheweek")
    .setDescription("Manually post the artwork of the week"),
  new SlashCommandBuilder()
    .setName("addboost")
    .setDescription("Add an XP boost to a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give the boost to")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("multiplier")
        .setDescription("XP multiplier (e.g., 1.5 for 1.5x, 2 for 2x)")
        .setRequired(true)
        .setMinValue(1.0)
        .setMaxValue(10.0),
    )
    .addStringOption((option) =>
      option
        .setName("activity")
        .setDescription("Which activity type to boost")
        .setRequired(true)
        .addChoices(
          { name: "Art posting", value: "art" },
          { name: "Quest", value: "quest" },
          { name: "Reactions", value: "reaction" },
          { name: "All", value: "all" }
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName("duration_hours")
        .setDescription("How long the boost lasts in hours")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(8760),
    ),
  new SlashCommandBuilder()
    .setName("removeboost")
    .setDescription("Remove an XP boost from a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove the boost from")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("activity")
        .setDescription("Which activity type boost to remove")
        .setRequired(true)
        .addChoices(
          { name: "Art posting", value: "art" },
          { name: "Quest", value: "quest" },
          { name: "Reactions", value: "reaction" },
          { name: "All", value: "all" }
        ),
    ),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View the shop or manage shop items")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View all available shop items"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new item to the shop")
        .addStringOption((option) =>
          option
            .setName("itemname")
            .setDescription("Name of the shop item")
            .setRequired(true),
        )
        .addNumberOption((option) =>
          option
            .setName("boost_multiplier")
            .setDescription("XP boost multiplier (1.0-10.0)")
            .setRequired(true)
            .setMinValue(1.0)
            .setMaxValue(10.0),
        )
        .addIntegerOption((option) =>
          option
            .setName("duration_hours")
            .setDescription("How long the boost lasts in hours")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(8760),
        )
        .addStringOption((option) =>
          option
            .setName("activity")
            .setDescription("Which activity type to boost")
            .setRequired(true)
            .addChoices(
              { name: "Art posting", value: "art" },
              { name: "Quest", value: "quest" },
              { name: "Reactions", value: "reaction" },
              { name: "All", value: "all" }
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName("seed_cost")
            .setDescription("Cost in seeds")
            .setRequired(true)
            .setMinValue(1),
        ),
    ),
].map((command) => command.toJSON());

module.exports = { commands };
