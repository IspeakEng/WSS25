import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';
import { logger } from '../../utils/logger.js';
import botConfig from '../../config/bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_COMMANDS = 100;
const COMMAND_COUNT_WARN_THRESHOLD = 90;

// ============================================================
// DISABLED COMMAND CATEGORIES
// ============================================================

const DISABLED_CATEGORIES = new Set([
    'Economy',
    'Leveling'
]);

const DISABLED_COMMANDS = new Set([
    'app-admin'
]);

// ============================================================
// CHECK IF COMMAND SHOULD BE DISABLED
// ============================================================

function isCommandDisabled(command, filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    const pathParts = normalizedPath.split('/');

    // Disable entire Leveling folder
    if (pathParts.includes('Leveling')) {
        return true;
    }

    // Disable Economy folder
    if (pathParts.includes('Economy')) {
        return true;
    }

    // Disable specific commands
    if (command?.data?.name) {
        const commandName = command.data.name.toLowerCase();

        if (DISABLED_COMMANDS.has(commandName)) {
            return true;
        }
    }

    return false;
}

// ============================================================
// SUBCOMMAND INFO
// ============================================================

function getSubcommandInfo(commandData) {
    const subcommands = [];

    if (commandData.options) {
        for (const option of commandData.options) {
            if (option.type === 1) {
                subcommands.push(option.name);
            } else if (option.type === 2) {
                if (option.options) {
                    for (const subOption of option.options) {
                        if (subOption.type === 1) {
                            subcommands.push(
                                `${option.name}/${subOption.name}`
                            );
                        }
                    }
                }
            }
        }
    }

    return subcommands;
}

// ============================================================
// GET ALL COMMAND FILES
// ============================================================

async function getAllFiles(directory, fileList = []) {
    const files = await fs.readdir(directory, {
        withFileTypes: true
    });

    for (const file of files) {
        const filePath = path.join(
            directory,
            file.name
        );

        if (file.isDirectory()) {

            // Completely skip disabled command folders
            if (
                file.name === 'Leveling' ||
                file.name === 'Economy'
            ) {
                logger.info(
                    `🚫 Skipping disabled command folder: ${file.name}`
                );

                continue;
            }

            // Existing behaviour
            if (file.name === 'modules') {
                continue;
            }

            await getAllFiles(
                filePath,
                fileList
            );

        } else if (
            file.name.endsWith('.js')
        ) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

// ============================================================
// LOAD COMMANDS
// ============================================================

export async function loadCommands(client) {

    client.commands = new Collection();

    const commandsPath = path.join(
        __dirname,
        '../../commands'
    );

    const commandFiles =
        await getAllFiles(commandsPath);

    logger.info(
        `Found ${commandFiles.length} command files to load`
    );

    const uniqueCommandNames = new Set();

    let disabledCount = 0;

    for (const filePath of commandFiles) {

        try {

            const normalizedPath =
                filePath.replace(/\\/g, '/');

            const commandName =
                path.basename(
                    filePath,
                    '.js'
                );

            const commandDir =
                path.dirname(filePath);

            const category =
                path.basename(commandDir);

            // ------------------------------------------------
            // IMPORT COMMAND
            // ------------------------------------------------

            const commandModule =
                await import(
                    pathToFileURL(filePath).href
                );

            const command =
                commandModule.default ||
                commandModule;

            // ------------------------------------------------
            // VALIDATE COMMAND
            // ------------------------------------------------

            if (
                !command.data ||
                !command.execute
            ) {
                logger.warn(
                    `Command at ${filePath} is missing required "data" or "execute" property.`
                );

                continue;
            }

            // ------------------------------------------------
            // CHECK DISABLED COMMANDS
            // ------------------------------------------------

            if (
                isCommandDisabled(
                    command,
                    filePath
                )
            ) {

                disabledCount++;

                logger.info(
                    `🚫 Disabled command: /${command.data.name}${
                        category
                            ? ` [${category}]`
                            : ''
                    }`
                );

                continue;
            }

            command.category =
                category;

            command.filePath =
                normalizedPath;

            const primaryCommandName =
                command.data.name;

            // ------------------------------------------------
            // DUPLICATE CHECK
            // ------------------------------------------------

            if (
                !uniqueCommandNames.has(
                    primaryCommandName
                )
            ) {

                uniqueCommandNames.add(
                    primaryCommandName
                );

                client.commands.set(
                    primaryCommandName,
                    command
                );
            }

            // ------------------------------------------------
            // SUBCOMMAND LOGGING
            // ------------------------------------------------

            const subcommands =
                getSubcommandInfo(
                    command.data.toJSON()
                );

            logger.info(
                `Loaded command: /${primaryCommandName} from ${normalizedPath} (category: ${category})`
            );

            if (
                subcommands.length > 0
            ) {

                logger.info(
                    `  - Subcommands: ${subcommands.join(
                        ', '
                    )}`
                );
            }

        } catch (error) {

            logger.error(
                `Error loading command from ${filePath}:`,
                error
            );
        }
    }

    // ========================================================
    // COMMAND STATISTICS
    // ========================================================

    const commandsWithSubcommands =
        Array.from(
            client.commands.values()
        ).filter(cmd => {

            const subcommands =
                getSubcommandInfo(
                    cmd.data.toJSON()
                );

            return (
                subcommands.length > 0
            );
        });

    const totalSubcommands =
        commandsWithSubcommands.reduce(
            (total, cmd) => {

                return (
                    total +
                    getSubcommandInfo(
                        cmd.data.toJSON()
                    ).length
                );

            },
            0
        );

    const uniqueCommands =
        new Set();

    for (
        const [
            name,
            command
        ]
        of client.commands.entries()
    ) {

        if (
            command.data &&
            command.data.name
        ) {

            uniqueCommands.add(
                command.data.name
            );
        }
    }

    logger.info(
        `Loaded ${uniqueCommands.size} commands`
    );

    logger.info(
        `Disabled commands removed: ${disabledCount}`
    );

    logger.info(
        `Remaining commands: ${client.commands.size}`
    );

    return client.commands;
}

// ============================================================
// COLLECT COMMAND PAYLOADS
// ============================================================

function collectCommandPayloads(client) {

    const commands = [];

    let totalSubcommands = 0;

    const registeredNames =
        new Set();

    for (
        const command
        of client.commands.values()
    ) {

        if (
            !command.data ||
            typeof command.data.toJSON !==
                'function'
        ) {

            logger.warn(
                `Command missing data or toJSON method: ${command}`
            );

            continue;
        }

        const commandName =
            command.data.name;

        logger.debug(
            `Processing command for registration: ${commandName}`
        );

        if (
            registeredNames.has(
                commandName
            )
        ) {

            logger.debug(
                `Skipping duplicate command: ${commandName}`
            );

            continue;
        }

        registeredNames.add(
            commandName
        );

        const commandJson =
            command.data.toJSON();

        commands.push(
            commandJson
        );

        totalSubcommands +=
            getSubcommandInfo(
                commandJson
            ).length;

        if (
            process.env.NODE_ENV !==
            'production'
        ) {

            logger.debug(
                `Registering command: ${commandName}`
            );
        }
    }

    return {
        commands,
        totalSubcommands
    };
}

// ============================================================
// VALIDATE COMMANDS
// ============================================================

function validateCommands(commands) {

    const validationErrors = [];

    for (const cmd of commands) {

        if (
            cmd.name &&
            cmd.name.length > 32
        ) {

            validationErrors.push(
                `Command ${cmd.name} has name longer than 32 chars`
            );
        }

        if (
            cmd.description &&
            cmd.description.length > 110
        ) {

            validationErrors.push(
                `Command ${cmd.name} has description longer than 110 chars`
            );
        }

        if (!cmd.options) {
            continue;
        }

        for (
            const option
            of cmd.options
        ) {

            if (
                option.name &&
                option.name.length > 32
            ) {

                validationErrors.push(
                    `Command ${cmd.name} option ${option.name} has name longer than 32 chars`
                );
            }

            if (
                option.description &&
                option.description.length > 110
            ) {

                validationErrors.push(
                    `Command ${cmd.name} option ${option.name} has description longer than 110 chars`
                );
            }

            if (
                option.choices
            ) {

                for (
                    const choice
                    of option.choices
                ) {

                    if (
                        choice.name &&
                        choice.name.length >
                            110
                    ) {

                        validationErrors.push(
                            `Command ${cmd.name} option ${option.name} choice ${choice.name} has invalid name`
                        );
                    }

                    if (
                        choice.value &&
                        typeof choice.value ===
                            'string' &&
                        choice.value.length >
                            100
                    ) {

                        validationErrors.push(
                            `Command ${cmd.name} option ${option.name} choice ${choice.name} has invalid value`
                        );
                    }
                }
            }

            if (
                !option.options
            ) {
                continue;
            }

            for (
                const subOption
                of option.options
            ) {

                if (
                    subOption.name &&
                    subOption.name.length >
                        32
                ) {

                    validationErrors.push(
                        `Command ${cmd.name} subcommand ${option.name} option ${subOption.name} has invalid name`
                    );
                }

                if (
                    subOption.description &&
                    subOption.description.length >
                        110
                ) {

                    validationErrors.push(
                        `Command ${cmd.name} subcommand ${option.name} option ${subOption.name} has invalid description`
                    );
                }

                if (
                    !subOption.choices
                ) {
                    continue;
                }

                for (
                    const choice
                    of subOption.choices
                ) {

                    if (
                        choice.name &&
                        choice.name.length >
                            110
                    ) {

                        validationErrors.push(
                            `Command ${cmd.name} subcommand ${option.name} option ${subOption.name} choice ${choice.name} has invalid name`
                        );
                    }

                    if (
                        choice.value &&
                        typeof choice.value ===
                            'string' &&
                        choice.value.length >
                            100
                    ) {

                        validationErrors.push(
                            `Command ${cmd.name} subcommand ${option.name} option ${subOption.name} choice ${choice.name} has invalid value`
                        );
                    }
                }
            }
        }
    }

    if (
        validationErrors.length > 0
    ) {

        logger.error(
            'Command validation failed. Errors:'
        );

        validationErrors.forEach(
            error =>
                logger.error(
                    `  - ${error}`
                )
        );

        throw new Error(
            `Command validation failed with ${validationErrors.length} errors`
        );
    }
}

// ============================================================
// PREPARE COMMANDS
// ============================================================

function prepareCommandsForRegistration(
    commands
) {

    if (
        commands.length >=
        COMMAND_COUNT_WARN_THRESHOLD
    ) {

        logger.warn(
            `Command count (${commands.length}) is near Discord's ${MAX_COMMANDS} global command limit`
        );
    }

    if (
        commands.length <=
        MAX_COMMANDS
    ) {

        return commands;
    }

    logger.warn(
        `Command count (${commands.length}) exceeds Discord limit (${MAX_COMMANDS}), truncating...`
    );

    const truncated =
        commands.slice(
            0,
            MAX_COMMANDS
        );

    logger.info(
        `Truncated to ${truncated.length} commands for registration`
    );

    return truncated;
}

// ============================================================
// REGISTER GLOBAL COMMANDS
// ============================================================

async function registerGlobalCommands(
    client,
    clientId,
    commands,
    totalSubcommands
) {

    if (!clientId) {
        throw new Error(
            'CLIENT_ID is required for slash command registration'
        );
    }

    if (!client.rest) {
        throw new Error(
            'Discord REST client is not available for slash command registration'
        );
    }

    logger.info(
        `Preparing to register ${
            totalSubcommands +
            commands.length
        } commands globally`
    );

    logger.info(
        'Validating commands before registration...'
    );

    validateCommands(
        commands
    );

    logger.info(
        'Command validation passed'
    );

    const commandsToRegister =
        prepareCommandsForRegistration(
            commands
        );

    // --------------------------------------------------------
    // CLEAR OLD COMMANDS
    // --------------------------------------------------------

    if (
        botConfig.commands?.deleteCommands
    ) {

        logger.info(
            'Clearing existing global commands before registration...'
        );

        await client.rest.put(
            `/applications/${clientId}/commands`,
            {
                body: []
            }
        );
    }

    // --------------------------------------------------------
    // REGISTER NEW COMMANDS
    // --------------------------------------------------------

    logger.info(
        `Registering ${commandsToRegister.length} global commands...`
    );

    await client.rest.put(
        `/applications/${clientId}/commands`,
        {
            body: commandsToRegister
        }
    );

    logger.info(
        `Successfully registered ${commandsToRegister.length} global commands`
    );

    logger.info(
        'Global commands may take up to an hour to appear in all servers on first deploy'
    );
}

// ============================================================
// REGISTER COMMANDS
// ============================================================

export async function registerCommands(
    client,
    options = {}
) {

    const {
        clientId = null
    } = options;

    try {

        const {
            commands,
            totalSubcommands
        } =
            collectCommandPayloads(
                client
            );

        await registerGlobalCommands(
            client,
            clientId,
            commands,
            totalSubcommands
        );

    } catch (error) {

        logger.error(
            'Error registering commands:',
            error
        );

        throw error;
    }
}

// ============================================================
// RELOAD COMMAND
// ============================================================

export async function reloadCommand(
    client,
    commandName
) {

    const command =
        client.commands.get(
            commandName
        );

    if (!command) {

        return {
            success: false,
            message:
                `Command "${commandName}" not found`
        };
    }

    try {

        const commandPath =
            path.resolve(
                command.filePath
            );

        const moduleUrl =
            pathToFileURL(
                commandPath
            );

        moduleUrl.searchParams.set(
            't',
            Date.now().toString()
        );

        const newCommand =
            (
                await import(
                    moduleUrl.href
                )
            ).default;

        // Don't allow reload of disabled command
        if (
            isCommandDisabled(
                newCommand,
                commandPath
            )
        ) {

            client.commands.delete(
                commandName
            );

            return {
                success: false,
                message:
                    `Command "${commandName}" is disabled`
            };
        }

        client.commands.set(
            commandName,
            newCommand
        );

        logger.info(
            `Reloaded command: ${commandName}`
        );

        return {
            success: true,
            message:
                `Successfully reloaded command "${commandName}"`
        };

    } catch (error) {

        logger.error(
            `Error reloading command "${commandName}":`,
            error
        );

        return {
            success: false,
            message:
                `Error reloading command: ${error.message}`
        };
    }
}
