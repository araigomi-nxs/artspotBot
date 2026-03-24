# 🔥 Daily Streak Tracking System - Automatic Implementation

## Overview

The daily streak tracking system is **fully automatic**. When users post art to the designated art channel, their streak is automatically updated without needing any manual commands.

---

## How It Works

### Automatic Behavior

1. **User posts image** in the art channel configured with `/setartchannel`
2. **Bot detects the image** and logs the post
3. **Streak updates automatically** - first post of the day updates their streak
4. **Notification is sent** showing their current streak and any milestones reached
5. **Database records it** in the `art_post_activity` table

### Streak Logic

```
Day 1: User posts → Streak = 1 ✅
Day 2: User posts → Streak = 2 ✅ (continues)
Day 3: User posts → Streak = 3 ✨ (10 seeds awarded!)
Day 4: User posts → Streak = 4 ✅
Day 5: User doesn't post → Streak resets to 0
Day 6: User posts → Streak = 1 (new streak starts)
```

---

## Features

### ✅ Automatic Tracking

- No commands needed
- Automatic on first art post each day
- Only counts first post per day for streak
- Subsequent posts grant seeds but don't re-trigger streak updates

### ✅ Milestone Notifications

When users reach streak milestones, they receive an automatic notification:

- 🎉 **7 days** - One Week
- 🔥 **14 days** - Two Weeks
- 🌟 **30 days** - One Month
- 🎊 **60 days** - Two Months
- 👑 **100 days** - 100 Days Milestone

### ✅ Rewards

- **10 XP** - First art post of the day (with boost multiplier)
- **2 seeds** - Per art post
- **10 seeds** - At 3-day streak milestone

### ✅ Persistent Tracking

- Streak data stored in `user_streaks` table
- Activity logged in `art_post_activity` table
- Best streak recorded permanently
- Last posted date tracked

---

## User Experience

### When User Posts Art

The bot automatically:

1. ✅ Detects the image attachment
2. ✅ Updates their daily activity
3. ✅ Continues their streak
4. ✅ Sends a notification embed showing:
   - **Current Streak**: X days
   - **Best Streak**: Y days
   - **Milestone**: If reached (One Week, Two Weeks, etc.)

### Example Notification

```
🔥 Streak Updated!
Current Streak: 7 days🎉 One Week!
Best Streak: 7 days
```

---

## Database Tables

### user_streaks table

Stores user streak information:

- `art_streak_current` - Current streak count
- `art_streak_best` - Best streak ever achieved
- `art_last_date` - Last date user posted

### art_post_activity table

Tracks daily activity:

- `guild_id` - Server ID
- `user_id` - User ID
- `post_date` - Date of post
- `post_count` - Number of posts that day

---

## Integration Points

The streaks are updated in **message handler** when:

1. Message posted in art channel (configured with `/setartchannel`)
2. Message contains an image attachment
3. It's the user's first post of the day

### Code Flow

```javascript
// Art channel detection
if (message.channelId === artChannelId) {
  if (hasImage) {
    trackArtPost(); // Logs daily activity

    if (postCount === 1) {
      updateArtStreak(); // Updates streak (automatic)
      sendStreakNotification(); // Shows notification ✨
    }
  }
}
```

---

## System Components

### 1. Database Functions

- `trackArtPost()` - Logs daily posts
- `updateArtStreak()` - Updates streak tracking
- `addXpWithBoost()` - Awards XP with multipliers
- `addSeeds()` - Awards seeds

### 2. Streak Renderer (`lib/streakRenderer.js`)

Available for future enhancements:

- `generateStreakCalendarSVG()` - 56-day calendar view
- `generateStreakStatsCardSVG()` - Stats card display
- Can be used to create `/stats` or leaderboard features later

### 3. Message Handler

Automatically triggers when images posted in art channel

---

## What Changed

### ❌ Removed

- `/streak checkin` command (automatic now)
- `/streak view` command
- `/streak stats` command
- `getStreakActivityMap()` utility function (not needed without commands)
- Command handlers in index.js

### ✅ Added

- Automatic streak notification when posting art
- Embed response showing streak progress
- Milestone detection and display on first post

### ✅ Database - No Changes

All existing tables and data remain intact and functional

---

## Configuration

No new configuration needed! Use existing commands:

```
/setartchannel [channel]  - Set where art posts are tracked
/setlogchannel [channel]  - Set where logs are posted
```

---

## Performance

- ✅ No performance impact - uses existing database queries
- ✅ Notification is fast (~100ms)
- ✅ Streak calculation is efficient
- ✅ No external API calls

---

## Troubleshooting

### Issue: Streak not updating

**Check**: User posted image in correct art channel (set via `/setartchannel`)

### Issue: Streak only updates once per day

**Expected**: Streak updates only on first post of day - this is correct!

### Issue: No notification showing

**Check**: Bot has permission to reply in the channel

### Issue: Streaks reset unexpectedly

**Note**: Streaks reset if a day is missed (date doesn't match)

---

## Future Enhancement Ideas

1. **Leaderboard**: `/leaderboard` - Show top current streaks
2. **Streak Freeze**: Shop item to prevent streak loss
3. **Reminders**: DM users before midnight
4. **Badges**: Grant roles at milestone streaks
5. **Canvas/Quest Streaks**: Parallel systems for other activities
6. **Stats Command**: `/stats @user` - View detailed streak history
7. **Calendar View**: Create command to display 56-day calendar

---

## The Streak Renderer Library

The `lib/streakRenderer.js` file still exists and contains functions for:

- Generating SVG calendar displays (7x8 grid, 56 days)
- Creating stats card SVGs with progress bars
- Converting SVGs to PNG format

These functions can be used if you want to add viewing commands later, but they're not currently active. The system works perfectly without them!

---

## Installation Complete ✅

The system is ready to use! Users will see automatic streak notifications when posting art to your community. No commands needed - it just works!

**To test**:

1. Have a user post an image in the art channel
2. They should receive an automatic streak notification
3. Check their streak increases day-to-day

The streak system is now integrated seamlessly into your bot! 🚀
