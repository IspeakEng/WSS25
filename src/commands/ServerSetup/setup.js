import {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits
} from "discord.js";

const structure = [
    {
        category: "INFORMATION",
        channels: [
            ["rules", ChannelType.GuildText],
            ["announcements", ChannelType.GuildText],
            ["welcome", ChannelType.GuildText]
        ]
    },
    {
        category: "COMMUNITY",
        channels: [
            ["general", ChannelType.GuildText],
            ["chat", ChannelType.GuildText],
            ["shitpost", ChannelType.GuildText],
            ["moments", ChannelType.GuildText]
        ]
    },
    {
        category: "MEDIA",
        channels: [
            ["gallery", ChannelType.GuildText],
            ["clips", ChannelType.GuildText],
            ["links", ChannelType.GuildText]
        ]
    },
    {
        category: "VOICE",
        channels: [
            ["General", ChannelType.GuildVoice],
            ["Gaming", ChannelType.GuildVoice],
            ["Chill", ChannelType.GuildVoice],
            ["AFK", ChannelType.GuildVoice]
        ]
    }
];

export default {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Automatically create the WSS'25 server structure")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({
                content: "❌ This command can only be used inside a server.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const botMember = guild.members.me;

        if (
            !botMember ||
            !botMember.permissions.has(PermissionFlagsBits.ManageChannels)
        ) {
            return interaction.editReply(
                "❌ I need the **Manage Channels** permission."
            );
        }

        let created = 0;
        let skipped = 0;

        try {
            for (const section of structure) {
                let category = guild.channels.cache.find(
                    channel =>
                        channel.type === ChannelType.GuildCategory &&
                        channel.name.toLowerCase() ===
                            section.category.toLowerCase()
                );

                if (!category) {
                    category = await guild.channels.create({
                        name: section.category,
                        type: ChannelType.GuildCategory
                    });

                    created++;
                }

                for (const [name, type] of section.channels) {
                    const existingChannel = guild.channels.cache.find(
                        channel =>
                            channel.parentId === category.id &&
                            channel.name.toLowerCase() === name.toLowerCase() &&
                            channel.type === type
                    );

                    if (existingChannel) {
                        skipped++;
                        continue;
                    }

                    await guild.channels.create({
                        name,
                        type,
                        parent: category.id
                    });

                    created++;
                }
            }

            await interaction.editReply(
                `✅ **WSS'25 server setup complete!**\n\n` +
                `📁 Created: **${created}**\n` +
                `⏭️ Already existed: **${skipped}**`
            );

        } catch (error) {
            console.error("Setup command error:", error);

            await interaction.editReply(
                "❌ Something went wrong while creating the server structure."
            );
        }
    }
};
