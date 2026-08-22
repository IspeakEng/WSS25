// interactionHandlers/embedEditModal.js
import { EmbedBuilder } from 'discord.js';

const OWNER_ID = '1054967242497982476';

export default {
    name: 'embed_edit',

    async execute(interaction, client) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this.',
                ephemeral: true
            });
        }

        const [, messageId, channelId] = interaction.customId.split(':');

        // 👇 Footer যোগ করো
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const color = interaction.fields.getTextInputValue('color');
        const image = interaction.fields.getTextInputValue('image');
        const thumbnail = interaction.fields.getTextInputValue('thumbnail');
        const footer = interaction.fields.getTextInputValue('footer'); // 👈 NEW

        if (!title && !description && !color && !image && !thumbnail && !footer) {
            return interaction.reply({
                content: '❌ You must fill at least one field.',
                ephemeral: true
            });
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel?.isTextBased()) {
                return interaction.reply({
                    content: '❌ Channel not found.',
                    ephemeral: true
                });
            }

            const message = await channel.messages.fetch(messageId);

            if (message.author.id !== client.user.id) {
                return interaction.reply({
                    content: '❌ I can only edit messages sent by me.',
                    ephemeral: true
                });
            }

            if (!message.embeds.length) {
                return interaction.reply({
                    content: '❌ This message does not contain an embed.',
                    ephemeral: true
                });
            }

            const embed = EmbedBuilder.from(message.embeds[0]);

            if (title.trim()) embed.setTitle(title.trim());
            else if (title === '') embed.setTitle(null);

            if (description.trim()) embed.setDescription(description.trim());
            else if (description === '') embed.setDescription(null);

            if (color.trim()) {
                const cleanColor = color.replace('#', '').trim();
                if (!/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                    return interaction.reply({
                        content: '❌ Invalid color. Use HEX like `#ff0000`.',
                        ephemeral: true
                    });
                }
                embed.setColor(`#${cleanColor}`);
            } else if (color === '') {
                embed.setColor(null);
            }

            if (image.trim()) embed.setImage(image.trim());
            else if (image === '') embed.setImage(null);

            if (thumbnail.trim()) embed.setThumbnail(thumbnail.trim());
            else if (thumbnail === '') embed.setThumbnail(null);

            // 👇 Footer handle করো
            if (footer.trim()) {
                embed.setFooter({ text: footer.trim() });
            } else if (footer === '') {
                embed.setFooter(null);
            }

            await message.edit({ embeds: [embed] });

            await interaction.reply({
                content: `✅ **Embed updated successfully!**\n\n` +
                        `[Jump to message](${message.url})`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Embed edit modal error:', error);

            const reply = interaction.replied || interaction.deferred 
                ? interaction.editReply.bind(interaction)
                : interaction.reply.bind(interaction);

            await reply({
                content: `❌ Failed to update embed: ${error.message}`,
                ephemeral: true
            }).catch(() => {});
        }
    }
};
