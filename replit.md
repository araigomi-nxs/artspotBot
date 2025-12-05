# Arspot Bot

A Discord bot for managing art archives and prompts with an XP ranking system.

## Overview

Arspot Bot allows users to:
- Archive artwork with `![A]` command
- Manage prompts for art challenges
- Earn XP through reactions on archived artwork
- View XP leaderboards

## Features

### Art Archiving
- Post an image with `![A]` in your message to archive it
- Images are sent to a designated archive channel with the original author's info
- Earn 1 XP for your first archive each day

### XP System
- Receive 1 XP when others react to your archived artwork
- XP is correctly attributed to the original artist (not the bot)
- Each user can only give 1 XP per archived image
- Cannot earn XP from your own reactions

### Prompt Management
- `/prompt add <text>` - Add a new prompt
- `/prompt show` - Display all prompts with pagination
- `/prompt random` - Get and remove a random prompt
- `/prompt remove <number>` - Remove a specific prompt

### Other Commands
- `/setarchive <channel>` - Set the archive channel
- `/ranking` - View the XP leaderboard
- `/help` - Show all commands

## Project Structure

```
.
├── index.js        # Main bot logic
├── commands.js     # Slash command definitions
├── package.json    # Dependencies
└── replit.md       # This file
```

## Database Tables

- `prompts` - Stores user-submitted prompts
- `settings` - Guild settings (archive channel)
- `user_xp` - User XP tracking per guild
- `reaction_tracking` - Prevents duplicate XP from reactions
- `archive_activity` - Daily archive tracking

## Environment Variables

Required:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## Recent Changes

**December 2024:**
- Fixed XP reaction system to award XP to the original artwork author specified in the embed, not the bot that posted the message
- Added `AuthorID` field to embed footer for proper XP attribution
- Added Partials support for handling reactions on older messages
