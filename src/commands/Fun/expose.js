import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';

const ALLEGATIONS = [
  'Has been caught lurking without saying a word',
  'Definitely reads messages from the notification bar',
  'Has said "I was just about to reply" at least once',
  'Disappears the moment someone needs them',
  'Probably has 47 unread notifications',
  'Has typed "LMAO" with a completely straight face',
  'Says "one last game" and plays for another 3 hours',
  'Has opened Discord just to stare at the server list',
  'Definitely judges people based on their profile picture',
  'Has used "bro" as an entire argument',
  'Pretends not to care but checks everything',
  'Has joined a voice channel and immediately gone silent',
  'Probably has a secret main character arc',
  'Has said "trust me" before doing something questionable',
  'Was online and still chose not to reply',
  'Has absolutely blamed lag for a skill issue',
  'Probably knows more server drama than they admit',
  'Has typed a message, deleted it, and sent something completely different',
  'Definitely has at least one embarrassing old username',
];

const SERIOUSNESS = [
  'Highly suspicious',
  'Extremely questionable',
  'Moderately criminal',
  'Suspiciously normal',
  'Deeply concerning',
  'Under investigation',
  'Certified menace',
  'Beyond saving',
];

const VERDICTS = [
  'The allegations are looking pretty bad.',
  'We will be monitoring this individual closely.',
  'The evidence speaks for itself.',
  'No further investigation is required. Guilty.',
  'The jury has seen enough.',
  'This person needs to explain themselves.',
  'The allegations cannot be ignored anymore.',
  'Case closed. Unfortunately.',
];

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getAccountAge(user) {
  const createdAt = user.createdAt;
  const now = Date.now();
  const days = Math.floor((now - createdAt.getTime()) / 86400000);

  if (days < 1) return 'Less than a day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;

  return `${Math.floor(days / 365)} years`;
}

function getJoinAge(member) {
  if (!member.joinedAt) return 'Unknown';

  const days = Math.floor(
    (Date.now() - member.joinedAt.getTime()) / 86400000,
  );

  if (days < 1) return 'Less than a day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;

  return `${Math.floor(days / 365)} years`;
}

function getThreatLevel() {
  const levels = [
    'LOW',
    'LOW',
    'MEDIUM',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
  ];

  return levels[Math.floor(Math.random() * levels.length)];
}

export default {
  data: new SlashCommandBuilder()
    .setName('expose')
    .setDescription('Expose someone with a highly questionable investigation')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The person you want to expose')
        .setRequired(false),
    ),

  category: 'Fun',

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);

      if (!deferSuccess) {
        logger.warn('Expose command defer failed', {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });
        return;
      }

      const target = interaction.options.getUser('user') || interaction.user;

      if (target.bot) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message: 'Nice try. Bots cannot be exposed.',
        });
      }

      const member = await interaction.guild.members
        .fetch(target.id)
        .catch(() => null);

      const allegations = getRandomItems(ALLEGATIONS, 4);
      const seriousness =
        SERIOUSNESS[Math.floor(Math.random() * SERIOUSNESS.length)];
      const verdict =
        VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
      const threatLevel = getThreatLevel();

      const roles = member
        ? member.roles.cache
            .filter((role) => role.id !== interaction.guild.id)
            .map((role) => role.name)
            .slice(0, 3)
        : [];

      const roleText =
        roles.length > 0 ? roles.join(', ') : 'No additional roles';

      const description = [
        '**CONFIDENTIAL — EXPOSURE REPORT**',
        '',
        `**Target:** ${target}`,
        `**Threat Level:** \`${threatLevel}\``,
        `**Investigation Status:** ${seriousness}`,
        '',
        '**Known Allegations**',
        allegations.map((item) => `> • ${item}`).join('\n'),
        '',
        '**Subject Information**',
        `> Account Age: **${getAccountAge(target)}**`,
        `> Server Member For: **${member ? getJoinAge(member) : 'Unknown'}**`,
        `> Roles: **${roleText}**`,
        '',
        `**Final Verdict:** ${verdict}`,
      ].join('\n');

      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          createEmbed({
            title: `Exposure Report — ${target.username}`,
            description,
            color: 'primary',
            thumbnail: target.displayAvatarURL({ size: 256 }),
            footer: `Investigation requested by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      logger.error('Expose command error:', error);

      return await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message: 'The investigation failed. The evidence may have been destroyed.',
      });
    }
  },
};
