import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('msg-log')
        .setDescription('Set the message delete/edit log channel')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel where deleted/edited messages will be logged')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, guildConfig, client) {
        try {
            const channel = interaction.options.getChannel('channel');

            if (!channel) {
                return interaction.reply({
                    content: '❌ Invalid channel.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Save config in your existing database
            const key = `msglog:${interaction.guild.id}`;

            await client.db.set(key, {
                channelId: channel.id,
                ownerId: interaction.guild.ownerId,
            });

            // Make channel private
            try {
                await channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    {
                        ViewChannel: false,
                    }
                );

                await channel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                        ViewChannel: true,
                        ReadMessageHistory: true,
                        SendMessages: false,
                    }
                );
            } catch (permissionError) {
                console.error(
                    'Failed to configure msg-log permissions:',
                    permissionError
                );
            }

            await interaction.reply({
                content:
                    `✅ Message log channel set to ${channel}.\n` +
                    `🗑️ Deleted messages and ✏️ edited messages will be logged there.\n` +
                    `🔒 The channel is hidden from @everyone.`,
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error('msg-log command error:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Failed to configure message logging.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
        }
    },
};
