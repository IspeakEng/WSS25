import {
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// ============================================================
// UNO CONFIG
// ============================================================

const games = new Map();
const unoChannels = new Map();

const MAX_PLAYERS = 10;

const COLORS = ['red', 'yellow', 'green', 'blue'];

const COLOR_EMOJI = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  wild: '🎨',
};

const COLOR_NAMES = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

const CARD_NAMES = {
  skip: 'Skip',
  reverse: 'Reverse',
  draw2: '+2',
  wild: 'Wild',
  wild4: '+4',
};

// ============================================================
// DECK
// ============================================================

function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    // One 0
    deck.push({
      color,
      value: '0',
    });

    // Two of 1-9
    for (let number = 1; number <= 9; number++) {
      deck.push({
        color,
        value: String(number),
      });

      deck.push({
        color,
        value: String(number),
      });
    }

    // Two Skip / Reverse / +2
    for (let i = 0; i < 2; i++) {
      deck.push({
        color,
        value: 'skip',
      });

      deck.push({
        color,
        value: 'reverse',
      });

      deck.push({
        color,
        value: 'draw2',
      });
    }
  }

  // Four Wild + Four Wild +4
  for (let i = 0; i < 4; i++) {
    deck.push({
      color: 'wild',
      value: 'wild',
    });

    deck.push({
      color: 'wild',
      value: 'wild4',
    });
  }

  return shuffle(deck);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

// ============================================================
// CARD HELPERS
// ============================================================

function cardText(card) {
  if (!card) {
    return 'None';
  }

  if (card.color === 'wild') {
    return `${COLOR_EMOJI.wild} ${CARD_NAMES[card.value]}`;
  }

  return `${COLOR_EMOJI[card.color]} ${
    CARD_NAMES[card.value] || card.value
  }`;
}

function cardLabel(card) {
  if (card.color === 'wild') {
    return CARD_NAMES[card.value];
  }

  return `${COLOR_NAMES[card.color]} ${CARD_NAMES[card.value] || card.value}`;
}

function canPlay(card, topCard, currentColor) {
  if (!card || !topCard) {
    return false;
  }

  // Wild cards can always be played
  if (card.color === 'wild') {
    return true;
  }

  // Same color
  if (card.color === currentColor) {
    return true;
  }

  // Same value
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

// ============================================================
// GAME
// ============================================================

function createGame(channelId, hostId) {
  const game = {
    channelId,
    hostId,

    players: [],
    hands: new Map(),

    deck: [],
    discard: [],

    currentColor: null,
    turnIndex: 0,

    direction: 1,

    started: false,
    solo: false,

    message: null,
    collector: null,

    unoCalled: new Set(),
  };

  games.set(channelId, game);

  return game;
}

function currentPlayer(game) {
  return game.players[game.turnIndex];
}

function nextTurn(game, amount = 1) {
  const total = game.players.length;

  game.turnIndex =
    (game.turnIndex + amount * game.direction + total) %
    total;
}

function drawCards(game, amount) {
  const cards = [];

  for (let i = 0; i < amount; i++) {
    if (game.deck.length === 0) {
      reshuffleDiscard(game);
    }

    if (game.deck.length === 0) {
      break;
    }

    cards.push(game.deck.pop());
  }

  return cards;
}

function reshuffleDiscard(game) {
  if (game.discard.length <= 1) {
    return;
  }

  const topCard = game.discard.pop();

  game.deck = shuffle(game.discard);

  game.discard = [topCard];
}

function dealCards(game) {
  for (const playerId of game.players) {
    game.hands.set(
      playerId,
      drawCards(game, 7)
    );
  }

  let firstCard;

  while (game.deck.length > 0) {
    firstCard = game.deck.pop();

    // Don't start with +4
    if (firstCard.value !== 'wild4') {
      break;
    }

    game.deck.unshift(firstCard);
  }

  game.discard.push(firstCard);

  if (firstCard.color === 'wild') {
    game.currentColor =
      COLORS[Math.floor(Math.random() * COLORS.length)];
  } else {
    game.currentColor = firstCard.color;
  }
}

// ============================================================
// GAME EMBED
// ============================================================

function buildGameEmbed(game) {
  const topCard = game.discard.at(-1);

  let turnText = 'Waiting...';

  if (game.started) {
    const player = currentPlayer(game);

    if (player === 'BOT') {
      turnText = '🤖 Bot';
    } else {
      turnText = `<@${player}>`;
    }
  }

  const playerList =
    game.players.length > 0
      ? game.players
          .map((player) => {
            if (player === 'BOT') {
              return '🤖 Bot';
            }

            return `<@${player}>`;
          })
          .join('\n')
      : 'Nobody has joined yet.';

  const embed = new EmbedBuilder()
    .setTitle('🃏 UNO')
    .setDescription(
      game.started
        ? [
            `**Top Card:** ${cardText(topCard)}`,
            `**Current Color:** ${
              COLOR_EMOJI[game.currentColor]
            } ${COLOR_NAMES[game.currentColor]}`,
            `**Turn:** ${turnText}`,
          ].join('\n')
        : [
            'Join the game and wait for everyone.',
            '',
            '**1 player:** You vs Bot',
            '**2–10 players:** Humans only',
          ].join('\n')
    )
    .addFields({
      name: `Players (${game.players.length}/${MAX_PLAYERS})`,
      value: playerList,
    });

  if (game.started) {
    const counts = game.players
      .map((player) => {
        const hand = game.hands.get(player) || [];

        if (player === 'BOT') {
          return `🤖 Bot — **${hand.length}** cards`;
        }

        return `<@${player}> — **${hand.length}** cards`;
      })
      .join('\n');

    embed.addFields({
      name: 'Cards Remaining',
      value: counts || 'None',
    });
  }

  return embed;
}

// ============================================================
// LOBBY BUTTONS
// ============================================================

function lobbyButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('uno_join')
      .setLabel('Join Game')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('uno_start')
      .setLabel('Start Game')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('uno_cancel')
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

// ============================================================
// GAME BUTTONS
// ============================================================

function gameButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('uno_cards')
        .setLabel('My Cards')
        .setEmoji('🃏')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('uno_draw')
        .setLabel('Draw Card')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('uno_call')
        .setLabel('UNO!')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

// ============================================================
// CARD SELECT MENU
// ============================================================

function cardSelectMenu(game, playerId) {
  const hand = game.hands.get(playerId) || [];
  const topCard = game.discard.at(-1);

  const playable = hand
    .map((card, index) => ({
      card,
      index,
    }))
    .filter(({ card }) =>
      canPlay(
        card,
        topCard,
        game.currentColor
      )
    );

  if (playable.length === 0) {
    return null;
  }

  const options = playable
    .slice(0, 25)
    .map(({ card, index }) => ({
      label: cardLabel(card).slice(0, 100),
      value: String(index),
      emoji:
        COLOR_EMOJI[card.color] || '🃏',
    }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('uno_play')
      .setPlaceholder('Choose a card to play...')
      .addOptions(options)
  );
}

// ============================================================
// COLOR SELECT MENU
// ============================================================

function colorSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('uno_color')
      .setPlaceholder('Choose a color...')
      .addOptions(
        COLORS.map((color) => ({
          label: COLOR_NAMES[color],
          value: color,
          emoji: COLOR_EMOJI[color],
        }))
      )
  );
}

// ============================================================
// UPDATE MESSAGE
// ============================================================

async function updateGameMessage(game) {
  if (!game.message) {
    return;
  }

  try {
    await game.message.edit({
      embeds: [buildGameEmbed(game)],
      components: game.started
        ? gameButtons()
        : [lobbyButtons()],
    });
  } catch (error) {
    console.error(
      'UNO message update error:',
      error
    );
  }
}

// ============================================================
// END GAME
// ============================================================

async function endGame(game, message) {
  game.started = false;

  if (game.collector) {
    game.collector.stop();
  }

  games.delete(game.channelId);

  if (!game.message) {
    return;
  }

  try {
    await game.message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle('🃏 UNO — Game Over')
          .setDescription(message),
      ],
      components: [],
    });
  } catch {}
}

// ============================================================
// START GAME
// ============================================================

async function startGame(game) {
  if (game.started) {
    return;
  }

  /*
   * 1 human = human vs bot
   */
  if (game.players.length === 1) {
    game.players.push('BOT');
    game.solo = true;
  }

  /*
   * 2–10 humans = no bot
   */
  if (game.players.length < 2) {
    throw new Error(
      'NOT_ENOUGH_PLAYERS'
    );
  }

  if (game.players.length > MAX_PLAYERS) {
    throw new Error(
      'TOO_MANY_PLAYERS'
    );
  }

  game.started = true;

  game.deck = createDeck();

  dealCards(game);

  /*
   * First player is random
   */
  game.turnIndex =
    Math.floor(
      Math.random() * game.players.length
    );

  /*
   * Start direction
   */
  game.direction = 1;
}

// ============================================================
// PLAYER CARD
// ============================================================

function removeCard(
  game,
  playerId,
  index
) {
  const hand = game.hands.get(playerId);

  if (!hand || !hand[index]) {
    return null;
  }

  return hand.splice(index, 1)[0];
}

// ============================================================
// PLAY CARD
// ============================================================

async function playCard(
  game,
  playerId,
  cardIndex,
  interaction
) {
  if (!game.started) {
    await interaction.reply({
      content:
        '❌ The game has not started.',
      ephemeral: true,
    });

    return;
  }

  if (currentPlayer(game) !== playerId) {
    await interaction.reply({
      content:
        '❌ It is not your turn.',
      ephemeral: true,
    });

    return;
  }

  const hand =
    game.hands.get(playerId);

  const card = hand?.[cardIndex];

  if (!card) {
    await interaction.reply({
      content:
        '❌ That card does not exist.',
      ephemeral: true,
    });

    return;
  }

  const topCard =
    game.discard.at(-1);

  if (
    !canPlay(
      card,
      topCard,
      game.currentColor
    )
  ) {
    await interaction.reply({
      content:
        '❌ You cannot play that card.',
      ephemeral: true,
    });

    return;
  }

  /*
   * Wild cards need color selection
   */
  if (card.color === 'wild') {
    await interaction.reply({
      content: `You played **${cardText(card)}**.\nChoose the new color:`,
      components: [colorSelectMenu()],
      ephemeral: true,
    });

    return;
  }

  removeCard(
    game,
    playerId,
    cardIndex
  );

  game.discard.push(card);

  game.currentColor = card.color;

  await finishTurnAfterCard(
    game,
    playerId,
    card,
    interaction
  );
}

// ============================================================
// FINISH NORMAL CARD
// ============================================================

async function finishTurnAfterCard(
  game,
  playerId,
  card,
  interaction
) {
  const hand =
    game.hands.get(playerId);

  /*
   * Winner
   */
  if (hand.length === 0) {
    const winner =
      playerId === 'BOT'
        ? '🤖 **Bot wins!**'
        : `🏆 **<@${playerId}> wins!**`;

    await endGame(
      game,
      winner
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🃏 UNO — Game Over'
            )
            .setDescription(winner),
        ],
        components: [],
      });
    }

    return;
  }

  /*
   * Effects
   */
  let skip = false;
  let drawAmount = 0;

  if (card.value === 'skip') {
    skip = true;
  }

  if (card.value === 'reverse') {
    /*
     * In a 2-player game,
     * Reverse acts like Skip.
     */
    if (game.players.length === 2) {
      skip = true;
    } else {
      game.direction *= -1;
    }
  }

  if (card.value === 'draw2') {
    drawAmount = 2;
    skip = true;
  }

  if (card.value === 'wild4') {
    drawAmount = 4;
    skip = true;
  }

  /*
   * Next player
   */
  nextTurn(game);

  if (skip) {
    nextTurn(game);
  }

  const nextPlayer =
    currentPlayer(game);

  /*
   * Draw penalty
   */
  if (
    drawAmount > 0 &&
    nextPlayer !== 'BOT'
  ) {
    const cards = drawCards(
      game,
      drawAmount
    );

    game.hands
      .get(nextPlayer)
      .push(...cards);
  }

  await updateGameMessage(game);

  /*
   * Bot turn
   */
  if (nextPlayer === 'BOT') {
    setTimeout(
      () => botTurn(game),
      1200
    );
  }

  /*
   * Update interaction
   */
  if (
    !interaction.replied &&
    !interaction.deferred
  ) {
    try {
      await interaction.update({
        embeds: [
          buildGameEmbed(game),
        ],
        components:
          gameButtons(),
      });
    } catch {}
  }
}

// ============================================================
// WILD COLOR
// ============================================================

async function playWildAfterColor(
  game,
  playerId,
  cardIndex,
  color,
  interaction
) {
  if (!game.started) {
    await interaction.update({
      content:
        '❌ The game has already ended.',
      components: [],
    });

    return;
  }

  if (currentPlayer(game) !== playerId) {
    await interaction.update({
      content:
        '❌ It is not your turn.',
      components: [],
    });

    return;
  }

  const hand =
    game.hands.get(playerId);

  const card =
    hand?.[cardIndex];

  if (
    !card ||
    card.color !== 'wild'
  ) {
    await interaction.update({
      content:
        '❌ That card is no longer available.',
      components: [],
    });

    return;
  }

  removeCard(
    game,
    playerId,
    cardIndex
  );

  game.discard.push(card);

  game.currentColor = color;

  await interaction.update({
    content: `🌈 Color changed to **${COLOR_NAMES[color]}**.`,
    components: [],
  });

  /*
   * Continue turn logic
   */
  const fakeInteraction = {
    replied: true,
    deferred: false,
    update: async (data) => {
      try {
        await game.message.edit(data);
      } catch {}
    },
  };

  await finishTurnAfterCard(
    game,
    playerId,
    card,
    fakeInteraction
  );
}

// ============================================================
// BOT TURN
// ============================================================

async function botTurn(game) {
  if (!game.started) {
    return;
  }

  if (currentPlayer(game) !== 'BOT') {
    return;
  }

  const hand =
    game.hands.get('BOT') || [];

  const topCard =
    game.discard.at(-1);

  const playable = hand
    .map((card, index) => ({
      card,
      index,
    }))
    .filter(({ card }) =>
      canPlay(
        card,
        topCard,
        game.currentColor
      )
    );

  /*
   * No playable card
   */
  if (playable.length === 0) {
    const drawn =
      drawCards(game, 1);

    if (drawn.length > 0) {
      const drawnCard =
        drawn[0];

      hand.push(drawnCard);

      if (
        canPlay(
          drawnCard,
          topCard,
          game.currentColor
        )
      ) {
        await botPlay(
          game,
          hand.length - 1
        );

        return;
      }
    }

    nextTurn(game);

    await updateGameMessage(game);

    if (
      currentPlayer(game) === 'BOT'
    ) {
      setTimeout(
        () => botTurn(game),
        1200
      );
    }

    return;
  }

  /*
   * Prefer normal cards
   */
  const normalCards =
    playable.filter(
      ({ card }) =>
        card.color !== 'wild'
    );

  const choice =
    normalCards.length > 0
      ? normalCards[
          Math.floor(
            Math.random() *
              normalCards.length
          )
        ]
      : playable[
          Math.floor(
            Math.random() *
              playable.length
          )
        ];

  await botPlay(
    game,
    choice.index
  );
}

// ============================================================
// BOT PLAY
// ============================================================

async function botPlay(
  game,
  cardIndex
) {
  const hand =
    game.hands.get('BOT');

  const card =
    removeCard(
      game,
      'BOT',
      cardIndex
    );

  if (!card) {
    return;
  }

  game.discard.push(card);

  /*
   * Bot chooses best color
   */
  if (card.color === 'wild') {
    const colorCounts = {};

    for (const c of hand) {
      if (c.color !== 'wild') {
        colorCounts[c.color] =
          (colorCounts[c.color] || 0) + 1;
      }
    }

    const bestColor =
      Object.entries(
        colorCounts
      ).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

    game.currentColor =
      bestColor ||
      COLORS[
        Math.floor(
          Math.random() *
            COLORS.length
        )
      ];
  } else {
    game.currentColor =
      card.color;
  }

  /*
   * Bot wins
   */
  if (hand.length === 0) {
    await endGame(
      game,
      '🤖 **Bot wins!**'
    );

    return;
  }

  let skip = false;
  let drawAmount = 0;

  if (card.value === 'skip') {
    skip = true;
  }

  if (card.value === 'reverse') {
    if (game.players.length === 2) {
      skip = true;
    } else {
      game.direction *= -1;
    }
  }

  if (card.value === 'draw2') {
    drawAmount = 2;
    skip = true;
  }

  if (card.value === 'wild4') {
    drawAmount = 4;
    skip = true;
  }

  nextTurn(game);

  if (skip) {
    nextTurn(game);
  }

  const nextPlayer =
    currentPlayer(game);

  if (
    drawAmount > 0 &&
    nextPlayer !== 'BOT'
  ) {
    const cards =
      drawCards(
        game,
        drawAmount
      );

    game.hands
      .get(nextPlayer)
      .push(...cards);
  }

  await updateGameMessage(game);

  if (nextPlayer === 'BOT') {
    setTimeout(
      () => botTurn(game),
      1200
    );
  }
}

// ============================================================
// UNO HELP
// ============================================================

function helpEmbed() {
  return new EmbedBuilder()
    .setTitle('🃏 UNO Help')
    .setDescription(
      [
        '**How to play**',
        '',
        '1️⃣ Use `/uno` to create a game.',
        '2️⃣ Other members click **Join Game**.',
        '3️⃣ The game creator clicks **Start Game**.',
        '4️⃣ Match the top card by color or number.',
        '5️⃣ If you cannot play, use **Draw Card**.',
        '6️⃣ When you have one card left, press **UNO!**.',
        '7️⃣ First player with zero cards wins.',
        '',
        '**Players**',
        '👤 1 player → You vs 🤖 Bot',
        '👥 2–10 players → Humans only',
        '',
        '**Special Cards**',
        '⏭️ **Skip** → Skip the next player.',
        '🔄 **Reverse** → Reverse the turn order.',
        '➕ **+2** → Next player draws 2.',
        '🌈 **Wild** → Choose a color.',
        '💥 **+4** → Choose a color and next player draws 4.',
      ].join('\n')
    )
    .setFooter({
      text: 'Good luck! And don't forget UNO!',
    });
}

// ============================================================
// SLASH COMMAND
// ============================================================

export default {
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play UNO')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription(
          'Set the UNO game channel'
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription(
              'Select the UNO channel'
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('help')
        .setDescription(
          'Show UNO help'
        )
    ),

  async execute(interaction) {
    const subcommand =
      interaction.options.getSubcommand();

    // ========================================================
    // /uno help
    // ========================================================

    if (subcommand === 'help') {
      await interaction.reply({
        embeds: [helpEmbed()],
        ephemeral: true,
      });

      return;
    }

    // ========================================================
    // /uno setup
    // ========================================================

    if (subcommand === 'setup') {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        await interaction.reply({
          content:
            '❌ Only members with **Manage Server** permission can set the UNO channel.',
          ephemeral: true,
        });

        return;
      }

      const channel =
        interaction.options.getChannel(
          'channel'
        );

      unoChannels.set(
        interaction.guildId,
        channel.id
      );

      await interaction.reply({
        content:
          `✅ UNO channel set to ${channel}.\n\nEveryone can now use \`/uno\` in that channel.`,
        ephemeral: true,
      });

      return;
    }

    // ========================================================
    // /uno
    // ========================================================

    const selectedChannel =
      unoChannels.get(
        interaction.guildId
      );

    if (!selectedChannel) {
      await interaction.reply({
        content:
          '❌ UNO has not been configured yet.\n\nAsk a server manager to use:\n`/uno setup channel:#channel`',
        ephemeral: true,
      });

      return;
    }

    if (
      interaction.channelId !==
      selectedChannel
    ) {
      await interaction.reply({
        content:
          `❌ UNO can only be played in <#${selectedChannel}>.`,
        ephemeral: true,
      });

      return;
    }

    if (
      games.has(
        interaction.channelId
      )
    ) {
      await interaction.reply({
        content:
          '❌ There is already an UNO game running in this channel.',
        ephemeral: true,
      });

      return;
    }

    // ========================================================
    // CREATE GAME
    // ========================================================

    const game = createGame(
      interaction.channelId,
      interaction.user.id
    );

    game.players.push(
      interaction.user.id
    );

    const message =
      await interaction.reply({
        embeds: [
          buildGameEmbed(game),
        ],
        components: [
          lobbyButtons(),
        ],
        fetchReply: true,
      });

    game.message = message;

    // ========================================================
    // BUTTON COLLECTOR
    // ========================================================

    const collector =
      message.createMessageComponentCollector({
        time: 30 * 60 * 1000,
      });

    game.collector = collector;

    collector.on(
      'collect',
      async (component) => {
        try {
          // ==================================================
          // JOIN
          // ==================================================

          if (
            component.customId ===
            'uno_join'
          ) {
            if (game.started) {
              await component.reply({
                content:
                  '❌ The game has already started.',
                ephemeral: true,
              });

              return;
            }

            if (
              game.players.includes(
                component.user.id
              )
            ) {
              await component.reply({
                content:
                  '❌ You already joined this game.',
                ephemeral: true,
              });

              return;
            }

            if (
              game.players.length >=
              MAX_PLAYERS
            ) {
              await component.reply({
                content:
                  '❌ This game is full. Maximum 10 players.',
                ephemeral: true,
              });

              return;
            }

            game.players.push(
              component.user.id
            );

            await component.update({
              embeds: [
                buildGameEmbed(game),
              ],
              components: [
                lobbyButtons(),
              ],
            });

            return;
          }

          // ==================================================
          // START
          // ==================================================

          if (
            component.customId ===
            'uno_start'
          ) {
            if (
              component.user.id !==
              game.hostId
            ) {
              await component.reply({
                content:
                  '❌ Only the person who created the game can start it.',
                ephemeral: true,
              });

              return;
            }

            try {
              await startGame(game);

              await component.update({
                embeds: [
                  buildGameEmbed(game),
                ],
                components:
                  gameButtons(),
              });

              if (
                currentPlayer(game) ===
                'BOT'
              ) {
                setTimeout(
                  () => botTurn(game),
                  1200
                );
              }
            } catch (error) {
              console.error(
                'UNO start error:',
                error
              );

              await component.reply({
                content:
                  '❌ Could not start the game.',
                ephemeral: true,
              });
            }

            return;
          }

          // ==================================================
          // CANCEL
          // ==================================================

          if (
            component.customId ===
            'uno_cancel'
          ) {
            if (
              component.user.id !==
              game.hostId
            ) {
              await component.reply({
                content:
                  '❌ Only the game creator can cancel the game.',
                ephemeral: true,
              });

              return;
            }

            await endGame(
              game,
              '❌ UNO game cancelled.'
            );

            await component.reply({
              content:
                '❌ UNO game cancelled.',
              ephemeral: true,
            });

            return;
          }

          // ==================================================
          // GAME CHECK
          // ==================================================

          if (!game.started) {
            await component.reply({
              content:
                '❌ The game has not started yet.',
              ephemeral: true,
            });

            return;
          }

          // ==================================================
          // MY CARDS
          // ==================================================

          if (
            component.customId ===
            'uno_cards'
          ) {
            if (
              !game.players.includes(
                component.user.id
              )
            ) {
              await component.reply({
                content:
                  '❌ You are not in this game.',
                ephemeral: true,
              });

              return;
            }

            const hand =
              game.hands.get(
                component.user.id
              ) || [];

            const cardList =
              hand.length > 0
                ? hand
                    .map(
                      (card, index) =>
                        `**${index + 1}.** ${cardText(card)}`
                    )
                    .join('\n')
                : 'No cards.';

            const menu =
              cardSelectMenu(
                game,
                component.user.id
              );

            const components =
              menu ? [menu] : [];

            await component.reply({
              content:
                `### 🃏 Your Cards\n${cardList}\n\n${
                  menu
                    ? 'Select a playable card below.'
                    : '❌ You currently have no playable cards.'
                }`,
              components,
              ephemeral: true,
            });

            return;
          }

          // ==================================================
          // PLAY CARD
          // ==================================================

          if (
            component.customId ===
            'uno_play'
          ) {
            const index =
              Number(
                component.values[0]
              );

            await playCard(
              game,
              component.user.id,
              index,
              component
            );

            return;
          }

          // ==================================================
          // COLOR SELECT
          // ==================================================

          if (
            component.customId ===
            'uno_color'
          ) {
            const color =
              component.values[0];

            /*
             * Find the wild card from the
             * user's hand that they selected.
             *
             * We store the pending card
             * temporarily on the interaction.
             */

            const hand =
              game.hands.get(
                component.user.id
              );

            if (!hand) {
              await component.update({
                content:
                  '❌ You are not in this game.',
                components: [],
              });

              return;
            }

            /*
             * Find a playable wild card.
             * Since the color menu only appears
             * immediately after selecting a wild,
             * use the first wild card that is
             * currently playable.
             */
            const topCard =
              game.discard.at(-1);

            const wildIndex =
              hand.findIndex(
                (card) =>
                  card.color === 'wild' &&
                  canPlay(
                    card,
                    topCard,
                    game.currentColor
                  )
              );

            if (wildIndex === -1) {
              await component.update({
                content:
                  '❌ Wild card not found.',
                components: [],
              });

              return;
            }

            await playWildAfterColor(
              game,
              component.user.id,
              wildIndex,
              color,
              component
            );

            return;
          }

          // ==================================================
          // DRAW
          // ==================================================

          if (
            component.customId ===
            'uno_draw'
          ) {
            if (
              currentPlayer(game) !==
              component.user.id
            ) {
              await component.reply({
                content:
                  '❌ It is not your turn.',
                ephemeral: true,
              });

              return;
            }

            const drawn =
              drawCards(game, 1);

            if (drawn.length > 0) {
              game.hands
                .get(
                  component.user.id
                )
                .push(
                  drawn[0]
                );
            }

            /*
             * After drawing,
             * turn goes to next player.
             */
            nextTurn(game);

            await component.update({
              embeds: [
                buildGameEmbed(game),
              ],
              components:
                gameButtons(),
            });

            if (
              currentPlayer(game) ===
              'BOT'
            ) {
              setTimeout(
                () => botTurn(game),
                1200
              );
            }

            return;
          }

          // ==================================================
          // UNO
          // ==================================================

          if (
            component.customId ===
            'uno_call'
          ) {
            const hand =
              game.hands.get(
                component.user.id
              );

            if (!hand) {
              await component.reply({
                content:
                  '❌ You are not in this game.',
                ephemeral: true,
              });

              return;
            }

            if (hand.length !== 1) {
              await component.reply({
                content:
                  '❌ You can only call UNO when you have exactly 1 card.',
                ephemeral: true,
              });

              return;
            }

            game.unoCalled.add(
              component.user.id
            );

            await component.reply({
              content:
                `📢 **UNO!** <@${component.user.id}> has 1 card left!`,
            });

            return;
          }
        } catch (error) {
          console.error(
            'UNO interaction error:',
            error
          );

          if (
            !component.replied &&
            !component.deferred
          ) {
            await component.reply({
              content:
                '❌ Something went wrong while processing that action.',
              ephemeral: true,
            });
          }
        }
      }
    );

    // ========================================================
    // COLLECTOR END
    // ========================================================

    collector.on(
      'end',
      async () => {
        if (
          games.has(
            game.channelId
          )
        ) {
          games.delete(
            game.channelId
          );
        }

        try {
          await message.edit({
            components: [],
          });
        } catch {}
      }
    );
  },
};
