const getKey = (guildId) => `linkFilter:${guildId}`;


/*
 * ==========================================================================
 * GET CONFIG
 * ==========================================================================
 */

export async function getLinkFilterConfig(client, guildId) {

    try {

        const data =
            await client.db.get(
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


/*
 * ==========================================================================
 * SET BYPASS ROLE
 * ==========================================================================
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


/*
 * ==========================================================================
 * DISABLE
 * ==========================================================================
 */

export async function disableLinkFilter(
    client,
    guildId
) {

    await client.db.delete(
        getKey(guildId)
    );
}


/*
 * ==========================================================================
 * CHECK BYPASS
 * ==========================================================================
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


    /*
     * SERVER OWNER ALWAYS BYPASS
     */

    if (
        message.author.id ===
        message.guild.ownerId
    ) {

        return true;
    }


    /*
     * FILTER DISABLED
     */

    if (
        !config.enabled ||
        !config.roleId
    ) {

        return true;
    }


    /*
     * SELECTED ROLE BYPASS
     */

    return (
        message.member?.roles?.cache?.has(
            config.roleId
        ) ?? false
    );
}


/*
 * ==========================================================================
 * NORMAL LINK DETECTION
 * ==========================================================================
 */

export function containsLink(
    content = ''
) {

    const text =
        String(content);


    /*
     * HTTP / HTTPS / WWW
     */

    const urlRegex =
        /(?:https?:\/\/|www\.)[^\s<]+/i;


    /*
     * DISCORD INVITE
     */

    const discordInviteRegex =
        /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)[^\s<]+/i;


    /*
     * BARE DOMAIN
     */

    const bareDomainRegex =
        /(?:^|\s)(?!.*@)(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?/i;


    return (
        urlRegex.test(text) ||
        discordInviteRegex.test(text) ||
        bareDomainRegex.test(text)
    );
}


/*
 * ==========================================================================
 * GIF URL DETECTION
 * ==========================================================================
 */

function isGifUrl(
    value = ''
) {

    const text =
        String(value)
            .toLowerCase()
            .trim();


    if (!text) {
        return false;
    }


    /*
     * DIRECT .GIF
     */

    if (
        /\.gif(?:[?#]|$)/i.test(text)
    ) {

        return true;
    }


    /*
     * TENOR
     */

    if (
        text.includes('tenor.com/') ||
        text.includes('tenor.com')
    ) {

        return true;
    }


    /*
     * GIPHY
     */

    if (
        text.includes('giphy.com/') ||
        text.includes('giphy.com')
    ) {

        return true;
    }


    /*
     * GIF SEARCH / MEDIA DOMAINS
     */

    if (
        text.includes('media.tenor.com/') ||
        text.includes('media.giphy.com/') ||
        text.includes('i.giphy.com/')
    ) {

        return true;
    }


    return false;
}


/*
 * ==========================================================================
 * GIF ATTACHMENT DETECTION
 * ==========================================================================
 */

export function containsGifAttachment(
    message
) {

    if (
        !message.attachments?.size
    ) {

        return false;
    }


    return message.attachments.some(
        attachment => {

            const name =
                attachment.name
                    ?.toLowerCase() || '';


            const contentType =
                attachment.contentType
                    ?.toLowerCase() || '';


            const url =
                attachment.url
                    ?.toLowerCase() || '';


            return (
                name.endsWith('.gif') ||
                contentType === 'image/gif' ||
                contentType.startsWith('image/gif;') ||
                isGifUrl(url)
            );
        }
    );
}


/*
 * ==========================================================================
 * GIF EMBED DETECTION
 * ==========================================================================
 */

export function containsGifEmbed(
    message
) {

    if (
        !message.embeds?.length
    ) {

        return false;
    }


    return message.embeds.some(
        embed => {

            const urls = [

                embed.url,

                embed.image?.url,

                embed.image?.proxyURL,

                embed.thumbnail?.url,

                embed.thumbnail?.proxyURL,

                embed.video?.url,

                embed.video?.proxyURL,

            ].filter(Boolean);


            return urls.some(
                url => isGifUrl(url)
            );
        }
    );
}


/*
 * ==========================================================================
 * GIF / LINK DETECTION
 * ==========================================================================
 */

export function containsBlockedContent(
    message
) {

    /*
     * Normal links
     */

    if (
        containsLink(
            message.content
        )
    ) {

        return true;
    }


    /*
     * GIF attachment
     */

    if (
        containsGifAttachment(
            message
        )
    ) {

        return true;
    }


    /*
     * GIF embed / Discord GIF picker
     */

    if (
        containsGifEmbed(
            message
        )
    ) {

        return true;
    }


    /*
     * Check embed URLs generally
     *
     * This catches cases where Discord
     * converts a GIF into an embed.
     */

    if (
        message.embeds?.length
    ) {

        for (
            const embed
            of message.embeds
        ) {

            const urls = [

                embed.url,

                embed.image?.url,

                embed.image?.proxyURL,

                embed.thumbnail?.url,

                embed.thumbnail?.proxyURL,

                embed.video?.url,

                embed.video?.proxyURL,

            ].filter(Boolean);


            if (
                urls.some(
                    url => isGifUrl(url)
                )
            ) {

                return true;
            }
        }
    }


    return false;
}
