import {
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';

const RELATIONSHIPS = [
    {
        type: '💕 Soulmates',
        descriptions: [
            'The universe clearly planned this.',
            'Somehow, these two just make sense.',
            'Even the server can see the chemistry.',
        ],
    },
    {
        type: '🫂 Best Friends',
        descriptions: [
            'Absolutely inseparable. Probably a bad influence on each other.',
            'They share one brain cell and somehow it works.',
            'Best friends with questionable decision-making.',
        ],
    },
    {
        type: '💀 Enemies',
        descriptions: [
            'They would argue over who gets the last slice of pizza.',
            'Peace was never an option.',
            'One conversation away from starting a war.',
        ],
    },
    {
        type: '😭 One-Sided Love',
        descriptions: [
            'Someone needs to check the group chat.',
            'The feelings are not equally distributed.',
            'One is dreaming. The other is just vibing.',
        ],
    },
    {
        type: '🤝 Crime Partners',
        descriptions: [
            'If one gets arrested, the other is definitely involved.',
            'Never let these two near a suspiciously large bag.',
            'They know too much about each other.',
        ],
    },
    {
        type: '🔥 Toxic Duo',
        descriptions: [
            'They fight, disappear, return, and repeat.',
            'Terrible together. Somehow impossible apart.',
            'Their relationship needs a terms-of-service agreement.',
        ],
    },
    {
        type: '🎭 Fake Dating',
        descriptions: [
            'It started as a joke. It stopped being a joke.',
            'Nobody knows when the fake part ended.',
            'The server has already accepted them as a couple.',
        ],
    },
    {
        type: '🗿 Barely Tolerate Each Other',
        descriptions: [
            'They are technically friends. Technically.',
            'One more argument and the friendship is getting patched out.',
            'The relationship is being held together by pure convenience.',
        ],
    },
    {
        type: '💍 Married for Tax Purposes',
        descriptions: [
            'Romance: questionable. Financial strategy: flawless.',
            'They filed the paperwork before catching feelings.',
            'Nobody understands the marriage. Not even them.',
        ],
    },
    {
        type: '⚔️ Rivals',
        descriptions: [
            'Every interaction is a competition.',
            'They do not want peace. They want the leaderboard.',
            'One victory is never enough.',
        ],
    },
    {
        type: '👑 Royal Couple',
        descriptions: [
            'The server has officially become their kingdom.',
            'One rules. The other pretends to rule.',
            'Their combined ego requires its own throne room.',
        ],
    },
    {
        type: '🧪 Lab Experiment Partners',
        descriptions: [
            'Scientists are still trying to understand this duo.',
            'Results are concerning but fascinating.',
            'The experiment should probably have been stopped earlier.',
        ],
    },
];

const EVENTS = [
    '🍕 They went out for food and somehow started an argument.',
    '🎮 They played one game together and blamed each other for the loss.',
    '📱 One left the other on read for 7 hours.',
    '🛒 They went shopping and returned with absolutely nothing useful.',
    '🚗 They got lost despite having Google Maps.',
    '🎬 They spent 40 minutes choosing a movie and never watched one.',
    '💬 They accidentally revealed an embarrassing secret.',
    '🎵 They made a playlist together. It is somehow terrible.',
    '☕ They met for five minutes and stayed for three hours.',
    '💀 One of them made a joke that the other is still recovering from.',
    '🗣️ They started gossiping and completely lost track of time.',
    '🧠 They tried to solve a problem and somehow created three more.',
];

const TRAITS = [
    'Chaotic',
    'Wholesome',
    'Questionable',
    'Unpredictable',
    'Dangerous',
    'Suspicious',
    'Iconic',
    'Unstable',
    'Legendary',
    'Confusing',
];

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function progressBar(value, length = 10) {
    const filled = Math.round((value / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

export const data = new SlashCommandBuilder()
    .setName('relationship')
    .setDescription('Check the chaotic relationship between two users.')
    .addUserOption(option =>
        option
            .setName('user1')
            .setDescription('The first user')
            .setRequired(true)
    )
    .addUserOption(option =>
        option
            .setName('user2')
            .setDescription('The second user')
            .setRequired(true)
    );

export async function execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');

    if (!user1 || !user2) {
        return interaction.reply({
            content: '❌ Please provide two users.',
            ephemeral: true,
        });
    }

    if (user1.id === user2.id) {
        return interaction.reply({
            content: '💀 Bro... you cannot have a relationship with yourself.',
            ephemeral: true,
        });
    }

    const compatibility = randomNumber(1, 100);
    const obsession = randomNumber(1, 100);
    const betrayal = randomNumber(1, 70);
    const stability = randomNumber(20, 100);

    const relationship = randomItem(RELATIONSHIPS);
    const description = randomItem(relationship.descriptions);
    const event = randomItem(EVENTS);
    const trait = randomItem(TRAITS);

    const firstTexter =
        Math.random() > 0.5 ? user1 : user2;

    const moreObsessed =
        obsession > 65
            ? (Math.random() > 0.5 ? user1 : user2)
            : 'Nobody. They have better things to do.';

    const dominant =
        Math.random() > 0.5 ? user1 : user2;

    const embed = new EmbedBuilder()
        .setTitle('💞 Relationship Check')
        .setDescription(
            `${user1} × ${user2}\n\n` +
            `**${relationship.type}**\n` +
            `*${description}*`
        )
        .addFields(
            {
                name: '💯 Compatibility',
                value:
                    `**${compatibility}%**\n` +
                    `${progressBar(compatibility)}`,
                inline: true,
            },
            {
                name: '🧠 More Obsessed',
                value:
                    typeof moreObsessed === 'string'
                        ? moreObsessed
                        : `${moreObsessed}`,
                inline: true,
            },
            {
                name: '👑 Who Has More Power?',
                value: `${dominant}`,
                inline: true,
            },
            {
                name: '📱 Texts First',
                value: `${firstTexter}`,
                inline: true,
            },
            {
                name: '💀 Betrayal Chance',
                value: `**${betrayal}%**`,
                inline: true,
            },
            {
                name: '🧪 Relationship Type',
                value: `**${trait}**`,
                inline: true,
            },
            {
                name: '🔥 Relationship Stability',
                value:
                    `**${stability}%**\n` +
                    `${progressBar(stability)}`,
                inline: false,
            },
            {
                name: '📖 Today's Lore',
                value: event,
                inline: false,
            }
        )
        .setThumbnail(user1.displayAvatarURL({ size: 256 }))
        .setFooter({
            text: 'Relationship analysis powered by absolutely unreliable science.',
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
