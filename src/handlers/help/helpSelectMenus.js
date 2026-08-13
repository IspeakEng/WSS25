import { createEmbed } from '../../utils/embeds.js';
import { createButton, getPaginationRow } from '../../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";
const CATEGORY_SELECT_ID = "help-category-select";
const FOOTER_TEXT = "Made with ❤️";

const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Music: "🎵",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    "Reaction Roles": "🎭",
    Community: "👥",
    Birthday: "🎂",
    "Join To Create": "🔌",
    Verification: "✅",
    Config: "⚙️",
};

/*
 * ==========================================================================
 * COMMANDS HIDDEN FROM /HELP
 * ==========================================================================
 *
 * These commands still exist and work normally.
 * They are only hidden from the /help menu.
 */

const HIDDEN_HELP_COMMANDS = new Set([
    "app-admin dashboard",
    "app-admin list",
    "app-admin review",
    "app-admin setup",
    "buy",
    "crime",
    "daily",
    "deposit",
    "economy dashboard",
    "embedbuilder",
    "flip",
    "gamble",
    "inventory",
    "join",
    "mine",
    "pay",
    "rob",
    "roll",
    "say",
    "shop",
    "shop-config setrole",
    "slut",
    "withdraw",
    "work",
]);

function formatCategoryName(rawCategory) {
    return rawCategory
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);

    if (!commandData?.name) {
        return [];
    }

    const baseName = commandData.name;
    const baseDescription =
        commandData.description || "No description";

    const options = commandData.options || [];

    const entries = [];

    for (const option of options) {
        if (!option) continue;

        /*
         * Normal subcommand
         *
         * Example:
         * /app-admin dashboard
         */
        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({
                baseName,
                displayName: `${baseName} ${option.name}`,
                description: option.description || baseDescription,
                category,
            });

            continue;
        }

        /*
         * Subcommand group
         *
         * Example:
         * /shop-config setrole
         */
        if (option.type === SUBCOMMAND_GROUP_TYPE) {
            const nestedOptions = option.options || [];

            for (const nested of nestedOptions) {
                if (nested?.type !== SUBCOMMAND_TYPE) {
                    continue;
                }

                entries.push({
                    baseName,
                    displayName: `${baseName} ${option.name} ${nested.name}`,
                    description:
                        nested.description ||
                        option.description ||
                        baseDescription,
                    category,
                });
            }
        }
    }

    /*
     * Normal command without subcommands
     *
     * Example:
     * /work
     * /rob
     * /gamble
     */
    if (entries.length === 0) {
        entries.push({
            baseName,
            displayName: baseName,
            description: baseDescription,
            category,
        });
    }

    return entries;
}

function normalizeCommandData(command) {
    const rawData = command?.data;

    if (!rawData) {
        return null;
    }

    const jsonData =
        typeof rawData.toJSON === 'function'
            ? rawData.toJSON()
            : rawData;

    if (!jsonData?.name) {
        return null;
    }

    return {
        ...jsonData,

        options: Array.isArray(jsonData.options)
            ? jsonData.options.map((option) =>
                  typeof option?.toJSON === 'function'
                      ? option.toJSON()
                      : option,
              )
            : [],
    };
}

/*
 * ==========================================================================
 * FILTER HELP ENTRIES
 * ==========================================================================
 */

function filterHiddenHelpEntries(entries) {
    return entries.filter(
        (entry) =>
            entry?.displayName &&
            !HIDDEN_HELP_COMMANDS.has(entry.displayName),
    );
}

/*
 * ==========================================================================
 * CATEGORY COMMANDS MENU
 * ==========================================================================
 */

async function createCategoryCommandsMenu(category, client) {
    const categoryName = formatCategoryName(category);
    const icon = CATEGORY_ICONS[categoryName] || "🔍";

    const categoryCommands = [];

    try {
        const categoryPath = path.join(
            __dirname,
            "../../commands",
            category,
        );

        const commandFiles = (
            await fs.readdir(categoryPath)
        )
            .filter((file) => file.endsWith(".js"))
            .sort();

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);

            const commandModule = await import(
                `file://${filePath}`
            );

            const command = commandModule.default;
            const commandData = normalizeCommandData(command);

            if (!commandData) {
                continue;
            }

            /*
             * Never show /help or /commandlist.
             */
            if (
                commandData.name === "help" ||
                commandData.name === "commandlist"
            ) {
                continue;
            }

            const helpEntries = buildHelpEntries(
                command,
                categoryName,
            );

            const visibleEntries =
                filterHiddenHelpEntries(helpEntries);

            categoryCommands.push(...visibleEntries);
        }
    } catch (error) {
        logger.error(
            `Error reading commands from category ${category}:`,
            error,
        );
    }

    categoryCommands.sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
    );

    /*
     * Fetch registered Discord commands so we can create
     * clickable command mentions.
     */
    let registeredCommands = new Collection();

    try {
        if (client?.application?.commands?.fetch) {
            const commands =
                await client.application.commands.fetch();

            for (const cmd of commands.values()) {
                registeredCommands.set(cmd.name, cmd);
            }
        }
    } catch (error) {
        logger.error(
            'Error fetching registered commands:',
            error,
        );
    }

    const embed = createEmbed({
        title: `${icon} ${categoryName} Commands`,

        description:
            categoryCommands.length > 0
                ? `Click any command mention below to use it.`
                : `No commands found in the **${categoryName}** category.`,
    });

    if (categoryCommands.length > 0) {
        const commandMentions = categoryCommands
            .map((cmd) => {
                const registeredCmd =
                    registeredCommands.get(cmd.baseName);

                if (registeredCmd && registeredCmd.id) {
                    return `</${cmd.displayName}:${registeredCmd.id}> · ${cmd.description}`;
                }

                return `\`/${cmd.displayName}\` · ${cmd.description}`;
            })
            .join("\n");

        const maxLength = 1000;

        if (commandMentions.length <= maxLength) {
            embed.addFields({
                name: "Commands",
                value: commandMentions,
                inline: false,
            });
        } else {
            const chunks = [];
            let currentChunk = "";

            const lines = commandMentions.split("\n");

            for (const line of lines) {
                if (
                    (currentChunk + "\n" + line).length >
                    maxLength
                ) {
                    if (currentChunk) {
                        chunks.push(currentChunk);
                    }

                    currentChunk = line;
                } else {
                    currentChunk +=
                        (currentChunk ? "\n" : "") + line;
                }
            }

            if (currentChunk) {
                chunks.push(currentChunk);
            }

            chunks.forEach((chunk, index) => {
                embed.addFields({
                    name: `Commands (Part ${index + 1})`,
                    value: chunk,
                    inline: false,
                });
            });
        }
    }

    embed.setFooter({
        text: FOOTER_TEXT,
    });

    embed.setTimestamp();

    const backButton = createButton(
        BACK_BUTTON_ID,
        "Back",
        "primary",
        "⬅️",
        false,
    );

    const buttonRow =
        new ActionRowBuilder().addComponents(
            backButton,
        );

    return {
        embeds: [embed],
        components: [buttonRow],
    };
}

/*
 * ==========================================================================
 * ALL COMMANDS MENU
 * ==========================================================================
 */

export async function createAllCommandsMenu(
    page = 1,
    client,
) {
    const commandsPerPage = 45;

    const allCommands = [];

    const commandsPath = path.join(
        __dirname,
        "../../commands",
    );

    const categoryDirs = (
        await fs.readdir(commandsPath, {
            withFileTypes: true,
        })
    )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    /*
     * Read every command category.
     */
    for (const category of categoryDirs) {
        try {
            const categoryPath = path.join(
                __dirname,
                "../../commands",
                category,
            );

            const commandFiles = (
                await fs.readdir(categoryPath)
            )
                .filter((file) => file.endsWith(".js"))
                .sort();

            for (const file of commandFiles) {
                const filePath = path.join(
                    categoryPath,
                    file,
                );

                const commandModule = await import(
                    `file://${filePath}`
                );

                const command = commandModule.default;

                const commandData =
                    normalizeCommandData(command);

                if (!commandData) {
                    continue;
                }

                /*
                 * Never show /help or /commandlist.
                 */
                if (
                    commandData.name === "help" ||
                    commandData.name === "commandlist"
                ) {
                    continue;
                }

                const categoryName =
                    formatCategoryName(category);

                /*
                 * Build all entries first.
                 */
                const helpEntries = buildHelpEntries(
                    command,
                    categoryName,
                );

                /*
                 * Remove the 24 hidden commands.
                 */
                const visibleEntries =
                    filterHiddenHelpEntries(
                        helpEntries,
                    );

                allCommands.push(...visibleEntries);
            }
        } catch (error) {
            logger.error(
                `Error reading commands from category ${category}:`,
                error,
            );
        }
    }

    /*
     * Sort commands alphabetically.
     */
    allCommands.sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
    );

    /*
     * Fetch registered Discord commands.
     */
    let registeredCommands = new Collection();

    try {
        if (client?.application?.commands?.fetch) {
            const commands =
                await client.application.commands.fetch();

            for (const cmd of commands.values()) {
                registeredCommands.set(cmd.name, cmd);
            }
        }
    } catch (error) {
        logger.error(
            'Error fetching registered commands:',
            error,
        );
    }

    /*
     * Pagination.
     */
    const totalPages = Math.ceil(
        allCommands.length / commandsPerPage,
    );

    const startIndex =
        (page - 1) * commandsPerPage;

    const endIndex =
        startIndex + commandsPerPage;

    const pageCommands = allCommands.slice(
        startIndex,
        endIndex,
    );

    const embed = createEmbed({
        title: "📋 All Commands",

        description:
            "Browse every available command in one list. Use the page buttons below to move through the full set.",
    });

    embed.setFooter({
        text: FOOTER_TEXT,
    });

    embed.setTimestamp();

    if (pageCommands.length > 0) {
        const commandMentions = pageCommands.map(
            (cmd) => {
                const registeredCmd =
                    registeredCommands.get(
                        cmd.baseName,
                    );

                if (
                    registeredCmd &&
                    registeredCmd.id
                ) {
                    return `</${cmd.displayName}:${registeredCmd.id}> · ${cmd.category}`;
                }

                return `\`/${cmd.displayName}\` · ${cmd.category}`;
            },
        );

        const columnCount =
            pageCommands.length > 20
                ? 3
                : pageCommands.length > 10
                    ? 2
                    : 1;

        const chunkSize = Math.ceil(
            commandMentions.length /
                columnCount,
        );

        for (
            let i = 0;
            i < columnCount;
            i++
        ) {
            const chunk = commandMentions
                .slice(
                    i * chunkSize,
                    (i + 1) * chunkSize,
                )
                .join("\n");

            if (!chunk) {
                continue;
            }

            embed.addFields({
                name:
                    i === 0
                        ? `Commands (Page ${page})`
                        : "Commands (cont.)",

                value: chunk,

                inline:
                    columnCount > 1,
            });
        }
    }

    const components = [];

    /*
     * Pagination buttons.
     */
    if (totalPages > 1) {
        const paginationRow =
            getPaginationRow(
                PAGINATION_PREFIX,
                page,
                totalPages,
            );

        components.push(
            paginationRow,
        );
    }

    /*
     * Back button.
     */
    const backButton = createButton(
        BACK_BUTTON_ID,
        "Back",
        "primary",
        "⬅️",
        false,
    );

    const buttonRow =
        new ActionRowBuilder().addComponents(
            backButton,
        );

    components.push(buttonRow);

    return {
        embeds: [embed],
        components,

        currentPage: page,
        totalPages,
    };
}

/*
 * ==========================================================================
 * HELP CATEGORY SELECT MENU
 * ==========================================================================
 */

export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,

    async execute(interaction, client) {
        try {
            if (
                !interaction.deferred &&
                !interaction.replied
            ) {
                await interaction.deferUpdate();
            }

            const selectedCategory =
                interaction.values[0];

            /*
             * All Commands
             */
            if (
                selectedCategory ===
                ALL_COMMANDS_ID
            ) {
                const {
                    embeds,
                    components,
                } =
                    await createAllCommandsMenu(
                        1,
                        client,
                    );

                await interaction.editReply({
                    embeds,
                    components,
                });
            } else {
                /*
                 * Specific category
                 */
                const {
                    embeds,
                    components,
                } =
                    await createCategoryCommandsMenu(
                        selectedCategory,
                        client,
                    );

                await interaction.editReply({
                    embeds,
                    components,
                });
            }
        } catch (error) {
            if (
                error?.code === 40060 ||
                error?.code === 10062
            ) {
                logger.warn(
                    "Help category select interaction already acknowledged or expired.",
                    {
                        event:
                            "interaction.help.select.unavailable",

                        errorCode:
                            String(error.code),

                        customId:
                            interaction.customId,

                        interactionId:
                            interaction.id,
                    },
                );

                return;
            }

            await handleInteractionError(
                interaction,
                error,
                {
                    type: "select_menu",

                    customId:
                        interaction.customId,

                    handler:
                        "help_category",
                },
            );
        }
    },
};
