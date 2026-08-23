import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('embed-send')
    .setDescription('Send a custom embed without buttons')
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
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Normal message to send above embed')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Embed description')
        .setRequired(true)
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
    .addStringOption(option =>
      option.setName('footer_icon')
        .setDescription('Footer icon URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Author name')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('author_icon')
        .setDescription('Author icon URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('author_url')
        .setDescription('Author URL')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field1_name')
        .setDescription('Field 1 name')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field1_value')
        .setDescription('Field 1 value')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field1_inline')
        .setDescription('Field 1 inline? (true/false)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field2_name')
        .setDescription('Field 2 name')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field2_value')
        .setDescription('Field 2 value')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field2_inline')
        .setDescription('Field 2 inline? (true/false)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field3_name')
        .setDescription('Field 3 name')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field3_value')
        .setDescription('Field 3 value')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('field3_inline')
        .setDescription('Field 3 inline? (true/false)')
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
    const footerIcon = interaction.options.getString('footer_icon');
    const author = interaction.options.getString('author');
    const authorIcon = interaction.options.getString('author_icon');
    const authorUrl = interaction.options.getString('author_url');

    // Get fields
    const fields = [];
    for (let i = 1; i <= 3; i++) {
      const name = interaction.options.getString(`field${i}_name`);
      const value = interaction.options.getString(`field${i}_value`);
      const inline = interaction.options.getString(`field${i}_inline`);
      if (name && value) {
        fields.push({
          name,
          value,
          inline: inline === 'true'
        });
      }
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
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (footer) embed.setFooter({ text: footer, iconURL: footerIcon || undefined });
    if (author) embed.setAuthor({ name: author, iconURL: authorIcon || undefined, url: authorUrl || undefined });
    if (fields.length > 0) embed.addFields(fields);

    // Prepare message
    const messagePayload = {
      embeds: [embed]
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
