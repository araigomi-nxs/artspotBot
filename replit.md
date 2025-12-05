# Arspot Bot

A Discord bot for managing art archives and prompts with an XP ranking system.

## Overview

Arspot Bot allows users to:
- Archive artwork with `![A]` command
- Manage prompts for art challenges
- Earn XP through reactions on artwork (in art channel or archived embeds)
- View XP leaderboards and user stats

## Features

### Art Archiving
- Post an image with `![A]` in your message to archive it
- Images are sent to a designated archive channel with the original author's info
- Earn 5 XP for your first archive each day
- Each archive is tracked in your total archive count

### XP System
- **Art Channel Only**: Receive 1 XP when others react to your images (must have image attachments)
- Each user can only give 1 XP per message
- Cannot earn XP from your own reactions
- Archive channel is for viewing only - no XP from reactions there

### User Stats
- Track total archive count per user
- View XP and archive count with `/stats` command

### Prompt Management
- `/prompt add <text>` - Add a new prompt
- `/prompt show` - Display all prompts with pagination
- `/prompt random` - Get and remove a random prompt
- `/prompt remove <number>` - Remove a specific prompt

### Channel Setup Commands
- `/setarchive <channel>` - Set the archive channel (where archived images go)
- `/setartchannel <channel>` - Set the art channel (where reactions give XP for image posts)

### Other Commands
- `/ranking` - View the XP leaderboard
- `/stats [user]` - View your or another user's stats (XP and archive count)
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
- `settings` - Guild settings (archive_channel_id, art_channel_id)
- `user_xp` - User XP tracking per guild
- `user_archives` - User archive/drawing count per guild
- `reaction_tracking` - Prevents duplicate XP from reactions
- `archive_activity` - Daily archive tracking (for XP cooldown)

## Environment Variables

Required:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## Recent Changes

**December 2024:**
- Fixed XP reaction system to award XP to the original artwork author specified in the embed
- Added `AuthorID` field to embed footer for proper XP attribution
- Added Partials support for handling reactions on older messages
- Added `/setartchannel` command to designate art channel for reaction XP
- Reaction XP in art channel only works for messages with image attachments
- Changed archive XP from 1 to 5 (once per day)
- Added `user_archives` table to track total archive count per user
- Added `/stats` command to view user XP and archive count
