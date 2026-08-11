import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.UserUpdate,
  once: false,

  async execute(oldUser, newUser) {
    try {
      if (oldUser.bot) return;

      const user = await newUser.fetch(true);
      const fields = [];

      // Username
      if (oldUser.username !== user.username) {
        fields.push({
          name: '🏷️ Username',
          value: `${oldUser.username} → ${user.username}`,
          inline: false
        });
      }

      // Display Name
      if (oldUser.globalName !== user.globalName) {
        fields.push({
          name: '✨ Display Name',
          value: `${oldUser.globalName || 'None'} → ${user.globalName || 'None'}`,
          inline: false
        });
      }

      // Avatar
      if (oldUser.avatar !== user.avatar) {
        fields.push({
          name: '🖼️ Avatar',
          value: `[View Avatar](${user.displayAvatarURL({ size: 1024 })})`,
          inline: false
        });
      }

      // Banner
      if (oldUser.banner !== user.banner) {
        fields.push({
          name: '🎨 Banner',
          value: user.bannerURL({ size: 1024 })
            ? `[View Banner](${user.bannerURL({ size: 1024 })})`
            : 'Removed',
          inline: false
        });
      }

      // Accent Color
      if (oldUser.accentColor !== user.accentColor) {
        fields.push({
          name: '🎨 Accent Color',
          value: user.hexAccentColor || 'None',
          inline: true
        });
      }

      // Nothing changed
      if (!fields.length) return;

      const guilds = [...user.client.guilds.cache.values()];

      for (const guild of guilds) {
        if (!guild.members.cache.has(user.id)) continue;

        await logEvent({
          client: user.client,
          guildId: guild.id,
          eventType: EVENT_TYPES.MEMBER_PROFILE_CHANGE,
          data: {
            description: `${user.tag} updated their profile`,
            userId: user.id,
            fields: [
              {
                name: '👤 User',
                value: `${user.tag} (${user.id})`,
                inline: false
              },
              ...fields
            ]
          }
        });
      }

      logger.debug(`Profile update processed for ${user.id}`);
    } catch (error) {
      logger.error('Error in userUpdate event:', error);
    }
  }
};
```
