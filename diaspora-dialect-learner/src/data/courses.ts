/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseLanguage, DialectCourse, Unit, LessonNode } from "../types";

export const COURSES_BY_BASE_LANG: Record<BaseLanguage, DialectCourse[]> = {
  [BaseLanguage.English]: [
    {
      id: "en-patois",
      name: "Jamaican Patois",
      nativeName: "Patwa",
      region: "Caribbean (Jamaica)",
      flag: "🇯🇲",
      description: "Learn the vibrant English-based creole of Jamaica, filled with colorful idioms and African grammatical roots.",
      difficulty: "Beginner",
      tagline: "Wah gwaan? Learn to talk like a true yardie!"
    },
    {
      id: "en-gullah",
      name: "Gullah Geechee",
      nativeName: "Geechee",
      region: "North America (Black Americans)",
      flag: "🇺🇸",
      description: "Preserve the unique creole spoken by African Americans on the coastal Sea Islands of South Carolina, Georgia, and Florida.",
      difficulty: "Intermediate",
      tagline: "How oona da do? Connect with deep African-American ancestry."
    },
    {
      id: "en-belizean",
      name: "Belizean Creole",
      nativeName: "Kriol",
      region: "Central America (Belize)",
      flag: "🇧🇿",
      description: "Discover Belize's national language, blending African elements, English, and Caribbean flavor.",
      difficulty: "Beginner",
      tagline: "Weh di gwaan? Speak the soul of Belize!"
    },
    {
      id: "en-swahili",
      name: "Swahili",
      nativeName: "Kiswahili",
      region: "East Africa",
      flag: "🇹🇿",
      description: "The most widely spoken language in Africa, combining Bantu syntax with Arabic and global influences.",
      difficulty: "Beginner",
      tagline: "Habari gani! Step into the heart of East Africa."
    },
    {
      id: "en-igbo",
      name: "Igbo",
      nativeName: "Asụsụ Igbo",
      region: "West Africa (Nigeria)",
      flag: "🇳🇬",
      description: "Learn one of Nigeria's principal languages, featuring complex tonal patterns and rich proverb-based expressions.",
      difficulty: "Intermediate",
      tagline: "Kedu! Dive into Nigerian heritage and traditional wisdom."
    },
    {
      id: "en-yoruba",
      name: "Yoruba",
      nativeName: "Èdè Yorùbá",
      region: "West Africa (Nigeria/Benin)",
      flag: "🇳🇬",
      description: "Explore a major tonal language of West Africa, deeply tied to Afro-Caribbean spiritual traditions like Santería and Candomblé.",
      difficulty: "Advanced",
      tagline: "Bawo ni! Learn the language of royal proverbs."
    }
  ],
  [BaseLanguage.French]: [
    {
      id: "fr-haitian",
      name: "Haitian Creole",
      nativeName: "Kreyòl Ayisyen",
      region: "Caribbean (Haiti)",
      flag: "🇭🇹",
      description: "Learn the proud language of the world's first independent Black republic, blending 18th-century French with West African Fon and Yoruba.",
      difficulty: "Beginner",
      tagline: "Sak pase? Learn the language of the Haitian revolution!"
    },
    {
      id: "fr-nouchi",
      name: "Ivorian Nouchi",
      nativeName: "Nouchi",
      region: "West Africa (Côte d'Ivoire)",
      flag: "🇨🇮",
      description: "Speak the high-energy urban street slang of Abidjan, fusing French vocabulary with Ivorian languages like Baoulé and Dioula.",
      difficulty: "Intermediate",
      tagline: "Ça gâte pas! Master the coolest urban slang in West Africa."
    },
    {
      id: "fr-wolof",
      name: "Wolof",
      nativeName: "Kadd Wolof",
      region: "West Africa (Senegal)",
      flag: "🇸🇳",
      description: "Explore Senegal's beautiful dominant language, characterized by a highly expressive oral tradition.",
      difficulty: "Intermediate",
      tagline: "Nanga def? Discover Teranga hospitality through Wolof!"
    },
    {
      id: "fr-swahili",
      name: "Swahili",
      nativeName: "Kiswahili",
      region: "East/Central Africa",
      flag: "🇨🇩",
      description: "Connect French-speaking Africa with the global Bantu culture through the East African lingua franca.",
      difficulty: "Beginner",
      tagline: "Habari gani! Parlez Swahili, la langue unificatrice."
    }
  ],
  [BaseLanguage.Arabic]: [
    {
      id: "ar-swahili",
      name: "Swahili",
      nativeName: "السواحيلية",
      region: "East Africa",
      flag: "🇰🇪",
      description: "Swahili contains over 30% Arabic vocabulary! Discover the historical ties between East Africa and the Arab world.",
      difficulty: "Beginner",
      tagline: "مرحباً! تعلم السواحيلية مع روابطها العربية العميقة."
    },
    {
      id: "ar-sudanese",
      name: "Sudanese Arabic",
      nativeName: "العامية السودانية",
      region: "East Africa (Sudan)",
      flag: "🇸🇩",
      description: "Blend classic Arabic with indigenous Nubian languages and East African dialects.",
      difficulty: "Beginner",
      tagline: "حبابك! تكلم بلهجة النيلين الدافئة."
    },
    {
      id: "ar-nubian",
      name: "Nubian Dialect",
      nativeName: "الرطانة النوبية",
      region: "North-East Africa (Nubia)",
      flag: "🇪🇬",
      description: "Learn the legendary language of the ancient Black Pharaohs of Kush along the Nile valley.",
      difficulty: "Intermediate",
      tagline: "مسكاجرو! تعلم لغة ملوك كوش العظام."
    }
  ]
};

// Course contents definitions (lessons, quizzes, culture facts, etc.)
export const COURSE_CONTENT: Record<string, Unit[]> = {
  "en-patois": [
    {
      id: "patois-u1",
      number: 1,
      title: "GREETINGS & ROOTS",
      description: "Master the essential greetings, standard replies, and the African influence on syntax.",
      themeColor: "from-emerald-600 to-green-500",
      borderColor: "border-emerald-600",
      lessons: [
        {
          id: "patois-l1",
          title: "The Universal Greeting",
          description: "Discover 'Wah Gwaan' and how to reply like a Kingston local.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "p-q1",
              type: "choice",
              question: "What is the most popular, universal way to say 'What's going on?' in Jamaican Patois?",
              options: ["Wah gwaan?", "How oona do?", "Sak pase?", "Kedu?"],
              correctAnswer: "Wah gwaan?",
              explanation: "'Wah gwaan' literally translates to 'What is going on?' and is the most common greeting in Jamaica.",
              audioMock: "/assets/audio/wah_gwaan.mp3"
            },
            {
              id: "p-q2",
              type: "choice",
              question: "If someone asks you 'Wah gwaan?', how do you reply to mean 'I am here' or 'Doing good'?",
              options: ["Mi deh yah", "Nyam food", "Mwen byen", "Habari"],
              correctAnswer: "Mi deh yah",
              explanation: "'Mi deh yah' means 'I am here' or 'I'm doing well'. It signifies resilience and being present.",
              audioMock: "/assets/audio/mi_deh_yah.mp3"
            },
            {
              id: "p-q3",
              type: "translate",
              question: "Arrange the words to translate: 'I am doing fine' (Literal: 'Mi deh yah')",
              options: ["yah", "deh", "Mi"],
              correctAnswer: "Mi,deh,yah",
              explanation: "Patois uses the pronoun 'Mi' for 'I' and 'deh yah' to represent state/location."
            }
          ],
          steps: [
            {
              id: "p-s1",
              type: "teaching",
              conceptTitle: "The Universal Greeting",
              conceptExplanation: "In Jamaica, <b>'Wah gwaan?'</b> is the ultimate door-opener. It literally means 'What is going on?'. You say it to friends, siblings, and community members with a nod of recognition.",
              narrative: "Greetings in Jamaica are active rituals of connection, inheriting West African habits of deep communal respect and oral preservation.",
              audioKey: "wah_gwaan",
              character: {
                name: "Auntie Joyce",
                avatar: "👵🏽",
                role: "Griot & Language Elder"
              }
            },
            {
              id: "p-s2",
              type: "choice",
              question: "What is the most popular, universal way to say 'What's going on?' in Jamaican Patois?",
              options: ["Wah gwaan?", "How oona do?", "Sak pase?", "Kedu?"],
              correctAnswer: "Wah gwaan?",
              explanation: "'Wah gwaan' literally translates to 'What is going on?' and is the most common greeting in Jamaica.",
              audioKey: "wah_gwaan"
            },
            {
              id: "p-s3",
              type: "teaching",
              conceptTitle: "How to Reply Like a Local",
              conceptExplanation: "When someone greets you with 'Wah gwaan?', replying <b>'Mi deh yah'</b> is the gold standard. It literally translates to 'I am here' or 'I am present and well'.",
              narrative: "Replying 'Mi deh yah' signifies survival, resilience, and presence in spite of all challenges.",
              audioKey: "mi_deh_yah",
              character: {
                name: "Kofi",
                avatar: "🧑🏾",
                role: "Kingston Street Guide"
              }
            },
            {
              id: "p-s4",
              type: "choice",
              question: "If someone asks you 'Wah gwaan?', how do you reply to mean 'I am here' or 'Doing good'?",
              options: ["Mi deh yah", "Nyam food", "Mwen byen", "Habari"],
              correctAnswer: "Mi deh yah",
              explanation: "'Mi deh yah' means 'I am here' or 'I'm doing well'. It signifies resilience and being present.",
              audioKey: "mi_deh_yah"
            },
            {
              id: "p-s5",
              type: "translate",
              question: "Translate: 'I am here' (Literal: 'Mi deh yah')",
              options: ["yah", "deh", "Mi", "dem", "nyam"],
              correctAnswer: "Mi,deh,yah",
              explanation: "Patois uses the pronoun 'Mi' for 'I' and 'deh' (to be) + 'yah' (here) to represent state."
            }
          ]
        },
        {
          id: "patois-l2",
          title: "Patois Pronouns & Verbs",
          description: "Understand the simplification of verb forms and pronoun structures.",
          type: "grammar",
          status: "locked",
          questions: [
            {
              id: "p-q4",
              type: "choice",
              question: "Which word represents 'We' or 'Us' in Jamaican Patois, derived from English 'We' but spoken with West African plural rules?",
              options: ["Wi", "Oona", "Unnu", "Nou"],
              correctAnswer: "Unnu",
              explanation: "'Unnu' or 'Yuh' is used for plural 'you'. 'Wi' is used for we, but 'Unnu' is the direct Igbo-cognate pronoun for plural 'you'!"
            },
            {
              id: "p-q5",
              type: "choice",
              question: "How do you say 'They' or 'Them' in Patois?",
              options: ["Dem", "Yuh", "Mi", "Him"],
              correctAnswer: "Dem",
              explanation: "'Dem' is used for 'them/they', and also functions as a plural marker (e.g. 'di dog dem' = 'the dogs')."
            },
            {
              id: "p-q6",
              type: "translate",
              question: "Arrange to say: 'You plural are eating' (Literal: 'Unnu a nyam')",
              options: ["nyam", "a", "Unnu"],
              correctAnswer: "Unnu,a,nyam",
              explanation: "'Unnu' (you plural) + 'a' (is/are continuous action) + 'nyam' (to eat, derived from Wolof/Bantu 'nyam')."
            }
          ]
        },
        {
          id: "patois-l3",
          title: "The African Connection",
          description: "Learn about words directly imported from West African languages.",
          type: "culture",
          status: "locked",
          questions: [
            {
              id: "p-q7",
              type: "choice",
              question: "The word 'Nyam' (meaning to eat) is a direct loanword from which language family?",
              options: ["West African (Wolof/Fula/Bantu)", "Spanish", "Arawak Taino", "English slang"],
              correctAnswer: "West African (Wolof/Fula/Bantu)",
              explanation: "'Nyam' means to eat or chew, found widely across West African Bantu and Atlantic languages."
            },
            {
              id: "p-q8",
              type: "choice",
              question: "The Jamaican folklore spider 'Anansi' comes from the stories of which West African ethnic group?",
              options: ["Akan (Ghana)", "Yoruba (Nigeria)", "Zulu (South Africa)", "Wolof (Senegal)"],
              correctAnswer: "Akan (Ghana)",
              explanation: "Kwaku Ananse is the clever spider trickster from Akan (Ghanaian) mythology brought across the Atlantic."
            }
          ]
        }
      ]
    },
    {
      id: "patois-u2",
      number: 2,
      title: "STREET TALK & CULTURE",
      description: "Dive into everyday slang, food words, and music idioms from Dancehall & Reggae.",
      themeColor: "from-amber-500 to-yellow-400",
      borderColor: "border-amber-500",
      lessons: [
        {
          id: "patois-l4",
          title: "Reggae & Rastafari Terms",
          description: "Learn about positive vibrations: 'I-tal', 'I and I', and 'Idren'.",
          type: "slang",
          status: "locked",
          questions: [
            {
              id: "p-q9",
              type: "choice",
              question: "What does 'I-tal' mean in Jamaican cuisine?",
              options: ["Natural/Organic/Saltless vegan food", "Spicy jerk style", "Fried fish with onions", "Sweet coconut cake"],
              correctAnswer: "Natural/Organic/Saltless vegan food",
              explanation: "'I-tal' comes from 'Vital', referring to the saltless, natural, plant-based diet of Rastafarians."
            }
          ]
        },
        {
          id: "patois-l5",
          title: "Unit 1 Graduation",
          description: "Test your complete skills to unlock Unit 2 awards!",
          type: "milestone",
          status: "locked",
          questions: [
            {
              id: "p-q10",
              type: "choice",
              question: "Translate: 'Lickle more'!",
              options: ["See you later / Goodbye", "Give me some more", "Very small", "Eat quickly"],
              correctAnswer: "See you later / Goodbye",
              explanation: "'Lickle more' is a warm way of saying 'Goodbye' or 'See you in a bit'."
            }
          ]
        }
      ]
    }
  ],
  "en-gullah": [
    {
      id: "gullah-u1",
      number: 1,
      title: "SEA ISLANDS FOUNDATION",
      description: "Discover Gullah Geechee, the language of survival on the coastal islands.",
      themeColor: "from-blue-600 to-indigo-500",
      borderColor: "border-blue-600",
      lessons: [
        {
          id: "gullah-l1",
          title: "First Meeting",
          description: "Learn common expressions of welcome and identity.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "g-q1",
              type: "choice",
              question: "How do you say 'How are you all doing?' in Gullah?",
              options: ["How oona da do?", "Wah gwaan?", "Sak pase?", "Habari yako?"],
              correctAnswer: "How oona da do?",
              explanation: "'Oona' is the Gullah pronoun for 'you plural' or 'you all', directly related to the Igbo word 'Unu'."
            },
            {
              id: "g-q2",
              type: "choice",
              question: "What does 'dayclean' mean in Gullah Geechee culture?",
              options: ["Dawn / Sunrise / Morning", "Doing laundry", "Beautiful beach", "Clean house"],
              correctAnswer: "Dawn / Sunrise / Morning",
              explanation: "'Dayclean' refers to the pristine morning hours when the new day has just been swept clean."
            },
            {
              id: "g-q3",
              type: "translate",
              question: "Translate: 'We were there' (Literal: 'We bin dey')",
              options: ["dey", "bin", "We"],
              correctAnswer: "We,bin,dey",
              explanation: "'Bin' is the past tense marker, and 'dey' means present/located, matching Sierra Leone Krio syntax."
            }
          ]
        }
      ]
    }
  ],
  "en-belizean": [
    {
      id: "belizean-u1",
      number: 1,
      title: "KRIOL WELCOME",
      description: "Belizean Kriol connects the Caribbean directly with Central America.",
      themeColor: "from-red-600 to-rose-500",
      borderColor: "border-red-600",
      lessons: [
        {
          id: "bz-l1",
          title: "Belizean Hello",
          description: "Discover 'Weh di gwaan' and how to reply with Kriol pride.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "bz-q1",
              type: "choice",
              question: "How do you say 'What's going on?' in Belizean Kriol?",
              options: ["Weh di gwaan?", "Sak pase?", "Kedu?", "Habari?"],
              correctAnswer: "Weh di gwaan?",
              explanation: "'Weh di gwaan' is Belize's native way of asking 'what is going on'."
            },
            {
              id: "bz-q2",
              type: "choice",
              question: "What does 'bway' and 'gyal' mean in Belize?",
              options: ["Boy and Girl", "Yes and No", "Good and Bad", "Eat and Drink"],
              correctAnswer: "Boy and Girl",
              explanation: "Directly adapted phonetic spellings of boy and girl typical of Caribbean Creoles."
            },
            {
              id: "bz-q3",
              type: "translate",
              question: "Translate: 'I am here' (Literal: 'A deh ya')",
              options: ["ya", "deh", "A"],
              correctAnswer: "A,deh,ya",
              explanation: "Belizean Kriol uses 'A' for I, and 'deh ya' for 'here'."
            }
          ]
        }
      ]
    }
  ],
  "fr-haitian": [
    {
      id: "haitian-u1",
      number: 1,
      title: "PREMYE PA (FIRST STEPS)",
      description: "Speak Kreyòl Ayisyen, the language of pride and freedom.",
      themeColor: "from-blue-700 to-sky-500",
      borderColor: "border-blue-700",
      lessons: [
        {
          id: "haitian-l1",
          title: "The Spirit of Ayiti",
          description: "Learn 'Sak pase?' and key Haitian greetings.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "h-q1",
              type: "choice",
              question: "What is the classic, informal Haitian Creole greeting for 'What's happening?'",
              options: ["Sak pase?", "Wah gwaan?", "Comment allez-vous?", "Kedu?"],
              correctAnswer: "Sak pase?",
              explanation: "'Sak pase' means 'What is passing/happening?'. The typical answer is 'N ap boule' (We are burning/chilling!)."
            },
            {
              id: "h-q2",
              type: "choice",
              question: "How do you reply to 'Sak pase' to mean 'We are fine' or 'Getting by'?",
              options: ["N ap boule", "Mwen tris", "Mi deh yah", "Ça gâte pas"],
              correctAnswer: "N ap boule",
              explanation: "'N ap boule' is a resilient, positive slang meaning 'We are doing great' (literally 'We are burning/living hot')."
            },
            {
              id: "h-q3",
              type: "translate",
              question: "Translate: 'I am doing well' (Literal: 'Mwen byen')",
              options: ["byen", "Mwen"],
              correctAnswer: "Mwen,byen",
              explanation: "'Mwen' (I) + 'byen' (well) forms the perfect positive response."
            }
          ]
        }
      ]
    }
  ],
  "fr-nouchi": [
    {
      id: "nouchi-u1",
      number: 1,
      title: "CIVILIZATION OF ABIDJAN",
      description: "Speak the street language of Côte d'Ivoire.",
      themeColor: "from-orange-600 to-amber-500",
      borderColor: "border-orange-600",
      lessons: [
        {
          id: "n-l1",
          title: "Introduction to Nouchi",
          description: "Master essential Abidjan catchphrases.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "n-q1",
              type: "choice",
              question: "In Ivorian Nouchi, what does 'Ça gâte pas' mean?",
              options: ["Everything is fine / It's all good", "It's spoiled", "I am angry", "Let's go home"],
              correctAnswer: "Everything is fine / It's all good",
              explanation: "'Ça gâte pas' translates to 'It does not spoil', meaning everything is absolutely cool and going great."
            },
            {
              id: "n-q2",
              type: "choice",
              question: "If someone is described as 'Choco' in Abidjan, what are they?",
              options: ["Fancy, stylish, or rich", "Dark-skinned", "A lazy person", "A good cook"],
              correctAnswer: "Fancy, stylish, or rich",
              explanation: "'Choco' means high-class, stylish, elegant, or wealthy, drawing from 'chocolate' as a luxury item."
            }
          ]
        }
      ]
    }
  ],
  "en-swahili": [
    {
      id: "swahili-u1",
      number: 1,
      title: "BANTU GATEWAY",
      description: "Learn Swahili, the beautiful Bantu tongue connecting millions.",
      themeColor: "from-green-700 to-yellow-600",
      borderColor: "border-green-700",
      lessons: [
        {
          id: "sw-l1",
          title: "Warm Welcome",
          description: "Learn Jambo and Habari.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "sw-q1",
              type: "choice",
              question: "What is the most respectful greeting for elders in Swahili?",
              options: ["Shikamoo", "Jambo", "Mambo vipi", "Sasa"],
              correctAnswer: "Shikamoo",
              explanation: "'Shikamoo' is a beautiful respectful greeting for elders, answered with 'Marahaba' (I accept your respect)."
            },
            {
              id: "sw-q2",
              type: "choice",
              question: "What does 'Habari gani' mean?",
              options: ["How are things? / What news?", "Good morning", "Goodbye", "Thank you"],
              correctAnswer: "How are things? / What news?",
              explanation: "'Habari gani' asks 'What news?' or 'How is everything?'."
            }
          ]
        }
      ]
    }
  ],
  "en-igbo": [
    {
      id: "igbo-u1",
      number: 1,
      title: "IGBO PROVERBS & LIFE",
      description: "Understand the tonal and historical beauty of Igbo.",
      themeColor: "from-teal-600 to-emerald-500",
      borderColor: "border-teal-600",
      lessons: [
        {
          id: "ig-l1",
          title: "Starting Out",
          description: "Learn Kedu and standard greetings.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "ig-q1",
              type: "choice",
              question: "What is the universal Igbo greeting for 'How are you?' or 'Hello'?",
              options: ["Kedu?", "Bawo ni?", "Wah gwaan?", "Nanga def?"],
              correctAnswer: "Kedu?",
              explanation: "'Kedu' literally means 'how is it?', the universal door-opener to conversation in Igbo land."
            }
          ]
        }
      ]
    }
  ],
  "en-yoruba": [
    {
      id: "yoruba-u1",
      number: 1,
      title: "OMOLUABI LAND",
      description: "Speak Yoruba, the language of high culture and drums.",
      themeColor: "from-amber-700 to-orange-600",
      borderColor: "border-amber-700",
      lessons: [
        {
          id: "yo-l1",
          title: "Yoruba Welcome",
          description: "Learn Bawo ni and respectful greetings.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "yo-q1",
              type: "choice",
              question: "How do you say 'How are you?' to a friend in Yoruba?",
              options: ["Bawo ni?", "Kedu?", "E ku aro", "Mambo"],
              correctAnswer: "Bawo ni?",
              explanation: "'Bawo ni' is 'how is it going?' or 'how are you?' in friendly Yoruba."
            }
          ]
        }
      ]
    }
  ],
  "fr-wolof": [
    {
      id: "wolof-u1",
      number: 1,
      title: "TERANGA SPIRIT",
      description: "Learn Wolof, Senegal's language of poetry and hospitality.",
      themeColor: "from-blue-600 to-emerald-600",
      borderColor: "border-blue-600",
      lessons: [
        {
          id: "wf-l1",
          title: "The Senegalese Greeting",
          description: "Learn 'Nanga def' and replies.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "wf-q1",
              type: "choice",
              question: "How do you say 'How are you?' in Wolof?",
              options: ["Nanga def?", "Sak pase?", "Ça va?", "Kedu?"],
              correctAnswer: "Nanga def?",
              explanation: "'Nanga def' asks 'How are you doing?' in Wolof."
            }
          ]
        }
      ]
    }
  ],
  "fr-swahili": [
    {
      id: "fr-sw-u1",
      number: 1,
      title: "BANTU CONGO",
      description: "Learn Swahili for French speakers.",
      themeColor: "from-green-600 to-teal-500",
      borderColor: "border-green-600",
      lessons: [
        {
          id: "fr-sw-l1",
          title: "Swahili Bonjour",
          description: "Habari gani and basic nouns.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "fr-sw-q1",
              type: "choice",
              question: "How do you say 'Very good' in Swahili?",
              options: ["Nzuri sana", "Karibu", "Asante", "Ndiyo"],
              correctAnswer: "Nzuri sana",
              explanation: "'Nzuri sana' means 'very good/excellent'."
            }
          ]
        }
      ]
    }
  ],
  "ar-swahili": [
    {
      id: "ar-sw-u1",
      number: 1,
      title: "ARABIC BANTU TIES",
      description: "Explore Swahili, featuring deep Arabic loanwords.",
      themeColor: "from-amber-600 to-yellow-500",
      borderColor: "border-amber-600",
      lessons: [
        {
          id: "ar-sw-l1",
          title: "Swahili Arabic Roots",
          description: "Learn how Swahili inherits terms like Khabari (Habari), Shukran (Asante) and more.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "ar-sw-q1",
              type: "choice",
              question: "What Swahili greeting is derived directly from Arabic 'Habar' (news/information)?",
              options: ["Habari gani?", "Sasa", "Mambo", "Jambo"],
              correctAnswer: "Habari gani?",
              explanation: "'Habari' is directly derived from Arabic 'خبر' (khabar), meaning news."
            }
          ]
        }
      ]
    }
  ],
  "ar-sudanese": [
    {
      id: "ar-sd-u1",
      number: 1,
      title: "SUDANESE HOME",
      description: "Learn Sudanese Arabic dialect.",
      themeColor: "from-blue-600 to-amber-500",
      borderColor: "border-blue-600",
      lessons: [
        {
          id: "ar-sd-l1",
          title: "Warm Greeting",
          description: "Hababka and core Sudanese terms.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "ar-sd-q1",
              type: "choice",
              question: "How do you say 'Welcome' in Sudanese Arabic?",
              options: ["حبابك (Hababka)", "مرحباً", "مسكاجرو", "أهلاً"],
              correctAnswer: "حبابك (Hababka)",
              explanation: "'Hababka' is the unique Sudanese way of saying welcome."
            }
          ]
        }
      ]
    }
  ],
  "ar-nubian": [
    {
      id: "ar-nb-u1",
      number: 1,
      title: "KUSH KINGDOM",
      description: "Speak the royal language of ancient Nubian civilization.",
      themeColor: "from-yellow-700 to-amber-600",
      borderColor: "border-yellow-700",
      lessons: [
        {
          id: "ar-nb-l1",
          title: "Ancient Hello",
          description: "Maskagro and greetings of Kush.",
          type: "vocab",
          status: "available",
          questions: [
            {
              id: "ar-nb-q1",
              type: "choice",
              question: "What is the primary greeting for 'Hello' in Nubian?",
              options: ["مسكاجرو (Maskagro)", "حبابك", "كيفك", "مرحباً"],
              correctAnswer: "مسكاجرو (Maskagro)",
              explanation: "'Maskagro' is the legendary welcoming greeting in Nubian."
            }
          ]
        }
      ]
    }
  ]
};

// Fun simulated AI companion responses for Kojo
export const KOJO_CHAT_RESPONSES: Record<string, string[]> = {
  "en-patois": [
    "Wah gwaan! Keep practicing and you will speak like a Kingston king!",
    "Remember: 'Mi deh yah' means I'm here. It's all about resilience!",
    "Nyam means to eat, directly from Africa. Jamaicans love good food!",
    "Lickle more! That's how we say see you later.",
    "Bredrin, your progress is absolutely beautiful! Big up yourself!"
  ],
  "en-gullah": [
    "How oona da do! Gullah Geechee is the link to the Sierra Leone Gullah roots.",
    "Dayclean is the morning! Have a beautiful dayclean!",
    "We are keeping the Sea Island heritage alive together!",
    "Trust your ancestors, oona doing wonderful!"
  ],
  "en-belizean": [
    "Weh di gwaan! Belizean Kriol is sweet like coconut fudge!",
    "A deh ya! Speak it with Belizean pride!",
    "Belizean Kriol blends Mayan, Garifuna, African, and European histories."
  ],
  "fr-haitian": [
    "Sak pase! Kreyòl Ayisyen is the language of freedom and courage!",
    "N ap boule! Keep that energy, we are doing amazing things!",
    "L'union fait la force - unity is strength. Let's keep learning!"
  ],
  "fr-nouchi": [
    "Ça gâte pas! Abidjan street slang is all about energy and style!",
    "You are becoming very Choco! Keep studying!",
    "Nouchi is the coolest way to speak French in West Africa."
  ],
  "en-swahili": [
    "Habari gani! Swahili connects the beautiful Bantu heartlands.",
    "Shikamoo is for elders. Marahaba is the reply. Respect is everything!",
    "Safari means journey in Swahili. Your learning is a beautiful safari!"
  ],
  "en-igbo": [
    "Kedu! Igbo language is filled with beautiful proverbs.",
    "Ọ dị mma! Keep going, you are making Nigeria proud!",
    "Your Igbo is getting so sweet!"
  ],
  "en-yoruba": [
    "Bawo ni! Yoruba has tones that sound like music.",
    "Dada ni! Everything is excellent. Your progress is beautiful!",
    "E ku aro means good morning. Have a glorious day!"
  ],
  "fr-wolof": [
    "Nanga def! Welcome to Senegal's beautiful culture of Teranga (hospitality).",
    "Mangi fi! (I am here). Your pronunciation is perfect!",
    "Wolof makes you a true citizen of Dakar!"
  ],
  "ar-sudanese": [
    "حبابك! لهجة السودان لطيفة وجميلة جداً.",
    "عافية! نتمنى لك يوماً سعيداً.",
    "لغة النيلين تجمع بين الأصالة والترحاب."
  ],
  "ar-nubian": [
    "مسكاجرو! مرحباً بك في أرض كوش العريقة.",
    "أنت تتعلم لغة ملوك النوبة، واصل بكل فخر!",
    "حضارة النوبة تمتد لآلاف السنين."
  ]
};
