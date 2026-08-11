```js
import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.PresenceUpdate,
  once: false,

  async execute(oldPresence, newPresence) {
    try {
      const member = newPresence.member;

      if (!member || member.user.bot) return;

      const oldStatus = oldPresence?.status || 'offline';
      const newStatus = newPresence?.status || 'offline';

      const oldActivities =
        oldPresence?.activities
          ?.map(activity => activity.name)
          .filter(Boolean)
          .join(', ') || 'None';

      const newActivities =
        newPresence?.activities
          ?.map(activity => activity.name)
          .filter(Boolean)
          .join(', ') || 'None';

      // Only log when something actually changes
      if (
        oldStatus === newStatus &&
        oldActivities === newActivities
      ) {
        return;
      }

      const fields = [];

      if (oldStatus !== newStatus) {
        fields.push({
          name: '🟢 Status',
          value: `${oldStatus} → ${newStatus}`,
          inline: true
        });
      }

      if (oldActivities !== newActivities) {
        fields.push({
          name: '🎮 Activity',
          value: `${oldActivities} → ${newActivities}`,
          inline: false
        });
      }

      if (!fields.length) return;

      await logEvent({
        client: newPresence.client,
        guildId: newPresence.guild.id,
        eventType: EVENT_TYPES.MEMBER_PRESENCE_CHANGE,
        data: {
          description: `${member.user.tag} updated their presence.`,
          userId: member.user.id,
          fields
        }
      });

      logger.debug(
        `Presence update logged for ${member.user.id} in ${newPresence.guild.name}`
      );
    } catch (error) {
      logger.error(
        'Error in presenceUpdate event:',
        error
      );
    }
  }
};
```
