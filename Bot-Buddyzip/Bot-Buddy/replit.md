# Discord Prompt Bot

## Overview
A simple Discord bot that manages a list of prompts. Users can add prompts, view all prompts, and get a random prompt (which removes it from the list). Prompts are stored in a PostgreSQL database with the username of who suggested them.

## Commands (Slash Commands)
- `/prompt add <text>` - Add a new prompt to the list
- `/prompt show` - Display all prompts in the list (paginated, 20 per page)
- `/prompt random` - Get and remove a random prompt from the list
- `/prompt remove <number>` - Remove a specific prompt by its number
- `/setarchive <channel>` - Set the channel for archived images
- `/help` - Show help message

## Image Archiving
- Reply to any message containing an image with `![A]` to archive it
- The image will be posted to the archive channel as an embed
- Shows the original author and who archived it

## Project Structure
- `index.js` - Main bot code and event handlers
- `commands.js` - Slash command definitions
- `package.json` - Project configuration and dependencies

## Database
Uses PostgreSQL to store prompts with:
- `id` - Unique identifier
- `prompt_text` - The prompt content
- `username` - Discord username of who suggested it
- `created_at` - Timestamp when added

## Setup
1. Create a Discord bot at https://discord.com/developers/applications
2. Enable "Message Content Intent" in Bot settings
3. Add the DISCORD_BOT_TOKEN secret
4. Run the bot

## Dependencies
- discord.js - Discord API library for Node.js
- pg - PostgreSQL client for Node.js

## Recent Changes
- December 5, 2025: Added PostgreSQL database for persistent storage with username tracking
- December 5, 2025: Initial bot creation with prompt management commands
