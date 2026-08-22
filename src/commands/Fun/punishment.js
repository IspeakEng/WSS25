import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('punishment')
    .setDescription('Show a fake punishment for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to punish')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Punishment type')
        .setRequired(true)
        .addChoices(
          { name: 'Ban', value: 'ban' },
          { name: 'Kick', value: 'kick' },
          { name: 'Mute', value: 'mute' },
          { name: 'Timeout', value: 'timeout' },
          { name: 'Warn', value: 'warn' }
        )
    )

    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the punishment')
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Duration for mute/timeout')
        .setRequired(false)
    ),

  async execute(interaction) {
    // 🔐 ADMIN ONLY CHECK
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ You need Administrator permission to use this command.',
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const reason =
      interaction.options.getString('reason') || 'No reason provided';
    const duration =
      interaction.options.getString('duration') || 'Not specified';

    const punishmentNames = {
      ban: 'Banned',
      kick: 'Kicked',
      mute: 'Muted',
      timeout: 'Timed Out',
      warn: 'Warned',
    };

    const punishmentName = punishmentNames[type];

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({
        name: 'Moderation Action',
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTitle(`⚠️ ${punishmentName}`)
      .setDescription(
        `**${user.tag}** has been **${punishmentName.toLowerCase()}**.`
      )
      .addFields(
        {
          name: 'User',
          value: `${user} \`${user.id}\``,
          inline: false,
        },
        {
          name: 'Reason',
          value: reason,
          inline: false,
        }
      )
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: 'This is a simulated moderation action.',
      })
      .setTimestamp();

    if (type === 'mute' || type === 'timeout') {
      embed.addFields({
        name: 'Duration',
        value: duration,
        inline: true,
      });
    }

    embed.addFields({
      name: 'Moderator',
      value: `${interaction.user}`,
      inline: true,
    });

    await interaction.reply({
      embeds: [embed],
    });
  },
};
