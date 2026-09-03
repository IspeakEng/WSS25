/*
 * ==========================================================================
 * LINK FILTER SERVICE
 * ==========================================================================
 *
 * Server-wide link/GIF protection.
 *
 * Normal members:
 * ❌ Links
 * ❌ GIFs
 *
 * Whitelisted role:
 * ✅ Links
 * ✅ GIFs
 *
 * Configuration is stored in client.db.
 * ==========================================================================
 */

const getKey = (guildId) => `linkFilter:${guildId}`;


/**
 * Get link filter configuration.
 */
export async function getLinkFilterConfig(client, guildId) {
    try {
        const data = await client.db.get(
            getKey(guildId),
            null
        );

        return data || {
            enabled: false,
            roleId: null,
        };

    } catch {
        return {
            enabled: false,
            roleId: null,
        };
    }
}


/**
 * Set the allowed role.
 */
export async function setLinkFilterRole(
    client,
    guildId,
    roleId
) {
    const config = {
        enabled: true,
        roleId,
    };

    await client.db.set(
        getKey(guildId),
        config
    );

    return config;
}


/**
 * Disable the link filter.
 */
export async function disableLinkFilter(
    client,
    guildId
) {
    await client.db.delete(
        getKey(guildId)
    );
}


/**
 * Check whether a member is allowed to send
 * links/GIFs.
 */
export async function canBypassLinkFilter(
    client,
    message
) {
    const config =
        await getLinkFilterConfig(
            client,
            message.guild.id
        );

    if (!config.enabled || !config.roleId) {
        return true;
    }

    return message.member?.roles?.cache?.has(
        config.roleId
    ) ?? false;
}


/**
 * Detect URLs inside message content.
 *
 * This catches:
 * https://example.com
 * http://example.com
 * www.example.com
 * discord.gg/example
 * discord.com/invite/example
 * tenor.com
 * giphy.com
 * etc.
 */
export function containsLink(content = '') {
    const text = String(content);

    const urlRegex =
        /(?:https?:\/\/|www\.)[^\s<]+/i;

    const discordInviteRegex =
        /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)[^\s<]+/i;

    return (
        urlRegex.test(text) ||
        discordInviteRegex.test(text)
    );
}


/**
 * Detect GIF attachments.
 */
export function containsGifAttachment(message) {
    if (!message.attachments?.size) {
        return false;
    }

    return message.attachments.some(
        attachment => {
            const name =
                attachment.name?.toLowerCase() || '';

            const contentType =
                attachment.contentType?.toLowerCase() || '';

            return (
                name.endsWith('.gif') ||
                contentType === 'image/gif' ||
                contentType.startsWith('image/gif;')
            );
        }
    );
}


/**
 * Detect a blocked message.
 */
export function containsBlockedContent(message) {
    return (
        containsLink(message.content) ||
        containsGifAttachment(message)
    );
}
