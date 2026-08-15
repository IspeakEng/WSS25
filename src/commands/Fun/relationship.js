import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const relationships = [
    '💕 Soulmates',
    '🫂 Best Friends',
    '💀 Enemies',
    '😭 One-Sided Love',
    '🤝 Crime Partners',
    '🔥 Toxic Duo',
    '🎭 Fake Dating',
    '⚔️ Rivals',
    '💍 Married for Tax Purposes',
    '🤡 Clown Partners',
];

const descriptions = [
    'The universe clearly planned this.',
    'They share one brain cell and somehow it works.',
    'Peace was never an option.',
    'Nobody knows what is happening between them.',
    'They should probably not be left alone together.',
    'Somehow, this relationship actually works.',
    'This is either friendship or a very complicated situation.',
];

function random(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export const data = new SlashCommandBuilder()
    .setName('relationship')
    .setDescription('Check the relationship between two users.')
    .addUserOption(option =>
        option
            .setName('user1')
            .setDescription('First user')
            .setRequired(true)
    )
    .addUserOption(option =>
        option
            .setName('user2')
            .setDescription('Second user')
            .setRequired(true)
    );

export async function execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');

    if (user1.id === user2.id) {
        return interaction.reply({
            content: '💀 You cannot have a relationship with yourself.',
            ephemeral: true,
        });
    }

    const compatibility = Math.floor(Math.random() * 101);

    const embed = new EmbedBuilder()
        .setTitle('💞 Relationship Check')
        .setDescription(
            `${user1} × ${user2}\n\n` +
            `**${random(relationships)}**\n` +
            `*${random(descriptions)}*`
        )
        .addFields(
            {
                name: '💯 Compatibility',
                value: `${compatibility}%`,
                inline: true,
            },
            {
                name: '📱 Texts First',
                value: `${Math.random() > 0.5 ? user1 : user2}`,
                inline: true,
            },
            {
                name: '👑 Who Has More Power?',
                value: `${Math.random() > 0.5 ? user1 : user2}`,
                inline: true,
            }
        )
        .setThumbnail(user1.displayAvatarURL({ size: 256 }))
        .setFooter({
            text: 'Powered by absolutely unreliable science.',
        })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
    });
}

export default {
    data,
    execute,
};
