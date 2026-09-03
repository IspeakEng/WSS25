const getKey = (guildId) => `linkFilter:${guildId}`;

export async function getLinkFilterConfig(client, guildId) {
    try {
        const data = await client.db.get(getKey(guildId), null);

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

export async function setLinkFilterRole(client, guildId, roleId) {
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

export async function disableLinkFilter(client, guildId) {
    await client.db.delete(
        getKey(guildId)
    );
}

export async function canBypassLinkFilter(client, message) {
    const config = await getLinkFilterConfig(
        client,
        message.guild.id
    );

    // Server owner can always send links/GIFs
    if (
        message.author.id ===
        message.guild.ownerId
    ) {
        return true;
    }

    // Filter disabled
    if (
        !config.enabled ||
        !config.roleId
    ) {
        return true;
    }

    // Selected role can send links/GIFs
    return (
        message.member?.roles?.cache?.has(
            config.roleId
        ) ?? false
    );
}


/*
 * Detect normal URLs + Discord invites
 */
export function containsLink(content = '') {
    const text = String(content);

    const urlRegex =
        /(?:https?:\/\/|www\.)[^\s<]+/i;

    const bareDomainRegex =
        /(?:^|\s)(?!.*@)(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?/i;

    const discordInviteRegex =
        /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)[^\s<]+/i;

    return (
        urlRegex.test(text) ||
        bareDomainRegex.test(text) ||
        discordInviteRegex.test(text)
    );
}


/*
 * Detect direct GIF uploads
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


/*
 * Detect links OR GIFs
 */
export function containsBlockedContent(message) {
    return (
        containsLink(message.content) ||
        containsGifAttachment(message)
    );
}
