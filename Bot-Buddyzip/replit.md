# Discord Prompt Bot

## Overview

A Discord bot that manages a prompt suggestion system for creative projects. Users can add prompts to a shared list, view all prompts with pagination, retrieve random prompts (which removes them from the list), and remove specific prompts. The bot also supports image archiving functionality, allowing users to save images from messages to a designated archive channel. All data is persisted in a PostgreSQL database.

**Status:** Running as Artspot BOT

## User Preferences

Preferred communication style: Simple, everyday language.

## Commands

### Slash Commands
- `/prompt add <text>` - Add a new prompt to the list
- `/prompt show` - Display all prompts (paginated, 20 per page)
- `/prompt random` - Get and remove a random prompt
- `/prompt remove <number>` - Remove a specific prompt by its number
- `/setarchive <channel>` - Set the channel for archived images
- `/ranking` - View the XP leaderboard
- `/help` - Show all available commands

### Image Archiving
Post a message with `![A]` and attach an image to archive it to the designated channel.

### XP Ranking System
- Earn 1 XP for your first archive each day (limit: 1 XP per day from archiving)
- Earn 1 XP for each unique user reaction on your messages
- View the leaderboard with `/ranking`

## Project Structure

```
Bot-Buddy/
├── index.js      - Main bot code and event handlers
├── commands.js   - Slash command definitions
└── package.json  - Project configuration and dependencies
```

## System Architecture

### Application Architecture
The bot uses a straightforward event-driven architecture built on Discord.js v14. The main application file (`index.js`) handles all bot initialization, event listeners, and interaction logic, while command definitions are separated into `commands.js` for clarity and maintainability.

**Key Design Decisions:**
- **Monolithic structure**: All bot logic resides in a single entry point for simplicity
- **Event-driven interactions**: Uses Discord.js event handlers for message and interaction events
- **Slash commands**: Modern Discord slash command API for user interactions
- **Component interactions**: Uses Discord buttons for pagination controls

### Data Persistence
PostgreSQL is used as the primary data store with connection pooling for efficient database access.

**Database Schema:**
- **prompts table**: Stores prompt suggestions with auto-incrementing IDs, text content, username attribution, and timestamps
- **settings table**: Stores guild-specific configuration (archive channel settings) with guild_id as primary key

### External Dependencies
- **discord.js** (^14.25.1): Full-featured Discord API wrapper
- **pg** (^8.16.3): PostgreSQL client for Node.js

### Environment Variables
- `DISCORD_BOT_TOKEN` - Bot authentication token (secret)
- `DATABASE_URL` - PostgreSQL connection string

## Recent Changes
- December 5, 2025: Bot deployed and running successfully
- December 5, 2025: Added PostgreSQL database for persistent storage
- December 5, 2025: Initial bot creation with prompt management and image archiving