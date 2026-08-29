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

        const [, messageId, channelId] =
            interaction.customId.split(':');

        const title =
            interaction.fields.getTextInputValue('title');

        const description =
            interaction.fields.getTextInputValue('description');

        const color =
            interaction.fields.getTextInputValue('color');

        const image =
            interaction.fields.getTextInputValue('image');

        const thumbnail =
            interaction.fields.getTextInputValue('thumbnail');

        try {
            const channel =
                await client.channels.fetch(channelId);

            if (!channel?.isTextBased()) {
                return interaction.reply({
                    content: '❌ Channel not found.',
                    ephemeral: true
                });
            }

            const message =
                await channel.messages.fetch(messageId);

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

            // Copy existing embed
            const embed =
                EmbedBuilder.from(message.embeds[0]);

            // Title
            if (title.trim()) {
                embed.setTitle(title.trim());
            } else {
                embed.setTitle(null);
            }

            // Description
            if (description.trim()) {
                embed.setDescription(description.trim());
            } else {
                embed.setDescription(null);
            }

            // Color
            if (color.trim()) {
                const cleanColor =
                    color.replace(/^#/, '').trim();

                if (!/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                    return interaction.reply({
                        content:
                            '❌ Invalid color. Use HEX like `#ff0000`.',
                        ephemeral: true
                    });
                }

                embed.setColor(`#${cleanColor}`);
            } else {
                embed.setColor(null);
            }

            // Image
            if (image.trim()) {
                embed.setImage(image.trim());
            } else {
                embed.setImage(null);
            }

            // Thumbnail
            if (thumbnail.trim()) {
                embed.setThumbnail(thumbnail.trim());
            } else {
                embed.setThumbnail(null);
            }

            /*
             * IMPORTANT:
             *
             * Do NOT use message.edit()
             *
             * We delete the old message and send
             * a completely new one so Discord will
             * NOT show "(edited)".
             */

            await message.delete();

            const newMessage =
                await channel.send({
                    embeds: [embed]
                });

            await interaction.reply({
                content:
                    `✅ **Embed updated successfully!**\n\n` +
                    `[Jump to message](${newMessage.url})`,
                ephemeral: true
            });

        } catch (error) {
            console.error(
                '❌ Embed edit modal error:',
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.editReply({
                    content:
                        `❌ Failed to update embed: ${error.message}`
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content:
                        `❌ Failed to update embed: ${error.message}`,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
