const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const monitorClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

const MAIN_BOT_ID = process.env.MAIN_BOT_ID; // The Olivine bot ID
const STATUS_CHANNEL_ID = process.env.STATUS_CHANNEL_ID; // Where to send status updates
const CHECK_INTERVAL = 30000; // Check every 30 seconds

let mainBotLastSeen = Date.now();
let mainBotOnline = true;

monitorClient.once("ready", () => {
  console.log(`✅ Status Monitor logged in as ${monitorClient.user.tag}`);
  startMonitoring();
});

async function startMonitoring() {
  setInterval(async () => {
    try {
      const statusChannel = await monitorClient.channels.fetch(STATUS_CHANNEL_ID);
      if (!statusChannel) {
        console.error("Status channel not found");
        return;
      }

      const guild = statusChannel.guild;
      const member = await guild.members.fetch(MAIN_BOT_ID).catch(() => null);

      if (member) {
        // Bot is online
        if (!mainBotOnline) {
          // Bot just came back online
          mainBotOnline = true;
          const embed = new EmbedBuilder()
            .setTitle("🟢 Bot Status Update")
            .setDescription("**Olivine has woke up**")
            .setColor(0x57f287)
            .setTimestamp();

          await statusChannel.send({ embeds: [embed] });
          console.log("📢 Sent: Olivine has woke up");
        }
        mainBotLastSeen = Date.now();
      } else {
        // Bot is offline
        if (mainBotOnline) {
          // Bot just went offline
          mainBotOnline = false;
          const embed = new EmbedBuilder()
            .setTitle("🔴 Bot Status Update")
            .setDescription("**Olivine went to sleep**")
            .setColor(0xbd2e58)
            .setTimestamp();

          await statusChannel.send({ embeds: [embed] });
          console.log("📢 Sent: Olivine went to sleep");
        }
      }
    } catch (error) {
      console.error("Error checking bot status:", error);
    }
  }, CHECK_INTERVAL);
}

const token = process.env.STATUS_MONITOR_BOT_TOKEN;

if (!token) {
  console.error(
    "Error: STATUS_MONITOR_BOT_TOKEN is not set in environment variables.",
  );
  process.exit(1);
}

monitorClient.login(token);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🔴 Status Monitor shutting down...");
  monitorClient.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🔴 Status Monitor shutting down...");
  monitorClient.destroy();
  process.exit(0);
});
