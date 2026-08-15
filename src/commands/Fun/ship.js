import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

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
  return createSeed(user1Id, user2Id) % 101;
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
    return getRandomItems(VERDICTS.soulmate, 1, score * 37)[0];
  }

  if (score >= 55) {
    return getRandomItems(VERDICTS.good, 1, score * 53)[0];
  }

  if (score >= 30) {
    return getRandomItems(VERDICTS.neutral, 1, score * 71)[0];
  }

  return getRandomItems(VERDICTS.bad, 1, score * 97)[0];
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
}

function drawCircularImage(ctx, image, x, y, size) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2,
  );
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(image, x, y, size, size);

  ctx.restore();
}

function drawAvatarBorder(ctx, x, y, size) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2 + 6,
    0,
    Math.PI * 2,
  );

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

async function createShipCard(user1, user2, score, status) {
  const width = 1200;
  const height = 700;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const background = ctx.createLinearGradient(
    0,
    0,
    width,
    height,
  );

  background.addColorStop(0, '#17121f');
  background.addColorStop(0.5, '#24172d');
  background.addColorStop(1, '#12121a');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.globalAlpha = 0.08;

  ctx.fillStyle = '#ffffff';

  ctx.beginPath();
  ctx.arc(100, 100, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(1100, 600, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // Header
  drawCenteredText(
    ctx,
    'SHIP COMPATIBILITY',
    width / 2,
    65,
    'bold 34px sans-serif',
    '#ffffff',
  );

  drawCenteredText(
    ctx,
    'how compatible are they?',
    width / 2,
    105,
    '22px sans-serif',
    '#b9adbf',
  );

  // Avatar settings
  const avatarSize = 230;

  const user1X = 180;
  const user2X = width - 180 - avatarSize;
  const avatarY = 155;

  // Avatar cards
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';

  drawRoundedRect(
    ctx,
    user1X - 20,
    avatarY - 20,
    avatarSize + 40,
    avatarSize + 40,
    28,
  );

  ctx.fill();

  drawRoundedRect(
    ctx,
    user2X - 20,
    avatarY - 20,
    avatarSize + 40,
    avatarSize + 40,
    28,
  );

  ctx.fill();

  // Load avatars
  const avatar1 = await loadImage(
    user1.displayAvatarURL({
      extension: 'png',
      size: 256,
    }),
  );

  const avatar2 = await loadImage(
    user2.displayAvatarURL({
      extension: 'png',
      size: 256,
    }),
  );

  // Draw avatars
  drawCircularImage(
    ctx,
    avatar1,
    user1X,
    avatarY,
    avatarSize,
  );

  drawCircularImage(
    ctx,
    avatar2,
    user2X,
    avatarY,
    avatarSize,
  );

  drawAvatarBorder(
    ctx,
    user1X,
    avatarY,
    avatarSize,
  );

  drawAvatarBorder(
    ctx,
    user2X,
    avatarY,
    avatarSize,
  );

  // X symbol
  drawCenteredText(
    ctx,
    '×',
    width / 2,
    avatarY + avatarSize / 2,
    'bold 62px sans-serif',
    '#ffffff',
  );

  // Usernames
  const username1 =
    user1.username.length > 18
      ? `${user1.username.slice(0, 16)}...`
      : user1.username;

  const username2 =
    user2.username.length > 18
      ? `${user2.username.slice(0, 16)}...`
      : user2.username;

  drawCenteredText(
    ctx,
    username1,
    user1X + avatarSize / 2,
    425,
    'bold 27px sans-serif',
    '#ffffff',
  );

  drawCenteredText(
    ctx,
    username2,
    user2X + avatarSize / 2,
    425,
    'bold 27px sans-serif',
    '#ffffff',
  );

  // Score
  drawCenteredText(
    ctx,
    `${score}%`,
    width / 2,
    445,
    'bold 68px sans-serif',
    '#ffffff',
  );

  // Status
  drawCenteredText(
    ctx,
    status.name,
    width / 2,
    505,
    'bold 25px sans-serif',
    '#d6bfdc',
  );

  // Progress bar
  const barWidth = 600;
  const barHeight = 18;

  const barX = (width - barWidth) / 2;
  const barY = 550;

  drawRoundedRect(
    ctx,
    barX,
    barY,
    barWidth,
    barHeight,
    10,
  );

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();

  const filledWidth = Math.max(
    0,
    (barWidth * score) / 100,
  );

  if (filledWidth > 0) {
    drawRoundedRect(
      ctx,
      barX,
      barY,
      filledWidth,
      barHeight,
      10,
    );

    const progressGradient = ctx.createLinearGradient(
      barX,
      barY,
      barX + barWidth,
      barY,
    );

    progressGradient.addColorStop(0, '#c9a7d8');
    progressGradient.addColorStop(1, '#ffffff');

    ctx.fillStyle = progressGradient;
    ctx.fill();
  }

  // Bottom decorative text
  drawCenteredText(
    ctx,
    '♡',
    width / 2,
    620,
    '30px sans-serif',
    '#ffffff',
  );

  return canvas.encode('png');
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
          message:
            'Bots cannot be shipped. They have no romantic subroutines.',
        });
      }

      if (user1.id === user2.id) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message:
            'You cannot ship someone with themselves. Even the algorithm has limits.',
        });
      }

      const score = getCompatibility(
        user1.id,
        user2.id,
      );

      const status = getStatus(score);

      const seed = createSeed(
        user1.id,
        user2.id,
      );

      const reasons = getRandomItems(
        REASONS,
        3,
        seed,
      );

      const verdict = getVerdict(score);

      const shipCard = await createShipCard(
        user1,
        user2,
        score,
        status,
      );

      const attachment = new AttachmentBuilder(
        shipCard,
        {
          name: 'ship-card.png',
        },
      );

      const description = [
        `**${user1.username}**  ×  **${user2.username}**`,
        '',
        `**Compatibility:** \`${score}%\``,
        '',
        '**Compatibility Analysis**',
        reasons
          .map((reason) => `> ${reason}`)
          .join('\n'),
        '',
        `*${verdict}*`,
      ].join('\n');

      return await InteractionHelper.safeEditReply(
        interaction,
        {
          files: [attachment],

          embeds: [
            createEmbed({
              title: 'SHIP COMPATIBILITY',
              description,
              color: 'primary',
              image: 'attachment://ship-card.png',
              footer: `Shipped by ${interaction.user.username}`,
            }),
          ],
        },
      );
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
