/*
 * ==========================================================================
 * SAVE USER LEVEL DATA
 * ==========================================================================
 */

export async function saveUserLevelData(
    client,
    guildId,
    userId,
    data
) {
    try {
        if (!guildId || !userId) {
            throw new TitanBotError(
                'Guild ID and User ID are required',
                ErrorTypes.VALIDATION
            );
        }

        if (
            !data ||
            typeof data !== 'object'
        ) {
            throw new TitanBotError(
                'Invalid user level data',
                ErrorTypes.VALIDATION
            );
        }

        /*
         * PostgreSQL timestamp fix:
         * Convert JavaScript milliseconds from Date.now()
         * into a real JavaScript Date object.
         */

        let lastMessage = null;

        if (data.lastMessage) {
            const timestamp = Number(data.lastMessage);

            if (Number.isFinite(timestamp)) {
                lastMessage = new Date(timestamp);
            } else if (data.lastMessage instanceof Date) {
                lastMessage = data.lastMessage;
            }
        }

        const sanitizedData = {
            xp: Math.max(
                0,
                Number(data.xp) || 0
            ),

            level: Math.max(
                0,
                Math.min(
                    Number(data.level) || 0,
                    MAX_LEVEL
                )
            ),

            totalXp: Math.max(
                0,
                Number(data.totalXp) || 0
            ),

            lastMessage,

            rank:
                Number(data.rank) || 0
        };

        const key =
            getUserLevelKey(
                guildId,
                userId
            );

        await client.db.set(
            key,
            sanitizedData
        );

    } catch (error) {
        logger.error(
            `Error saving user level data for ${userId}:`,
            error
        );

        if (
            error instanceof TitanBotError
        ) {
            throw error;
        }

        throw new TitanBotError(
            `Failed to save user data: ${error.message}`,
            ErrorTypes.DATABASE,
            'Could not save level data at this time.'
        );
    }
}
