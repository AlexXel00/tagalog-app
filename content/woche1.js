// Inhalt Woche 1: Ueberleben und Smalltalk
// Felder bei Woertern:
//   tl     - Schreibweise wie im Alltag (ohne Akzente)
//   stress - mit Betonungszeichen: Akut = betonte Silbe, Gravis = Glottisschlag am Ende,
//            Zirkumflex = betont plus Glottisschlag. Ohne Zeichen = Betonung auf vorletzter Silbe.
//   de     - Bedeutung
//   note   - kurzer Hinweis
//   reviewed - true, sobald ein Muttersprachler den Eintrag geprueft hat
(function () {
  "use strict";

  var words = [
    // Begruessen und Hoeflichkeit
    { id: "w_kumusta", tl: "Kumusta?", stress: "Kumustá?", de: "Wie geht's?", note: "Kommt vom spanischen ¿cómo está?", topic: "gruss" },
    { id: "w_mabuti", tl: "mabuti", stress: "mabúti", de: "gut", note: "Antwort auf Kumusta: Mabuti naman (Gut, danke).", topic: "gruss" },
    { id: "w_salamat", tl: "salamat", stress: "salámat", de: "danke", topic: "gruss" },
    { id: "w_oo", tl: "oo", stress: "oò", de: "ja (locker)", note: "Unter Freunden. Zu Älteren sagt man opo.", topic: "gruss" },
    { id: "w_opo", tl: "opo", stress: "opo", de: "ja (höflich)", note: "Zu Älteren, Fremden, Kunden.", topic: "gruss" },
    { id: "w_hindi", tl: "hindi", stress: "hindî", de: "nein / nicht", topic: "gruss" },
    { id: "w_umaga", tl: "Magandang umaga.", stress: "Magandang umaga.", de: "Guten Morgen.", topic: "gruss" },
    { id: "w_hapon", tl: "Magandang hapon.", stress: "Magandang hapon.", de: "Guten Nachmittag.", topic: "gruss" },
    { id: "w_gabi", tl: "Magandang gabi.", stress: "Magandang gabí.", de: "Guten Abend.", topic: "gruss" },
    { id: "w_paalam", tl: "paalam", stress: "paálam", de: "auf Wiedersehen", note: "Eher förmlich. Im Alltag hört man oft Ingat! (Pass auf dich auf).", topic: "gruss" },

    // Personen
    { id: "w_ako", tl: "ako", stress: "akó", de: "ich", topic: "person" },
    { id: "w_ikaw", tl: "ikaw", stress: "ikáw", de: "du (am Satzanfang)", topic: "person" },
    { id: "w_ka", tl: "ka", stress: "ka", de: "du (nach dem ersten Wort)", topic: "person" },
    { id: "w_siya", tl: "siya", stress: "siyá", de: "er / sie", note: "Tagalog unterscheidet nicht zwischen er und sie.", topic: "person" },
    { id: "w_kaibigan", tl: "kaibigan", stress: "kaibígan", de: "Freund / Freundin", topic: "person" },
    { id: "w_pangalan", tl: "pangalan", stress: "pangálan", de: "Name", topic: "person" },

    // Fragewoerter
    { id: "w_ano", tl: "ano", stress: "anó", de: "was", topic: "frage" },
    { id: "w_saan", tl: "saan", stress: "saán", de: "wo / wohin", topic: "frage" },
    { id: "w_sino", tl: "sino", stress: "síno", de: "wer", topic: "frage" },
    { id: "w_magkano", tl: "magkano", stress: "magkáno", de: "wie viel (Preis)", topic: "frage" },

    // Zustaende und Eigenschaften
    { id: "w_pagod", tl: "pagod", stress: "pagód", de: "müde", topic: "zustand" },
    { id: "w_gutom", tl: "gutom", stress: "gutóm", de: "hungrig", topic: "zustand" },
    { id: "w_masarap", tl: "masarap", stress: "masaráp", de: "lecker", topic: "zustand" },
    { id: "w_mainit", tl: "mainit", stress: "mainít", de: "heiß", topic: "zustand" },
    { id: "w_maganda", tl: "maganda", stress: "magandá", de: "schön", topic: "zustand" },
    { id: "w_mabait", tl: "mabait", stress: "mabaít", de: "nett / lieb", topic: "zustand" },

    // Dinge
    { id: "w_tubig", tl: "tubig", stress: "túbig", de: "Wasser", topic: "ding" },
    { id: "w_kanin", tl: "kanin", stress: "kanín", de: "gekochter Reis", note: "Ungekochter Reis heißt bigas.", topic: "ding" },
    { id: "w_bahay", tl: "bahay", stress: "báhay", de: "Haus", topic: "ding" },
    { id: "w_ito", tl: "ito", stress: "itó", de: "dies / das hier", topic: "ding" },
    { id: "w_piso", tl: "piso", stress: "píso", de: "Peso", topic: "ding" },

    // Zahlen
    { id: "n_1", tl: "isa", stress: "isá", de: "eins", topic: "zahl" },
    { id: "n_2", tl: "dalawa", stress: "dalawá", de: "zwei", topic: "zahl" },
    { id: "n_3", tl: "tatlo", stress: "tatló", de: "drei", topic: "zahl" },
    { id: "n_4", tl: "apat", stress: "ápat", de: "vier", topic: "zahl" },
    { id: "n_5", tl: "lima", stress: "limá", de: "fünf", topic: "zahl" },
    { id: "n_6", tl: "anim", stress: "ánim", de: "sechs", topic: "zahl" },
    { id: "n_7", tl: "pito", stress: "pitó", de: "sieben", topic: "zahl" },
    { id: "n_8", tl: "walo", stress: "waló", de: "acht", topic: "zahl" },
    { id: "n_9", tl: "siyam", stress: "siyám", de: "neun", topic: "zahl" },
    { id: "n_10", tl: "sampu", stress: "sampû", de: "zehn", topic: "zahl" }
  ];

  var sentences = [
    { id: "s_pangalan", tl: "Ano ang pangalan mo?", de: "Wie heißt du?", parts: ["Ano", "ang", "pangalan", "mo?"] },
    { id: "s_akosi", tl: "Ako si Alex.", de: "Ich bin Alex.", parts: ["Ako", "si", "Alex."] },
    { id: "s_pagod", tl: "Pagod ako.", de: "Ich bin müde.", parts: ["Pagod", "ako."] },
    { id: "s_gutomka", tl: "Gutom ka ba?", de: "Bist du hungrig?", parts: ["Gutom", "ka", "ba?"] },
    { id: "s_hindigutom", tl: "Hindi ako gutom.", de: "Ich bin nicht hungrig.", parts: ["Hindi", "ako", "gutom."] },
    { id: "s_masarap", tl: "Masarap ito.", de: "Das ist lecker.", parts: ["Masarap", "ito."] },
    { id: "s_magkano", tl: "Magkano po ito?", de: "Wie viel kostet das? (höflich)", parts: ["Magkano", "po", "ito?"] },
    { id: "s_tubig", tl: "Mainit ang tubig.", de: "Das Wasser ist heiß.", parts: ["Mainit", "ang", "tubig."] },
    { id: "s_bahay", tl: "Maganda ang bahay.", de: "Das Haus ist schön.", parts: ["Maganda", "ang", "bahay."] },
    { id: "s_mabaitsi", tl: "Mabait si Ana.", de: "Ana ist nett.", parts: ["Mabait", "si", "Ana."] },
    { id: "s_kumustaka", tl: "Kumusta ka?", de: "Wie geht es dir?", parts: ["Kumusta", "ka?"] },
    { id: "s_mabutinaman", tl: "Mabuti naman, salamat.", de: "Gut, danke.", parts: ["Mabuti", "naman,", "salamat."] },
    { id: "s_kaibigan", tl: "Mabait na kaibigan si Ana.", de: "Ana ist eine nette Freundin.", parts: ["Mabait", "na", "kaibigan", "si", "Ana."] }
  ];

  // Lueckentexte: answer ist der Index in options
  var clozes = [
    { id: "c1", before: "", after: " ako.", de: "Ich bin müde.", options: ["Pagod", "Tubig", "Saan"], answer: 0, why: "Die Eigenschaft steht vorne, das Pronomen danach. Ein Wort für „bin“ gibt es nicht." },
    { id: "c2", before: "Ano ", after: " pangalan mo?", de: "Wie heißt du?", options: ["ang", "si", "ka"], answer: 0, why: "ang markiert das Thema des Satzes: hier den Namen." },
    { id: "c3", before: "Ako ", after: " Alex.", de: "Ich bin Alex.", options: ["si", "ang", "po"], answer: 0, why: "Vor Personennamen steht si statt ang." },
    { id: "c4", before: "Maganda ", after: " bahay.", de: "Das Haus ist schön.", options: ["ang", "si", "ba"], answer: 0, why: "bahay ist kein Name, also ang." },
    { id: "c5", before: "Masarap ", after: ".", de: "Das ist lecker.", options: ["ito", "ako", "saan"], answer: 0, why: "ito heißt „das hier“." },
    { id: "c6", before: "Hindi ", after: " gutom.", de: "Ich bin nicht hungrig.", options: ["ako", "ang", "si"], answer: 0, why: "Nach hindi rückt das Pronomen direkt nach vorne: Hindi ako gutom." },
    { id: "c7", before: "Magkano ", after: " ito?", de: "Wie viel kostet das? (höflich)", options: ["po", "ang", "ba"], answer: 0, why: "po macht den Satz höflich, z.B. gegenüber Verkäufern." },
    { id: "c8", before: "Gutom ka ", after: "?", de: "Bist du hungrig?", options: ["ba", "po", "ang"], answer: 0, why: "ba macht aus einer Aussage eine Ja/Nein-Frage." },
    { id: "c9", before: "Mabait ", after: " Ana.", de: "Ana ist nett.", options: ["si", "ang", "ka"], answer: 0, why: "Ana ist ein Name, also si." },
    { id: "c10", before: "Magandang ", after: " po.", de: "Guten Morgen. (höflich)", options: ["umaga", "gabi", "tubig"], answer: 0, why: "umaga ist der Morgen, gabi der Abend." },
    { id: "c11", before: "Mabait ", after: " kaibigan.", de: "ein netter Freund", options: ["na", "ng", "ang"], answer: 0, why: "Endet das erste Wort auf einen Konsonanten, verbindet na die beiden Wörter." }
  ];

  // Warum-Karten: Grammatik mit Logik dahinter. quiz: kurze Fragen mit Antwortindex
  var grammar = [
    {
      id: "g_praedikat",
      title: "Das Wichtigste kommt zuerst",
      body: [
        "Im Tagalog steht das, was man über etwas sagt, meistens am Anfang des Satzes.",
        "Pagod ako heißt wörtlich „Müde ich“. Ein Wort für „sein“ (bin, bist, ist) gibt es dafür nicht."
      ],
      examples: [["Pagod ako.", "Ich bin müde."], ["Masarap ito.", "Das ist lecker."]],
      quiz: [
        { q: "Wie sagst du „Ich bin hungrig“?", options: ["Gutom ako.", "Gutom si ako.", "Ako gutom."], answer: 0 },
        { q: "Was fehlt im Tagalog-Satz im Vergleich zum Deutschen?", options: ["das Wort für „sein“", "das Pronomen", "die Eigenschaft"], answer: 0 }
      ]
    },
    {
      id: "g_angsi",
      title: "ang und si: Worum geht es?",
      body: [
        "ang zeigt an, worum es im Satz geht, also das Thema.",
        "Bei Personennamen steht statt ang das Wörtchen si."
      ],
      examples: [["Maganda ang bahay.", "Das Haus ist schön."], ["Mabait si Ana.", "Ana ist nett."]],
      quiz: [
        { q: "Welches Wort passt: Mainit ___ tubig.", options: ["ang", "si"], answer: 0 },
        { q: "Welches Wort passt: Pagod ___ Marco.", options: ["si", "ang"], answer: 0 }
      ]
    },
    {
      id: "g_kaikaw",
      title: "ka oder ikaw?",
      body: [
        "Beide heißen „du“. ka ist die kurze Form und darf nie am Satzanfang stehen.",
        "Steht „du“ ganz vorne, nimmt man ikaw."
      ],
      examples: [["Gutom ka ba?", "Bist du hungrig?"], ["Ikaw ba si Alex?", "Bist du Alex?"]],
      quiz: [
        { q: "Welches passt: Pagod ___?", options: ["ka", "ikaw"], answer: 0 },
        { q: "Welches passt: ___ ba si Ana?", options: ["Ikaw", "Ka"], answer: 0 }
      ]
    },
    {
      id: "g_linker",
      title: "Der Kleber -ng und na",
      body: [
        "Eigenschaft und Ding werden mit einem kleinen Kleber verbunden.",
        "Endet das erste Wort auf einen Vokal, hängt man -ng an: maganda + umaga = magandang umaga.",
        "Endet es auf einen Konsonanten, steht na dazwischen: mabait na kaibigan."
      ],
      examples: [["Magandang umaga.", "Guten Morgen."], ["mabait na kaibigan", "ein netter Freund"]],
      quiz: [
        { q: "Wie heißt „schönes Haus“?", options: ["magandang bahay", "maganda na bahay", "maganda bahay"], answer: 0 },
        { q: "Wie heißt „heißes Wasser“? (mainit endet auf t)", options: ["mainit na tubig", "mainitng tubig", "mainit tubig"], answer: 0 }
      ]
    },
    {
      id: "g_po",
      title: "po und opo: Respekt",
      body: [
        "Zu Älteren, Fremden oder Kunden hängt man po an den Satz. Das ist wie ein freundliches Sie.",
        "opo ist das höfliche Ja, oo das lockere."
      ],
      examples: [["Salamat po.", "Danke. (höflich)"], ["Magkano po ito?", "Wie viel kostet das? (höflich)"]],
      quiz: [
        { q: "Die Mutter eines Freundes fragt dich etwas. Du sagst ja:", options: ["Opo.", "Oo."], answer: 0 },
        { q: "Was macht po im Satz?", options: ["Es macht ihn höflich.", "Es macht ihn zur Frage.", "Es verneint ihn."], answer: 0 }
      ]
    },
    {
      id: "g_ba",
      title: "ba macht eine Frage",
      body: [
        "Mit ba wird aus einer Aussage eine Ja/Nein-Frage.",
        "ba steht nach dem ersten Wort, kommt aber nach kurzen Pronomen wie ka: Gutom ka ba?"
      ],
      examples: [["Gutom ka.", "Du bist hungrig."], ["Gutom ka ba?", "Bist du hungrig?"]],
      quiz: [
        { q: "Wie fragst du „Bist du müde?“", options: ["Pagod ka ba?", "Ba pagod ka?", "Pagod ba ka?"], answer: 0 }
      ]
    },
    {
      id: "g_hindi",
      title: "Verneinen mit hindi",
      body: [
        "hindi kommt an den Anfang.",
        "Kurze Pronomen wie ako oder ka rücken direkt hinter hindi."
      ],
      examples: [["Gutom ako.", "Ich bin hungrig."], ["Hindi ako gutom.", "Ich bin nicht hungrig."]],
      quiz: [
        { q: "Wie sagst du „Ich bin nicht müde“?", options: ["Hindi ako pagod.", "Hindi pagod ako.", "Ako hindi pagod."], answer: 0 }
      ]
    }
  ];

  // Aussprache: Regeln mit Hoerbeispielen. Betonungspaare brauchen spaeter echte Aufnahmen.
  var pronunciation = [
    { id: "p_ng", title: "ng am Wortanfang", tip: "Wie das ng in „Ding“, aber ganz vorne. Kein hörbares g.", examples: ["ngayon", "ngiti", "Ngayon na."] },
    { id: "p_mga", title: "mga = manga", tip: "Das Wörtchen für die Mehrzahl wird „manga“ gesprochen.", examples: ["mga kaibigan", "mga bahay"] },
    { id: "p_vokale", title: "Klare Vokale", tip: "a, e, i, o, u werden kurz und klar gesprochen. Jeder Buchstabe wird ausgesprochen.", examples: ["salamat", "kaibigan", "pangalan"] },
    { id: "p_po", title: "Kurzes po", tip: "po ist kurz und leicht, fast nur angehängt.", examples: ["Salamat po.", "Opo."] },
    { id: "p_r", title: "Gerolltes r", tip: "Das r ist ein kurz angeschlagenes Zungen-r, wie im Spanischen.", examples: ["masarap", "barangay"] },
    { id: "p_betonung", title: "Betonung ändert die Bedeutung", tip: "Gleiche Buchstaben, andere Betonung: áso (Hund) und asó (Rauch). Lies die Akzente mit.", examples: ["Kumusta ka?", "Magandang gabi."] }
  ];

  var culture = [
    { id: "k_mano", title: "Mano po", text: "Jüngere nehmen die Hand einer älteren Person und führen sie kurz an die eigene Stirn. Diese Geste heißt pagmamano und zeigt Respekt. Das Wort mano kommt aus dem Spanischen und heißt Hand.", word: ["Mano po.", "Ihre Hand bitte (Respektsgeste)."] },
    { id: "k_adobo", title: "Adobo", text: "Fleisch, geschmort in Essig, Sojasauce, Knoblauch und Lorbeer. Das Schmoren in Essig gab es schon vor der Kolonialzeit, den Namen brachten die Spanier mit. Jede Familie schwört auf ihr eigenes Rezept.", word: ["Masarap ang adobo.", "Das Adobo ist lecker."] },
    { id: "k_kapre", title: "Der Kapre", text: "Ein riesiges, behaartes Wesen aus der philippinischen Mythologie. Er wohnt in großen alten Bäumen wie dem Balete und raucht Zigarren. Wer nachts Rauch in einer Baumkrone sieht, denkt an den Kapre.", word: ["kapre", "Baumriese aus der Mythologie"] },
    { id: "k_barangay", title: "Barangay", text: "Die kleinste Verwaltungseinheit des Landes, vergleichbar mit einem Ortsteil. Der Name geht auf balangay zurück, einen Bootstyp, mit dem früher ganze Familienverbände reisten.", word: ["barangay", "Ortsteil, kleinste Verwaltungseinheit"] },
    { id: "k_tagbanua", title: "Die Tagbanua in Palawan", text: "Die Tagbanua sind eine indigene Gruppe in Palawan. Sie haben eine eigene traditionelle Schrift, eine der wenigen alten philippinischen Schriften, die bis heute erhalten sind.", word: ["Tagbanua", "indigene Gruppe in Palawan"] },
    { id: "k_jeepney", title: "Jeepney", text: "Nach dem Zweiten Weltkrieg blieben viele US-Militärjeeps im Land. Sie wurden verlängert, bunt bemalt und zu Sammeltaxis umgebaut. Heute werden viele alte Jeepneys durch modernere Fahrzeuge ersetzt.", word: ["Para po!", "Bitte anhalten! (beim Aussteigen)"] },
    { id: "k_bayanihan", title: "Bayanihan", text: "Gemeinschaftssinn: Früher trugen Nachbarn ein ganzes Holzhaus auf Bambusstangen an einen neuen Ort. Heute steht bayanihan allgemein für gegenseitige Hilfe.", word: ["bayanihan", "Gemeinschaftshilfe"] },
    { id: "k_merienda", title: "Merienda", text: "Die Zwischenmahlzeit am Nachmittag, oft etwas Süßes wie turon (frittierte Banane im Teigblatt) oder Reiskuchen. Das Wort kommt aus dem Spanischen.", word: ["Merienda tayo!", "Lass uns Merienda machen!"] }
  ];

  window.CONTENT = {
    week: 1,
    title: "Überleben und Smalltalk",
    words: words,
    sentences: sentences,
    clozes: clozes,
    grammar: grammar,
    pronunciation: pronunciation,
    culture: culture
  };
})();
