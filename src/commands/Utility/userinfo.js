import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get detailed information about a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to inspect (defaults to you)")
    ),

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);

    if (!deferSuccess) {
      logger.warn(`UserInfo interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'userinfo'
      });
      return;
    }

    const user =
      interaction.options.getUser("target") || interaction.user;

    const member = interaction.guild.members.cache.get(user.id);

    // ──────────────── TIMESTAMPS ────────────────

    const createdTimestamp = Math.floor(
      user.createdAt.getTime() / 1000
    );

    const joinedTimestamp = member?.joinedAt
      ? Math.floor(member.joinedAt.getTime() / 1000)
      : null;

    // ──────────────── ROLES ────────────────

    const roles = member
      ? member.roles.cache
          .filter((role) => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
      : [];

    const roleList =
      roles.length > 0
        ? roles
            .slice(0, 10)
            .map((role) => `<@&${role.id}>`)
            .join("  ")
        : "`None`";

    const moreRoles =
      roles.length > 10
        ? `\n> ✦ *+${roles.length - 10} more role(s)*`
        : "";

    // ──────────────── STATUS ────────────────

    const botStatus = user.bot
      ? "✦ Yes"
      : "✦ No";

    // ──────────────── EMBED ────────────────

    const embed = createEmbed({
      title: "✦・USER INFORMATION・✦",
      description:
        `╭─────────────── ⟡ ───────────────╮\n` +
        `        **${user.displayName || user.username}**\n` +
        `╰─────────────── ⟡ ───────────────╯`
    })
      .setThumbnail(
        user.displayAvatarURL({
          dynamic: true,
          size: 512
        })
      )
      .setAuthor({
        name: `${user.tag}`,
        iconURL: user.displayAvatarURL({
          dynamic: true,
          size: 128
        })
      })

      // ───────── IDENTITY ─────────

      .addFields({
        name: "╭─ ✦ ɪᴅᴇɴᴛɪᴛʏ",
        value:
          `> **Username**  ── \`${user.username}\`\n` +
          `> **Display**  ── ${user.displayName || user.username}\n` +
          `> **ID**  ── \`${user.id}\``,
        inline: true
      })

      // ───────── SERVER ─────────

      .addFields({
        name: "╭─ ◈ sᴇʀᴠᴇʀ",
        value:
          `> **Joined**  ── ${
            joinedTimestamp
              ? `<t:${joinedTimestamp}:R>`
              : "`Not in server`"
          }\n` +
          `> **Highest Role**  ── ${
            member?.roles?.highest
              ? member.roles.highest.toString()
              : "`None`"
          }`,
        inline: true
      })

      // ───────── ACCOUNT ─────────

      .addFields({
        name: "╭─ ⟡ ᴀᴄᴄᴏᴜɴᴛ",
        value:
          `> **Bot**  ── ${botStatus}\n` +
          `> **Created**  ── <t:${createdTimestamp}:R>`,
        inline: true
      })

      // ───────── ROLES ─────────

      .addFields({
        name: "╭─ ✧ ʀᴏʟᴇs",
        value:
          `> ${roleList}` +
          moreRoles,
        inline: false
      })

      // ───────── FOOTER ─────────

      .setFooter({
        text: `✦ Requested by ${interaction.user.tag}  •  ${interaction.guild.name}`,
        iconURL: interaction.user.displayAvatarURL({
          dynamic: true,
          size: 64
        })
      })

      .setTimestamp();

    // ──────────────── SEND ────────────────

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [embed]
    });

    logger.info(`UserInfo command executed`, {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId
    });
  },
};
