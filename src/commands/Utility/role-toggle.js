import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role-toggle')
    .setDescription('Send embed with role toggle button')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to toggle')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole('role');

    const embed = new EmbedBuilder()
      .setTitle('🎫 Get Your Role')
      .setDescription(`Click the button below to get or remove the **${role.name}** role.`)
      .setColor('#00FF00')
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId(`toggle_role_${role.id}`)
      .setLabel(`🔘 Toggle ${role.name}`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: '✅ Role toggle button sent!',
      ephemeral: true
    });
  }
};
