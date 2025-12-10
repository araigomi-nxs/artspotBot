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
      art_channel_id VARCHAR(255),
      quest_channel_id VARCHAR(255),
      canvas_channel_id VARCHAR(255),
      log_channel_id VARCHAR(255),
      announcement_channel_id VARCHAR(255)
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
  await pool.query(createTcgCardsTable);
  await pool.query(createArtworkOfWeekTable);
  await pool.query(createFanartSubmissionsTable);

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
  console.log("Database initialized.");
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
  // Get the most reacted artwork from the past 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const result = await pool.query(
    `SELECT 
      rt.message_id,
      rt.message_author_id as user_id,
      m.author_id,
      COUNT(DISTINCT rt.reactor_id) as reaction_count
    FROM reaction_tracking rt
    WHERE rt.guild_id = $1 AND rt.id IN (
      SELECT id FROM reaction_tracking 
      WHERE guild_id = $1 AND created_at >= $2::date
      ORDER BY id DESC
    )
    GROUP BY rt.message_id, rt.message_author_id, m.author_id
    ORDER BY reaction_count DESC
    LIMIT 1`,
    [guildId, weekAgo],
  );
  
  return result.rows[0];
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
    const check = await pool.query(
      "SELECT username FROM daily_quest_submissions WHERE guild_id = $1 AND user_id = $2 AND xp_awarded = false LIMIT 1",
      [guildId, userId],
    );
    
    if (!check.rows[0]) return { success: false, message: "Submission not found" };
    
    const username = check.rows[0].username;
    
    // Award XP
    await addXp(guildId, userId, username, 10);
    
    // Mark as approved
    await pool.query(
      "UPDATE daily_quest_submissions SET xp_awarded = true, approved_by = $1 WHERE guild_id = $2 AND user_id = $3 AND xp_awarded = false",
      [moderatorId, guildId, userId],
    );
    
    return { success: true, username };
  } catch (error) {
    console.error("Error approving daily quest:", error);
    return { success: false, message: "Error occurred" };
  }
}

async function rejectDailyQuest(guildId, userId) {
  try {
    await pool.query(
      "DELETE FROM daily_quest_submissions WHERE guild_id = $1 AND user_id = $2 AND xp_awarded = false",
      [guildId, userId],
    );
    return true;
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
    await addXp(guildId, userId, username, 10);
    
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
      // Remove 10 XP
      await pool.query(
        "UPDATE user_xp SET xp = GREATEST(0, xp - 10) WHERE guild_id = $1 AND user_id = $2",
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

async function addXp(guildId, userId, username, amount = 1) {
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
      const logChannel = await client.channels.fetch(logChannelId);
      if (logChannel) {
        const newXP = await getUserXp(guildId, userId);
        await logChannel.send({
          embeds: [{
            color: 0x5865f2,
            title: "✅ XP Awarded",
            fields: [
              { name: "User", value: `<@${userId}> (${username})`, inline: true },
              { name: "Amount", value: `+${amount} XP`, inline: true },
              { name: "Total XP", value: `${newXP}`, inline: true },
            ],
            timestamp: new Date(),
          }],
        });
      }
    }
  } catch (error) {
    console.error("Error logging XP:", error);
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

async function createPromptListEmbed(page) {
  const prompts = await getAllPrompts();
  const totalPages = Math.ceil(prompts.length / ITEMS_PER_PAGE);
  const startIndex = page * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, prompts.length);
  const pagePrompts = prompts.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setTitle("📋Prompt List")
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

function createGeneralHelpEmbed() {
  return new EmbedBuilder()
    .setTitle("Arspot Bot Commands")
    .setColor(0x32cd32)
    .setDescription("Prompt management, XP system, quest challenges, and Magma integration")
    .addFields(
      { name: "🔥 /prompt add <text>", value: "Add a new prompt to the list" },
      { name: "🔥 /prompt show", value: "Display all prompts in the list" },
      { name: "🔥 /create <name> <project>", value: "Create a new Magma drawing canvas" },
      { name: "🔥 /ranking", value: "View the XP leaderboard" },
      { name: "🔥 /fanart <user> <image>", value: "Send fanart and let them rate it (-5/1/+5 XP to the artist)" },
      { name: "🔥 /stats [user]", value: "View your or another user's stats" },
      { name: "🔥 /help", value: "Show this help message" },
    )
    .addFields({
      name: "Quest System",
      value: "Post images in the quest channel during active challenges. Moderators will approve submissions to award 10 XP. Weekend quests auto-post at 6 AM UTC+8 on Saturdays/Sundays.",
    })
    .addFields({
      name: "Canvas Hosting",
      value: "Post Magma canvas links in the canvas channel or use /create to earn 15 XP per day (capped daily). Lifetime canvas hosted count tracks your total creations.",
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
      { name: "🔥 /setartchannel <channel>", value: "Set the art channel (5 XP per first post daily)" },
      { name: "🔥 /setquestchannel <channel>", value: "Set the quest channel (10 XP with approval)" },
      { name: "🔥 /setcanvaschannel <channel>", value: "Set the canvas channel (15 XP per day)" },
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
          .setImage(imageUrl)
          .setFooter({ text: `This week's most loved artwork!` })
          .setTimestamp();
        
        await announcementChannel.send({ embeds: [embed] });
        
        // Record this in the database
        await recordArtworkOfWeek(guild.id, topArt.message_id, topArt.user_id, "", topArt.reaction_count);
        console.log(`Posted artwork of the week to ${guild.name}`);
      } catch (error) {
        console.error(`Error posting artwork of the week to ${guild.name}:`, error);
      }
    }
  }
  
  // Monday at 12 AM - only check quests if announcements aren't already done
  // Check if it's Saturday (6) or Sunday (0) at 6 AM UTC+8 - post weekly prompt
  if ((day === 6 || day === 0) && hour === 6) {
    console.log("Time to post weekly prompt!");
    
    for (const guild of client.guilds.cache.values()) {
      try {
        const questChannelId = await getQuestChannel(guild.id);
        if (!questChannelId) continue;
        
        const questChannel = await client.channels.fetch(questChannelId);
        if (!questChannel) continue;
        
        // Get a random prompt
        const prompt = await getRandomPrompt();
        if (!prompt) continue;
        
        // Create new challenge
        const challengeId = await createPromptChallenge(guild.id, prompt.prompt_text);
        
        // Delete the prompt from the list
        await removePromptById(prompt.id);
        
        const embed = new EmbedBuilder()
          .setTitle("🎨 Weekly Quest Challenge!")
          .setDescription(`**Prompt:** ${prompt.prompt_text}`)
          .setColor(0xff6b35)
          .addFields(
            { name: "💰 Reward", value: "10 XP (pending moderator approval)", inline: true },
            { name: "📋 How to Participate", value: "Post your art in this channel with the prompt theme!", inline: false },
          )
          .setFooter({ text: `Suggested by ${prompt.username}` })
          .setTimestamp();
        
        await questChannel.send({ embeds: [embed] });
        console.log(`Posted weekly quest to ${guild.name}`);
      } catch (error) {
        console.error(`Error posting weekly quest to ${guild.name}:`, error);
      }
    }
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}!`);

  await initDatabase();
  
  // Schedule weekly updates check every hour
  setInterval(checkAndPostWeeklyUpdates, 60 * 60 * 1000);
  checkAndPostWeeklyUpdates(); // Check immediately on startup

  const rest = new REST({ version: "10" }).setToken(token);
  const testGuildId = process.env.TEST_GUILD_ID;

  try {
    console.log("Registering slash commands...");
    const cmdNames = commands.map((c) => c.name).join(", ");
    console.log("Commands to register:", cmdNames);

    // Delete and register guild-specific commands for instant updates (if TEST_GUILD_ID is set)
    if (testGuildId) {
      try {
        const existingGuildCommands = await rest.get(
          Routes.applicationGuildCommands(client.user.id, testGuildId)
        );
        console.log(`Found ${existingGuildCommands.length} existing guild commands. Deleting...`);
        
        for (const cmd of existingGuildCommands) {
          console.log(`Deleting guild command: ${cmd.name}`);
          await rest.delete(
            Routes.applicationGuildCommand(client.user.id, testGuildId, cmd.id)
          );
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log("Existing guild commands deleted.");
        
        // Register guild-specific commands for instant updates
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, testGuildId),
          { body: commands },
        );
        console.log("Guild-specific commands registered instantly!");
      } catch (error) {
        console.error("Error registering guild commands:", error.message);
      }
    }

    // Delete all global commands (use only guild commands)
    try {
      const existingCommands = await rest.get(
        Routes.applicationCommands(client.user.id)
      );
      console.log(`Found ${existingCommands.length} existing global commands:`, existingCommands.map(c => c.name).join(", "));
      
      for (const cmd of existingCommands) {
        console.log(`Deleting global command: ${cmd.name}`);
        await rest.delete(
          Routes.applicationCommand(client.user.id, cmd.id)
        );
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log("Existing global commands deleted.");
    } catch (error) {
      console.error("Error deleting existing commands:", error.message);
    }

    // Clear global commands (empty array)
    try {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: [] },
      );
      console.log("Global command registration cleared (guild-only mode).");
    } catch (error) {
      console.error("Error clearing global commands:", error.message);
    }

    console.log("Bot is ready and listening for guild commands only.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
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
        await updateArtQuestStreak(
          message.guild.id,
          message.author.id,
          message.author.username,
        );

        // React with emojis for moderator approval
        const reply = await message.reply({
          content: `📋 **Quest submission pending approval** - Moderators can react with ✅ to approve or ❌ to reject`,
        });
        
        await reply.react("✅");
        await reply.react("❌");
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
      
      // Award 5 XP only for the first post of the day
      if (postCount === 1) {
        await updateArtQuestStreak(
          message.guild.id,
          message.author.id,
          message.author.username,
        );

        await addXp(
          message.guild.id,
          message.author.id,
          message.author.username,
          5,
        );
      }
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
      
      // Award 15 XP only for the first canvas link of the day
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
          15,
        );
      }
      
      await message.react("🎨");
    }
  }

});

// Art channel listener for XP - award 5 XP per image posted (capped daily)
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

  // Check if this is a quest submission (reply message with ✅ or ❌)
  const questChannelId = await getQuestChannel(message.guild.id);
  if (message.channel.id === questChannelId && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌")) {
    // Check if user has moderator permissions
    const member = await message.guild.members.fetch(user.id);
    if (!member.permissions.has("ModerateMembers")) {
      // Remove non-mod reactions
      try {
        await reaction.remove();
      } catch (e) {
        console.error("Error removing reaction:", e);
      }
      return;
    }

    // Get the original quest message this is replying to
    const referencedMessage = message.reference ? await message.channel.messages.fetch(message.reference.messageId) : null;
    if (!referencedMessage) {
      console.warn("Could not find referenced quest message");
      return;
    }

    // Get the quest submitter (author of original message)
    const questSubmitterId = referencedMessage.author.id;
    const questSubmitterName = referencedMessage.author.username;

    // This is a quest submission approval/rejection by a moderator
    if (reaction.emoji.name === "✅") {
      // Approve - award XP to the quest submitter
      try {
        await addXp(message.guild.id, questSubmitterId, questSubmitterName, 10);
        await pool.query(
          "UPDATE daily_quest_submissions SET xp_awarded = true, approved_by = $1 WHERE guild_id = $2 AND user_id = $3 AND xp_awarded = false",
          [user.id, message.guild.id, questSubmitterId],
        );
        
        // Update message to show approval
        try {
          await message.reply({
            content: `✅ **Approved by <@${user.id}>!** <@${questSubmitterId}> earned **+10 XP** for their quest submission!`,
          });
        } catch (e) {
          console.warn("Could not reply to quest approval:", e);
        }
      } catch (error) {
        console.error("Error approving quest:", error);
      }
    } else if (reaction.emoji.name === "❌") {
      // Reject - remove the submission
      try {
        await pool.query(
          "DELETE FROM daily_quest_submissions WHERE guild_id = $1 AND user_id = $2 AND xp_awarded = false",
          [message.guild.id, questSubmitterId],
        );
        
        try {
          await message.reply({
            content: `❌ **Rejected by <@${user.id}>** - No XP awarded`,
          });
        } catch (e) {
          console.warn("Could not reply to quest rejection:", e);
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
    await addXp(
      message.guild.id,
      message.author.id,
      message.author.username,
      1,
    );
  }
});

client.on("interactionCreate", async (interaction) => {
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
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to use this button.",
          ephemeral: true,
        });
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
          try {
            await interaction.update({
              content: `✅ **Approved by <@${interaction.user.id}>!** <@${userId}> earned **+10 XP** for their quest submission! Current total: ${currentXP} XP`,
              components: [], // Remove buttons
            });
          } catch (updateError) {
            // Interaction may have expired, try replying instead
            if (updateError.code === 10062) {
              console.warn("Interaction expired, skipping update");
            } else {
              throw updateError;
            }
          }
        } else {
          try {
            await interaction.reply({
              content: `❌ ${result.message}`,
              ephemeral: true,
            });
          } catch (replyError) {
            if (replyError.code !== 10062) {
              throw replyError;
            }
          }
        }
      } catch (error) {
        console.error("Error in approve_daily_xp button:", error);
      }
      return;
    }

    // Handle Daily Quest Reject button
    if (customId.startsWith("reject_daily_xp_")) {
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to use this button.",
          ephemeral: true,
        });
      }
      
      const userId = customId.split("_")[3];
      
      const rejected = await rejectDailyQuest(interaction.guild.id, userId);
      
      if (rejected) {
        await interaction.update({
          content: `❌ **Rejected by <@${interaction.user.id}>** - No XP awarded`,
          components: [], // Remove buttons
        });
      } else {
        await interaction.reply({
          content: "❌ Submission not found or already processed.",
          ephemeral: true,
        });
      }
      return;
    }

    // Handle Approve XP button (for challenge-specific quests)
    if (customId.startsWith("approve_xp_")) {
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to use this button.",
          ephemeral: true,
        });
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
        await interaction.update({
          content: `✅ **Approved by <@${interaction.user.id}>!** <@${userId}> earned **+10 XP** for quest completion! Current total: ${currentXP} XP`,
          components: [], // Remove buttons
        });
      } else {
        await interaction.reply({
          content: `❌ ${result.message}`,
          ephemeral: true,
        });
      }
      return;
    }

    // Handle Reject XP button
    if (customId.startsWith("reject_xp_")) {
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to use this button.",
          ephemeral: true,
        });
      }
      
      const parts = customId.split("_");
      const challengeId = parseInt(parts[2]);
      const userId = parts[3];
      
      const rejected = await rejectSubmission(challengeId, userId);
      
      if (rejected) {
        await interaction.update({
          content: `❌ **Rejected by <@${interaction.user.id}>** - No XP awarded`,
          components: [], // Remove buttons
        });
      } else {
        await interaction.reply({
          content: "❌ Submission not found or already processed.",
          ephemeral: true,
        });
      }
      return;
    }

    if (customId.startsWith("fanart_rate_")) {
      const parts = customId.split("_");
      const fanartId = parseInt(parts[2], 10);
      const amount = parseInt(parts[3], 10);

      if (Number.isNaN(fanartId) || Number.isNaN(amount)) {
        return interaction.reply({ content: "❌ Invalid fanart rating.", ephemeral: true });
      }

      const submission = await getFanartSubmissionById(fanartId);

      if (!submission) {
        return interaction.reply({ content: "❌ Fanart not found or expired.", ephemeral: true });
      }

      if (submission.target_id !== interaction.user.id) {
        return interaction.reply({ content: "❌ Only the tagged user can rate this fanart.", ephemeral: true });
      }

      if (submission.status !== "pending") {
        return interaction.reply({ content: "❌ This fanart has already been rated.", ephemeral: true });
      }

      const updatedSubmission = await completeFanartSubmission(fanartId, amount);

      if (!updatedSubmission) {
        return interaction.reply({ content: "❌ This fanart has already been rated.", ephemeral: true });
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
        .setImage(submission.image_url)
        .setTimestamp();

      await interaction.update({
        content: `✅ Fanart rated. <@${submission.artist_id}> ${amount > 0 ? "+" : ""}${amount} XP`,
        embeds: [resultEmbed],
        components: [],
      });
      return;
    }

    // Handle Remove XP button
    if (customId.startsWith("remove_xp_")) {
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to use this button.",
          ephemeral: true,
        });
      }
      
      const parts = customId.split("_");
      const challengeId = parseInt(parts[2]);
      const userId = parts[3];
      
      const removed = await removeSubmissionXP(interaction.guild.id, challengeId, userId);
      
      if (removed) {
        await interaction.update({
          content: `🚫 **Moderator removed 10 XP** from <@${userId}>`,
          components: [], // Remove the button
        });
      } else {
        await interaction.reply({
          content: "❌ XP was already removed or not found.",
          ephemeral: true,
        });
      }
      return;
    }

    if (customId === "help_mod") {
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to view moderator commands.",
          ephemeral: true,
        });
      }

      const embed = await createModHelpEmbed();
      const buttons = await createHelpModButtons();
      await interaction.update({ embeds: [embed], components: [buttons] });
      return;
    }

    if (customId === "help_general") {
      const embed = await createGeneralHelpEmbed();
      const buttons = await createHelpGeneralButtons();
      await interaction.update({ embeds: [embed], components: [buttons] });
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

  if (commandName === "prompt") {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const promptText = interaction.options.getString("text");
      const username = interaction.user.username;
      await addPrompt(promptText, username);
      const count = await getPromptCount();
      await interaction.reply(
        `✅Prompt added to the list!`,
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
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to get a random prompt.",
          ephemeral: true,
        });
      }

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
      // Check if user has moderator permissions
      if (!interaction.member.permissions.has("ModerateMembers")) {
        return interaction.reply({
          content: "❌ You need Moderate Members permission to remove prompts.",
          ephemeral: true,
        });
      }

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
  } else if (commandName === "fanart") {
    const targetUser = interaction.options.getUser("user");
    const imageAttachment = interaction.options.getAttachment("image");

    if (!interaction.guild) {
      return interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
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
      .addFields({ name: "How to rate", value: "Pick -5 XP, +1 XP, or +5 XP. Your choice is final." })
      .setImage(imageAttachment.url)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`fanart_rate_${fanartId}_-5`)
        .setLabel("-5 XP")
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
    const leaderboard = await getLeaderboard(interaction.guild.id, 10);
    const userXp = await getUserXp(interaction.guild.id, interaction.user.id);

    if (leaderboard.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("Ranking")
        .setColor(0xffd700)
        .setDescription(
          "No rankings yet! Archive images or get reactions to earn XP.",
        );

      return interaction.reply({ embeds: [embed] });
    }

    const rankingList = leaderboard
      .map((user, index) => {
        const medal =
          index === 0
            ? "🥇"
            : index === 1
              ? "🥈"
              : index === 2
                ? "🥉"
                : `**${index + 1}.**`;
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
  } else if (commandName === "setartchannel") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply("Please select a text channel.");
    }

    await setArtChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Art channel set to ${channel}. Reactions on images posted there will award XP to the artist.`,
    );
  } else if (commandName === "setquestchannel") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply("Please select a text channel.");
    }

    await setQuestChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Quest channel set to ${channel}. Users can post images for quest challenges here, and moderators will approve submissions for 10 XP.`,
    );
  } else if (commandName === "setcanvaschannel") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply("Please select a text channel.");
    }

    await setCanvasChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Canvas channel set to ${channel}. Magma canvas links posted here will earn 15 XP.`,
    );
  } else if (commandName === "setlogchannel") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply("Please select a text channel.");
    }

    await setLogChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Log channel set to ${channel}. All XP awards will be logged here.`,
    );
  } else if (commandName === "setannouncementchannel") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel");

    // Allow text channels and announcement channels
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return interaction.reply("Please select a text or announcement channel.");
    }

    await setAnnouncementChannel(interaction.guild.id, channel.id);
    await interaction.reply(
      `Announcement channel set to ${channel}. Artwork of the week will be posted here.`,
    );
  } else if (commandName === "modifyxp") {
    // Check if user has moderator permissions
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "❌ You need Moderate Members permission to use this command.",
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (amount === 0) {
      return interaction.reply({
        content: "Amount cannot be 0.",
        ephemeral: true,
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

      await interaction.reply({
        content: `✅ Updated XP for <@${targetUser.id}> by ${amount > 0 ? "+" : ""}${amount} XP. New total: ${newXp} XP.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error modifying XP:", error);
      await interaction.reply({
        content: "❌ Failed to modify XP. Please try again.",
        ephemeral: true,
      });
    }
  } else if (commandName === "stats") {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userXp = await getUserXp(interaction.guild.id, targetUser.id);
    const totalArtPosts = await getTotalArtPosts(
      interaction.guild.id,
      targetUser.id,
    );
    const totalCanvasHosts = await getTotalCanvasHosts(
      interaction.guild.id,
      targetUser.id,
    );
    const streaks = await getUserStreaks(
      interaction.guild.id,
      targetUser.id,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Stats`)
      .setColor(0x5865f2)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "XP", value: `${userXp}`, inline: true },
        { name: "Art Posts", value: `${totalArtPosts}`, inline: true },
        { name: "Canvas Hosted", value: `${totalCanvasHosts}`, inline: true },
        {
          name: "Art/Quest Streak",
          value: `Current: ${streaks.art_streak_current} | Best: ${streaks.art_streak_best}`,
          inline: true,
        },
        {
          name: "Canvas Streak",
          value: `Current: ${streaks.canvas_streak_current} | Best: ${streaks.canvas_streak_best}`,
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "create") {
    const title = interaction.options.getString("name");
    const projectId = interaction.options.getString("project");

    if (!process.env.MAGMA_TOKEN || !process.env.MAGMA_TEAM) {
      return interaction.reply({
        content: "Magma integration is not configured. Please contact an administrator.",
        ephemeral: true,
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
      
      // Award 15 XP only for the first canvas creation of the day
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
          15,
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
        .setImage(imageUrl)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({
        content: "❌ Failed to add card. Please try again.",
        ephemeral: true,
      });
    }
  } else if (commandName === "pull") {
    const card = await pullRandomCard(interaction.guild.id);

    if (!card) {
      return interaction.reply({
        content: "❌ No cards available! Use `/addcard` to add cards first.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🎴 You pulled a card!")
      .setColor(0xbd2e58)
      .addFields(
        { name: "Card Name", value: card.card_name, inline: true },
        { name: "Rarity", value: `${card.rarity_percent}%`, inline: true },
      )
      .setImage(card.image_url)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else if (commandName === "help") {
    const embed = await createGeneralHelpEmbed();
    const buttons = await createHelpGeneralButtons();
    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
});

client.login(token);
