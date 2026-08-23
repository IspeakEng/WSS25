import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed-send')
    .setDescription('Send embed with role toggle buttons')
    // Channel options
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('Target server ID (leave empty for current server)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('Target channel ID (leave empty for current channel)')
        .setRequired(false)
    )
    // Message content
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Normal message to send above embed')
        .setRequired(false)
    )
    // Embed options
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Embed description')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Image or GIF URL for the embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumbnail')
        .setDescription('Thumbnail image URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Embed color, example: #000000')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('footer')
        .setDescription('Embed footer text')
        .setRequired(false)
    )
    // Roles (1-5)
    .addRoleOption(option =>
      option.setName('role1')
        .setDescription('First role to toggle')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role2')
        .setDescription('Second role to toggle')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role3')
        .setDescription('Third role to toggle')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role4')
        .setDescription('Fourth role to toggle')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role5')
        .setDescription('Fifth role to toggle')
        .setRequired(false)
    )
    // Button labels
    .addStringOption(option =>
      option.setName('button1_label')
        .setDescription('Label for button 1')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button2_label')
        .setDescription('Label for button 2')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button3_label')
        .setDescription('Label for button 3')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button4_label')
        .setDescription('Label for button 4')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button5_label')
        .setDescription('Label for button 5')
        .setRequired(false)
    )
    // Button colors
    .addStringOption(option =>
      option.setName('button1_color')
        .setDescription('Button 1 color: primary, success, danger, secondary')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button2_color')
        .setDescription('Button 2 color: primary, success, danger, secondary')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button3_color')
        .setDescription('Button 3 color: primary, success, danger, secondary')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button4_color')
        .setDescription('Button 4 color: primary, success, danger, secondary')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('button5_color')
        .setDescription('Button 5 color: primary, success, danger, secondary')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    // Get all options
    const serverId = interaction.options.getString('server_id');
    const channelId = interaction.options.getString('channel_id');
    const messageContent = interaction.options.getString('message');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const color = interaction.options.getString('color') || '#5865F2';
    const footer = interaction.options.getString('footer');

    // Get roles
    const roles = [];
    const roleOptions = ['role1', 'role2', 'role3', 'role4', 'role5'];
    for (const roleOpt of roleOptions) {
      const role = interaction.options.getRole(roleOpt);
      if (role) roles.push(role);
    }

    if (roles.length === 0) {
      return interaction.reply({
        content: '❌ Please specify at least one role! Use role1, role2, etc.',
        ephemeral: true
      });
    }

    // Get button labels
    const buttonLabels = [];
    for (let i = 1; i <= 5; i++) {
      const label = interaction.options.getString(`button${i}_label`);
      buttonLabels.push(label || null);
    }

    // Get button colors
    const buttonColors = [];
    for (let i = 1; i <= 5; i++) {
      const color = interaction.options.getString(`button${i}_color`);
      buttonColors.push(color || null);
    }

    // Target server and channel
    let targetGuild = interaction.guild;
    let targetChannel = interaction.channel;

    if (serverId) {
      try {
        targetGuild = await interaction.client.guilds.fetch(serverId);
      } catch {
        return interaction.reply({
          content: '❌ Invalid server ID!',
          ephemeral: true
        });
      }
    }

    if (channelId) {
      try {
        targetChannel = await targetGuild.channels.fetch(channelId);
        if (!targetChannel.isTextBased()) {
          return interaction.reply({
            content: '❌ Invalid channel! Must be a text channel.',
            ephemeral: true
          });
        }
      } catch {
        return interaction.reply({
          content: '❌ Invalid channel ID!',
          ephemeral: true
        });
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (color) embed.setColor(color);
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (footer) embed.setFooter({ text: footer });

    // Create buttons
    const colorMap = {
      'primary': ButtonStyle.Primary,
      'success': ButtonStyle.Success,
      'danger': ButtonStyle.Danger,
      'secondary': ButtonStyle.Secondary
    };

    const defaultColors = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary, ButtonStyle.Primary];
    const buttons = [];

    roles.forEach((role, index) => {
      const label = buttonLabels[index] || `🔘 ${role.name}`;
      const colorInput = buttonColors[index] || 'primary';
      const style = colorMap[colorInput.toLowerCase()] || defaultColors[index % defaultColors.length];

      buttons.push(
        new ButtonBuilder()
          .setCustomId(`toggle_role_${role.id}`)
          .setLabel(label.substring(0, 80))
          .setStyle(style)
      );
    });

    // Arrange buttons (max 5 per row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder();
      buttons.slice(i, i + 5).forEach(btn => row.addComponents(btn));
      rows.push(row);
    }

    // Prepare message
    const messagePayload = {
      embeds: [embed],
      components: rows
    };

    if (messageContent) {
      messagePayload.content = messageContent;
    }

    // Send message
    try {
      await targetChannel.send(messagePayload);
      
      await interaction.reply({
        content: `✅ Embed sent successfully! ${channelId ? `Channel: <#${channelId}>` : `Channel: <#${interaction.channel.id}>`}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Failed to send embed:', error);
      await interaction.reply({
        content: '❌ Failed to send embed! Make sure I have permission to send messages in that channel.',
        ephemeral: true
      });
    }
  }
};
