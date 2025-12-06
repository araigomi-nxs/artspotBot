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
      archive_channel_id VARCHAR(255),
      art_channel_id VARCHAR(255)
    )
  `;

  const createUserArchivesTable = `
    CREATE TABLE IF NOT EXISTS user_archives (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      archive_count INTEGER DEFAULT 0,
      UNIQUE(guild_id, user_id)
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