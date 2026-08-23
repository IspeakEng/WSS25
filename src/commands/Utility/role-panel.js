import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Create panel with multiple role buttons')
    .addRoleOption(option =>
      option.setName('role1')
        .setDescription('First role')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role2')
        .setDescription('Second role')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role3')
        .setDescription('Third role (optional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const roles = [
      interaction.options.getRole('role1'),
      interaction.options.getRole('role2'),
      interaction.options.getRole('role3')
    ].filter(r => r !== null);

    const embed = new EmbedBuilder()
      .setTitle('🎭 Role Selector Panel')
      .setDescription('Click the buttons below to manage your roles.')
      .setColor('#5865F2')
      .setFooter({ text: `${roles.length} roles available` })
      .setTimestamp();

    const buttonStyles = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger];
    const emojis = ['🎮', '📚', '⭐'];

    const buttons = roles.map((role, index) => {
      return new ButtonBuilder()
        .setCustomId(`toggle_role_${role.id}`)
        .setLabel(`${emojis[index] || '🔘'} ${role.name}`)
        .setStyle(buttonStyles[index] || ButtonStyle.Secondary);
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = new ActionRowBuilder();
      row.addComponents(buttons.slice(i, i + 2));
      rows.push(row);
    }

    await interaction.channel.send({
      embeds: [embed],
      components: rows
    });

    await interaction.reply({
      content: `✅ Role panel with ${roles.length} roles created!`,
      ephemeral: true
    });
  }
};
