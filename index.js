const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  getVoiceConnection
} = require('@discordjs/voice');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================== VOICE SYSTEM ==================
function joinVC() {
  const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
  if (!channel) return;

  const existing = getVoiceConnection(GUILD_ID);
  if (existing) existing.destroy();

  const connection = joinVoiceChannel({
    channelId: VOICE_CHANNEL_ID,
    guildId: GUILD_ID,
    adapterCreator: channel.guild.voiceAdapterCreator
  });

  console.log("🎧 دخل الروم الصوتي");

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    console.log("🔁 انقطع الاتصال، إعادة دخول...");
    setTimeout(joinVC, 3000);
  });
}

// ================== SLASH COMMAND ==================
const commands = [
  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('إرسال رسالة خاصة لشخص')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('الشخص')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message')
        .setDescription('الرسالة')
        .setRequired(true)
    )
];

// ================== REGISTER COMMANDS ==================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commands Registered");
  } catch (e) {
    console.log(e);
  }
})();

// ================== COMMAND HANDLER ==================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'dm') {
    const user = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    try {
      await user.send(message);
      interaction.reply({ content: '✅ تم إرسال الرسالة', ephemeral: true });
    } catch {
      interaction.reply({ content: '❌ ما قدرت أرسل له (الخاص مقفل)', ephemeral: true });
    }
  }
});

// ================== READY ==================
client.once('ready', () => {
  console.log(`${client.user.tag} شغال`);

  joinVC();

  // حماية: يرجع يدخل إذا طلع
  setInterval(() => {
    const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel) return;

    const me = channel.guild.members.me;

    if (!me.voice.channel) {
      console.log("🚨 طلع من الروم، يرجع يدخل");
      joinVC();
    }
  }, 5000);
});

client.login(TOKEN);
