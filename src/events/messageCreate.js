/*
 * ----------------------------------------------------------------------
 * AFK SYSTEM
 * ----------------------------------------------------------------------
 */

try {
    const { getAFKKey } = await import('../utils/database.js');

    /*
     * ------------------------------------------------------------------
     * REMOVE AFK WHEN AFK USER SENDS A MESSAGE
     * ------------------------------------------------------------------
     */

    const authorAFKKey = getAFKKey(
        message.guild.id,
        message.author.id
    );

    const authorAFK = await client.db.get(
        authorAFKKey,
        null
    );

    if (authorAFK) {
        await client.db.delete(authorAFKKey);

        const welcomeBack = await message.channel.send({
            content:
                `👋 Welcome back, ${message.author}! Your AFK status has been removed.`,
        }).catch(() => null);

        if (welcomeBack) {
            setTimeout(() => {
                welcomeBack.delete().catch(() => {});
            }, 5000);
        }
    }

    /*
     * ------------------------------------------------------------------
     * CHECK MENTIONED USERS FOR AFK STATUS
     * ------------------------------------------------------------------
     */

    const mentionedUsers = [...message.mentions.users.values()]
        .filter(user => !user.bot)
        .filter(user => user.id !== message.author.id);

    for (const mentionedUser of mentionedUsers) {

        const mentionedAFKKey = getAFKKey(
            message.guild.id,
            mentionedUser.id
        );

        const afkData = await client.db.get(
            mentionedAFKKey,
            null
        );

        if (!afkData) {
            continue;
        }

        const reason =
            afkData.reason || 'No reason provided';

        const since =
            afkData.timestamp
                ? `<t:${Math.floor(Number(afkData.timestamp) / 1000)}:R>`
                : 'Unknown';

        await message.channel.send({
            content:
                `💤 **${mentionedUser.username} is AFK**\n` +
                `> Reason: ${reason}\n` +
                `> Since: ${since}`,
        }).catch(() => {});
    }

} catch (error) {
    logger.error(
        'Error handling AFK system:',
        error
    );
}
