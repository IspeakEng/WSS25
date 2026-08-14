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
        commandName: "userinfo",
      });
      return;
    }

    try {
      // ─────────────────────────────────────────────
      // USER
      // ─────────────────────────────────────────────

      const user =
        interaction.options.getUser("target") || interaction.user;

      // Fetch all guild roles first
      // This makes sure member role objects are available.
      await interaction.guild.roles.fetch();

      // Force-fetch the actual member
      const member = await interaction.guild.members
        .fetch({
          user: user.id,
          force: true,
        })
        .catch(() => null);

      // ─────────────────────────────────────────────
      // ACCOUNT CREATION
      // ─────────────────────────────────────────────

      const createdDate = new Date(user.createdTimestamp);

      const createdTimestamp = Math.floor(
        user.createdTimestamp / 1000
      );

      // Bangladesh date
      const bdDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(createdDate);

      // Bangladesh time
      const bdTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(createdDate);

      // ─────────────────────────────────────────────
      // TIME PERIOD
      // ─────────────────────────────────────────────

      const bdHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "numeric",
          hour12: false,
        }).format(createdDate)
      );

      let timePeriod;
      let periodIcon;

      if (bdHour >= 5 && bdHour < 12) {
        timePeriod = "Morning";
        periodIcon = "☀️";
      } else if (bdHour >= 12 && bdHour < 17) {
        timePeriod = "Afternoon";
        periodIcon = "🌤️";
      } else if (bdHour >= 17 && bdHour < 20) {
        timePeriod = "Evening";
        periodIcon = "🌆";
      } else {
        timePeriod = "Night";
        periodIcon = "🌙";
      }

      // ─────────────────────────────────────────────
      // SERVER JOIN DATE
      // ─────────────────────────────────────────────

      const joinedTimestamp = member?.joinedTimestamp
        ? Math.floor(member.joinedTimestamp / 1000)
        : null;

      // ─────────────────────────────────────────────
      // ROLES
      // ─────────────────────────────────────────────

      let roleText = "No additional roles";

      if (member) {
        const roleIds = [...member.roles.cache.keys()]
          .filter((roleId) => roleId !== interaction.guild.id);

        const roles = roleIds
          .map((roleId) => interaction.guild.roles.cache.get(roleId))
          .filter(Boolean)
          .sort((a, b) => b.position - a.position);

        if (roles.length > 0) {
          roleText = roles
            .slice(0, 20)
            .map((role) => `<@&${role.id}>`)
            .join("  ");

          if (roles.length > 20) {
            roleText += `\n> ✦ *+${roles.length - 20} more role(s)*`;
          }
        }
      }

      // ─────────────────────────────────────────────
      // HIGHEST ROLE
      // ─────────────────────────────────────────────

      let highestRole = "No additional role";

      if (member?.roles?.highest) {
        const highest = member.roles.highest;

        if (highest.id !== interaction.guild.id) {
          highestRole = highest.toString();
        }
      }

      // ─────────────────────────────────────────────
      // DISPLAY NAME
      // ─────────────────────────────────────────────

      const displayName =
        member?.displayName ||
        user.globalName ||
        user.username;

      // ─────────────────────────────────────────────
      // EMBED
      // ─────────────────────────────────────────────

      const embed = createEmbed({
        title: "✦・USER INFORMATION・✦",

        description:
          `╭──────────────────────────────╮\n` +
          `\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003**${displayName}**\n` +
          `╰──────────────────────────────╯`,
      })

        // ─────────────────────────────────────────
        // AVATAR
        // ─────────────────────────────────────────

        .setThumbnail(
          user.displayAvatarURL({
            dynamic: true,
            size: 512,
          })
        )

        .setAuthor({
          name: user.tag,
          iconURL: user.displayAvatarURL({
            dynamic: true,
            size: 128,
          }),
        })

        // ─────────────────────────────────────────
        // IDENTITY
        // ─────────────────────────────────────────

        .addFields({
          name: "╭─ ✦ ɪᴅᴇɴᴛɪᴛʏ",
          value:
            `> **Username** ── \`${user.username}\`\n` +
            `> **Display Name** ── ${displayName}\n` +
            `> **User ID** ── \`${user.id}\``,
          inline: false,
        })

        // ─────────────────────────────────────────
        // SERVER
        // ─────────────────────────────────────────

        .addFields({
          name: "╭─ ◈ sᴇʀᴠᴇʀ",
          value:
            `> **Joined** ── ${
              joinedTimestamp
                ? `<t:${joinedTimestamp}:R>`
                : "`Not in server`"
            }\n` +
            `> **Highest Role** ── ${highestRole}`,
          inline: true,
        })

        // ─────────────────────────────────────────
        // ACCOUNT
        // ─────────────────────────────────────────

        .addFields({
          name: "╭─ ⟡ ᴀᴄᴄᴏᴜɴᴛ",
          value:
            `> **Bot** ── ${user.bot ? "✦ Yes" : "✦ No"}\n` +
            `> **Created** ── <t:${createdTimestamp}:R>`,
          inline: true,
        })

        // ─────────────────────────────────────────
        // CREATION TIME
        // ─────────────────────────────────────────

        .addFields({
          name: "╭─ ◌ ᴄʀᴇᴀᴛɪᴏɴ ᴛɪᴍᴇ",
          value:
            `> **Date** ── ${bdDate}\n` +
            `> **Time** ── ${bdTime} (BD)\n` +
            `> **Period** ── ${periodIcon} ${timePeriod}`,
          inline: false,
        })

        // ─────────────────────────────────────────
        // ROLES
        // ─────────────────────────────────────────

        .addFields({
          name: "╭─ ✧ ʀᴏʟᴇs",
          value: `> ${roleText}`,
          inline: false,
        })

        // ─────────────────────────────────────────
        // FOOTER
        // ─────────────────────────────────────────

        .setFooter({
          text: `✦ Requested by ${interaction.user.tag}  •  ${interaction.guild.name}`,
          iconURL: interaction.user.displayAvatarURL({
            dynamic: true,
            size: 64,
          }),
        })

        .setTimestamp();

      // ─────────────────────────────────────────────
      // SEND
      // ─────────────────────────────────────────────

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed],
      });

      logger.info(`UserInfo command executed`, {
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId,
      });

    } catch (error) {
      logger.error(`UserInfo command failed`, {
        error: error?.message || error,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      });

      await InteractionHelper.safeEditReply(interaction, {
        content:
          "✦ Something went wrong while fetching this user's information.",
        embeds: [],
      }).catch(() => {});
    }
  },
};
