import {
    SlashCommandBuilder,
    AttachmentBuilder
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send a message through the bot')

        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message you want the bot to send')
                .setRequired(false)
        )

        .addAttachmentOption(option =>
            option
                .setName('file')
                .setDescription('Image, GIF, video, or other file to send')
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName('sticker_id')
                .setDescription('Sticker ID to send')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            // Command must be used inside a server
            if (!interaction.guild) {
                return interaction.reply({
                    content: '❌ This command can only be used inside a server.',
                    ephemeral: true
                });
            }

            // =========================
            // SERVER OWNER CHECK
            // =========================
            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({
                    content:
                        '❌ Only this server\'s owner can use the `/send` command.',
                    ephemeral: true
                });
            }

            const message =
                interaction.options.getString('message');

            const file =
                interaction.options.getAttachment('file');

            const stickerId =
                interaction.options.getString('sticker_id');

            // Nothing provided
            if (!message && !file && !stickerId) {
                return interaction.reply({
                    content:
                        '❌ Give me a message, file, or sticker.',
                    ephemeral: true
                });
            }

            // Defer response
            await interaction.deferReply({
                ephemeral: true
            });

            // Typing indicator
            await interaction.channel.sendTyping();

            // Small delay
            await new Promise(resolve =>
                setTimeout(resolve, 1500)
            );

            const payload = {};

            // =========================
            // TEXT
            // =========================
            if (message) {
                payload.content = message;
            }

            // =========================
            // IMAGE / GIF / VIDEO / FILE
            // =========================
            if (file) {
                payload.files = [
                    new AttachmentBuilder(file.url, {
                        name: file.name
                    })
                ];
            }

            // =========================
            // STICKER
            // =========================
            if (stickerId) {
                payload.stickers = [stickerId];
            }

            // =========================
            // SEND
            // =========================
            const sentMessage =
                await interaction.channel.send(payload);

            await interaction.editReply({
                content:
                    `✅ Message sent successfully.\n\n` +
                    `**Server:** ${interaction.guild.name}\n` +
                    `**Channel:** ${interaction.channel}\n` +
                    `**Message ID:** \`${sentMessage.id}\``
            });

        } catch (error) {
            console.error('Send command error:', error);

            const errorMessage =
                '❌ Failed to send the message. Make sure the bot has permission to send messages and attach files in this channel.';

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: errorMessage
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
