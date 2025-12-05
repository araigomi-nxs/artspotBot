const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const { Pool } = require("pg");
const { commands } = require("./commands");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ITEMS_PER_PAGE = 20;

async function initDatabase() {
  const createPromptsTable = `
    CREATE TABLE IF NOT EXISTS prompts (
      id SERIAL PRIMARY KEY,
      prompt_text TEXT NOT NULL,
      username VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      guild_id VARCHAR(255) PRIMARY KEY,
      archive_channel_id VARCHAR(255)
    )
  `;

  const createUserXpTable = `
    CREATE TABLE IF NOT EXISTS user_xp (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      xp INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id)
    )
  `;

  const createReactionTrackingTable = `
    CREATE TABLE IF NOT EXISTS reaction_tracking (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) NOT NULL,
      message_author_id VARCHAR(255) NOT NULL,
      reactor_id VARCHAR(255) NOT NULL,
      UNIQUE(guild_id, message_id, reactor_id)
    )
  `;

  const createArchiveActivityTable = `
    CREATE TABLE IF NOT EXISTS archive_activity (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      archive_date DATE NOT NULL DEFAULT CURRENT_DATE,
      UNIQUE(guild_id, user_id, archive_date)
    )
  `;

  await pool.query(createPromptsTable);
  await pool.query(createSettingsTable);
  await pool.query(createUserXpTable);
  await pool.query(createReactionTrackingTable);
  await pool.query(createArchiveActivityTable);
  console.log("Database initialized.");
}

async function trackDailyArchive(guildId, userId) {
  try {
    const result = await pool.query(
      `INSERT INTO archive_activity (guild_id, user_id, archive_date) 
       VALUES ($1, $2, CURRENT_DATE) 
       ON CONFLICT (guild_id, user_id, archive_date) DO NOTHING
       RETURNING id`,
      [guildId, userId],
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function addXp(guildId, userId, username, amount = 1) {
  await pool.query(
    `INSERT INTO user_xp (guild_id, user_id, username, xp) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (guild_id, user_id) 
     DO UPDATE SET xp = user_xp.xp + $4, username = $3`,
    [guildId, userId, username, amount],
  );
}

async function getUserXp(guildId, userId) {
  const result = await pool.query(
    "SELECT xp FROM user_xp WHERE guild_id = $1 AND user_id = $2",
    [guildId, userId],
  );
  return result.rows[0]?.xp || 0;
}

async function getLeaderboard(guildId, limit = 10) {
  const result = await pool.query(
    "SELECT username, xp FROM user_xp WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2",
    [guildId, limit],
  );
  return result.rows;
}

async function hasReactedBefore(guildId, messageId, reactorId) {
  const result = await pool.query(
    "SELECT id FROM reaction_tracking WHERE guild_id = $1 AND message_id = $2 AND reactor_id = $3",
    [guildId, messageId, reactorId],
  );
  return result.rows.length > 0;
}

async function trackReaction(guildId, messageId, messageAuthorId, reactorId) {
  try {
    const result = await pool.query(
      `INSERT INTO reaction_tracking (guild_id, message_id, message_author_id, reactor_id) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (guild_id, message_id, reactor_id) DO NOTHING
       RETURNING id`,
      [guildId, messageId, messageAuthorId, reactorId],
    );
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function setArchiveChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO settings (guild_id, archive_channel_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET archive_channel_id = $2`,
    [guildId, channelId],
  );
}

async function getArchiveChannel(guildId) {
  const result = await pool.query(
    "SELECT archive_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.archive_channel_id;
}

async function addPrompt(text, username) {
  const result = await pool.query(
    "INSERT INTO prompts (prompt_text, username) VALUES ($1, $2) RETURNING id",
    [text, username],
  );
  return result.rows[0].id;
}

async function getAllPrompts() {
  const result = await pool.query("SELECT * FROM prompts ORDER BY id ASC");
  return result.rows;
}

async function getPromptCount() {
  const result = await pool.query("SELECT COUNT(*) FROM prompts");
  return parseInt(result.rows[0].count);
}

async function removePromptById(id) {
  const result = await pool.query(
    "DELETE FROM prompts WHERE id = $1 RETURNING *",
    [id],
  );
  return result.rows[0];
}

async function getRandomPrompt() {
  const result = await pool.query(
    "SELECT * FROM prompts ORDER BY RANDOM() LIMIT 1",
  );
  return result.rows[0];
}

async function createPromptListEmbed(page) {
  const prompts = await getAllPrompts();
  const totalPages = Math.ceil(prompts.length / ITEMS_PER_PAGE);
  const startIndex = page * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, prompts.length);
  const pagePrompts = prompts.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setTitle("Prompt List")
    .setColor(0xff9500)
    .setDescription(
      pagePrompts
        .map(
          (p, i) =>
            `**${startIndex + i + 1}.** ${p.prompt_text}\n*Suggested by: ${p.username}*`,
        )
        .join("\n\n"),
    )
    .setFooter({
      text: `Page ${page + 1}/${totalPages} | Total: ${prompts.length} prompt(s)`,
    });

  return embed;
}

async function createPaginationButtons(currentPage) {
  const count = await getPromptCount();
  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev_page")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next_page")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );

  return row;
}

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error(
    "Error: DISCORD_BOT_TOKEN is not set in environment variables.",
  );
  process.exit(1);
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  await initDatabase();

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("Registering slash commands...");
    console.log(
      "Commands to register:",
      commands.map((c) => c.name).join(", "),
    );

    // Register commands to each guild the bot is in (instant update)
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands },
      );
      console.log(`Commands registered to guild: ${guild.name}`);
    }

    console.log("Slash commands registered successfully!");
    console.log("Bot is ready and listening for commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();

  if (content.includes("![a]")) {
    const imageAttachment = message.attachments.find((att) =>
      att.contentType?.startsWith("image/"),
    );

    if (!imageAttachment) {
      return message.reply(
        "Please include an image with your `![A]` message to archive it.",
      );
    }

    try {
      const archiveChannelId = await getArchiveChannel(message.guild.id);

      if (!archiveChannelId) {
        return message.reply(
          "No archive channel set. Use `/setarchive` to set one.",
        );
      }

      const archiveChannel = await client.channels.fetch(archiveChannelId);

      if (!archiveChannel) {
        return message.reply(
          "Archive channel not found. Please set a new one with `/setarchive`.",
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("New Art")
        .setColor(0xbd2e58)
        .setImage(imageAttachment.url)
        .addFields({
          name: "Author: ",
          value: message.author.username,
          inline: true,
        })
        .setFooter({ text: `From #${message.channel.name}` })
        .setTimestamp();

      await archiveChannel.send({ embeds: [embed] });
      await message.react("✅");

      // Award 1 XP for archiving (only once per day)
      const isFirstArchiveToday = await trackDailyArchive(message.guild.id, message.author.id);
      if (isFirstArchiveToday) {
        await addXp(message.guild.id, message.author.id, message.author.username, 1);
      }
    } catch (error) {
      console.error("Error archiving image:", error);
      message.reply("Failed to archive the image. Please try again.");
    }
  }
});

// Reaction listener for XP
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  
  // Fetch partial reactions if needed
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Error fetching reaction:", error);
      return;
    }
  }
  
  const message = reaction.message;
  if (!message.guild) return;
  
  // Don't give XP for reacting to your own message
  if (message.author.id === user.id) return;
  
  // Track this reaction and award XP only if this is a new unique reaction
  const isNewReaction = await trackReaction(message.guild.id, message.id, message.author.id, user.id);
  
  if (isNewReaction) {
    await addXp(message.guild.id, message.author.id, message.author.username, 1);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === "prev_page" || customId === "next_page") {
      const footer = interaction.message.embeds[0]?.footer?.text || "";
      const pageMatch = footer.match(/Page (\d+)/);
      let currentPage = pageMatch ? parseInt(pageMatch[1]) - 1 : 0;

      if (customId === "prev_page") {
        currentPage = Math.max(0, currentPage - 1);
      } else {
        const count = await getPromptCount();
        const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      const embed = await createPromptListEmbed(currentPage);
      const buttons = await createPaginationButtons(currentPage);

      await interaction.update({ embeds: [embed], components: [buttons] });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "setarchive") {
    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply("Please select a text channel.");
    }

    await setArchiveChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Archive channel set to ${channel}. Reply to any image with \`![A]\` to archive it.`,
    );
  } else if (commandName === "prompt") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const promptText = interaction.options.getString("text");
      const username = interaction.user.username;
      await addPrompt(promptText, username);
      const count = await getPromptCount();
      await interaction.reply(
        `Prompt added! You now have ${count} prompt(s) in the list.`,
      );
    } else if (subcommand === "show") {
      const count = await getPromptCount();

      if (count === 0) {
        const embed = new EmbedBuilder()
          .setTitle("Prompt List")
          .setColor(0xbd2e58)
          .setDescription(
            "The prompt list is empty.\nAdd prompts using `/prompt add`",
          );

        return interaction.reply({ embeds: [embed] });
      }

      const embed = await createPromptListEmbed(0);
      const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

      if (totalPages > 1) {
        const buttons = await createPaginationButtons(0);
        await interaction.reply({ embeds: [embed], components: [buttons] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } else if (subcommand === "random") {
      const count = await getPromptCount();

      if (count === 0) {
        const embed = new EmbedBuilder()
          .setTitle("No Prompts Available")
          .setColor(0xfee75c)
          .setDescription(
            "The prompt list is empty.\nAdd prompts using `/prompt add`",
          );

        return interaction.reply({ embeds: [embed] });
      }

      const randomPrompt = await getRandomPrompt();
      await removePromptById(randomPrompt.id);
      const newCount = await getPromptCount();

      const embed = new EmbedBuilder()
        .setTitle("Random Prompt")
        .setColor(0x57f287)
        .setDescription(randomPrompt.prompt_text)
        .addFields({
          name: "Suggested by",
          value: randomPrompt.username,
          inline: true,
        })
        .setFooter({
          text: `Removed from list. ${newCount} prompt(s) remaining.`,
        });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "remove") {
      const promptNumber = interaction.options.getInteger("number");
      const prompts = await getAllPrompts();

      if (prompts.length === 0) {
        return interaction.reply(
          "The prompt list is empty. Add prompts using `/prompt add`",
        );
      }

      if (promptNumber > prompts.length) {
        return interaction.reply(
          `Invalid number. There are only ${prompts.length} prompt(s) in the list.`,
        );
      }

      const promptToRemove = prompts[promptNumber - 1];
      await removePromptById(promptToRemove.id);
      const newCount = await getPromptCount();
      await interaction.reply(
        `Removed prompt #${promptNumber}: "${promptToRemove.prompt_text}" (by ${promptToRemove.username})\n${newCount} prompt(s) remaining.`,
      );
    }
  } else if (commandName === "ranking") {
    const leaderboard = await getLeaderboard(interaction.guild.id, 10);
    const userXp = await getUserXp(interaction.guild.id, interaction.user.id);
    
    if (leaderboard.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("Ranking")
        .setColor(0xffd700)
        .setDescription("No rankings yet! Archive images or get reactions to earn XP.");
      
      return interaction.reply({ embeds: [embed] });
    }
    
    const rankingList = leaderboard
      .map((user, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `**${index + 1}.**`;
        return `${medal} ${user.username} - ${user.xp} XP`;
      })
      .join("\n");
    
    const embed = new EmbedBuilder()
      .setTitle("Ranking Leaderboard")
      .setColor(0xffd700)
      .setDescription(rankingList)
      .setFooter({ text: `Your XP: ${userXp}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("Prompt Bot Commands")
      .setColor(0x5865f2)
      .setDescription("Manage your collection of prompts")
      .addFields(
        { name: "/prompt add <text>", value: "Add a new prompt to the list" },
        { name: "/prompt show", value: "Display all prompts in the list" },
        { name: "/prompt random", value: "Get and remove a random prompt" },
        {
          name: "/prompt remove <number>",
          value: "Remove a specific prompt by its number",
        },
        {
          name: "/setarchive <channel>",
          value: "Set the archive channel for images",
        },
        {
          name: "![A]",
          value: "Post with an image to archive it",
        },
        { name: "/ranking", value: "View the XP leaderboard" },
        { name: "/help", value: "Show this help message" },
      );

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(token);
