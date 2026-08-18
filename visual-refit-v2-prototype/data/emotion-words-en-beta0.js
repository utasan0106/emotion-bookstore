/* ---------------------------------------------------------------------------
 * V2_EMOTION_WORDS_EN — 04「ことば」詳細（意味 / ニュアンス / 近い言葉）の EN 表示層
 *
 * 目的
 *   EN 表示のとき、04 の語詳細パネルが日本語のまま出てしまうのを解消する。
 *
 * 方針
 *   - 正本である V2_EMOTION_WORDS（JA）には一切触れない。上書きもしない。
 *   - ここは「表示のための EN 層」であり、JA を置き換えるものではない。
 *   - 各項目は JA の現行内容と意味が対応する簡潔な英語にとどめ、
 *     感情の意味を再解釈したり、説明を足したりしない。
 *   - キーは V2_EMOTION_WORDS と同じ 21 の感情 ID。
 *     欠けている ID / field があれば adapter 側で JA canonical へ落ちる。
 *   - 既存の CATEGORY_DEF_EN（hero lead の EN）と同じ「並列 EN 辞書」の作り。
 *   - 静的データであり storage / GA4 / network には一切触れない。
 * ------------------------------------------------------------------------ */
(function (global) {
  'use strict';
  global.V2_EMOTION_WORDS_EN = {
    "ureshii": {
      "imi": "A brightening of the heart when something you hoped for happens, or when something you care about is fulfilled.",
      "nuance": "It can arise suddenly at a small piece of news, or linger long after a large event. More than \"fun,\" it tends to be a response to something happening in your favour, though the two often overlap.",
      "near_words": ["Fun", "Happy", "Satisfied", "Relieved"]
    },
    "wakuwaku": {
      "imi": "A feeling drawn toward what is about to happen or is just beginning, where anticipation and a rising energy move together.",
      "nuance": "It usually points at something not yet in hand, close to expectation or elation. Beyond simple enjoyment, it can carry a slight restlessness at facing the unknown.",
      "near_words": ["Looking forward", "Anticipation", "Elation", "Buoyant"]
    },
    "hokorashii": {
      "imi": "Feeling that your own conduct or achievement, or that of someone close to you, has worth, and wanting to hold your head up.",
      "nuance": "It can turn toward yourself, or toward family, friends and others you value. It is tied to events and judgements of worth more than \"confidence\" is, and can hold self-regard or a sense of relationship that \"glad\" alone does not carry.",
      "near_words": ["Sense of achievement", "Confidence", "Glad", "Respect"]
    },
    "ando": {
      "imi": "The relieved feeling of tension leaving your body, as when worry or strain eases.",
      "nuance": "It is used both for the release at the moment anxiety dissolves and for a quiet calm. It ranges from the brief lightness of a deep breath out to a slow settling.",
      "near_words": ["Relieved", "At ease", "Calm", "Sense of release"]
    },
    "kansha": {
      "imi": "Turning toward the help, care or good fortune you have received from someone, and feeling its worth.",
      "nuance": "Along with gladness and warmth, it can carry the sense of having put someone to trouble, or of being indebted. Saying \"thank you\" and the gratitude felt inside are not always the same thing.",
      "near_words": ["Thankful", "Glad", "Apologetic", "Indebted"]
    },
    "itooshii": {
      "imi": "Holding a person, an animal or something in your life as irreplaceable, and drawing your heart toward it.",
      "nuance": "It is used not only for people close to you but also for animals, objects, time that has passed and memories. It can overlap with \"cute,\" but it is used for a depth of care that goes beyond appearance or charm.",
      "near_words": ["Affection", "Cute", "Missing someone"]
    },
    "akogare": {
      "imi": "Being strongly drawn to a person, a way of living or a place, finding it admirable and wanting to come closer to it someday.",
      "nuance": "It can overlap with respect, but rather than only appraising, it can hold an attraction and a distance, as if looking at something from a little way off. It is used for ways of life, occupations, places and eras as well as people.",
      "near_words": ["Respect", "Ideal", "A quickening"]
    },
    "shitto": {
      "imi": "A word used when a relationship feels as though it may be shaken, or when comparing yourself with others leaves your heart unsettled.",
      "nuance": "It is used both when an important relationship feels threatened and when you begrudge what someone else has. It does not point to a single feeling; anxiety and anger can be layered into it.",
      "near_words": ["Envy", "Longing for what others have", "Anxiety"]
    },
    "natsukashii": {
      "imi": "The movement of the heart back through time when you touch a person, place or event from the past.",
      "nuance": "Along with warmth and gladness, it can carry the loneliness and ache of not being able to return. It is sometimes used for eras and scenes you never experienced yourself; it is a word closely tied to time.",
      "near_words": ["Nostalgia", "Missing something", "Bittersweet", "Lonely"]
    },
    "kanashii": {
      "imi": "The feeling of the heart sinking at what was lost, what hurt, or what did not turn out as hoped.",
      "nuance": "It can stay quietly for a long time, or well up all at once. It overlaps with loneliness, frustration and disappointment, but \"sad\" is a broad word, not limited to one cause or relationship.",
      "near_words": ["Lonely", "Bittersweet", "Painful", "Disappointed"]
    },
    "kodoku": {
      "imi": "The state or feeling of being set apart on your own, sensing that connection and sharing with others is not enough.",
      "nuance": "Being alone and feeling lonely are not the same. It can arise even among others, and conversely time alone can be comfortable, so it is worth keeping apart from \"isolation\" or simply \"being by yourself.\"",
      "near_words": ["Lonely", "Forlorn", "Feeling shut out", "Isolation"]
    },
    "gakkari": {
      "imi": "The feeling of deflating when what you expected does not come, or the result you hoped for does not arrive.",
      "nuance": "Rather than deep sorrow, what comes forward is the drop from where you had expected to be. It is used for small letdowns and large disappointments alike, and can lead on to regret, emptiness or sadness.",
      "near_words": ["Let down", "A shame", "Sad", "Empty"]
    },
    "fuan": {
      "imi": "The unsettled feeling that comes with not knowing how things will turn out, or with the possibility that something bad may happen.",
      "nuance": "More than \"afraid,\" which faces a clear danger in front of you, it tends to face what cannot be read or is not certain. It ranges from brief worry to a long-lasting restlessness.",
      "near_words": ["Worry", "Afraid", "Restless", "Forlorn"]
    },
    "aseri": {
      "imi": "The feeling of being driven to do something quickly, pressed by time or circumstance while things do not move as you wish.",
      "nuance": "It can appear strongly and briefly, or stay faintly for a long time. More than \"anxiety,\" the urgency that hurries action comes forward; more than \"frustration,\" it carries the sense of being chased yourself.",
      "near_words": ["Urgency", "Anxiety", "Frustration", "Irritation"]
    },
    "odoroki": {
      "imi": "The feeling of your attention snapping into focus on meeting something unexpected or a sudden change.",
      "nuance": "It works for glad surprise, frightening surprise, and surprise whose good or bad is not yet decided. It often rises in an instant, and may then move on into joy, anxiety or anger.",
      "near_words": ["Startled", "Bewildered", "Wonder", "Shock"]
    },
    "ikari": {
      "imi": "The feeling that can make you push back strongly when you sense you have been hurt, treated unfairly, or obstructed.",
      "nuance": "It ranges from small irritation to deep indignation. It can turn toward another person, or toward yourself or the situation, and unlike \"disgust,\" which wants distance, it can hold a direction of wanting to change or resist.",
      "near_words": ["Irritation", "Indignation", "Frustration", "Disgust"]
    },
    "kuyashii": {
      "imi": "The feeling of being unable to accept how things stand, when you fell short, lost, or did not get the result you wanted.",
      "nuance": "Along with sadness, anger and the thought \"I could have done more\" can be layered in. Where \"regret\" tends to look back at your own choices, this is also used as a response to the result itself and to falling short.",
      "near_words": ["Regret", "Chagrin", "Disappointed", "Anger"]
    },
    "hazukashii": {
      "imi": "The feeling that can make you want to shrink, sensing that how you look or what you did has been exposed to others' eyes.",
      "nuance": "Beyond anxiety about failure or judgement, it is used for the bashfulness of being praised, or for feeling out of place. It can arise from your own standards with no one watching, and cannot be tied to a single cause.",
      "near_words": ["Shame", "Awkward", "Bashful", "Guilty"]
    },
    "ushirometai": {
      "imi": "The feeling of a reproach staying with you, when what you did or what you are hiding catches on someone else's standards or your own.",
      "nuance": "It is used not only for clear wrongdoing but also for what cannot be said, or for not having answered someone well enough. It overlaps with guilt, but concealment, others' eyes and awkwardness sit nearby, so they are not fully the same.",
      "near_words": ["Guilt", "A bad conscience", "Indebted", "Ashamed"]
    },
    "keno": {
      "imi": "The feeling of strong discomfort or unacceptability toward a person, thing or act, which can bring the wish to keep it at a distance.",
      "nuance": "It is used both for what feels physically unpleasant and for when you strongly cannot accept someone's actions or way of thinking. It can overlap with \"dislike\" or \"contempt,\" but it does not mean the same thing.",
      "near_words": ["Unpleasant", "Dislike", "Contempt"]
    },
    "moyamoya": {
      "imi": "The sense of something catching in your heart, or not clearing, while no word yet fits it.",
      "nuance": "It happens both when you know the reason and when you cannot yet put it into words. It includes the sense of leaving something vague, rather than settling on one name such as \"anxiety\" or \"irritation.\"",
      "near_words": ["Unsettled", "Something off", "A snag"]
    }
  };
})(typeof window !== 'undefined' ? window : this);
