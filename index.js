const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  StringSelectMenuBuilder,
} = require("discord.js");
require('dotenv').config();
console.log("Current DB URL:", process.env.DATABASE_URL);
const { Pool } = require("pg");
const { commands } = require("./commands");
const { ApiClient } = require("magma-sdk");

// Initialize Magma client
const magma = new ApiClient({
  apiToken: process.env.MAGMA_TOKEN,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction],
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PROMPT_PAGE_SIZE = 15;
const RANKING_PAGE_SIZE = 15;
const SHOP_IMAGE_URL = "https://i.imgur.com/OkvlP5E.png"; // Add your imgur PNG URL here

// Tier XP thresholds (from T1..T10)
const TIER_THRESHOLDS = {
  1: 100,
  2: 170,
  3: 290,
  4: 500,
  5: 850,
  6: 1450,
  7: 2460,
  8: 4180,
  9: 7100,
  10: 10000,
};

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
      art_channel_id VARCHAR(255),
      quest_channel_id VARCHAR(255),
      canvas_channel_id VARCHAR(255),
      log_channel_id VARCHAR(255),
      announcement_channel_id VARCHAR(255),
      mod_role_id VARCHAR(255),
      prompt_role_id VARCHAR(255),
      tier_role_system_enabled BOOLEAN DEFAULT true
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

  const createArtPostActivityTable = `
    CREATE TABLE IF NOT EXISTS art_post_activity (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      post_date DATE NOT NULL DEFAULT CURRENT_DATE,
      post_count INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id, post_date)
    )
  `;

  const createUserArtPostsTable = `
    CREATE TABLE IF NOT EXISTS user_art_posts (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      total_posts INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id)
    )
  `;

  const createWeeklyPromptChallengeTable = `
    CREATE TABLE IF NOT EXISTS weekly_prompt_challenge (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      prompt_text TEXT NOT NULL,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      active BOOLEAN DEFAULT true
    )
  `;

  const createPromptChallengeSubmissionsTable = `
    CREATE TABLE IF NOT EXISTS prompt_challenge_submissions (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      challenge_id INTEGER NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) NOT NULL,
      xp_awarded BOOLEAN DEFAULT false,
      approved_by VARCHAR(255),
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(challenge_id, user_id)
    )
  `;

  const createUserCanvasHostsTable = `
    CREATE TABLE IF NOT EXISTS user_canvas_hosts (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      total_canvas_hosted INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id)
    )
  `;

  const createDailyQuestSubmissionsTable = `
    CREATE TABLE IF NOT EXISTS daily_quest_submissions (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) NOT NULL,
      xp_awarded BOOLEAN DEFAULT false,
      approved_by VARCHAR(255),
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, user_id, message_id)
    )
  `;

  const createCanvasPostActivityTable = `
    CREATE TABLE IF NOT EXISTS canvas_post_activity (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      post_date DATE NOT NULL DEFAULT CURRENT_DATE,
      post_count INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id, post_date)
    )
  `;

  const createUserStreaksTable = `
    CREATE TABLE IF NOT EXISTS user_streaks (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      art_streak_current INTEGER DEFAULT 0,
      art_streak_best INTEGER DEFAULT 0,
      art_last_date DATE,
      quest_streak_current INTEGER DEFAULT 0,
      quest_streak_best INTEGER DEFAULT 0,
      quest_last_date DATE,
      canvas_streak_current INTEGER DEFAULT 0,
      canvas_streak_best INTEGER DEFAULT 0,
      canvas_last_date DATE,
      UNIQUE(guild_id, user_id)
    )
  `;

  const createTcgCardsTable = `
    CREATE TABLE IF NOT EXISTS tcg_cards (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      card_name VARCHAR(255) NOT NULL,
      image_url TEXT NOT NULL,
      rarity_percent INTEGER NOT NULL CHECK (rarity_percent >= 1 AND rarity_percent <= 100),
      added_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createArtworkOfWeekTable = `
    CREATE TABLE IF NOT EXISTS artwork_of_week (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      reaction_count INTEGER DEFAULT 0,
      week_start DATE NOT NULL,
      posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, week_start)
    )
  `;

  const createModRolesTable = `
    CREATE TABLE IF NOT EXISTS mod_roles (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      role_id VARCHAR(255) NOT NULL,
      UNIQUE(guild_id, role_id)
    )
  `;

  const createTierRolesTable = `
    CREATE TABLE IF NOT EXISTS tier_roles (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      tier INTEGER NOT NULL,
      role_id VARCHAR(255) NOT NULL,
      UNIQUE(guild_id, tier)
    )
  `;

  const createFanartSubmissionsTable = `
    CREATE TABLE IF NOT EXISTS fanart_submissions (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      artist_id VARCHAR(255) NOT NULL,
      artist_username VARCHAR(255) NOT NULL,
      target_id VARCHAR(255) NOT NULL,
      target_username VARCHAR(255) NOT NULL,
      image_url TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      xp_given INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createDailyXpActivityTable = `
    CREATE TABLE IF NOT EXISTS daily_xp_activity (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_xp_earned INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id, activity_date)
    )
  `;

  const createXpBoostsTable = `
    CREATE TABLE IF NOT EXISTS xp_boosts (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      multiplier DECIMAL(3, 1) NOT NULL,
      activity_type VARCHAR(50) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255)
    )
  `;

  const createUserSeedsTable = `
    CREATE TABLE IF NOT EXISTS user_seeds (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      seeds INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id)
    )
  `;

  const createShopItemsTable = `
    CREATE TABLE IF NOT EXISTS shop_items (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      boost_multiplier DECIMAL(3,1) NOT NULL,
      duration_hours INTEGER NOT NULL,
      activity VARCHAR(50) NOT NULL,
      seed_cost INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await pool.query(createPromptsTable);
  await pool.query(createSettingsTable);
  await pool.query(createUserXpTable);
  await pool.query(createReactionTrackingTable);
  await pool.query(createArtPostActivityTable);
  await pool.query(createUserArtPostsTable);
  await pool.query(createWeeklyPromptChallengeTable);
  await pool.query(createPromptChallengeSubmissionsTable);
  await pool.query(createUserCanvasHostsTable);
  await pool.query(createDailyQuestSubmissionsTable);
  await pool.query(createCanvasPostActivityTable);
  await pool.query(createUserStreaksTable);
  await pool.query(createDailyXpActivityTable);
  await pool.query(createXpBoostsTable);
  await pool.query(createUserSeedsTable);
  await pool.query(createShopItemsTable);
  await pool.query(createTcgCardsTable);
  await pool.query(createArtworkOfWeekTable);
  await pool.query(createFanartSubmissionsTable);
  await pool.query(createModRolesTable);
  await pool.query(createTierRolesTable);

  // Add missing columns to settings table if they don't exist
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS art_channel_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS quest_channel_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS canvas_channel_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS log_channel_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS announcement_channel_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS mod_role_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS prompt_role_id VARCHAR(255)`,
  );
  await pool.query(
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS tier_role_system_enabled BOOLEAN DEFAULT true`,
  );
  // Make created_by nullable for shop purchases
  await pool.query(
    `ALTER TABLE xp_boosts ALTER COLUMN created_by DROP NOT NULL`,
  ).catch(() => {}); // Ignore error if already nullable
  console.log("Database initialized");
}

async function trackArtPost(guildId, userId) {
  try {
    // Get today's post count for this user
    const result = await pool.query(
      `INSERT INTO art_post_activity (guild_id, user_id, post_date, post_count) 
       VALUES ($1, $2, CURRENT_DATE, 1) 
       ON CONFLICT (guild_id, user_id, post_date) 
       DO UPDATE SET post_count = art_post_activity.post_count + 1
       RETURNING post_count`,
      [guildId, userId],
    );
    return result.rows[0]?.post_count || 0;
  } catch (error) {
    console.error("Error tracking art post:", error);
    return 0;
  }
}

async function incrementTotalArtPosts(guildId, userId, username) {
  await pool.query(
    `INSERT INTO user_art_posts (guild_id, user_id, username, total_posts) 
     VALUES ($1, $2, $3, 1) 
     ON CONFLICT (guild_id, user_id) 
     DO UPDATE SET total_posts = user_art_posts.total_posts + 1, username = $3`,
    [guildId, userId, username],
  );
}

async function getTotalArtPosts(guildId, userId) {
  const result = await pool.query(
    "SELECT total_posts FROM user_art_posts WHERE guild_id = $1 AND user_id = $2",
    [guildId, userId],
  );
  return result.rows[0]?.total_posts || 0;
}

async function incrementCanvasHosts(guildId, userId, username) {
  await pool.query(
    `INSERT INTO user_canvas_hosts (guild_id, user_id, username, total_canvas_hosted) 
     VALUES ($1, $2, $3, 1) 
     ON CONFLICT (guild_id, user_id) 
     DO UPDATE SET total_canvas_hosted = user_canvas_hosts.total_canvas_hosted + 1, username = $3`,
    [guildId, userId, username],
  );
}

async function getTotalCanvasHosts(guildId, userId) {
  const result = await pool.query(
    "SELECT total_canvas_hosted FROM user_canvas_hosts WHERE guild_id = $1 AND user_id = $2",
    [guildId, userId],
  );
  return result.rows[0]?.total_canvas_hosted || 0;
}

async function getTotalQuestCompletions(guildId, userId) {
  const result = await pool.query(
    "SELECT COUNT(*) as count FROM daily_quest_submissions WHERE guild_id = $1 AND user_id = $2 AND xp_awarded = true",
    [guildId, userId],
  );
  return parseInt(result.rows[0]?.count) || 0;
}

async function trackCanvasPost(guildId, userId) {
  try {
    // Get today's canvas post count for this user
    const result = await pool.query(
      `INSERT INTO canvas_post_activity (guild_id, user_id, post_date, post_count) 
       VALUES ($1, $2, CURRENT_DATE, 1) 
       ON CONFLICT (guild_id, user_id, post_date) 
       DO UPDATE SET post_count = canvas_post_activity.post_count + 1
       RETURNING post_count`,
      [guildId, userId],
    );
    return result.rows[0]?.post_count || 0;
  } catch (error) {
    console.error("Error tracking canvas post:", error);
    return 0;
  }
}

async function updateArtStreak(guildId, userId, username) {
  const query = `
    INSERT INTO user_streaks (guild_id, user_id, username, art_streak_current, art_streak_best, art_last_date)
    VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      art_streak_current = CASE
        WHEN user_streaks.art_last_date = CURRENT_DATE THEN user_streaks.art_streak_current
        WHEN user_streaks.art_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.art_streak_current + 1
        ELSE 1
      END,
      art_streak_best = GREATEST(
        user_streaks.art_streak_best,
        CASE
          WHEN user_streaks.art_last_date = CURRENT_DATE THEN user_streaks.art_streak_current
          WHEN user_streaks.art_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.art_streak_current + 1
          ELSE 1
        END
      ),
      art_last_date = CURRENT_DATE
    RETURNING art_streak_current, art_streak_best, art_last_date;
  `;

  try {
    const result = await pool.query(query, [guildId, userId, username]);
    const streakData = result.rows[0];
    
    // Award 10 seeds when reaching 3 consecutive art streaks
    if (streakData.art_streak_current === 3) {
      await addSeeds(guildId, userId, username, 10, "🎨 Art Streak Milestone (3 days)");
    }
    
    return streakData;
  } catch (error) {
    console.error("Error updating art streak:", error);
    return null;
  }
}

async function updateQuestStreak(guildId, userId, username) {
  const query = `
    INSERT INTO user_streaks (guild_id, user_id, username, quest_streak_current, quest_streak_best, quest_last_date)
    VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      quest_streak_current = CASE
        WHEN user_streaks.quest_last_date = CURRENT_DATE THEN user_streaks.quest_streak_current
        WHEN user_streaks.quest_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.quest_streak_current + 1
        ELSE 1
      END,
      quest_streak_best = GREATEST(
        user_streaks.quest_streak_best,
        CASE
          WHEN user_streaks.quest_last_date = CURRENT_DATE THEN user_streaks.quest_streak_current
          WHEN user_streaks.quest_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.quest_streak_current + 1
          ELSE 1
        END
      ),
      quest_last_date = CURRENT_DATE
    RETURNING quest_streak_current, quest_streak_best, quest_last_date;
  `;

  try {
    const result = await pool.query(query, [guildId, userId, username]);
    return result.rows[0];
  } catch (error) {
    console.error("Error updating quest streak:", error);
    return null;
  }
}

async function updateArtQuestStreak(guildId, userId, username) {
  const query = `
    INSERT INTO user_streaks (guild_id, user_id, username, art_streak_current, art_streak_best, art_last_date)
    VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      art_streak_current = CASE
        WHEN user_streaks.art_last_date = CURRENT_DATE THEN user_streaks.art_streak_current
        WHEN user_streaks.art_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.art_streak_current + 1
        ELSE 1
      END,
      art_streak_best = GREATEST(
        user_streaks.art_streak_best,
        CASE
          WHEN user_streaks.art_last_date = CURRENT_DATE THEN user_streaks.art_streak_current
          WHEN user_streaks.art_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.art_streak_current + 1
          ELSE 1
        END
      ),
      art_last_date = CURRENT_DATE
    RETURNING art_streak_current, art_streak_best, art_last_date;
  `;

  try {
    const result = await pool.query(query, [guildId, userId, username]);
    return result.rows[0];
  } catch (error) {
    console.error("Error updating art/quest streak:", error);
    return null;
  }
}

async function updateCanvasStreak(guildId, userId, username) {
  const query = `
    INSERT INTO user_streaks (guild_id, user_id, username, canvas_streak_current, canvas_streak_best, canvas_last_date)
    VALUES ($1, $2, $3, 1, 1, CURRENT_DATE)
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      canvas_streak_current = CASE
        WHEN user_streaks.canvas_last_date = CURRENT_DATE THEN user_streaks.canvas_streak_current
        WHEN user_streaks.canvas_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.canvas_streak_current + 1
        ELSE 1
      END,
      canvas_streak_best = GREATEST(
        user_streaks.canvas_streak_best,
        CASE
          WHEN user_streaks.canvas_last_date = CURRENT_DATE THEN user_streaks.canvas_streak_current
          WHEN user_streaks.canvas_last_date = CURRENT_DATE - INTERVAL '1 day' THEN user_streaks.canvas_streak_current + 1
          ELSE 1
        END
      ),
      canvas_last_date = CURRENT_DATE
    RETURNING canvas_streak_current, canvas_streak_best, canvas_last_date;
  `;

  try {
    const result = await pool.query(query, [guildId, userId, username]);
    return result.rows[0];
  } catch (error) {
    console.error("Error updating canvas streak:", error);
    return null;
  }
}

async function getUserStreaks(guildId, userId) {
  const result = await pool.query(
    `SELECT 
      COALESCE(art_streak_current, 0) AS art_streak_current,
      COALESCE(art_streak_best, 0) AS art_streak_best,
      art_last_date,
      COALESCE(canvas_streak_current, 0) AS canvas_streak_current,
      COALESCE(canvas_streak_best, 0) AS canvas_streak_best,
      canvas_last_date
    FROM user_streaks
    WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId],
  );

  return result.rows[0] || {
    art_streak_current: 0,
    art_streak_best: 0,
    art_last_date: null,
    canvas_streak_current: 0,
    canvas_streak_best: 0,
    canvas_last_date: null,
  };
}

/**
 * Get activity map for the last 56 days
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Map} Map of date strings to boolean (posted or not)
 */
async function getArtActivityMap(guildId, userId) {
  try {
    const result = await pool.query(
      `SELECT post_date FROM art_post_activity
       WHERE guild_id = $1 AND user_id = $2 AND post_date >= CURRENT_DATE - INTERVAL '6 months'
       ORDER BY post_date ASC`,
      [guildId, userId]
    );
    
    const activityMap = new Map();
    result.rows.forEach(row => {
      const dateStr = row.post_date.toISOString().split('T')[0];
      activityMap.set(dateStr, true);
    });
    
    return activityMap;
  } catch (error) {
    console.error("Error getting activity map:", error);
    return new Map();
  }
}

// TCG Card functions
async function addTcgCard(guildId, cardName, imageUrl, rarityPercent, addedBy) {
  try {
    const result = await pool.query(
      `INSERT INTO tcg_cards (guild_id, card_name, image_url, rarity_percent, added_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [guildId, cardName, imageUrl, rarityPercent, addedBy],
    );
    return result.rows[0].id;
  } catch (error) {
    console.error("Error adding TCG card:", error);
    return null;
  }
}

async function pullRandomCard(guildId) {
  try {
    // Get all cards for this guild
    const result = await pool.query(
      "SELECT * FROM tcg_cards WHERE guild_id = $1",
      [guildId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const cards = result.rows;
    
    // Calculate weighted random selection based on rarity_percent
    // Higher rarity_percent = more common
    const totalWeight = cards.reduce((sum, card) => sum + card.rarity_percent, 0);
    let random = Math.random() * totalWeight;
    
    for (const card of cards) {
      random -= card.rarity_percent;
      if (random <= 0) {
        return card;
      }
    }
    
    // Fallback to last card if rounding causes issues
    return cards[cards.length - 1];
  } catch (error) {
    console.error("Error pulling random card:", error);
    return null;
  }
}

async function getAllTcgCards(guildId) {
  const result = await pool.query(
    "SELECT * FROM tcg_cards WHERE guild_id = $1 ORDER BY rarity_percent DESC, id ASC",
    [guildId],
  );
  return result.rows;
}

// Artwork of the Week functions
async function getTopArtworkOfWeek(guildId) {
  // Get the most reacted artwork from the art channel in the previous week (Monday-Sunday)
  try {
    const artChannelId = await getArtChannel(guildId);
    if (!artChannelId) return null;

    const artChannel = await client.channels.fetch(artChannelId);
    if (!artChannel) return null;

    // Calculate previous week start (Monday) and end (Sunday)
    const now = new Date();
    // Calculate previous week (7 days ago to 1 day ago)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7); // Go back 7 days
    weekStart.setHours(0, 0, 0, 0);

    let topMessage = null;
    let topReactionCount = 0;

    // Fetch messages from the channel
    let lastId = undefined;
    for (let i = 0; i < 10; i++) { // Fetch up to 10 batches of 100 messages
      const messages = await artChannel.messages.fetch({ limit: 100, before: lastId });
      if (messages.size === 0) break;

      for (const message of messages.values()) {
        // Stop if we've gone before the week start
        if (message.createdAt < weekStart) {
          break;
        }

        // Count unique users who reacted
        const uniqueUsers = new Set();
        try {
          for (const reaction of message.reactions.cache.values()) {
            const users = await reaction.users.fetch().catch(() => null);
            if (users) {
              for (const user of users.values()) {
                if (!user.bot) {
                  uniqueUsers.add(user.id);
                }
              }
            }
          }
        } catch (e) {
          console.warn("Error fetching reactions for message:", e.message);
        }

        const reactionCount = uniqueUsers.size;
        if (reactionCount > topReactionCount) {
          topReactionCount = reactionCount;
          topMessage = message;
        }
      }

      lastId = messages.last()?.id;
      
      // Check if we've gone before the week start
      if (messages.some(msg => msg.createdAt < weekStart)) break;
    }

    return topMessage ? { message_id: topMessage.id, user_id: topMessage.author.id, reaction_count: topReactionCount } : null;
  } catch (error) {
    console.error("Error getting top artwork of week:", error);
    return null;
  }
}

async function recordArtworkOfWeek(guildId, messageId, userId, username, reactionCount) {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday of current week
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    await pool.query(
      `INSERT INTO artwork_of_week (guild_id, message_id, user_id, username, reaction_count, week_start)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (guild_id, week_start)
       DO UPDATE SET message_id = $2, user_id = $3, username = $4, reaction_count = $5`,
      [guildId, messageId, userId, username, reactionCount, weekStartStr],
    );
    return true;
  } catch (error) {
    console.error("Error recording artwork of week:", error);
    return false;
  }
}

async function getActivePromptChallenge(guildId) {
  const result = await pool.query(
    "SELECT * FROM weekly_prompt_challenge WHERE guild_id = $1 AND active = true ORDER BY start_time DESC LIMIT 1",
    [guildId],
  );
  return result.rows[0];
}

async function createPromptChallenge(guildId, promptText) {
  // Deactivate previous challenges
  await pool.query(
    "UPDATE weekly_prompt_challenge SET active = false WHERE guild_id = $1",
    [guildId],
  );
  
  // Create new challenge
  const result = await pool.query(
    "INSERT INTO weekly_prompt_challenge (guild_id, prompt_text, active) VALUES ($1, $2, true) RETURNING id",
    [guildId, promptText],
  );
  return result.rows[0].id;
}

async function setQuestChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO settings (guild_id, quest_channel_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET quest_channel_id = $2`,
    [guildId, channelId],
  );
}

async function getQuestChannel(guildId) {
  const result = await pool.query(
    "SELECT quest_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.quest_channel_id;
}

async function setCanvasChannel(guildId, channelId) {
  await pool.query(
    "INSERT INTO settings (guild_id, canvas_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET canvas_channel_id = $2",
    [guildId, channelId],
  );
}

async function getCanvasChannel(guildId) {
  const result = await pool.query(
    "SELECT canvas_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.canvas_channel_id;
}

async function setLogChannel(guildId, channelId) {
  await pool.query(
    "INSERT INTO settings (guild_id, log_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET log_channel_id = $2",
    [guildId, channelId],
  );
}

async function getLogChannel(guildId) {
  const result = await pool.query(
    "SELECT log_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.log_channel_id;
}

async function setAnnouncementChannel(guildId, channelId) {
  await pool.query(
    "INSERT INTO settings (guild_id, announcement_channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET announcement_channel_id = $2",
    [guildId, channelId],
  );
}

async function getAnnouncementChannel(guildId) {
  const result = await pool.query(
    "SELECT announcement_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.announcement_channel_id;
}

async function setPromptPingRole(guildId, roleId) {
  await pool.query(
    "INSERT INTO settings (guild_id, prompt_role_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET prompt_role_id = $2",
    [guildId, roleId],
  );
}

async function getPromptPingRole(guildId) {
  const result = await pool.query(
    "SELECT prompt_role_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.prompt_role_id;
}

async function setTierRoleSystemEnabled(guildId, enabled) {
  await pool.query(
    "INSERT INTO settings (guild_id, tier_role_system_enabled) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET tier_role_system_enabled = $2",
    [guildId, enabled],
  );
}

async function isTierRoleSystemEnabled(guildId) {
  const result = await pool.query(
    "SELECT tier_role_system_enabled FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.tier_role_system_enabled !== false; // Default to true if not set
}

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lowered = url.toLowerCase();
  return lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.startsWith("attachment:");
}

// Tier role helpers
async function setTierRole(guildId, tier, roleId) {
  await pool.query(
    `INSERT INTO tier_roles (guild_id, tier, role_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, tier) DO UPDATE SET role_id = $3`,
    [guildId, tier, roleId],
  );
}

async function getTierRolesMap(guildId) {
  const result = await pool.query(
    "SELECT tier, role_id FROM tier_roles WHERE guild_id = $1",
    [guildId],
  );
  const map = {};
  for (const row of result.rows) map[row.tier] = row.role_id;
  return map;
}

async function getMissingTierRoles(guildId) {
  const map = await getTierRolesMap(guildId);
  const missing = [];
  for (let t = 1; t <= 10; t++) if (!map[t]) missing.push(t);
  return missing;
}

function getTierForXp(xp) {
  let tier = 0;
  for (let t = 1; t <= 10; t++) {
    if (xp >= TIER_THRESHOLDS[t]) tier = t;
  }
  return tier;
}

async function applyTierRoles(guildId, userId) {
  try {
    // Check if tier role system is enabled for this guild
    const systemEnabled = await isTierRoleSystemEnabled(guildId);
    if (!systemEnabled) return; // Skip if disabled

    const tierRoles = await getTierRolesMap(guildId);
    const missing = [];
    for (let t = 1; t <= 10; t++) if (!tierRoles[t]) missing.push(t);

    if (missing.length > 0) {
      console.warn(`Guild ${guildId} is missing tier roles for: ${missing.join(", ")}`);
      // continue: assign only if target tier role exists
    }

    const userXp = await getUserXp(guildId, userId);
    const targetTier = getTierForXp(userXp);
    
    // Get the user's document to check their current tier (from the tier role)
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    // Determine current tier based on roles
    let currentTier = 0;
    for (let t = 1; t <= 10; t++) {
      if (tierRoles[t] && member.roles.cache.has(tierRoles[t])) {
        currentTier = t;
        break;
      }
    }

    // Check if this is a tier upgrade (new achievement)
    const isTierUpgrade = targetTier > currentTier;

    // Build list of all tier role IDs present in this guild
    const allTierRoleIds = Object.values(tierRoles).filter(Boolean);

    // Remove any tier roles the member currently has that are not the target role
    for (const rId of allTierRoleIds) {
      if (rId === tierRoles[targetTier]) continue;
      if (member.roles.cache.has(rId)) {
        try {
          await member.roles.remove(rId, "Tier role update");
        } catch (e) {
          console.warn(`Failed to remove role ${rId} from ${userId}:`, e.message || e);
        }
      }
    }

    // Add the target tier role if set and member doesn't have it
    const targetRoleId = tierRoles[targetTier];
    if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
      try {
        await member.roles.add(targetRoleId, "Reached tier " + targetTier);
      } catch (e) {
        console.warn(`Failed to add tier role ${targetRoleId} to ${userId}:`, e.message || e);
      }
    }

    // Award 10 seeds when reaching a new tier
    if (isTierUpgrade) {
      const username = member.user.username;
      await addSeeds(guildId, userId, username, 10, `🏆 Tier Rank-Up (Tier ${targetTier})`);
    }

    // Optionally log to log channel if configured
    try {
      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("🏆 Tier Milestone")
            .addFields(
              { name: "User", value: `<@${userId}>`, inline: true },
              { name: "Tier", value: `${targetTier}`, inline: true },
              { name: "Total XP", value: `${userXp}`, inline: true },
            )
            .setTimestamp();
          
          await channel.send({ embeds: [embed] });
        }
      }
    } catch (e) {
      // ignore logging errors
    }
  } catch (error) {
    console.error("Error applying tier roles:", error);
  }
}

// Safe interaction helpers: try update/reply/editReply and fall back to channel.send when interaction is unknown/expired
async function safeInteractionUpdate(interaction, data) {
  try {
    return await interaction.update(data);
  } catch (err) {
    // Unknown interaction / expired
    if (err?.code === 10062 || err?.status === 404) {
      console.warn("Interaction.update failed (unknown/expired). Falling back to channel.send.", err.code || err.status);
      try {
        const channel = interaction.channel || (interaction.guild && interaction.guild.systemChannel) || null;
        if (channel && typeof channel.send === "function") {
          const fallback = {};
          if (data.content) fallback.content = data.content;
          if (data.embeds) fallback.embeds = data.embeds;
          // Avoid sending components in fallback
          return await channel.send(fallback);
        }
      } catch (sendErr) {
        console.error("Fallback channel.send failed:", sendErr);
      }
      return;
    }
    throw err;
  }
}

async function safeInteractionReply(interaction, data) {
  try {
    return await interaction.reply(data);
  } catch (err) {
    if (err?.code === 10062 || err?.status === 404) {
      console.warn("Interaction.reply failed (unknown/expired). Falling back to channel.send.");
      try {
        const channel = interaction.channel || (interaction.guild && interaction.guild.systemChannel) || null;
        if (channel && typeof channel.send === "function") {
          const fallback = {};
          if (data.content) fallback.content = data.content;
          if (data.embeds) fallback.embeds = data.embeds;
          return await channel.send(fallback);
        }
      } catch (sendErr) {
        console.error("Fallback channel.send failed:", sendErr);
      }
      return;
    }
    throw err;
  }
}

async function safeEditReply(interaction, data) {
  try {
    return await interaction.editReply(data);
  } catch (err) {
    if (err?.code === 10062 || err?.status === 404) {
      console.warn("Interaction.editReply failed (unknown/expired). Falling back to channel.send.");
      try {
        const channel = interaction.channel || (interaction.guild && interaction.guild.systemChannel) || null;
        if (channel && typeof channel.send === "function") {
          const fallback = {};
          if (data.content) fallback.content = data.content;
          if (data.embeds) fallback.embeds = data.embeds;
          return await channel.send(fallback);
        }
      } catch (sendErr) {
        console.error("Fallback channel.send failed:", sendErr);
      }
      return;
    }
    throw err;
  }
}

async function submitDailyQuestImage(guildId, userId, username, messageId) {
  try {
    const result = await pool.query(
      `INSERT INTO daily_quest_submissions (guild_id, user_id, username, message_id, xp_awarded) 
       VALUES ($1, $2, $3, $4, false) 
       ON CONFLICT (guild_id, user_id, message_id) DO NOTHING
       RETURNING id`,
      [guildId, userId, username, messageId],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error submitting daily quest:", error);
    return false;
  }
}

async function approveDailyQuestXP(guildId, userId, moderatorId) {
  try {
    // Atomically claim the submission to prevent double awards
    const claim = await pool.query(
      `UPDATE daily_quest_submissions
       SET xp_awarded = true, approved_by = $1
       WHERE guild_id = $2 AND user_id = $3 AND xp_awarded = false
       RETURNING username`,
      [moderatorId, guildId, userId],
    );

    if (!claim.rows[0]) return { success: false, message: "Submission not found or already processed" };

    const username = claim.rows[0].username;

    // Award XP with boost
    await addXpWithBoost(guildId, userId, username, 20, "quest", "✅ Quest Challenge Approval");

    // Award 2 seeds for quest completion
    await addSeeds(guildId, userId, username, 2, "✅ Quest Challenge Approval");

    return { success: true, username };
  } catch (error) {
    console.error("Error approving daily quest:", error);
    return { success: false, message: "Error occurred" };
  }
}

async function rejectDailyQuest(guildId, userId) {
  try {
    const result = await pool.query(
      "DELETE FROM daily_quest_submissions WHERE guild_id = $1 AND user_id = $2 AND xp_awarded = false RETURNING id",
      [guildId, userId],
    );
    // Return true only if a row was actually deleted (not already rejected)
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error rejecting daily quest:", error);
    return false;
  }
}

async function submitToChallengeAndAwardXP(guildId, challengeId, userId, username, messageId) {
  try {
    // Insert submission without awarding XP (pending approval)
    const result = await pool.query(
      `INSERT INTO prompt_challenge_submissions (guild_id, challenge_id, user_id, username, message_id, xp_awarded) 
       VALUES ($1, $2, $3, $4, $5, false) 
       ON CONFLICT (challenge_id, user_id) DO NOTHING
       RETURNING id`,
      [guildId, challengeId, userId, username, messageId],
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error submitting to challenge:", error);
    return false;
  }
}

async function approveSubmissionAndAwardXP(guildId, challengeId, userId, moderatorId) {
  try {
    // Check if already approved
    const check = await pool.query(
      "SELECT xp_awarded, username FROM prompt_challenge_submissions WHERE challenge_id = $1 AND user_id = $2",
      [challengeId, userId],
    );
    
    if (!check.rows[0]) return { success: false, message: "Submission not found" };
    if (check.rows[0].xp_awarded) return { success: false, message: "Already approved" };
    
    const username = check.rows[0].username;
    
    // Award XP
    await addXp(guildId, userId, username, 20, "📋 Weekly Prompt Challenge Approval");
    
    // Mark as approved
    await pool.query(
      "UPDATE prompt_challenge_submissions SET xp_awarded = true, approved_by = $1 WHERE challenge_id = $2 AND user_id = $3",
      [moderatorId, challengeId, userId],
    );
    
    return { success: true, username };
  } catch (error) {
    console.error("Error approving submission:", error);
    return { success: false, message: "Error occurred" };
  }
}

async function rejectSubmission(challengeId, userId) {
  try {
    await pool.query(
      "DELETE FROM prompt_challenge_submissions WHERE challenge_id = $1 AND user_id = $2 AND xp_awarded = false",
      [challengeId, userId],
    );
    return true;
  } catch (error) {
    console.error("Error rejecting submission:", error);
    return false;
  }
}

async function removeSubmissionXP(guildId, challengeId, userId) {
  try {
    // Check if XP was awarded
    const check = await pool.query(
      "SELECT xp_awarded FROM prompt_challenge_submissions WHERE challenge_id = $1 AND user_id = $2",
      [challengeId, userId],
    );
    
    if (check.rows[0]?.xp_awarded) {
      // Remove 20 XP
      await pool.query(
        "UPDATE user_xp SET xp = GREATEST(0, xp - 20) WHERE guild_id = $1 AND user_id = $2",
        [guildId, userId],
      );
      
      // Mark as removed
      await pool.query(
        "UPDATE prompt_challenge_submissions SET xp_awarded = false WHERE challenge_id = $1 AND user_id = $2",
        [challengeId, userId],
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing submission XP:", error);
    return false;
  }
}

// Track daily XP earned and check if it exceeds the cap
async function trackDailyXp(guildId, userId, xpAmount) {
  try {
    const result = await pool.query(
      `INSERT INTO daily_xp_activity (guild_id, user_id, activity_date, total_xp_earned)
       VALUES ($1, $2, CURRENT_DATE, $3)
       ON CONFLICT (guild_id, user_id, activity_date)
       DO UPDATE SET total_xp_earned = daily_xp_activity.total_xp_earned + $3
       RETURNING total_xp_earned`,
      [guildId, userId, xpAmount]
    );
    return result.rows[0]?.total_xp_earned || 0;
  } catch (error) {
    console.error("Error tracking daily XP:", error);
    return 0;
  }
}

// Get today's total XP earned
async function getDailyXpEarned(guildId, userId) {
  try {
    const result = await pool.query(
      `SELECT total_xp_earned FROM daily_xp_activity 
       WHERE guild_id = $1 AND user_id = $2 AND activity_date = CURRENT_DATE`,
      [guildId, userId]
    );
    return result.rows[0]?.total_xp_earned || 0;
  } catch (error) {
    console.error("Error getting daily XP:", error);
    return 0;
  }
}

// Check if user has already done art posting or quest today
async function hasUserDoneActivityToday(guildId, userId) {
  try {
    // Check if they posted art today
    const artResult = await pool.query(
      `SELECT post_count FROM art_post_activity 
       WHERE guild_id = $1 AND user_id = $2 AND post_date = CURRENT_DATE`,
      [guildId, userId]
    );
    
    if (artResult.rows[0]?.post_count > 0) {
      return "art";
    }
    
    // Check if they submitted a quest today
    const questResult = await pool.query(
      `SELECT id FROM daily_quest_submissions 
       WHERE guild_id = $1 AND user_id = $2 AND DATE(submitted_at) = CURRENT_DATE`,
      [guildId, userId]
    );
    
    if (questResult.rows.length > 0) {
      return "quest";
    }
    
    return null;
  } catch (error) {
    console.error("Error checking activity:", error);
    return null;
  }
}

// Get active XP boost for a user
async function getActiveBoost(guildId, userId, activityType) {
  try {
    const result = await pool.query(
      `SELECT multiplier FROM xp_boosts 
       WHERE guild_id = $1 AND user_id = $2 AND (activity_type = $3 OR activity_type = 'all')
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [guildId, userId, activityType]
    );
    return result.rows[0]?.multiplier || 1.0;
  } catch (error) {
    console.error("Error getting boost:", error);
    return 1.0;
  }
}

// Get all active boosts for a user
async function getUserActiveBoosts(guildId, userId) {
  try {
    const result = await pool.query(
      `SELECT activity_type, multiplier, expires_at, 
              EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_remaining
       FROM xp_boosts 
       WHERE guild_id = $1 AND user_id = $2 AND expires_at > NOW()
       ORDER BY activity_type ASC`,
      [guildId, userId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error getting user boosts:", error);
    return [];
  }
}

// Add XP boost for a user
async function addXpBoost(guildId, userId, username, multiplier, activityType, durationHours, createdBy) {
  try {
    const result = await pool.query(
      `INSERT INTO xp_boosts (guild_id, user_id, username, multiplier, activity_type, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, NOW() + MAKE_INTERVAL(hours => $6), $7)
       RETURNING id, expires_at`,
      [guildId, userId, username, multiplier, activityType, durationHours, createdBy]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error adding boost:", error);
    return null;
  }
}

// Remove expired boosts
async function cleanupExpiredBoosts() {
  try {
    await pool.query(`DELETE FROM xp_boosts WHERE expires_at <= NOW()`);
  } catch (error) {
    console.error("Error cleaning up boosts:", error);
  }
}

// Remove a boost for a user and activity type
async function removeXpBoost(guildId, userId, activityType) {
  try {
    const result = await pool.query(
      `DELETE FROM xp_boosts 
       WHERE guild_id = $1 AND user_id = $2 AND activity_type = $3 AND expires_at > NOW()
       RETURNING id, multiplier, activity_type`,
      [guildId, userId, activityType]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error removing boost:", error);
    return null;
  }
}

async function addXpWithBoost(guildId, userId, username, baseAmount, activityType, activityDescription = null) {
  // Get active boost
  const multiplier = await getActiveBoost(guildId, userId, activityType);
  const boostedAmount = Math.floor(baseAmount * multiplier);
  
  await pool.query(
    `INSERT INTO user_xp (guild_id, user_id, username, xp) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (guild_id, user_id) 
     DO UPDATE SET xp = user_xp.xp + $4, username = $3`,
    [guildId, userId, username, boostedAmount],
  );
  
  // Log the XP award if log channel is set
  try {
    const logChannelId = await getLogChannel(guildId);
    if (logChannelId) {
      const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const newXP = await getUserXp(guildId, userId);
        const boostText = multiplier > 1.0 ? ` (${multiplier}x boost)` : "";
        const fields = [
          { name: "User", value: `<@${userId}> (${username})`, inline: true },
          { name: "Amount", value: `+${boostedAmount} XP${boostText}`, inline: true },
          { name: "Total XP", value: `${newXP}`, inline: true },
        ];
        if (activityDescription) {
          fields.push({ name: "Activity", value: activityDescription, inline: false });
        }
        await logChannel.send({
          embeds: [{
            color: 0x5865f2,
            title: "✅ XP Awarded",
            fields: fields,
            timestamp: new Date(),
          }],
        });
      }
    }
  } catch (error) {
    console.error("Error logging XP with boost:", error);
  }
  
  // Apply tier roles after awarding XP
  try {
    await applyTierRoles(guildId, userId);
  } catch (e) {
    console.error("Error applying tier roles after addXpWithBoost:", e);
  }
  
  return boostedAmount;
}

async function addXp(guildId, userId, username, amount = 1, activityDescription = null) {
  await pool.query(
    `INSERT INTO user_xp (guild_id, user_id, username, xp) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (guild_id, user_id) 
     DO UPDATE SET xp = user_xp.xp + $4, username = $3`,
    [guildId, userId, username, amount],
  );
  
  // Log the XP award if log channel is set
  try {
    const logChannelId = await getLogChannel(guildId);
    if (logChannelId) {
      const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const newXP = await getUserXp(guildId, userId);
        const fields = [
          { name: "User", value: `<@${userId}> (${username})`, inline: true },
          { name: "Amount", value: `+${amount} XP`, inline: true },
          { name: "Total XP", value: `${newXP}`, inline: true },
        ];
        if (activityDescription) {
          fields.push({ name: "Activity", value: activityDescription, inline: false });
        }
        await logChannel.send({
          embeds: [{
            color: 0x5865f2,
            title: "✅ XP Awarded",
            fields: fields,
            timestamp: new Date(),
          }],
        });
      }
    }
  } catch (error) {
    console.error("Error logging XP:", error);
  }
  
  // Apply tier roles after awarding XP
  try {
    await applyTierRoles(guildId, userId);
  } catch (e) {
    console.error("Error applying tier roles after addXp:", e);
  }
}

// Add seeds to user
async function addSeeds(guildId, userId, username, amount = 1, activityDescription = null) {
  try {
    const result = await pool.query(
      `INSERT INTO user_seeds (guild_id, user_id, username, seeds)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, user_id)
       DO UPDATE SET seeds = user_seeds.seeds + $4, username = $3
       RETURNING seeds`,
      [guildId, userId, username, amount]
    );
    const totalSeeds = result.rows[0]?.seeds || 0;
    
    // Log the seed award if log channel is set
    try {
      const logChannelId = await getLogChannel(guildId);
      if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0x4CAF50)
            .setTitle("🌱 Seeds Awarded")
            .addFields(
              { name: "User", value: `<@${userId}> (${username})`, inline: true },
              { name: "Amount", value: `+${amount} 🌱`, inline: true },
              { name: "Total Seeds", value: `${totalSeeds} 🌱`, inline: true },
            );
          if (activityDescription) {
            embed.addFields({ name: "Activity", value: activityDescription, inline: false });
          }
          embed.setTimestamp();
          
          // Add imgur thumbnail if configured (add your imgur link here)
          const SEED_THUMBNAIL_URL = "https://i.imgur.com/qdcZ9xy.png"; // Add your imgur image URL here, e.g., "https://imgur.com/xxxxx.png"
          if (SEED_THUMBNAIL_URL) {
            embed.setThumbnail(SEED_THUMBNAIL_URL);
          }
          
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error("Error logging seeds:", error);
    }
    
    return totalSeeds;
  } catch (error) {
    console.error("Error adding seeds:", error);
    return 0;
  }
}

// Get user's seed balance
async function getUserSeeds(guildId, userId) {
  try {
    const result = await pool.query(
      "SELECT seeds FROM user_seeds WHERE guild_id = $1 AND user_id = $2",
      [guildId, userId]
    );
    return result.rows[0]?.seeds || 0;
  } catch (error) {
    console.error("Error getting user seeds:", error);
    return 0;
  }
}

async function adjustXpWithLog(guildId, userId, username, amount, context = {}) {
  const result = await pool.query(
    `INSERT INTO user_xp (guild_id, user_id, username, xp)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET xp = GREATEST(0, user_xp.xp + $4), username = $3
     RETURNING xp`,
    [guildId, userId, username, amount],
  );

  const newXp = result.rows[0]?.xp || 0;

  try {
    const logChannelId = await getLogChannel(guildId);
    if (logChannelId) {
      const logChannel = await client.channels.fetch(logChannelId);
      if (logChannel) {
        const fields = [
          { name: "User", value: `<@${userId}> (${username})`, inline: true },
          { name: "Amount", value: `${amount > 0 ? "+" : ""}${amount} XP`, inline: true },
          { name: "Total XP", value: `${newXp}`, inline: true },
        ];

        if (context.actorId) {
          fields.splice(1, 0, {
            name: "From",
            value: `<@${context.actorId}>`,
            inline: true,
          });
        }

        if (context.reason) {
          fields.push({ name: "Reason", value: context.reason, inline: false });
        }

        await logChannel.send({
          embeds: [{
            color: amount > 0 ? 0x32cd32 : 0xbd2e58,
            title: context.title || "XP Update",
            fields,
            timestamp: new Date(),
          }],
        });
      }
    }
  } catch (error) {
    console.error("Error logging XP adjustment:", error);
  }

  // After adjusting XP, apply tier roles
  try {
    await applyTierRoles(guildId, userId);
  } catch (e) {
    console.error("Error applying tier roles after adjustXpWithLog:", e);
  }

  return newXp;
}

async function createFanartSubmission(guildId, artistId, artistUsername, targetId, targetUsername, imageUrl) {
  const result = await pool.query(
    `INSERT INTO fanart_submissions (guild_id, artist_id, artist_username, target_id, target_username, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [guildId, artistId, artistUsername, targetId, targetUsername, imageUrl],
  );

  return result.rows[0]?.id;
}

async function getFanartSubmissionById(id) {
  const result = await pool.query(
    "SELECT * FROM fanart_submissions WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

async function completeFanartSubmission(id, xpGiven) {
  const result = await pool.query(
    `UPDATE fanart_submissions
     SET status = 'completed', xp_given = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, xpGiven],
  );

  return result.rows[0];
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

async function getLeaderboardCount(guildId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM user_xp WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.count || 0;
}

async function getLeaderboardPage(guildId, page = 0, pageSize = RANKING_PAGE_SIZE) {
  const offset = page * pageSize;
  const result = await pool.query(
    "SELECT username, xp FROM user_xp WHERE guild_id = $1 ORDER BY xp DESC, username ASC LIMIT $2 OFFSET $3",
    [guildId, pageSize, offset],
  );
  return result.rows;
}

async function createRankingEmbed(guildId, userId, page = 0, pageSize = RANKING_PAGE_SIZE) {
  const [entries, totalCount, userXp] = await Promise.all([
    getLeaderboardPage(guildId, page, pageSize),
    getLeaderboardCount(guildId),
    getUserXp(guildId, userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRank = page * pageSize + 1;

  const rankingList = entries
    .map((user, index) => {
      const absoluteRank = startRank + index;
      const medal =
        absoluteRank === 1
          ? "🥇"
          : absoluteRank === 2
            ? "🥈"
            : absoluteRank === 3
              ? "🥉"
              : `**${absoluteRank}.**`;
      return `${medal} ${user.username} - ${user.xp} XP`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Ranking Leaderboard")
    .setColor(0xffd700)
    .setDescription(rankingList || "No rankings yet! Archive images or get reactions to earn XP.")
    .setFooter({ text: `Page ${page + 1}/${totalPages} | Total: ${totalCount} | Your XP: ${userXp}` })
    .setTimestamp();

  return { embed, totalPages };
}

function createRankingButtons(currentPage, totalPages) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ranking_prev_${currentPage}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`ranking_next_${currentPage}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
  );

  return row;
}

async function isModerator(guildId, member) {
  const roleIds = await getModRoles(guildId);
  if (!roleIds.length) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function getModRoles(guildId) {
  // Support legacy single role stored in settings
  const legacy = await pool.query(
    "SELECT mod_role_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  const legacyRole = legacy.rows[0]?.mod_role_id;

  const result = await pool.query(
    "SELECT role_id FROM mod_roles WHERE guild_id = $1",
    [guildId],
  );

  const roles = result.rows.map((r) => r.role_id);
  if (legacyRole) roles.push(legacyRole);

  // Deduplicate in case legacy overlaps with new entries
  return [...new Set(roles)];
}

async function setModRole(guildId, roleId) {
  // Insert into the new mod_roles table
  await pool.query(
    `INSERT INTO mod_roles (guild_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (guild_id, role_id) DO NOTHING`,
    [guildId, roleId],
  );

  // Keep legacy column in sync for backward compatibility (store latest)
  await pool.query(
    `INSERT INTO settings (guild_id, mod_role_id)
     VALUES ($1, $2)
     ON CONFLICT (guild_id)
     DO UPDATE SET mod_role_id = $2`,
    [guildId, roleId],
  );
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

// Count unique reactors on a message
async function countUniqueReactors(guildId, messageId) {
  try {
    const result = await pool.query(
      "SELECT COUNT(DISTINCT reactor_id) as count FROM reaction_tracking WHERE guild_id = $1 AND message_id = $2",
      [guildId, messageId]
    );
    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error("Error counting unique reactors:", error);
    return 0;
  }
}

async function setArtChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO settings (guild_id, art_channel_id) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET art_channel_id = $2`,
    [guildId, channelId],
  );
}

async function getArtChannel(guildId) {
  const result = await pool.query(
    "SELECT art_channel_id FROM settings WHERE guild_id = $1",
    [guildId],
  );
  return result.rows[0]?.art_channel_id;
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

async function postDailyPrompt() {
  const now = new Date();
  // Convert to UTC+8
  const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const hour = utc8Time.getUTCHours();
  
  // Check if it's 12 PM UTC+8
  if (hour !== 12) {
    return; // Not time to post
  }
  
  console.log("Time to post daily prompt!");
  
  for (const guild of client.guilds.cache.values()) {
    try {
      const questChannelId = await getQuestChannel(guild.id);
      if (!questChannelId) continue;
      
      const questChannel = await client.channels.fetch(questChannelId);
      if (!questChannel) continue;
      
      // Get 1 random prompt
      const prompt = await getRandomPrompt();
      if (!prompt) continue;
      
      // Create challenge with the prompt
      const challengeId = await createPromptChallenge(guild.id, prompt.prompt_text);
      
      // Remove the used prompt from the list
      await removePromptById(prompt.id);
      
      let canvasLink = null;
      // Try to create a Magma canvas in artspace project
      if (process.env.MAGMA_TOKEN && process.env.MAGMA_TEAM) {
        try {
          const teams = await magma.teams();
          const magmaTeam = teams.find(x => x.slug === process.env.MAGMA_TEAM);
          if (magmaTeam) {
            const artspaceProject = magmaTeam.projects.find(p => p.name.toLowerCase() === "artspace");
            if (artspaceProject) {
              const result = await magma.create({
                project: artspaceProject._id,
                name: "daily",
                type: "Drawing",
              });
              canvasLink = `https://magma.com/d/${result.shortId || result._id}`;
            }
          }
        } catch (magmaError) {
          console.error(`Error creating Magma canvas for ${guild.name}:`, magmaError);
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle("🎨 Daily Prompt!")
        .setDescription(prompt.prompt_text)
        .setColor(0xff6b35)
        .addFields(
          { name: "💰 Reward", value: "20 XP (pending moderator approval)", inline: true },
          { name: "📋 How to Participate", value: "Post your art in this channel with the prompt theme!", inline: false },
        );
      
      if (canvasLink) {
        embed.addFields(
          { name: "🎨 Canvas Link", value: `[Draw on Magma](${canvasLink})`, inline: false }
        );
      }
      
      embed.setFooter({ text: `Suggested by ${prompt.username}` });
      embed.setTimestamp();
      
      const promptRoleId = await getPromptPingRole(guild.id);
      const sendPayload = { embeds: [embed] };
      if (promptRoleId) {
        sendPayload.content = `<@&${promptRoleId}>`;
        sendPayload.allowedMentions = { roles: [promptRoleId] };
      }
      
      await questChannel.send(sendPayload);
      console.log(`Posted daily prompt to ${guild.name}` + (promptRoleId ? ` (pinged role ${promptRoleId})` : "") + (canvasLink ? " with canvas link" : ""));
    } catch (error) {
      console.error(`Error posting daily prompt to ${guild.name}:`, error);
    }
  }
}

async function createPromptListEmbed(page) {
  const prompts = await getAllPrompts();
  const totalPages = Math.ceil(prompts.length / PROMPT_PAGE_SIZE) || 1;
  const startIndex = page * PROMPT_PAGE_SIZE;
  const endIndex = Math.min(startIndex + PROMPT_PAGE_SIZE, prompts.length);
  const pagePrompts = prompts.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setTitle("📋 Prompt List")
    .setColor(0xff9500)
    .setDescription(
      pagePrompts
        .map(
          (p, i) =>
            `**${startIndex + i + 1}.** ${p.prompt_text} - ${p.username}`,
        )
        .join("\n"),
    )
    .setFooter({
      text: `Page ${page + 1}/${totalPages} | Total: ${prompts.length} prompt(s)`,
    });

  return embed;
}

async function createPaginationButtons(currentPage) {
  const count = await getPromptCount();
  const totalPages = Math.ceil(count / PROMPT_PAGE_SIZE) || 1;

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

function createGeneralHelpEmbed() {
  return new EmbedBuilder()
    .setTitle("Arspot Bot Commands")
    .setColor(0x32cd32)
    .setDescription("Prompt management, XP system, quest challenges, and Magma integration")
    .addFields(
      { name: "🔥 /prompt add <text>", value: "Add a new prompt to the list" },
      { name: "🔥 /prompt list", value: "Display all prompts in the list" },
      { name: "🔥 /create <name> <project>", value: "Create a new Magma drawing canvas" },
      { name: "🔥 /ranking", value: "View the XP leaderboard" },
      { name: "🔥 /fanart <user> <image>", value: "Send fanart and let them rate it (-1/1/+5 XP to the artist)" },
      { name: "🔥 /stats [user]", value: "View your or another user's stats" },
      { name: "🔥 /help", value: "Show this help message" },
    )
    .addFields({
      name: "Quest System",
      value: "Post images in the quest channel during active challenges. Moderators will approve submissions to award 20 XP. Weekend quests auto-post at 6 AM UTC+8 on Saturdays/Sundays.",
    })
    .addFields({
      name: "Canvas Hosting",
      value: "Post Magma canvas links in the canvas channel or use /create to earn 30 XP per day (capped daily). Lifetime canvas hosted count tracks your total creations.",
    })
    .addFields({
      name: "Streaks",
      value: "Post in art/quest channels daily to grow your art streak. Host a canvas daily (link or /create) to grow your canvas streak. Missing a day resets the streak.",
    })
    .addFields({
      name: "Logging",
      value: "Set a log channel with /setlogchannel to track all XP awards.",
    });
}

function createModHelpEmbed() {
  return new EmbedBuilder()
    .setTitle("Moderator Commands")
    .setColor(0xbd2e58)
    .setDescription("These commands require the Moderate Members permission.")
    .addFields(
      { name: "🔥 /prompt random", value: "Get and remove a random prompt" },
      { name: "🔥 /prompt remove <number>", value: "Remove a prompt by its number" },
      { name: "🔥 /setpromptrole <role>", value: "Set the role pinged when pulling a prompt" },
      { name: "🔥 /setartchannel <channel>", value: "Set the art channel (15 XP per first post daily)" },
      { name: "🔥 /setquestchannel <channel>", value: "Set the quest channel (20 XP with approval)" },
      { name: "🔥 /setcanvaschannel <channel>", value: "Set the canvas channel (30 XP per day)" },
      { name: "🔥 /setlogchannel <channel>", value: "Set the XP log channel" },
    )
    .addFields({
      name: "Buttons",
      value: "Approve/Reject quest submissions and remove XP are available via message buttons in quest workflows.",
    });
}

function createHelpGeneralButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_mod")
      .setLabel("Moderator commands")
      .setStyle(ButtonStyle.Secondary),
  );
}

function createHelpModButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_general")
      .setLabel("General commands")
      .setStyle(ButtonStyle.Primary),
  );
}

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error(
    "Error: DISCORD_BOT_TOKEN is not set in environment variables.",
  );
  process.exit(1);
}
const { Events } = require("discord.js");

// Function to update quest channel descriptions with current prompt and time remaining
async function updateQuestChannelDescriptions() {
  try {
    console.log("Updating quest channel descriptions...");
    for (const guild of client.guilds.cache.values()) {
      try {
        const questChannelId = await getQuestChannel(guild.id);
        if (!questChannelId) continue;

        const questChannel = await client.channels.fetch(questChannelId).catch(() => null);
        if (!questChannel) continue;

        // Get current active challenge
        const result = await pool.query(
          "SELECT prompt_text FROM weekly_prompt_challenge WHERE guild_id = $1 AND active = true ORDER BY start_time DESC LIMIT 1",
          [guild.id],
        );

        if (result.rows.length === 0) {
          console.log(`No active prompt found for guild ${guild.name}`);
          continue;
        }

        const currentPrompt = result.rows[0].prompt_text;
        console.log(`Updating description for ${guild.name}: "${currentPrompt}"`);

        // Calculate time until next prompt at UTC+8 12:00 PM
        const now = new Date();
        const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        
        // Calculate next 12:00 PM UTC+8
        let nextPromptUtc8 = new Date(utc8Time);
        nextPromptUtc8.setUTCHours(12, 0, 0, 0);
        
        // If we're already past 12:00 PM UTC+8 today, schedule for tomorrow at 12:00 PM
        if (utc8Time.getUTCHours() >= 12) {
          nextPromptUtc8.setUTCDate(nextPromptUtc8.getUTCDate() + 1);
        }
        
        // Convert UTC+8 time back to UTC for Discord timestamp
        const nextPromptUtc = new Date(nextPromptUtc8.getTime() - (8 * 60 * 60 * 1000));
        const nextPromptTimestamp = Math.floor(nextPromptUtc.getTime() / 1000);

        const description = `**Current Prompt:** ${currentPrompt}\n\n⏰ **Next Prompt:** <t:${nextPromptTimestamp}:R>`;

        await questChannel.edit({ topic: description }).catch(e => {
          console.warn(`Failed to update quest channel description for ${guild.name}:`, e.message);
        });
      } catch (error) {
        console.warn(`Error updating quest channel description in guild ${guild.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error in updateQuestChannelDescriptions:", error);
  }
}

// Function to check and post weekly prompt & artwork of the week
async function checkAndPostWeeklyUpdates() {
  const now = new Date();
  // Convert to UTC+8
  const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const day = utc8Time.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = utc8Time.getUTCHours();
  
  // Check if it's Monday (1) at 12 AM UTC+8 - post artwork of the week
  if (day === 1 && hour === 0) {
    console.log("Time to post artwork of the week!");
    
    for (const guild of client.guilds.cache.values()) {
      try {
        const announcementChannelId = await getAnnouncementChannel(guild.id);
        if (!announcementChannelId) continue;
        
        const announcementChannel = await client.channels.fetch(announcementChannelId);
        if (!announcementChannel) continue;
        
        const topArt = await getTopArtworkOfWeek(guild.id);
        if (!topArt) continue;
        
        // Fetch the art channel to get the image
        const artChannelId = await getArtChannel(guild.id);
        if (!artChannelId) continue;
        
        const artChannel = await client.channels.fetch(artChannelId);
        if (!artChannel) continue;
        
        // Fetch the top artwork message to get image
        const topMessage = await artChannel.messages.fetch(topArt.message_id).catch(() => null);
        if (!topMessage || !topMessage.attachments.size) continue;
        
        const imageUrl = topMessage.attachments.first().url;
        
        const embed = new EmbedBuilder()
          .setTitle("🏆 Artwork of the Week!")
          .setColor(0xffd700)
          .addFields(
            { name: "Artist", value: `<@${topArt.user_id}>`, inline: true },
            { name: "Reactions", value: `${topArt.reaction_count} ❤️`, inline: true },
          )
          .setFooter({ text: `This week's most loved artwork!` })
          .setTimestamp();

        if (isValidImageUrl(imageUrl)) {
          try {
            embed.setImage(imageUrl);
          } catch (e) {
            console.warn("Artwork of the week: invalid image URL, skipping image", imageUrl);
          }
        } else {
          console.warn("Artwork of the week: unsupported image URL protocol, skipping image", imageUrl);
        }
        
        await announcementChannel.send({ embeds: [embed] });
        
        // Record this in the database
        await recordArtworkOfWeek(guild.id, topArt.message_id, topArt.user_id, "", topArt.reaction_count);
        console.log(`Posted artwork of the week to ${guild.name}`);
      } catch (error) {
        console.error(`Error posting artwork of the week to ${guild.name}:`, error);
      }
    }
  }
  
  // Daily prompts are now handled by postDailyPrompt() which posts at 12 PM UTC+8
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}!`);

  await initDatabase();
  
  // Schedule weekly updates check every hour
  setInterval(checkAndPostWeeklyUpdates, 60 * 60 * 1000);
  checkAndPostWeeklyUpdates(); // Check immediately on startup

  // Schedule daily prompts check every hour (posts at 12 PM UTC+8)
  setInterval(postDailyPrompt, 60 * 60 * 1000);
  postDailyPrompt(); // Check immediately on startup

  // Schedule hourly updates to quest channel descriptions
  setInterval(updateQuestChannelDescriptions, 60 * 60 * 1000);
  updateQuestChannelDescriptions(); // Update immediately on startup

  const rest = new REST({ version: "10" }).setToken(token);
  const testGuildId = process.env.TEST_GUILD_ID;

  try {
    console.log("Registering slash commands...");
    const cmdNames = commands.map((c) => c.name).join(", ");
    console.log("Commands to register:", cmdNames);

    // Register to test guild for instant updates (if set)
    if (testGuildId) {
      try {
        console.log(`Registering ${commands.length} commands to test guild ${testGuildId}...`);
        const startTime = Date.now();
        
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, testGuildId),
          { body: commands },
        );
        
        const elapsed = Date.now() - startTime;
        console.log(`Guild commands registered successfully! (took ${elapsed}ms)`);
      } catch (error) {
        console.error("Error registering guild commands:", error);
      }
    } else {
      console.log("TEST_GUILD_ID not set; registering globally (1 hour sync)...");
      try {
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands },
        );
        console.log("Global commands registered successfully!");
      } catch (error) {
        console.error("Error registering global commands:", error);
      }
    }

    console.log("Bot is ready and listening for commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
});

// Handle crashes and shutdowns
process.on("uncaughtException", async (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  process.exit(0);
});

process.on("SIGINT", async () => {
  process.exit(0);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Check if message is in quest channel
  const questChannelId = await getQuestChannel(message.guild.id);
  if (message.channelId === questChannelId) {
    const hasImage = message.attachments.some((att) =>
      att.contentType?.startsWith("image/"),
    );

    if (hasImage) {
      // Submit daily quest (pending moderator approval)
      const submitted = await submitDailyQuestImage(
        message.guild.id,
        message.author.id,
        message.author.username,
        message.id,
      );
      
      if (submitted) {
        await updateQuestStreak(
          message.guild.id,
          message.author.id,
          message.author.username,
        );

        // React on the original message for moderator approval
        await message.react("✅");
        await message.react("❌");
      }
    }
    return; // Don't process quest channel messages further
  }

  // Check if message is in the art channel and award XP for images
  const artChannelId = await getArtChannel(message.guild.id);
  if (message.channelId === artChannelId) {
    const hasImage = message.attachments.some((att) =>
      att.contentType?.startsWith("image/"),
    );

    if (hasImage) {
      // Regular art post - Track and award regular XP
      const postCount = await trackArtPost(message.guild.id, message.author.id);
      
      // Increment total art post count
      await incrementTotalArtPosts(
        message.guild.id,
        message.author.id,
        message.author.username,
      );
      
      // Award 10 XP only for the first post of the day
      if (postCount === 1) {
        const streakData = await updateArtStreak(
          message.guild.id,
          message.author.id,
          message.author.username,
        );

        await addXpWithBoost(
          message.guild.id,
          message.author.id,
          message.author.username,
          10,
          "art",
          "🎨 Art Post Bonus (Daily Streak)"
        );
        
        // Send streak notification
        if (streakData) {
          const { art_streak_current, art_streak_best } = streakData;
          
          // Determine milestone emoji
          let milestone = "";
          if (art_streak_current === 7) milestone = " 🎉 One Week!";
          else if (art_streak_current === 14) milestone = " 🔥 Two Weeks!";
          else if (art_streak_current === 30) milestone = " 🌟 One Month!";
          else if (art_streak_current === 60) milestone = " 🎊 Two Months!";
          else if (art_streak_current === 100) milestone = " 👑 100 Days!";
          
          const streakEmbed = new EmbedBuilder()
            .setTitle("🔥 Streak Updated!")
            .setColor(0xff6b35)
            .addFields(
              { name: "User", value: `<@${message.author.id}>`, inline: true },
              { name: "Current Streak", value: `${art_streak_current} days${milestone}`, inline: true },
              { name: "Best Streak", value: `${art_streak_best} days`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp();
          
          try {
            // Send to log channel instead of art channel
            const logChannelId = await getLogChannel(message.guild.id);
            if (logChannelId) {
              const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
              
              if (logChannel && logChannel.isTextBased()) {
                try {
                  const { generateStreakCalendarPNG } = require("./lib/streakRenderer");
                  const activityMap = await getArtActivityMap(message.guild.id, message.author.id);
                  
                  const calendarData = {
                    current: art_streak_current,
                    best: art_streak_best,
                    lastDate: streakData.art_last_date ? new Date(streakData.art_last_date).toLocaleDateString() : "Today"
                  };
                  
                  const { png } = await generateStreakCalendarPNG(message.author.username, calendarData, activityMap);
                  
                  if (png) {
                    const { AttachmentBuilder } = require("discord.js");
                    const attachment = new AttachmentBuilder(png, { name: "streak_calendar.png" });
                    await logChannel.send({ 
                      embeds: [streakEmbed], 
                      files: [attachment]
                    }).catch(() => {});
                  } else {
                    await logChannel.send({ embeds: [streakEmbed] }).catch(() => {});
                  }
                } catch (graphError) {
                  console.error("Error generating calendar graph:", graphError);
                  // Fallback to just the embed if graph generation fails
                  await logChannel.send({ embeds: [streakEmbed] }).catch(() => {});
                }
              }
            }
          } catch (error) {
            console.error("Error sending streak notification to log channel:", error);
          }
        }
      }
      
      // Award 2 seeds per art post (regardless of daily cap)
      await addSeeds(message.guild.id, message.author.id, message.author.username, 2, "📌 Art Link Post (First of the day)");
    }
  }

  // Check if message is in canvas channel and contains Magma canvas link
  const canvasChannelId = await getCanvasChannel(message.guild.id);
  if (message.channelId === canvasChannelId) {
    const magmaLinkRegex = /https:\/\/magma\.com\/d\/[a-zA-Z0-9_-]+/;
    if (magmaLinkRegex.test(message.content)) {
      // Track canvas post count (daily capped)
      const postCount = await trackCanvasPost(message.guild.id, message.author.id);
      
      // Increment total canvas host count
      await incrementCanvasHosts(
        message.guild.id,
        message.author.id,
        message.author.username,
      );
      
      // Award 3 seeds for hosting a canvas
      await addSeeds(message.guild.id, message.author.id, message.author.username, 3, "🖼️ Canvas Hosting Reward");
      
      // Award 30 XP only for the first canvas link of the day
      if (postCount === 1) {
        await updateCanvasStreak(
          message.guild.id,
          message.author.id,
          message.author.username,
        );

        await addXp(
          message.guild.id,
          message.author.id,
          message.author.username,
          30,
          "🖼️ Canvas Link Post (First of the day)"
        );
      }
      
      await message.react("🎨");
    }
  }

});

// Art channel listener for XP - award 15 XP per image posted (capped daily)
// This is handled in the messageCreate handler above for art channel images

// Reaction listener for quest approval and art channel reactions
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

  // Fetch partial messages if needed
  const message = reaction.message;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.error("Error fetching message:", error);
      return;
    }
  }

  if (!message.guild) return;

  // Check if this is a quest submission message with moderator reaction
  const questChannelId = await getQuestChannel(message.guild.id);
  if (message.channel.id === questChannelId && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌")) {
    // Check if user has moderator permissions
    const member = await message.guild.members.fetch(user.id);
    const isMod = await isModerator(message.guild.id, member);
    if (!isMod) {
      // Remove non-mod reactions
      try {
        await reaction.remove();
      } catch (e) {
        console.error("Error removing reaction:", e);
      }
      return;
    }

    const questSubmitterId = message.author.id;

    // Approve / Reject (idempotent: only processes if not already handled)
    if (reaction.emoji.name === "✅") {
      try {
        const result = await approveDailyQuestXP(message.guild.id, questSubmitterId, user.id);
        if (result.success) {
          const currentXP = await getUserXp(message.guild.id, questSubmitterId);
          try {
            await message.reply({
              content: `✅ Approved! <@${questSubmitterId}> earned **+20 XP**. Current total: ${currentXP} XP`,
            });
          } catch (e) {
            console.warn("Could not reply to quest approval:", e);
          }
        } else {
          // Already processed; silently ignore
          console.log(`Quest approval already processed for user ${questSubmitterId} in guild ${message.guild.id}`);
        }
      } catch (error) {
        console.error("Error approving quest:", error);
      }
    } else if (reaction.emoji.name === "❌") {
      try {
        const rejected = await rejectDailyQuest(message.guild.id, questSubmitterId);
        if (rejected) {
          try {
            await message.reply({
              content: `❌ **Rejected by <@${user.id}>** - No XP awarded`,
            });
          } catch (e) {
            console.warn("Could not reply to quest rejection:", e);
          }
        } else {
          // Already processed; silently ignore
          console.log(`Quest rejection already processed for user ${questSubmitterId} in guild ${message.guild.id}`);
        }
      } catch (error) {
        console.error("Error rejecting quest:", error);
      }
    }
    return;
  }

  // Art channel reaction handling for XP
  const artChannelId = await getArtChannel(message.guild.id);

  // Skip if no art channel is set or message is not in art channel
  if (!artChannelId || message.channel.id !== artChannelId) return;

  // Check if message has an image attachment
  const hasImageAttachment = message.attachments.some((att) =>
    att.contentType?.startsWith("image/"),
  );

  if (!hasImageAttachment) return;

  // Don't give XP for reacting to your own message
  if (message.author.id === user.id) return;

  const isNewReaction = await trackReaction(
    message.guild.id,
    message.id,
    message.author.id,
    user.id,
  );

  if (isNewReaction) {
    await addXpWithBoost(
      message.guild.id,
      message.author.id,
      message.author.username,
      1,
      "reaction",
      "💬 Message Reaction"
    );
    
    // Check if this is the 5th unique reaction
    const uniqueReactorCount = await countUniqueReactors(message.guild.id, message.id);
    if (uniqueReactorCount === 5) {
      await addSeeds(message.guild.id, message.author.id, message.author.username, 6, "💬 5th Unique Reaction Milestone");
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
  // Handle autocomplete for Magma projects
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "create") {
      try {
        const teams = await magma.teams();
        const magmaTeam = process.env.MAGMA_TEAM;
        const projects = teams
          .filter((x) => x.slug === magmaTeam)
          .flatMap((team) => team.projects);
        const choices = projects.map((x) => ({
          name: x.name,
          value: x._id,
        }));
        await interaction.respond(choices.slice(0, 25)); // Discord limits to 25 choices
      } catch (error) {
        console.error("Error fetching Magma projects:", error);
        await interaction.respond([]);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Handle Daily Quest Approve button
    if (customId.startsWith("approve_daily_xp_")) {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this button.",
          flags: 0,
        }).catch(() => {});
      }
      
      const userId = customId.split("_")[3];
      
            try {
            const result = await approveDailyQuestXP(
              interaction.guild.id,
              userId,
              interaction.user.id,
            );

            if (result.success) {
              const currentXP = await getUserXp(interaction.guild.id, userId);
              await safeInteractionUpdate(interaction, {
                content: `✅ Approved! <@${userId}> earned **+20 XP**. Current total: ${currentXP} XP`,
                components: [], // Remove buttons
              });
            } else {
              await safeInteractionReply(interaction, {
                content: `❌ ${result.message}`,
                flags: 0,
              });
            }
          } catch (error) {
            console.error("Error in approve_daily_xp button:", error);
          }
      return;
    }

    // Handle Daily Quest Reject button
    if (customId.startsWith("reject_daily_xp_")) {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this button.",
          flags: 0,
        }).catch(() => {});
      }
      
      const userId = customId.split("_")[3];
      
      const rejected = await rejectDailyQuest(interaction.guild.id, userId);
      
      if (rejected) {
        await safeInteractionUpdate(interaction, {
          content: `❌ **Rejected by <@${interaction.user.id}>** - No XP awarded`,
          components: [], // Remove buttons
        });
      } else {
        await safeInteractionReply(interaction, {
          content: "❌ Submission not found or already processed.",
          flags: 0,
        });
      }
      return;
    }

    // Handle Approve XP button (for challenge-specific quests)
    if (customId.startsWith("approve_xp_")) {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this button.",
          flags: 0,
        }).catch(() => {});
      }
      
      const parts = customId.split("_");
      const challengeId = parseInt(parts[2]);
      const userId = parts[3];
      
      const result = await approveSubmissionAndAwardXP(
        interaction.guild.id,
        challengeId,
        userId,
        interaction.user.id,
      );
      
      if (result.success) {
        const currentXP = await getUserXp(interaction.guild.id, userId);
        await safeInteractionUpdate(interaction, {
          content: `✅ **Approved by <@${interaction.user.id}>!** <@${userId}> earned **+20 XP** for quest completion! Current total: ${currentXP} XP`,
          components: [], // Remove buttons
        });
      } else {
        await safeInteractionReply(interaction, {
          content: `❌ ${result.message}`,
          flags: 0,
        });
      }
      return;
    }

    // Handle Reject XP button
    if (customId.startsWith("reject_xp_")) {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this button.",
          flags: 0,
        }).catch(() => {});
      }
      
      const parts = customId.split("_");
      const challengeId = parseInt(parts[2]);
      const userId = parts[3];
      
      const rejected = await rejectSubmission(challengeId, userId);
      
      if (rejected) {
        await safeInteractionUpdate(interaction, {
          content: `❌ **Rejected by <@${interaction.user.id}>** - No XP awarded`,
          components: [], // Remove buttons
        });
      } else {
        await safeInteractionReply(interaction, {
          content: "❌ Submission not found or already processed.",
          flags: 0,
        });
      }
      return;
    }

    if (customId.startsWith("fanart_rate_")) {
      const parts = customId.split("_");
      const fanartId = parseInt(parts[2], 10);
      const amount = parseInt(parts[3], 10);

      if (Number.isNaN(fanartId) || Number.isNaN(amount)) {
        return safeInteractionReply(interaction, { content: "❌ Invalid fanart rating." }).catch(() => {});
      }

      const submission = await getFanartSubmissionById(fanartId);

      if (!submission) {
        return safeInteractionReply(interaction, { content: "❌ Fanart not found or expired." }).catch(() => {});
      }

      if (submission.target_id !== interaction.user.id) {
        return safeInteractionReply(interaction, { content: "❌ Only the tagged user can rate this fanart." }).catch(() => {});
      }

      if (submission.status !== "pending") {
        return safeInteractionReply(interaction, { content: "❌ This fanart has already been rated." }).catch(() => {});
      }

      const updatedSubmission = await completeFanartSubmission(fanartId, amount);

      if (!updatedSubmission) {
        return safeInteractionReply(interaction, { content: "❌ This fanart has already been rated." }).catch(() => {});
      }

      const newXp = await adjustXpWithLog(
        submission.guild_id,
        submission.artist_id,
        submission.artist_username,
        amount,
        {
          title: "Fanart Feedback",
          actorId: submission.target_id,
          reason: "Fanart feedback rating",
        },
      );

      const resultEmbed = new EmbedBuilder()
        .setTitle("🎨 Fanart Feedback")
        .setColor(amount > 0 ? 0x32cd32 : 0xbd2e58)
        .setDescription(`Feedback recorded by <@${submission.target_id}> for fanart from <@${submission.artist_id}>.`)
        .addFields(
          { name: "XP Change", value: `${amount > 0 ? "+" : ""}${amount} XP`, inline: true },
          { name: "Artist Total XP", value: `${newXp}`, inline: true },
        )
        .setTimestamp();

      if (isValidImageUrl(submission.image_url)) {
        try {
          resultEmbed.setImage(submission.image_url);
        } catch (e) {
          console.warn("Fanart feedback: invalid image URL, skipping image", submission.image_url);
        }
      } else {
        console.warn("Fanart feedback: unsupported image URL protocol, skipping image", submission.image_url);
      }

      await safeInteractionUpdate(interaction, {
        content: `✅ Fanart rated. <@${submission.artist_id}> ${amount > 0 ? "+" : ""}${amount} XP`,
        embeds: [resultEmbed],
        components: [],
      });
      return;
    }

    // Handle Remove XP button
    if (customId.startsWith("remove_xp_")) {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this button.",
          flags: 0,
        }).catch(() => {});
      }
      
      const parts = customId.split("_");
      const challengeId = parseInt(parts[2]);
      const userId = parts[3];
      
      const removed = await removeSubmissionXP(interaction.guild.id, challengeId, userId);
      
      if (removed) {
        await safeInteractionUpdate(interaction, {
          content: `🚫 **Moderator removed 20 XP** from <@${userId}>`,
          components: [], // Remove the button
        });
      } else {
        await safeInteractionReply(interaction, {
          content: "❌ XP was already removed or not found.",
          flags: 0,
        });
      }
      return;
    }

    if (customId === "help_mod") {
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to view moderator commands.",
          flags: 0,
        }).catch(() => {});
      }

      const embed = await createModHelpEmbed();
      const buttons = await createHelpModButtons();
      await safeInteractionUpdate(interaction, { embeds: [embed], components: [buttons] }).catch(() => {});
      return;
    }

    if (customId === "help_general") {
      const embed = await createGeneralHelpEmbed();
      const buttons = await createHelpGeneralButtons();
      await safeInteractionUpdate(interaction, { embeds: [embed], components: [buttons] }).catch(() => {});
      return;
    }

    if (customId.startsWith("ranking_prev_") || customId.startsWith("ranking_next_")) {
      const parts = customId.split("_");
      const currentPage = parseInt(parts[2], 10) || 0;
      const direction = customId.startsWith("ranking_prev_") ? -1 : 1;
      const newPage = Math.max(0, currentPage + direction);

      const { embed, totalPages } = await createRankingEmbed(
        interaction.guild.id,
        interaction.user.id,
        newPage,
        RANKING_PAGE_SIZE,
      );

      const buttons = createRankingButtons(newPage, totalPages);

      await safeInteractionUpdate(interaction, { embeds: [embed], components: [buttons] });
      return;
    }

    if (customId === "prev_page" || customId === "next_page") {
      const footer = interaction.message.embeds[0]?.footer?.text || "";
      const pageMatch = footer.match(/Page (\d+)/);
      let currentPage = pageMatch ? parseInt(pageMatch[1]) - 1 : 0;

      if (customId === "prev_page") {
        currentPage = Math.max(0, currentPage - 1);
      } else {
        const count = await getPromptCount();
        const totalPages = Math.ceil(count / PROMPT_PAGE_SIZE) || 1;
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      const embed = await createPromptListEmbed(currentPage);
      const buttons = await createPaginationButtons(currentPage);

      await safeInteractionUpdate(interaction, { embeds: [embed], components: [buttons] });
    }
    return;
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;

    if (customId === "shop_purchase") {
      const itemId = parseInt(interaction.values[0]);

      try {
        // Get item details
        const itemResult = await pool.query(
          `SELECT * FROM shop_items WHERE id = $1 AND guild_id = $2`,
          [itemId, interaction.guild.id]
        );

        if (itemResult.rows.length === 0) {
          return safeInteractionReply(interaction, {
            content: "❌ Item not found!",
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        const item = itemResult.rows[0];
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Get user's current seeds
        const userSeedsResult = await pool.query(
          `SELECT seeds FROM user_seeds WHERE guild_id = $1 AND user_id = $2`,
          [interaction.guild.id, userId]
        );

        const currentSeeds = userSeedsResult.rows[0]?.seeds || 0;

        // Check if user has enough seeds
        if (currentSeeds < item.seed_cost) {
          return safeInteractionReply(interaction, {
            content: `❌ Not enough seeds! You have **${currentSeeds} 🌱** but need **${item.seed_cost} 🌱**.`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        // Check if user already has an active boost for this activity BEFORE deducting seeds
        const existingBoost = await getActiveBoost(interaction.guild.id, userId, item.activity);
        if (existingBoost > 1.0) {
          const activityLabel = item.activity === "all" ? "all activities" : 
                               item.activity === "art" ? "art posting" :
                               item.activity === "quest" ? "quests" :
                               "reactions";
          return safeInteractionReply(interaction, {
            content: `❌ You already have an active boost for ${activityLabel}. Wait for it to expire or remove it first.`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        // Deduct seeds
        await pool.query(
          `UPDATE user_seeds SET seeds = seeds - $1 WHERE guild_id = $2 AND user_id = $3`,
          [item.seed_cost, interaction.guild.id, userId]
        );

        // Add XP boost
        await addXpBoost(
          interaction.guild.id,
          userId,
          username,
          item.boost_multiplier,
          item.activity,
          item.duration_hours,
          null // createdBy
        );

        const activityLabel = item.activity === "all" ? "All activities" : 
                             item.activity === "art" ? "Art posting" :
                             item.activity === "quest" ? "Quests" :
                             "Reactions";

        const embed = new EmbedBuilder()
          .setColor(0x4CAF50)
          .setTitle(`✅ Purchased: ${item.item_name}`)
          .addFields(
            { name: "Cost", value: `${item.seed_cost} 🌱`, inline: true },
            { name: "Seeds Remaining", value: `${currentSeeds - item.seed_cost} 🌱`, inline: true },
            { name: "Boost", value: `${item.boost_multiplier}x`, inline: true },
            { name: "Duration", value: `${item.duration_hours} hour(s)`, inline: true },
            { name: "Activity Type", value: activityLabel, inline: true }
          )
          .setTimestamp();

        await safeInteractionReply(interaction, { embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => {});
      } catch (error) {
        console.error("Error purchasing shop item:", error);
        await safeInteractionReply(interaction, {
          content: `❌ Error purchasing item: ${error.message}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === "prompt") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const promptText = interaction.options.getString("text");
      const username = interaction.user.username;
      await addPrompt(promptText, username);
      const count = await getPromptCount();
      await safeInteractionReply(interaction, { content: `✅ Prompt added to the list!`, flags: MessageFlags.Ephemeral }).catch(() => {});
    } else if (subcommand === "list") {
      await interaction.deferReply();
      
      try {
        const count = await getPromptCount();

        if (count === 0) {
          const embed = new EmbedBuilder()
            .setTitle("Prompt List")
            .setColor(0xbd2e58)
            .setDescription(
              "The prompt list is empty.\nAdd prompts using `/prompt add`",
            );

          return await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        const embed = await createPromptListEmbed(0);
        const totalPages = Math.ceil(count / PROMPT_PAGE_SIZE) || 1;

        if (totalPages > 1) {
          const buttons = await createPaginationButtons(0);
          await interaction.editReply({ embeds: [embed], components: [buttons] }).catch(() => {});
        } else {
          await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }
      } catch (error) {
        console.error("Error in prompt list:", error);
        await interaction.editReply({ content: "❌ Error fetching prompt list." }).catch(() => {});
      }
    } else if (subcommand === "random") {
      // Defer the reply FIRST to prevent interaction timeout
      await interaction.deferReply();

      const shouldRemove = interaction.options.getBoolean("remove");
      
      // Check if user has moderator permissions (only needed if removing)
      if (shouldRemove) {
        const isMod = await isModerator(interaction.guild.id, interaction.member);
        if (!isMod) {
          return await interaction.editReply({
            content: "❌ You need moderator role to remove prompts from the list.",
          }).catch(() => {});
        }
      }

      const count = await getPromptCount();

      if (count === 0) {
        const embed = new EmbedBuilder()
          .setTitle("No Prompts Available")
          .setColor(0xfee75c)
          .setDescription(
            "The prompt list is empty.\nAdd prompts using `/prompt add`",
          );

        return await interaction.editReply({ embeds: [embed] }).catch(() => {});
      }

      const randomPrompt = await getRandomPrompt();
      
      if (shouldRemove) {
        await removePromptById(randomPrompt.id);
      }
      const newCount = await getPromptCount();

      const embed = new EmbedBuilder()
        .setTitle(shouldRemove ? "🎯 Official Random Prompt" : "💡 Personal Random Prompt")
        .setColor(shouldRemove ? 0xffa500 : 0x57f287)
        .setDescription(randomPrompt.prompt_text)
        .addFields({
          name: "Suggested by",
          value: randomPrompt.username,
          inline: true,
        });

      if (!shouldRemove) {
        embed.addFields({
          name: "ℹ️ Note",
          value: "This prompt will not be removed from the list.",
          inline: false,
        });
      }

      embed.setFooter({
        text: shouldRemove ? `Removed from list. ${newCount} prompt(s) remaining.` : `${newCount} prompt(s) available.`,
      });

      // Only update channel description if removing (moderator action)
      if (shouldRemove) {
        // Save this prompt to the database as the active challenge
        await createPromptChallenge(interaction.guild.id, randomPrompt.prompt_text);

        // Update quest channel description with prompt and time left
        try {
          const questChannelId = await getQuestChannel(interaction.guild.id);
          console.log(`Quest channel ID: ${questChannelId}`);
          if (questChannelId) {
            const questChannel = await client.channels.fetch(questChannelId);
            console.log(`Quest channel fetched: ${questChannel?.name || "null"}`);
            if (questChannel) {
              // Calculate time until next prompt at UTC+8 12:00 PM
              const now = new Date();
              const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
              
              // Calculate next 12:00 PM UTC+8
              let nextPromptUtc8 = new Date(utc8Time);
              nextPromptUtc8.setUTCHours(12, 0, 0, 0);
              
              // If we're already past 12:00 PM UTC+8 today, schedule for tomorrow at 12:00 PM
              if (utc8Time.getUTCHours() >= 12) {
                nextPromptUtc8.setUTCDate(nextPromptUtc8.getUTCDate() + 1);
              }
              
              // Convert UTC+8 time back to UTC for Discord timestamp
              const nextPromptUtc = new Date(nextPromptUtc8.getTime() - (8 * 60 * 60 * 1000));
              const nextPromptTimestamp = Math.floor(nextPromptUtc.getTime() / 1000);
              
              const description = `**Current Prompt:** ${randomPrompt.prompt_text}\n\n⏰ **Next Prompt:** <t:${nextPromptTimestamp}:R>`;
              console.log(`Updating quest channel description to: ${description}`);
              const result = await questChannel.edit({ topic: description });
              console.log(`Quest channel description updated successfully`);
            } else {
              console.warn("Quest channel not found after fetch");
            }
          } else {
            console.warn("No quest channel ID configured for this guild");
          }
        } catch (error) {
          console.warn("Error updating quest channel description:", error.message);
        }
      }

      const promptRoleId = await getPromptPingRole(interaction.guild.id);
      const replyPayload = { embeds: [embed] };

      // Only ping for official random prompt (when removing)
      if (promptRoleId && shouldRemove) {
        replyPayload.content = `<@&${promptRoleId}>`;
        replyPayload.allowedMentions = { roles: [promptRoleId] };
      }

      await interaction.editReply(replyPayload);
    } else if (subcommand === "remove") {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to remove prompts.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const promptNumber = interaction.options.getInteger("number");
      const prompts = await getAllPrompts();

      if (prompts.length === 0) {
        return safeInteractionReply(interaction,
          "The prompt list is empty. Add prompts using `/prompt add`",
        ).catch(() => {});
      }

      if (promptNumber > prompts.length) {
        return safeInteractionReply(interaction,
          `Invalid number. There are only ${prompts.length} prompt(s) in the list.`,
        ).catch(() => {});
      }

      const promptToRemove = prompts[promptNumber - 1];
      await removePromptById(promptToRemove.id);
      const newCount = await getPromptCount();
      await safeInteractionReply(interaction,
        `Removed prompt #${promptNumber}: "${promptToRemove.prompt_text}" (by ${promptToRemove.username})\n${newCount} prompt(s) remaining.`,
      ).catch(() => {});
    }
  } else if (commandName === "fanart") {
    const targetUser = interaction.options.getUser("user");
    const imageAttachment = interaction.options.getAttachment("image");

    if (!interaction.guild) {
      return safeInteractionReply(interaction, { content: "❌ This command can only be used in a server." }).catch(() => {});
    }

    await interaction.deferReply();

    if (!imageAttachment || !imageAttachment.contentType?.startsWith("image/")) {
      return interaction.editReply({ content: "❌ Please attach an image file for the fanart." });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: "❌ You can't send fanart to a bot." });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: "❌ You can't rate your own fanart." });
    }

    const fanartId = await createFanartSubmission(
      interaction.guild.id,
      interaction.user.id,
      interaction.user.username,
      targetUser.id,
      targetUser.username,
      imageAttachment.url,
    );

    const embed = new EmbedBuilder()
      .setTitle("🎨 New Fanart")
      .setColor(0xfee75c)
      .setDescription(`<@${targetUser.id}>, <@${interaction.user.id}> sent you fanart! Rate it to award XP to the artist.`)
      .addFields({ name: "How to rate", value: "Pick -1 XP, +1 XP, or +5 XP. Your choice is final." })
      .setTimestamp();

    if (isValidImageUrl(imageAttachment.url)) {
      try {
        embed.setImage(imageAttachment.url);
      } catch (e) {
        console.warn("Fanart command: invalid image URL, skipping image", imageAttachment.url);
      }
    } else {
      console.warn("Fanart command: unsupported image URL protocol, skipping image", imageAttachment.url);
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fanart_rate_${fanartId}_-1`)
        .setLabel("-1 XP")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`fanart_rate_${fanartId}_1`)
        .setLabel("+1 XP")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`fanart_rate_${fanartId}_5`)
        .setLabel("+5 XP")
        .setStyle(ButtonStyle.Success),
    );

    await interaction.editReply({
      content: `<@${targetUser.id}>`,
      embeds: [embed],
      components: [buttons],
    });
  } else if (commandName === "ranking") {
    try {
      const page = 0;
      const { embed, totalPages } = await createRankingEmbed(
        interaction.guild.id,
        interaction.user.id,
        page,
        RANKING_PAGE_SIZE,
      );

      if (totalPages > 1) {
        const buttons = createRankingButtons(page, totalPages);
        await safeInteractionReply(interaction, { embeds: [embed], components: [buttons] }).catch(() => {});
      } else {
        await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
      }
    } catch (error) {
      console.error("Error in ranking command:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "❌ Error fetching rankings." }).catch(() => {});
      } else {
        await safeInteractionReply(interaction, { content: "❌ Error fetching rankings.", flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  } else if (commandName === "setartchannel") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return safeInteractionReply(interaction, "Please select a text channel.").catch(() => {});
    }

    await setArtChannel(interaction.guild.id, channel.id);
    await safeInteractionReply(interaction,
      `Art channel set to ${channel}. Reactions on images posted there will award XP to the artist.`,
    ).catch(() => {});
  } else if (commandName === "setquestchannel") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return safeInteractionReply(interaction, "Please select a text channel.").catch(() => {});
    }

    await setQuestChannel(interaction.guild.id, channel.id);
    await safeInteractionReply(interaction,
      `Quest channel set to ${channel}. Users can post images for quest challenges here, and moderators will approve submissions for 20 XP.`,
    ).catch(() => {});
  } else if (commandName === "setcanvaschannel") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return safeInteractionReply(interaction, "Please select a text channel.").catch(() => {});
    }

    await setCanvasChannel(interaction.guild.id, channel.id);
    await safeInteractionReply(interaction,
      `Canvas channel set to ${channel}. Magma canvas links posted here will earn 30 XP.`,
    ).catch(() => {});
  } else if (commandName === "setlogchannel") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return safeInteractionReply(interaction, "Please select a text channel.").catch(() => {});
    }

    await setLogChannel(interaction.guild.id, channel.id);
    await safeInteractionReply(interaction,
      `Log channel set to ${channel}. All XP awards will be logged here.`,
    ).catch(() => {});
  } else if (commandName === "setannouncementchannel") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const channel = interaction.options.getChannel("channel");

    // Allow text channels and announcement channels
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return safeInteractionReply(interaction, "Please select a text or announcement channel.").catch(() => {});
    }

    await setAnnouncementChannel(interaction.guild.id, channel.id);
    await safeInteractionReply(interaction,
      `Announcement channel set to ${channel}. Artwork of the week will be posted here.`,
    ).catch(() => {});
  } else if (commandName === "setpromptrole") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const role = interaction.options.getRole("role");
    await setPromptPingRole(interaction.guild.id, role.id);

    await safeInteractionReply(interaction,
      `Prompt ping role set to ${role}. /prompt random will mention this role.`,
    ).catch(() => {});
  } else if (commandName === "settierrole") {
    // Only mods (server owner or mod roles) can set tier roles
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, { content: "❌ You need moderator role to use this command.", flags: 0 }).catch(() => {});
    }

    const tier = interaction.options.getInteger("tier");
    const role = interaction.options.getRole("role");

    if (tier < 1 || tier > 10) {
      return safeInteractionReply(interaction, { content: "Tier must be between 1 and 10.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    await setTierRole(interaction.guild.id, tier, role.id);
    await safeInteractionReply(interaction, { content: `✅ Tier ${tier} role set to ${role}.`, flags: MessageFlags.Ephemeral }).catch(() => {});
  } else if (commandName === "toggletierroles") {
    // Only mods can toggle the tier role system
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, { content: "❌ You need moderator role to use this command.", flags: 0 }).catch(() => {});
    }

    const enabled = interaction.options.getBoolean("enabled");
    await setTierRoleSystemEnabled(interaction.guild.id, enabled);
    
    const status = enabled ? "✅ **enabled**" : "❌ **disabled**";
    await safeInteractionReply(interaction, { 
      content: `Tier role system is now ${status}. Users will ${enabled ? "now" : "no longer"} automatically receive tier roles as they gain XP.`, 
      flags: MessageFlags.Ephemeral 
    }).catch(() => {});
  } else if (commandName === "artoftheweek") {
    // Only mods can post artwork of the week
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, { content: "❌ You need moderator role to use this command.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    await interaction.deferReply();

    try {
      const announcementChannelId = await getAnnouncementChannel(interaction.guild.id);
      if (!announcementChannelId) {
        return await interaction.editReply({ content: "❌ Announcement channel not set. Use /setannouncementchannel first." }).catch(() => {});
      }

      const announcementChannel = await client.channels.fetch(announcementChannelId);
      if (!announcementChannel) {
        return await interaction.editReply({ content: "❌ Announcement channel not found." }).catch(() => {});
      }

      const topArt = await getTopArtworkOfWeek(interaction.guild.id);
      if (!topArt) {
        return interaction.editReply({ content: "❌ No artwork found to post. Make sure users have posted and received reactions." });
      }

      // Fetch the art channel to get the image
      const artChannelId = await getArtChannel(interaction.guild.id);
      if (!artChannelId) {
        return interaction.editReply({ content: "❌ Art channel not set. Use /setartchannel first." });
      }

      const artChannel = await client.channels.fetch(artChannelId);
      if (!artChannel) {
        return interaction.editReply({ content: "❌ Art channel not found." });
      }

      // Fetch the top artwork message to get image
      const topMessage = await artChannel.messages.fetch(topArt.message_id).catch(() => null);
      if (!topMessage || !topMessage.attachments.size) {
        return interaction.editReply({ content: "❌ Could not fetch the artwork message or image." });
      }

      const imageUrl = topMessage.attachments.first().url;

      // Calculate previous week (7 days ago to 1 day ago)
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7); // Go back 7 days
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // 6 days after start = 7 day range
      weekEnd.setHours(23, 59, 59, 999);

      const weekStartTimestamp = Math.floor(weekStart.getTime() / 1000);
      const weekEndTimestamp = Math.floor(weekEnd.getTime() / 1000);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Artwork of the Week!")
        .setColor(0xffd700)
        .addFields(
          { name: "Artist", value: `<@${topArt.user_id}>`, inline: true },
          { name: "Total Unique User Reactions", value: `${topArt.reaction_count} ❤️`, inline: true },
          { name: "Week Start", value: `<t:${weekStartTimestamp}:D>`, inline: true },
          { name: "Week End", value: `<t:${weekEndTimestamp}:D>`, inline: true },
        )
        .setFooter({ text: `This week's most loved artwork!` })
        .setTimestamp();

      if (isValidImageUrl(imageUrl)) {
        try {
          embed.setImage(imageUrl);
        } catch (e) {
          console.warn("Artwork of the week: invalid image URL, skipping image", imageUrl);
        }
      } else {
        console.warn("Artwork of the week: unsupported image URL protocol, skipping image", imageUrl);
      }

      await announcementChannel.send({ content: `🏆 <@${topArt.user_id}>` });
      await announcementChannel.send({ embeds: [embed] });

      // Record this in the database
      const artistUsername = topMessage?.author?.username || "Unknown";
      await recordArtworkOfWeek(interaction.guild.id, topArt.message_id, topArt.user_id, artistUsername, topArt.reaction_count);
      
      // Award 50 XP and 10 seeds to the artist (with proper logging)
      await addXpWithBoost(interaction.guild.id, topArt.user_id, artistUsername, 50, "art", "🏆 Artwork of the Week Winner");
      await addSeeds(interaction.guild.id, topArt.user_id, artistUsername, 10, "🏆 Artwork of the Week Winner");
      
      await interaction.editReply({ 
        content: `✅ Artwork of the week posted! Artist: <@${topArt.user_id}> with ${topArt.reaction_count} reactions. (+50 XP, +10 seeds)` 
      });
    } catch (error) {
      console.error("Error posting artwork of the week:", error);
      await interaction.editReply({ content: `❌ Error posting artwork of the week: ${error.message}` });
    }
  } else if (commandName === "addboost") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const targetUser = interaction.options.getUser("user");
    const multiplier = interaction.options.getNumber("multiplier");
    const activityType = interaction.options.getString("activity");
    const durationHours = interaction.options.getInteger("duration_hours");

    try {
      // Check if user already has an active boost for this activity
      const existingBoost = await getActiveBoost(interaction.guild.id, targetUser.id, activityType);
      if (existingBoost > 1.0) {
        const activityLabel = activityType === "all" ? "all activities" : 
                             activityType === "art" ? "art posting" :
                             activityType === "quest" ? "quests" :
                             "reactions";
        return safeInteractionReply(interaction, {
          content: `❌ <@${targetUser.id}> already has an active boost for ${activityLabel}. Remove the existing boost first.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const boost = await addXpBoost(
        interaction.guild.id,
        targetUser.id,
        targetUser.username,
        multiplier,
        activityType,
        durationHours,
        interaction.user.id
      );

      if (!boost) {
        return safeInteractionReply(interaction, {
          content: "❌ Failed to add boost.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const activityLabel = activityType === "all" ? "All activities" : 
                           activityType === "art" ? "Art posting" :
                           activityType === "quest" ? "Quests" :
                           "Reactions";

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("✨ XP Boost Added")
        .addFields(
          { name: "User", value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
          { name: "Multiplier", value: `${multiplier}x`, inline: true },
          { name: "Activity Type", value: activityLabel, inline: true },
          { name: "Duration", value: `${durationHours} hour(s)`, inline: true }
        )
        .setTimestamp();

      await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error("Error adding XP boost:", error);
      await safeInteractionReply(interaction, {
        content: `❌ Error adding boost: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } else if (commandName === "removeboost") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const targetUser = interaction.options.getUser("user");
    const activityType = interaction.options.getString("activity");

    try {
      const removed = await removeXpBoost(interaction.guild.id, targetUser.id, activityType);

      if (!removed) {
        const activityLabel = activityType === "all" ? "all activities" : 
                             activityType === "art" ? "art posting" :
                             activityType === "quest" ? "quests" :
                             "reactions";
        return safeInteractionReply(interaction, {
          content: `❌ <@${targetUser.id}> does not have an active boost for ${activityLabel}.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const activityLabel = activityType === "all" ? "All activities" : 
                           activityType === "art" ? "Art posting" :
                           activityType === "quest" ? "Quests" :
                           "Reactions";

      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle("🗑️ XP Boost Removed")
        .addFields(
          { name: "User", value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
          { name: "Multiplier", value: `${removed.multiplier}x`, inline: true },
          { name: "Activity Type", value: activityLabel, inline: true }
        )
        .setTimestamp();

      await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error("Error removing XP boost:", error);
      await safeInteractionReply(interaction, {
        content: `❌ Error removing boost: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } else if (commandName === "modifyxp") {
    try {
      await interaction.deferReply();
    } catch (error) {
      console.error("Error deferring reply for modifyxp:", error);
      return;
    }

    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return await interaction.editReply({
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (amount === 0) {
      return interaction.editReply({
        content: "Amount cannot be 0.",
        flags: 0,
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO user_xp (guild_id, user_id, username, xp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id)
         DO UPDATE SET xp = GREATEST(0, user_xp.xp + $4), username = $3
         RETURNING xp`,
        [interaction.guild.id, targetUser.id, targetUser.username, amount],
      );

      const newXp = result.rows[0]?.xp || 0;

      const logChannelId = await getLogChannel(interaction.guild.id);
      if (logChannelId) {
        try {
          const logChannel = await client.channels.fetch(logChannelId);
          if (logChannel) {
            await logChannel.send({
              embeds: [{
                color: amount > 0 ? 0x32cd32 : 0xbd2e58,
                title: amount > 0 ? "XP Added" : "XP Removed",
                fields: [
                  { name: "User", value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
                  { name: "Amount", value: `${amount > 0 ? "+" : ""}${amount} XP`, inline: true },
                  { name: "Total XP", value: `${newXp}`, inline: true },
                  { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "Reason", value: reason, inline: false },
                ],
                timestamp: new Date(),
              }],
            });
          }
        } catch (e) {
          console.error("Error logging XP modification:", e);
        }
      }

      // Apply tier roles after manual XP modification
      try {
        await applyTierRoles(interaction.guild.id, targetUser.id);
      } catch (e) {
        console.error("Error applying tier roles after manual modifyxp:", e);
      }

      await interaction.editReply({
        content: `✅ Updated XP for <@${targetUser.id}> by ${amount > 0 ? "+" : ""}${amount} XP. New total: ${newXp} XP.`,
        flags: 0,
      });
    } catch (error) {
      console.error("Error modifying XP:", error);
      await interaction.editReply({
        content: "❌ Failed to modify XP. Please try again.",
        flags: 0,
      });
    }
  } else if (commandName === "modifyseeds") {
    // Check if user has moderator permissions
    const isMod = await isModerator(interaction.guild.id, interaction.member);
    if (!isMod) {
      return safeInteractionReply(interaction, {
        content: "❌ You need moderator role to use this command.",
        flags: 0,
      }).catch(() => {});
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (amount === 0) {
      return await interaction.editReply({
        content: "Amount cannot be 0.",
        flags: 0,
      }).catch(() => {});
    }

    try {
      const result = await pool.query(
        `INSERT INTO user_seeds (guild_id, user_id, username, seeds)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id)
         DO UPDATE SET seeds = GREATEST(0, user_seeds.seeds + $4), username = $3
         RETURNING seeds`,
        [interaction.guild.id, targetUser.id, targetUser.username, amount],
      );

      const newSeeds = result.rows[0]?.seeds || 0;

      const logChannelId = await getLogChannel(interaction.guild.id);
      if (logChannelId) {
        try {
          const logChannel = await client.channels.fetch(logChannelId);
          if (logChannel) {
            await logChannel.send({
              embeds: [{
                color: amount > 0 ? 0x32cd32 : 0xbd2e58,
                title: amount > 0 ? "Seeds Added" : "Seeds Removed",
                fields: [
                  { name: "User", value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
                  { name: "Amount", value: `${amount > 0 ? "+" : ""}${amount} 🌱`, inline: true },
                  { name: "Total Seeds", value: `${newSeeds} 🌱`, inline: true },
                  { name: "Moderator", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "Reason", value: reason, inline: false },
                ],
                timestamp: new Date(),
              }],
            });
          }
        } catch (e) {
          console.error("Error logging seed modification:", e);
        }
      }

      await interaction.editReply({
        content: `✅ Updated seeds for <@${targetUser.id}> by ${amount > 0 ? "+" : ""}${amount} 🌱. New total: ${newSeeds} 🌱.`,
        flags: 0,
      }).catch(() => {});
    } catch (error) {
      console.error("Error modifying seeds:", error);
      await interaction.editReply({
        content: "❌ Failed to modify seeds. Please try again.",
        flags: 0,
      }).catch(() => {});
    }
  } else if (commandName === "setmodrole") {
    // Check if user is server owner
    if (interaction.user.id !== interaction.guild.ownerId) {
      return safeInteractionReply(interaction, {
        content: "❌ Only the server owner can set the mod role.",
        flags: 0,
      }).catch(() => {});
    }

    const role = interaction.options.getRole("role");

    await setModRole(interaction.guild.id, role.id);

    const allRoles = await getModRoles(interaction.guild.id);
    const mentions = allRoles.map((r) => `<@&${r}>`).join(", ");

    await safeInteractionReply(interaction, {
      content: `✅ Moderator role added: ${role}\nCurrent mod roles: ${mentions}`,
      flags: 0,
    }).catch(() => {});
  } else if (commandName === "stats") {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userXp = await getUserXp(interaction.guild.id, targetUser.id);
    const userSeeds = await getUserSeeds(interaction.guild.id, targetUser.id);
    const totalArtPosts = await getTotalArtPosts(
      interaction.guild.id,
      targetUser.id,
    );
    const totalCanvasHosts = await getTotalCanvasHosts(
      interaction.guild.id,
      targetUser.id,
    );
    const totalQuestCompletions = await getTotalQuestCompletions(
      interaction.guild.id,
      targetUser.id,
    );
    const streaks = await getUserStreaks(
      interaction.guild.id,
      targetUser.id,
    );
    const boosts = await getUserActiveBoosts(interaction.guild.id, targetUser.id);
    const userTier = getTierForXp(userXp);
    
    // Get tier role info
    let tierRoleInfo = `Tier ${userTier}`;
    try {
      const tierRoles = await getTierRolesMap(interaction.guild.id);
      const tierRoleId = tierRoles[userTier];
      if (tierRoleId) {
        const role = await interaction.guild.roles.fetch(tierRoleId).catch(() => null);
        if (role) {
          tierRoleInfo = `Tier ${userTier} (${role})`;
        }
      }
    } catch (e) {
      console.error("Error fetching tier role:", e);
    }

    const fields = [
      { name: "🏆 Tier", value: tierRoleInfo, inline: true },
      { name: "🔸 XP", value: `${userXp}`, inline: true },
      { name: "🌱 Seeds", value: `${userSeeds}`, inline: true },
      { name: "📂 Art Posts", value: `${totalArtPosts}`, inline: true },
      { name: "📂 Canvas Hosted", value: `${totalCanvasHosts}`, inline: true },
      { name: "📂 Quests Completed", value: `${totalQuestCompletions}`, inline: true },
      {
        name: "🔥 Art Streak",
        value: `Current: ${streaks.art_streak_current} | Best: ${streaks.art_streak_best}`,
        inline: true,
      },
      {
        name: "🔥 Quest Streak",
        value: `Current: ${streaks.quest_streak_current} | Best: ${streaks.quest_streak_best}`,
        inline: true,
      },
      {
        name: "🔥 Canvas Streak",
        value: `Current: ${streaks.canvas_streak_current} | Best: ${streaks.canvas_streak_best}`,
        inline: true,
      },
    ];

    // Add boost info if user has active boosts
    if (boosts.length > 0) {
      const boostList = boosts.map(boost => {
        const activityName = boost.activity_type === "all" ? "All" :
                            boost.activity_type === "art" ? "Art" :
                            boost.activity_type === "quest" ? "Quest" :
                            boost.activity_type === "reaction" ? "Reactions" : boost.activity_type;
        // Use database-calculated remaining hours
        const expiresIn = Math.ceil(boost.hours_remaining);
        return `${activityName}: ${boost.multiplier}x (${Math.max(0, expiresIn)}h left)`;
      }).join("\n");
      
      fields.push({
        name: "🚀 Active Boosts",
        value: boostList,
        inline: false,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Stats`)
      .setColor(0xFF9500)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(...fields)
      .setTimestamp();

    try {
      // Generate art streak calendar
      let attachment = null;
      
      try {
        const { generateStreakCalendarPNG } = require("./lib/streakRenderer");
        const { AttachmentBuilder } = require("discord.js");
        const activityMap = await getArtActivityMap(interaction.guild.id, targetUser.id);
        
        if (activityMap && activityMap.size > 0) {
          const result = await generateStreakCalendarPNG(
            targetUser.username,
            { current: streaks?.art_streak_current || 0, best: streaks?.art_streak_best || 0, lastDate: new Date() },
            activityMap
          );
          
          if (result.png) {
            attachment = new AttachmentBuilder(result.png, { name: "streak_calendar.png" });
            embed.setImage("attachment://streak_calendar.png");
          }
        }
      } catch (calendarError) {
        console.error("Error generating calendar:", calendarError);
        // Continue without calendar if generation fails
      }
      
      const files = attachment ? [attachment] : [];
      
      await interaction.editReply({ embeds: [embed], files });
    } catch (error) {
      if (error?.code === 10062 || error?.status === 404) {
        // Interaction expired, send to channel instead
        try {
          await interaction.channel.send({ embeds: [embed] });
        } catch (e) {
          console.error("Failed to send stats to channel:", e);
        }
      } else {
        throw error;
      }
    }
  } else if (commandName === "create") {
    const title = interaction.options.getString("name");
    const projectId = interaction.options.getString("project");

    if (!process.env.MAGMA_TOKEN || !process.env.MAGMA_TEAM) {
      return interaction.reply({
        content: "Magma integration is not configured. Please contact an administrator.",
        flags: 0,
      });
    }

    try {
      await interaction.deferReply();
      
      const result = await magma.create({
        project: projectId,
        name: title,
        type: "Drawing",
      });

      const canvasId = result.shortId || result._id;
      
      // Track canvas hosting and award XP
      const postCount = await trackCanvasPost(interaction.guild.id, interaction.user.id);
      
      // Increment total canvas host count
      await incrementCanvasHosts(
        interaction.guild.id,
        interaction.user.id,
        interaction.user.username,
      );
      
      // Award 3 seeds for hosting a canvas
      await addSeeds(interaction.guild.id, interaction.user.id, interaction.user.username, 3, "🎨 Canvas Creation Reward");
      
      // Award 30 XP only for the first canvas creation of the day
      if (postCount === 1) {
        await updateCanvasStreak(
          interaction.guild.id,
          interaction.user.id,
          interaction.user.username,
        );

        await addXp(
          interaction.guild.id,
          interaction.user.id,
          interaction.user.username,
          30,
          "🎨 Canvas Creation (First of the day)"
        );
      }
      
      await interaction.editReply({
        content: `https://magma.com/d/${canvasId}`,
      });
    } catch (error) {
      console.error("Error creating Magma canvas:", error);
      await interaction.editReply({
        content: "Failed to create canvas. Please ensure you have the correct permissions and try again.",
      });
    }
  } else if (commandName === "addcard") {
    const cardName = interaction.options.getString("name");
    const imageUrl = interaction.options.getString("image");
    const rarityPercent = interaction.options.getInteger("rarity");

    const cardId = await addTcgCard(
      interaction.guild.id,
      cardName,
      imageUrl,
      rarityPercent,
      interaction.user.username,
    );

    if (cardId) {
      const embed = new EmbedBuilder()
        .setTitle("✅ Card Added!")
        .setColor(0xbd2e58)
        .addFields(
          { name: "Card Name", value: cardName, inline: true },
          { name: "Rarity", value: `${rarityPercent}%`, inline: true },
        )
        .setTimestamp();

      if (isValidImageUrl(imageUrl)) {
        try {
          embed.setImage(imageUrl);
        } catch (e) {
          console.warn("Add card: invalid image URL, skipping image", imageUrl);
        }
      } else {
        console.warn("Add card: unsupported image URL protocol, skipping image", imageUrl);
      }

      await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
    } else {
      await safeInteractionReply(interaction, {
        content: "❌ Failed to add card. Please try again.",
        flags: 0,
      }).catch(() => {});
    }
  } else if (commandName === "pull") {
    const card = await pullRandomCard(interaction.guild.id);

    if (!card) {
      return safeInteractionReply(interaction, {
        content: "❌ No cards available! Use `/addcard` to add cards first.",
        flags: 0,
      }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setTitle("🎴 You pulled a card!")
      .setColor(0xbd2e58)
      .addFields(
        { name: "Card Name", value: card.card_name, inline: true },
        { name: "Rarity", value: `${card.rarity_percent}%`, inline: true },
      )
      .setTimestamp();

    if (isValidImageUrl(card.image_url)) {
      try {
        embed.setImage(card.image_url);
      } catch (e) {
        console.warn("Pull card: invalid image URL, skipping image", card.image_url);
      }
    } else {
      console.warn("Pull card: unsupported image URL protocol, skipping image", card.image_url);
    }

    await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
  } else if (commandName === "shop") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      // Check if user has moderator permissions
      const isMod = await isModerator(interaction.guild.id, interaction.member);
      if (!isMod) {
        return safeInteractionReply(interaction, {
          content: "❌ You need moderator role to use this command.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const itemName = interaction.options.getString("itemname");
      const boostMultiplier = interaction.options.getNumber("boost_multiplier");
      const durationHours = interaction.options.getInteger("duration_hours");
      const activity = interaction.options.getString("activity");
      const seedCost = interaction.options.getInteger("seed_cost");

      try {
        await pool.query(
          `INSERT INTO shop_items (guild_id, item_name, boost_multiplier, duration_hours, activity, seed_cost)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [interaction.guild.id, itemName, boostMultiplier, durationHours, activity, seedCost]
        );

        const activityLabel = activity === "all" ? "All activities" : 
                             activity === "art" ? "Art posting" :
                             activity === "quest" ? "Quests" :
                             "Reactions";

        const embed = new EmbedBuilder()
          .setColor(0x4CAF50)
          .setTitle("✅ Shop Item Added")
          .addFields(
            { name: "Item Name", value: itemName, inline: true },
            { name: "Cost", value: `${seedCost} 🌱`, inline: true },
            { name: "Boost Multiplier", value: `${boostMultiplier}x`, inline: true },
            { name: "Duration", value: `${durationHours} hour(s)`, inline: true },
            { name: "Activity Type", value: activityLabel, inline: true }
          )
          .setTimestamp();

        await safeInteractionReply(interaction, { embeds: [embed] }).catch(() => {});
      } catch (error) {
        console.error("Error adding shop item:", error);
        await safeInteractionReply(interaction, {
          content: `❌ Error adding shop item: ${error.message}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    } else if (subcommand === "view") {
      await interaction.deferReply();
      try {
        const items = await pool.query(
          `SELECT * FROM shop_items WHERE guild_id = $1 ORDER BY id ASC`,
          [interaction.guild.id]
        );

        if (items.rows.length === 0) {
          return await interaction.editReply({
            content: "❌ No items in the shop yet!",
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }

        // Build select menu
        const selectOptions = items.rows.map((item, index) => ({
          label: `${item.item_name} (${item.seed_cost} 🌱)`,
          description: `${item.boost_multiplier}x for ${item.duration_hours}h`,
          value: item.id.toString(),
        }));

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("shop_purchase")
          .setPlaceholder("Select an item to purchase")
          .addOptions(selectOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setColor(0xFF9500)
          .setTitle("Shop");

        if (SHOP_IMAGE_URL) {
          embed.setImage(SHOP_IMAGE_URL);
        }

        await interaction.editReply({
          embeds: [embed],
          components: [row],
          flags: 0,
        }).catch(() => {});
      } catch (error) {
        console.error("Error viewing shop:", error);
        await interaction.editReply({
          content: `❌ Error viewing shop: ${error.message}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  } else if (commandName === "help") {
    const embed = await createGeneralHelpEmbed();
    const buttons = await createHelpGeneralButtons();
    await safeInteractionReply(interaction, { embeds: [embed], components: [buttons] }).catch(() => {});
  }
  } catch (error) {
    console.error("Unhandled error in interactionCreate:", error);
    // Try to reply to the interaction if possible
    try {
      if (interaction.isRepliable()) {
        await safeInteractionReply(interaction, {
          content: "❌ An unexpected error occurred. Please try again later.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    } catch (replyError) {
      console.error("Failed to send error message:", replyError);
    }
  }
});

client.login(token);
