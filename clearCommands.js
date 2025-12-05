const { REST, Routes } = require("discord.js");

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = "1446386803438260417"; // from Discord Developer Portal
const guildId = "1081687296711073832"; // the server you want to clear

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Clearing guild commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [],
    });
    console.log("Guild commands cleared!");

    console.log("Clearing global commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("Global commands cleared!");
  } catch (error) {
    console.error(error);
  }
})();
