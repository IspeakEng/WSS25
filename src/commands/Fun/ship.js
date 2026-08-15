import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';

const SHIP_STATUSES = [
  { min: 95, name: 'SOULMATES' },
  { min: 85, name: 'ABSOLUTELY DESTINED' },
  { min: 70, name: 'POWER COUPLE' },
  { min: 55, name: 'SUSPICIOUSLY CLOSE' },
  { min: 40, name: "IT'S COMPLICATED" },
  { min: 25, name: 'JUST FRIENDS' },
  { min: 10, name: 'BARELY COMPATIBLE' },
  { min: 0, name: 'ABSOLUTE DISASTER' },
];

const REASONS = [
  'Their personalities somehow match',
  'They would survive the same group chat',
  'One of them definitely carries the conversation',
  'They have suspiciously similar energy',
  'They would probably argue over something completely pointless',
  'One says "bro" way too much',
  'Their combined chaos level is dangerous',
  'They would either become best friends or enemies',
  'There is definitely some unexplained chemistry',
  'They would make a surprisingly good duo',
  'One of them would leave the other on read',
  'Their relationship would be 90% memes',
  'They would somehow turn everything into an argument',
  'The algorithm sees potential',
  'Even the server is suspicious about these two',
];

const VERDICTS = {
  soulmate: [
    'The algorithm has spoken. This is destiny.',
    'Someone needs to start planning the wedding.',
    'Even the server can see the chemistry.',
  ],

  good: [
    'There is definitely something going on here.',
    'This duo might actually work.',
    'The potential is dangerously high.',
  ],

  neutral: [
    'Could work. Could also end terribly.',
    'The algorithm is confused but slightly optimistic.',
    'There is potential... somewhere.',
  ],

  bad: [
    'Maybe keep these two away from each other.',
    'The algorithm recommends staying friends.',
    'This ship has already hit an iceberg.',
  ],
};

function createSeed(user1Id, user2Id) {
  const ids = [user1Id, user2Id].sort();

  let hash = 0;

  for (const char of `${ids[0]}:${ids[1]}`) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getCompatibility(user1Id, user2Id) {
  const seed = createSeed(user1Id, user2Id);

  return seed % 101;
}

function getStatus(score) {
  return (
    SHIP_STATUSES.find((status) => score >= status.min) ||
    SHIP_STATUSES[SHIP_STATUSES.length - 1]
  );
}

function getRandomItems(array, count, seed) {
  const items = [...array];
  const results = [];

  let value = seed;

  for (let i = 0; i < count; i++) {
    value = (value * 9301 + 49297) % 233280;

    const index = Math.floor((value / 233280) * items.length);

    results.push(items.splice(index, 1)[0]);
  }

  return results;
}

function getVerdict(score) {
  if (score >= 85) {
    return getRandomItems(
      VERDICTS.soulmate,
      1,
      score * 37,
    )[0];
  }

  if (score >= 55) {
    return getRandomItems(
      VERDICTS.good,
      1,
      score * 53,
    )[0];
  }

  if (score >= 30) {
    return getRandomItems(
      VERDICTS.neutral,
      1,
      score * 71,
    )[0];
  }

  return getRandomItems(
    VERDICTS.bad,
    1,
    score * 97,
  )[0];
}

function createShipBar(score) {
  const length = 15;

  const filled = Math.round((score / 100) * length);
  const empty = length - filled;

  return `♡ ${'━'.repeat(filled)}●${'━'.repeat(empty)} ♡`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('See how compatible two users are')
    .setDMPermission(false)

    .addUserOption((option) =>
      option
        .setName('user1')
        .setDescription('The first person')
        .setRequired(true),
    )

    .addUserOption((option) =>
      option
        .setName('user2')
        .setDescription('The second person')
        .setRequired(true),
    ),

  category: 'Fun',

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);

      if (!deferSuccess) {
        logger.warn('Ship command defer failed', {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });

        return;
      }

      const user1 = interaction.options.getUser('user1');
      const user2 = interaction.options.getUser('user2');

      if (!user1 || !user2) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message: 'Please select two users to ship.',
        });
      }

      if (user1.bot || user2.bot) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message: 'Bots cannot be shipped. They have no romantic subroutines.',
        });
      }

      if (user1.id === user2.id) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message:
            'You cannot ship someone with themselves. Even the algorithm has limits.',
        });
      }

      const score = getCompatibility(user1.id, user2.id);
      const status = getStatus(score);

      const seed = createSeed(user1.id, user2.id);

      const reasons = getRandomItems(
        REASONS,
        3,
        seed,
      );

      const verdict = getVerdict(score);
      const shipBar = createShipBar(score);

      const description = [
        `**${user1.username}**  ×  **${user2.username}**`,
        '',
        `### ${score}%`,
        shipBar,
        '',
        `**${status.name}**`,
        '',
        '**Compatibility Analysis**',
        reasons.map((reason) => `> ${reason}`).join('\n'),
        '',
        `*${verdict}*`,
      ].join('\n');

      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          createEmbed({
            title: 'SHIP COMPATIBILITY',
            description,

            color: 'primary',

            author: {
              name: user1.username,
              icon: user1.displayAvatarURL({
                size: 128,
                extension: 'png',
              }),
            },

            thumbnail: user2.displayAvatarURL({
              size: 256,
              extension: 'png',
            }),

            footer: `Shipped by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      logger.error('Ship command error:', error);

      return await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message:
          'The ship calculator crashed. The relationship may be too complicated.',
      });
    }
  },
};
