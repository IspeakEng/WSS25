import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('botprofile')
        .setDescription('Change the bot avatar or banner')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString())

        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Change the bot avatar')
                .addAttachmentOption(option =>
                    option
                        .setName('image')
                        .setDescription('Upload PNG, JPG, JPEG, WebP or GIF')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('banner')
                .setDescription('Change the bot banner')
                .addAttachmentOption(option =>
                    option
                        .setName('image')
                        .setDescription('Upload PNG, JPG, JPEG, WebP or GIF')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return interaction.reply({
                content: '❌ You need Administrator permission to use this command.',
                ephemeral: true
            });
        }

        const type = interaction.options.getSubcommand();
        const image = interaction.options.getAttachment('image');

        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif'
        ];

        if (!image.contentType || !allowedTypes.includes(image.contentType)) {
            return interaction.reply({
                content:
                    '❌ Invalid image format!\n\n' +
                    'Supported: PNG, JPG, JPEG, WebP and GIF.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            if (type === 'avatar') {
                await interaction.client.user.setAvatar(image.url);

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('✅ Avatar Updated')
                    .setDescription(
                        `The bot avatar has been successfully changed by ${interaction.user}.`
                    )
                    .setThumbnail(image.url)
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            if (type === 'banner') {
                await interaction.client.user.setBanner(image.url);

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('✅ Banner Updated')
                    .setDescription(
                        `The bot banner has been successfully changed by ${interaction.user}.`
                    )
                    .setImage(image.url)
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed]
                });
            }
        } catch (error) {
            console.error('Bot profile update error:', error);

            return interaction.editReply({
                content:
                    '❌ Failed to update the bot profile.\n\n' +
                    `**Error:** ${error.message}`
            });
        }
    }
};
