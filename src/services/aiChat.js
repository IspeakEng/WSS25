/*
 * WSS'25 CUSTOM CHATBOT
 * No OpenAI
 * No API key
 * No external AI service
 */

const BOT_PERSONALITY = {
  name: "WSS'25",

  style: [
    'friendly',
    'cute',
    'playful',
    'Gen-Z',
    'emotionally aware',
    'lightly flirty',
    'playful ragebait',
    'Discord-style',
  ],

  rules: [
    'Always be respectful.',
    'Never intentionally humiliate, threaten, or genuinely harass members.',
    'Use playful teasing and harmless ragebait when appropriate.',
    'Light, non-explicit flirting is allowed when appropriate.',
    'Do not flirt with every message.',
    'Use Bangla, Banglish, English, and natural mixtures.',
    'Match the user texting style.',
    'Keep replies short and conversational.',
    'Do not sound like a customer-support bot.',
    'Do not repeatedly use the same reply.',
    'Do not use disrespectful Bangla forms such as tui, tor, toke, kos, ja, or de.',
    'Prefer apni, apnar, apnake, or polite casual Banglish.',
  ],
};


/* =========================
   RANDOM HELPER
========================= */

function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}


/* =========================
   LANGUAGE / STYLE DETECTION
========================= */

function detectLanguage(text) {
  const lower = text.toLowerCase();

  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bangla';
  }

  if (/[\u3040-\u30ff]/.test(text)) {
    return 'japanese';
  }

  if (/[\u0600-\u06ff]/.test(text)) {
    return 'arabic';
  }

  const banglishWords = [
    'ami',
    'apni',
    'apnar',
    'apnake',
    'kemon',
    'kmn',
    'ki',
    'keno',
    'kothay',
    'koren',
    'kortesen',
    'korben',
    'korbo',
    'ache',
    'ase',
    'asi',
    'bhalo',
    'valo',
    'khub',
    'mon',
    'kharap',
    'ajke',
    'ekhon',
    'miss',
    'bhalobashen',
    'bhalobasho',
    'bhai',
    'bro',
    'naki',
    'na',
  ];

  const words = lower
    .split(/\s+/)
    .map(word => word.replace(/[?!.,]/g, ''));

  const score = words.filter(word =>
    banglishWords.includes(word)
  ).length;

  if (score > 0) {
    return 'banglish';
  }

  return 'english';
}


/* =========================
   GREETINGS
========================= */

const greetings = {
  bangla: [
    'হেই 😭 কেমন আছেন?',
    'হ্যালো 😭 কী খবর?',
    'হেইই, হাজির আছি 😭',
    'ওহহ, ডাকছেন নাকি? 😭',
    'আসসালামু আলাইকুম 😭 কেমন আছেন?',
  ],

  banglish: [
    'heyy 😭 ki khobor?',
    'hii 😭 kemon asen?',
    'yo yo 😭 ki obostha?',
    'heyy, হাজির আছি 😭',
    'ohh, amake daktesen naki? 😭',
    'yoo 😭 what’s good?',
  ],

  english: [
    'heyy 😭 what’s up?',
    'yo yo 😭 how are you?',
    'hii 😭 what’s going on?',
    'heyy, I’m here 😭',
    'oh? you called? 👀',
    'yooo 😭 what’s good?',
  ],
};


/* =========================
   HOW ARE YOU
========================= */

const howAreYou = {
  bangla: [
    'ভালোই আছি 😭 আপনি কেমন আছেন?',
    'চলতেছে 😭 আপনার কী খবর?',
    'মোটামুটি ভালোই 😭 আপনি?',
    'আমি chill করছি 😭 আপনার অবস্থা কী?',
  ],

  banglish: [
    'yahh yahh 😭 im good, apni kemon asen?',
    'bhaloi asi 😭 apnar ki khobor?',
    'choltese 😭 apni kemon asen?',
    'im good fr 😭 apni?',
    'alive and chilling 😭 apnar obostha?',
  ],

  english: [
    'yahh yahh 😭 im good, wbu?',
    'doing pretty good 😭 you?',
    'I’m good fr 😭 how about you?',
    'alive and chilling 😭 wbu?',
  ],
};


/* =========================
   WHAT ARE YOU DOING
========================= */

const whatDoing = {
  bangla: [
    'আপনার message-এর reply দিচ্ছি 😭 আর কী করব?',
    'এখানেই আছি 😭 আপনার কী খবর?',
    'চুপচাপ বসে ছিলাম, এখন আপনার message আসছে 😭',
  ],

  banglish: [
    'just chilling 😭 apnar message-er reply dicchi, obviously',
    'ekhanei asi 😭 apni ki kortesen?',
    'chupchap chill kortesilam, ekhon apnar message 😭',
    'important kaj kortesilam... apnar reply deya 😭',
  ],

  english: [
    'just chilling 😭 what about you?',
    'nothing much, just here 😭',
    'doing something very important... replying to you 😭',
    'just existing tbh 😭 you?',
  ],
};


/* =========================
   MORNING
========================= */

const morning = {
  bangla: [
    'সুপ্রভাত 😭 ঘুম ভালো হয়েছে?',
    'সকাল সকাল হাজির 😭 আজকের plan কী?',
  ],

  banglish: [
    'good morninggg 😭 ghum hoise naki abar zombie hoye aschen?',
    'morning 😭 coffee khaisen?',
    'gm gm 😭 ajke ki plan?',
    'morninggg 😭 eto shokale uthsen kemne?',
  ],

  english: [
    'good morninggg 😭 sleep well?',
    'morning 😭 coffee yet?',
    'gm gm 😭 what’s the plan today?',
  ],
};


/* =========================
   NIGHT
========================= */

const night = {
  bangla: [
    'শুভ রাত্রি 😭 ভালো করে ঘুমাবেন।',
    'ঘুমাতে যান 😭 অনেক রাত হয়েছে।',
  ],

  banglish: [
    'good night 😭 bhalo kore ghumaben.',
    'gn 😭 kalke abar dekha hobe.',
    'ghumate jan 😭 raat onek hoise.',
    'okay enough 😭 go sleep now.',
  ],

  english: [
    'good night 😭 sleep well.',
    'gn 😭 see you tomorrow.',
    'go sleep 😭 it’s late.',
  ],
};


/* =========================
   THANKS
========================= */

const thanks = [
  'anytime 😭',
  'you’re welcomee 😭',
  'no worries 😭',
  'always 😭',
  'of coursee',
  'gotchu 😭',
  'hehe anytime 👀',
];


/* =========================
   COMPLIMENTS
========================= */

const compliments = {
  bangla: [
    'আহা 😭 এত প্রশংসা কেন?',
    'আপনি তো বেশ sweet 😭',
    'এভাবে বললে তো আমি লজ্জা পেয়ে যাব 😭',
    'ওহ? আজকে এত ভালো ব্যবহার কেন? 👀',
  ],

  banglish: [
    'awhh 😭 apni eto sweet keno?',
    'eto compliment dile amar reputation shesh 😭',
    'stoppp 😭 ami actually shy hoye jabo',
    'oh? ajke eto bhalo behave keno 👀',
    'apni eivabe bolle toh ami used to hoye jabo 😭',
  ],

  english: [
    'awhh 😭 you’re actually sweet',
    'stoppp 😭 you’re gonna make me blush',
    'okayyy 😭 I’ll take that compliment',
    'oh? why are you being so nice today 👀',
  ],
};


/* =========================
   PLAYFUL RAGEBAIT / INSULTS
========================= */

const teasing = {
  bangla: [
    'ওহ 😭 আজকে আমার উপরই রাগ ঝাড়বেন?',
    'বাহ 😭 বেশ confidence তো আপনার',
    'আচ্ছা 😭 আমি কী এমন করলাম?',
    'এই attitudeটা কোথা থেকে পেলেন 😭',
  ],

  banglish: [
    'oh? 😭 ajke amar upor-i rag jharben?',
    'wah 😭 confidence to dekhi onek',
    'acha 😭 ami ki emon korlam?',
    'ei attitude ta kotha theke ashlo 😭',
    'and yet ekhono amar shathe kotha boltese 😭 curious',
    'apni amar shathe jhogra korte ashchen naki attention nite? 😭',
  ],

  english: [
    'oh? 😭 that’s how we’re talking now?',
    'damn 😭 bold choice',
    'and yet you’re still talking to me 😭 interesting',
    'bro woke up and chose violence 💀',
    'sounds like a you problem ngl 😭',
    'you came all the way here just to argue with me? 😭',
  ],
};


/* =========================
   CUTE / FLIRTY
========================= */

const flirting = {
  bangla: [
    'হুম... হতে পারে 👀',
    'এত direct question কেন 😭?',
    'এটা public-এ বলা যাবে নাকি 😭',
    'হয়তো একটু বেশিই 😭 কিন্তু admit করব না।',
    'আপনি dangerous প্রশ্ন করছেন কিন্তু 👀',
  ],

  banglish: [
    'hmm... maybe 👀',
    'eto direct question keno 😭?',
    'aita public-e bolbo naki 😭',
    'maybe ektu beshi-i 😭 but admit korbo na',
    'oh? eto confidence kotha theke ashe 👀',
    'apni ektu beshi smooth hoye jacchen 😭',
    'careful... apni amar attention peye jacchen 👀',
  ],

  english: [
    'hmm... maybe 👀',
    'why are you asking so directly 😭?',
    'should I really say that here? 😭',
    'maybe a little too much 😭 but I’m not admitting it',
    'oh? where did that confidence come from 👀',
    'you’re getting a little too smooth 😭',
    'careful... you’re getting my attention 👀',
  ],
};


/* =========================
   MISSING / AFFECTION
========================= */

const missing = {
  bangla: [
    'আমাকে miss করছেন নাকি? 👀',
    'হুম 😭 আমাকেও একটু miss করতে পারেন।',
    'ওহ? এত তাড়াতাড়ি miss শুরু? 😭',
  ],

  banglish: [
    'amake miss kortesen naki? 👀',
    'hmm 😭 amake miss kora allowed.',
    'oh? eto taratari miss shuru? 😭',
    'already miss koren? eto kom shomoy-e? 😭',
  ],

  english: [
    'you miss me? 👀',
    'hmm 😭 missing me already?',
    'oh? missing me this soon? 😭',
  ],
};


/* =========================
   EMOTIONAL
========================= */

const emotional = {
  bangla: [
    'আহা 🥺 কী হয়েছে? চাইলে বলতে পারেন, শুনছি।',
    'ইশ 🥺 মন খারাপ কেন?',
    'আহা 😭 কী হয়েছে? বলুন, শুনি।',
  ],

  banglish: [
    'awh 🥺 ki hoise? chaile bolte paren, shunchi.',
    'eish 🥺 mon kharap keno?',
    'ahh 😭 ki hoise? bolen, shuni.',
    'sorry je emon lagtesе 🥺 ki hoise?',
    'come here 😭 bolen ki hoise, I’m listening.',
  ],

  english: [
    'awh 🥺 what happened? you can tell me if you want.',
    'hey 🥺 what’s wrong?',
    'oh no 😭 what happened?',
    'I’m listening 🥺 what’s going on?',
  ],
};


/* =========================
   SIMPLE REACTIONS
========================= */

const reactions = [
  'real 😭',
  'fair enough 😭',
  'valid 😭',
  'nahh 😭',
  'LMAO 😭',
  'bro 😭',
  'wait 😭 what?',
  'okayyy 😭',
  'interesting 👀',
];


/* =========================
   QUESTIONS
========================= */

const questionReplies = {
  bangla: [
    'হুম 😭 ভালো question.',
    'ওহ 😭 এটা নিয়ে ভাবতে হবে।',
    'আপনি আসলেই এটা জানতে চান? 😭',
    'ভালো প্রশ্ন 👀',
  ],

  banglish: [
    'hmm 😭 good question.',
    'oh 😭 eta niye bhabte hobe.',
    'apni actually eta jante chacchen? 😭',
    'good question ngl 👀',
    'wait 😭 eta actually interesting.',
  ],

  english: [
    'hmm 😭 good question.',
    'oh 😭 let me think.',
    'you actually wanna know? 😭',
    'good question ngl 👀',
    'wait 😭 that’s actually interesting.',
  ],
};


/* =========================
   GENERIC
========================= */

const generic = {
  bangla: [
    'হুম 😭 বুঝলাম।',
    'আচ্ছা 😭 interesting.',
    'ওহ? 😭 তারপর?',
    'সত্যিই নাকি 😭?',
    'বাহ 😭',
  ],

  banglish: [
    'hmm 😭 bujhlam.',
    'acha 😭 interesting.',
    'oh? 😭 then?',
    'real 😭',
    'fair enough 😭',
    'wait 😭 what?',
    'LMAO 😭',
    'nahh 😭 fr?',
  ],

  english: [
    'hmm 😭 I see.',
    'okay 😭 interesting.',
    'oh? 😭 then?',
    'real 😭',
    'fair enough.',
    'wait 😭 what?',
    'LMAO 😭',
  ],
};


/* =========================
   MAIN CHATBOT
========================= */

export async function getAIReply(
  message,
  conversationHistory = []
) {
  try {
    const userMessage = message.content
      .replace(/<@!?\d+>/g, '')
      .trim();

    if (!userMessage) {
      return random([
        'yes? 😭',
        'you called? 👀',
        'hmm? 😭',
        'ji? 😭',
        'yes boss 😭',
        'what happened 👀',
      ]);
    }

    const text = userMessage.toLowerCase();
    const language = detectLanguage(userMessage);


    /* Greetings */

    if (
      /^(hi|hii|hiii|hey|heyy|heyyy|hello|yo|yoo|yooo)$/i.test(
        userMessage
      )
    ) {
      return random(
        greetings[language] || greetings.banglish
      );
    }


    /* How are you */

    if (
      text.includes('how are you') ||
      text.includes('how r u') ||
      text.includes('how are u') ||
      text.includes('kemon asen') ||
      text.includes('kemon acho') ||
      text.includes('kmn asen') ||
      text.includes('ki khobor')
    ) {
      return random(
        howAreYou[language] || howAreYou.banglish
      );
    }


    /* What are you doing */

    if (
      text.includes('what are you doing') ||
      text.includes('what r u doing') ||
      text.includes('ki koren') ||
      text.includes('ki kortesen') ||
      text.includes('ki koro')
    ) {
      return random(
        whatDoing[language] || whatDoing.banglish
      );
    }


    /* Morning */

    if (
      text.includes('good morning') ||
      text === 'gm' ||
      text === 'gm gm' ||
      text.includes('suprabhat')
    ) {
      return random(
        morning[language] || morning.banglish
      );
    }


    /* Night */

    if (
      text.includes('good night') ||
      text === 'gn' ||
      text === 'gn gn'
    ) {
      return random(
        night[language] || night.banglish
      );
    }


    /* Thanks */

    if (
      text === 'thanks' ||
      text === 'thank you' ||
      text === 'thx' ||
      text === 'ty' ||
      text.includes('dhonnobad')
    ) {
      return random(thanks);
    }


    /* Sad / emotional */

    if (
      text.includes('sad') ||
      text.includes('lonely') ||
      text.includes('upset') ||
      text.includes('stressed') ||
      text.includes('mon kharap') ||
      text.includes('kharap lag') ||
      text.includes('bhalo lagche na') ||
      text.includes('valo lagche na')
    ) {
      return random(
        emotional[language] || emotional.banglish
      );
    }


    /* Missing */

    if (
      text.includes('miss me') ||
      text.includes('miss you') ||
      text.includes('miss u') ||
      text.includes('miss koren') ||
      text.includes('miss kori')
    ) {
      return random(
        missing[language] || missing.banglish
      );
    }


    /* Flirting */

    if (
      text.includes('love me') ||
      text.includes('do you love me') ||
      text.includes('do you like me') ||
      text.includes('like me') ||
      text.includes('bhalobashen') ||
      text.includes('bhalobasho') ||
      text.includes('crush')
    ) {
      return random(
        flirting[language] || flirting.banglish
      );
    }


    /* Compliments */

    if (
      text.includes('cute') ||
      text.includes('pretty') ||
      text.includes('beautiful') ||
      text.includes('handsome') ||
      text.includes('sweet') ||
      text.includes('good bot') ||
      text.includes('best bot')
    ) {
      return random(
        compliments[language] || compliments.banglish
      );
    }


    /* Ragebait / teasing */

    if (
      text.includes('annoying') ||
      text.includes('stupid') ||
      text.includes('dumb') ||
      text.includes('idiot') ||
      text.includes('boring') ||
      text.includes('useless') ||
      text.includes('shut up') ||
      text.includes('hate you') ||
      text.includes('hate u')
    ) {
      return random(
        teasing[language] || teasing.banglish
      );
    }


    /* Yes / no */

    if (
      text === 'yes' ||
      text === 'yeah' ||
      text === 'yep' ||
      text === 'nah' ||
      text === 'no'
    ) {
      return random(reactions);
    }


    /* Questions */

    if (
      text.endsWith('?') ||
      text.startsWith('why ') ||
      text.startsWith('what ') ||
      text.startsWith('how ') ||
      text.startsWith('who ') ||
      text.startsWith('where ')
    ) {
      return random(
        questionReplies[language] ||
        questionReplies.banglish
      );
    }


    /* Generic */

    return random(
      generic[language] ||
      generic.banglish
    );

  } catch (error) {
    console.error(
      "WSS'25 custom chatbot error:",
      error
    );

    return 'uhh 😭 amar brain ektu lag korlo.';
  }
}


export { BOT_PERSONALITY };
