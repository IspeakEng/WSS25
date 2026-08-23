import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role-toggle')
    .setDescription('রোল টগল বাটন সহ Embed পাঠান')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('যে রোল টগল করতে চান')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const embed = new EmbedBuilder()
      .setTitle('🎫 রোল নিন')
      .setDescription(`**${role.name}** রোল নিতে বা রিমুভ করতে নিচের বাটনে ক্লিক করুন।`)
      .setColor('#00FF00')
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId(`toggle_role_${role.id}`)
      .setLabel(`🔘 ${role.name} টগল করুন`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ রোল টগল বাটন পাঠানো হয়েছে!`,
      ephemeral: true
    });
  }
};
