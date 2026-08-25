import { logger } from '../utils/logger.js';

// ========== TICKET PANELS ==========
export async function reconcileTicketPanels(client) {
    const summary = {
        scannedGuilds: 0,
        healthyPanels: 0,
        deletedPanels: 0,
        missingChannels: 0,
        recoveredIds: 0,
        errors: 0
    };

    try {
        const guilds = client.guilds.cache;
        summary.scannedGuilds = guilds.size;

        for (const [guildId, guild] of guilds) {
            try {
                const key = `ticket_panels_${guildId}`;
                const data = await client.db.get(key);
                
                if (!data || !data.panels) continue;

                for (const panel of data.panels) {
                    try {
                        const channel = guild.channels.cache.get(panel.channelId);
                        if (!channel) {
                            summary.missingChannels++;
                            continue;
                        }

                        const message = await channel.messages.fetch(panel.messageId).catch(() => null);
                        if (message) {
                            summary.healthyPanels++;
                        } else {
                            summary.deletedPanels++;
                        }
                    } catch (error) {
                        summary.errors++;
                    }
                }
            } catch (error) {
                summary.errors++;
                logger.error(`Error reconciling ticket panels for guild ${guildId}:`, error.message);
            }
        }
    } catch (error) {
        logger.error('Error in reconcileTicketPanels:', error);
    }

    return summary;
}

// ========== VERIFICATION PANELS ==========
export async function reconcileVerificationPanels(client) {
    const summary = {
        scannedGuilds: 0,
        healthyPanels: 0,
        deletedPanels: 0,
        missingChannels: 0,
        recoveredIds: 0,
        errors: 0
    };

    try {
        const guilds = client.guilds.cache;
        summary.scannedGuilds = guilds.size;

        for (const [guildId, guild] of guilds) {
            try {
                const key = `verification_panels_${guildId}`;
                const data = await client.db.get(key);
                
                if (!data || !data.panels) continue;

                for (const panel of data.panels) {
                    try {
                        const channel = guild.channels.cache.get(panel.channelId);
                        if (!channel) {
                            summary.missingChannels++;
                            continue;
                        }

                        const message = await channel.messages.fetch(panel.messageId).catch(() => null);
                        if (message) {
                            summary.healthyPanels++;
                        } else {
                            summary.deletedPanels++;
                        }
                    } catch (error) {
                        summary.errors++;
                    }
                }
            } catch (error) {
                summary.errors++;
                logger.error(`Error reconciling verification panels for guild ${guildId}:`, error.message);
            }
        }
    } catch (error) {
        logger.error('Error in reconcileVerificationPanels:', error);
    }

    return summary;
}
