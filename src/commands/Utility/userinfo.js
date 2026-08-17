import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
      // USER & MEMBER
      // ─────────────────────────────────────────────

      const user = interaction.options.getUser("target") || interaction.user;

      await interaction.guild.roles.fetch();

      const member = await interaction.guild.members
        .fetch({
          user: user.id,
          force: true,
        })
        .catch(() => null);

      // ─────────────────────────────────────────────
      // 📅 ACCOUNT CREATION
      // ─────────────────────────────────────────────

      const createdDate = new Date(user.createdTimestamp);
      const createdTimestamp = Math.floor(user.createdTimestamp / 1000);

      const bdDate = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(createdDate);

      const bdTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(createdDate);

      // ─────────────────────────────────────────────
      // 🌅 TIME PERIOD
      // ─────────────────────────────────────────────

      const bdHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "numeric",
          hour12: false,
        }).format(createdDate)
      );

      let timePeriod, periodIcon;
      if (bdHour >= 5 && bdHour < 12) {
        timePeriod = "Morning";
        periodIcon = "🌅";
      } else if (bdHour >= 12 && bdHour < 17) {
        timePeriod = "Afternoon";
        periodIcon = "☀️";
      } else if (bdHour >= 17 && bdHour < 20) {
        timePeriod = "Evening";
        periodIcon = "🌇";
      } else {
        timePeriod = "Night";
        periodIcon = "🌙";
      }

      // ─────────────────────────────────────────────
      // 📥 SERVER JOIN DATE
      // ─────────────────────────────────────────────

      const joinedTimestamp = member?.joinedTimestamp
        ? Math.floor(member.joinedTimestamp / 1000)
        : null;

      // ─────────────────────────────────────────────
      // 🤖 BOT DETECTION
      // ─────────────────────────────────────────────

      const isBot = user.bot;
      const userType = isBot ? "🤖 **Bot**" : "👤 **User**";

      // ─────────────────────────────────────────────
      // 📊 PROGRESS BAR
      // ─────────────────────────────────────────────

      let progressBar = "❌ *Not in server*";
      let membershipLevel = "";

      if (member) {
        const now = Date.now();
        const joinedDate = member.joinedTimestamp;
        const daysInServer = Math.floor((now - joinedDate) / (1000 * 60 * 60 * 24));
        
        const progressPercent = Math.min((daysInServer / 30) * 100, 100);
        const filledBars = Math.floor(progressPercent / 10);
        const emptyBars = 10 - filledBars;
        
        const filled = '█'.repeat(filledBars);
        const empty = '░'.repeat(emptyBars);
        
        progressBar = `\`${filled}${empty}\` **${Math.round(progressPercent)}%**`;
        
        if (daysInServer < 1) {
          membershipLevel = "🆕 *Newbie*";
        } else if (daysInServer < 7) {
          membershipLevel = "🌱 *Rookie*";
        } else if (daysInServer < 30) {
          membershipLevel = "📈 *Regular*";
        } else if (daysInServer < 90) {
          membershipLevel = "⭐ *Veteran*";
        } else if (daysInServer < 365) {
          membershipLevel = "🔥 *Loyal*";
        } else {
          membershipLevel = "👑 *OG*";
        }
      }

      // ─────────────────────────────────────────────
      // 🎭 ROLES
      // ─────────────────────────────────────────────

      let roleText = "*No additional roles*";

      if (member) {
        const roleIds = [...member.roles.cache.keys()]
          .filter((roleId) => roleId !== interaction.guild.id);

        const roles = roleIds
          .map((roleId) => interaction.guild.roles.cache.get(roleId))
          .filter(Boolean)
          .sort((a, b) => b.position - a.position);

        if (roles.length > 0) {
          const maxRoles = 8;
          
          roleText = roles
            .slice(0, maxRoles)
            .map((role) => `<@&${role.id}>`)
            .join(" ");

          if (roles.length > maxRoles) {
            roleText += `\n┃ ✦ *+${roles.length - maxRoles} more*`;
          }
        }
      }

      // ─────────────────────────────────────────────
      // 🏆 HIGHEST ROLE
      // ─────────────────────────────────────────────

      let highestRole = "*No additional role*";
      if (member?.roles?.highest) {
        const highest = member.roles.highest;
        if (highest.id !== interaction.guild.id) {
          highestRole = highest.toString();
        }
      }

      // ─────────────────────────────────────────────
      // 📛 DISPLAY NAME
      // ─────────────────────────────────────────────

      const displayName = member?.displayName || user.globalName || user.username;

      // ─────────────────────────────────────────────
      // 🎨 EMBED — স্ট্যাটাস বাদে
      // ─────────────────────────────────────────────

      const embed = new EmbedBuilder()
        .setColor("#2B2D31") // ডিফল্ট ডার্ক কালার
        .setAuthor({
          name: `${user.username} • Profile`,
          iconURL: user.displayAvatarURL({ dynamic: true, size: 128 }),
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setDescription(
          `> ✦ **${displayName}** ✦\n` +
          `> \`${user.id}\`\n` +
          `\n` +
          `> ${userType} ${member ? '• 📌 **Member**' : '• ❌ **Not in server**'}`
        )
        .addFields(
          {
            name: `📅 Account Created`,
            value: `<t:${createdTimestamp}:D>\n<t:${createdTimestamp}:T> (BD)\n${periodIcon} ${timePeriod}`,
            inline: true,
          },
          {
            name: `📥 Joined Server`,
            value: joinedTimestamp 
              ? `<t:${joinedTimestamp}:D>\n<t:${joinedTimestamp}:R>` 
              : "*Not in server*",
            inline: true,
          },
          {
            name: `📊 Membership Level`,
            value: member ? `${progressBar}\n${membershipLevel}` : "*Not a member*",
            inline: true,
          },
          {
            name: `🏆 Highest Role`,
            value: highestRole,
            inline: true,
          },
          {
            name: `🎭 Roles (${member?.roles?.cache?.size - 1 || 0})`,
            value: roleText.length > 1024 
              ? roleText.substring(0, 1020) + "..." 
              : roleText,
            inline: false,
          }
        )
        .setFooter({
          text: `✦ Requested by ${interaction.user.displayName} • ${interaction.guild.name}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 64 }),
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
        content: "✦ Something went wrong while fetching this user's information.",
        embeds: [],
      }).catch(() => {});
    }
  },
};
