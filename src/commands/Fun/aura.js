import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';

const AURA_RANKS = [
  { min: 950, name: 'LEGENDARY AURA' },
  { min: 850, name: 'AURA GOD' },
  { min: 700, name: 'MAIN CHARACTER' },
  { min: 550, name: 'CERTIFIED AURA' },
  { min: 400, name: 'DECENT AURA' },
  { min: 250, name: 'NPC ENERGY' },
  { min: 100, name: 'NEGATIVE AURA' },
  { min: 0, name: 'AURA DEBT' },
];

const REASONS = [
  '+100 — Walked into the server like they own the place',
  '+85 — Suspiciously good profile picture',
  '+70 — Main character behavior detected',
  '+55 — Said "bro trust me" with confidence',
  '+40 — Somehow survived the group chat',
  '+25 — Online at an unreasonable hour',
  '-35 — Left someone on read',
  '-50 — Sent "lol" without laughing',
  '-75 — Said "skill issue"',
  '-100 — Bro thought they had aura',
  '-150 — NPC behavior detected',
  '-200 — Unrecoverable cringe',
];

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getRank(score) {
  return AURA_RANKS.find((rank) => score >= rank.min) || AURA_RANKS[AURA_RANKS.length - 1];
}

function getVerdict(score) {
  if (score >= 950) {
    return 'The server is not worthy of this much aura.';
  }

  if (score >= 700) {
    return 'Main character detected. Proceed with caution.';
  }

  if (score >= 400) {
    return 'Not bad. The aura is functioning normally.';
  }

  if (score >= 200) {
    return 'Someone needs to teach this person how to aura.';
  }

  return 'Please stay away from the aura department.';
}

export default {
  data: new SlashCommandBuilder()
    .setName('aura')
    .setDescription("Check someone's aura")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The person whose aura you want to scan')
        .setRequired(false),
    ),

  category: 'Fun',

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);

      if (!deferSuccess) {
        logger.warn('Aura command defer failed', {
          userId: interaction.user.id,
          guildId: interaction.guildId,
        });
        return;
      }

      const target = interaction.options.getUser('user') || interaction.user;

      if (target.bot) {
        return await replyUserError(interaction, {
          type: ErrorTypes.VALIDATION,
          message: "Bots don't have aura. They have API latency.",
        });
      }

      const score = Math.floor(Math.random() * 1001);
      const rank = getRank(score);
      const reasons = getRandomItems(REASONS, 3);
      const verdict = getVerdict(score);

      const description = [
        `**Aura Score:** \`${score}/1000\``,
        `**Rank:** ${rank.name}`,
        '',
        '**Aura Analysis**',
        reasons.map((reason) => `> ${reason}`).join('\n'),
        '',
        `**Verdict:** ${verdict}`,
      ].join('\n');

      return await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          createEmbed({
            title: `Aura Scan — ${target.username}`,
            description,
            color: 'primary',
            thumbnail: target.displayAvatarURL({ size: 256 }),
            footer: `Scanned by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      logger.error('Aura command error:', error);

      return await replyUserError(interaction, {
        type: ErrorTypes.UNKNOWN,
        message: 'Something went wrong while scanning the aura.',
      });
    }
  },
};
