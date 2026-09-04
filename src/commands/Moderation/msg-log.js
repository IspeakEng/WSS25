import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('msg-log')
        .setDescription('Set the message edit/delete log channel')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel where message logs will be sent')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction, guildConfig, client) {
        try {
            const channel =
                interaction.options.getChannel('channel');

            if (!channel) {
                return interaction.reply({
                    content: '❌ Invalid channel.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Save log channel
            await client.db.set(
                `msglog:${interaction.guild.id}`,
                {
                    channelId: channel.id,
                    setBy: interaction.user.id,
                }
            );

            // Make channel private
            await channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    ViewChannel: false,
                }
            );

            // Allow ONLY the person who configured it
            await channel.permissionOverwrites.edit(
                interaction.user.id,
                {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: false,
                }
            );

            // Allow bot to see/send messages
            const botMember =
                interaction.guild.members.me;

            if (botMember) {
                await channel.permissionOverwrites.edit(
                    botMember.id,
                    {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        EmbedLinks: true,
                    }
                );
            }

            await interaction.reply({
                content:
                    `✅ Message log channel set to ${channel}.\n` +
                    `🔒 ${channel} is now private.\n` +
                    `🗑️ Deleted and ✏️ edited messages will be logged here.`,
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error(
                'Error in /msg-log:',
                error
            );

            if (!interaction.replied) {
                await interaction.reply({
                    content:
                        '❌ Failed to configure the message log channel.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
        }
    },
};
