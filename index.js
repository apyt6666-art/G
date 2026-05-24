const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');

const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  getVoiceConnection
} = require('@discordjs/voice');

const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// ================== DATABASE ==================
let data = {
  dmLogChannel: null
};

if (fs.existsSync('./data.json')) {
  data = JSON.parse(fs.readFileSync('./data.json'));
}

function save() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: ['CHANNEL']
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

// ================== SLASH COMMANDS ==================
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
    ),

  new SlashCommandBuilder()
    .setName('setdmlog')
    .setDescription('تحديد روم لوق الخاص')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('روم اللوق')
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

  // ===== DM COMMAND =====
  if (interaction.commandName === 'dm') {
    const user = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    try {
      await user.send(message);

      interaction.reply({
        content: '✅ تم إرسال الرسالة',
        ephemeral: true
      });

    } catch {
      interaction.reply({
        content: '❌ ما قدرت أرسل له (الخاص مقفل)',
        ephemeral: true
      });
    }
  }

  // ===== SET DM LOG =====
  if (interaction.commandName === 'setdmlog') {
    const channel = interaction.options.getChannel('channel');

    data.dmLogChannel = channel.id;
    save();

    interaction.reply({
      content: '✅ تم تحديد روم لوق الخاص',
      ephemeral: true
    });
  }
});

// ================== DM LOGGER ==================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // فقط الخاص
  if (!message.guild) {

    if (!data.dmLogChannel) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(data.dmLogChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      })
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        {
          name: '👤 الشخص',
          value: `${message.author}\n\`${message.author.id}\``
        },
        {
          name: '💬 الرسالة',
          value: message.content || 'بدون نص'
        }
      )
      .setTimestamp();

    channel.send({ embeds: [embed] });
  }
});

// ================== READY ==================
client.once('ready', () => {
  console.log(`${client.user.tag} شغال`);

  joinVC();

  // حماية إذا طلع من الروم
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
