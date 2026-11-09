/* SignWheel compatibility readings.
 *
 * Original plain-word texts for the cross-chart contacts that carry a
 * two-person reading, written for this site from standard astrological
 * doctrine. Keyed by planet pair (in Engine.PLANETS order), then by
 * contact kind: "joined" (conjunction), "easy" (trine, sextile),
 * "hard" (square, opposition). Bodies are name-free on purpose: the
 * page headings carry the two people's names, and the texts speak of
 * "one of you" and "the other", so the same text serves any pair.
 *
 * Shape rules (spec section 5.3, LEGAL-CHECKS section 6): conditional
 * words only (tends to, can, often), patterns described, never a real
 * person's hidden feelings, no promises about what a pair will do,
 * no health, money or life-decision advice, no em dashes.
 */
"use strict";

const SYNASTRY_TEXTS = {
  "Sun|Moon": {
    joined: "One person's core self and the other person's feelings sit in the same sign, so each tends to feel oddly familiar to the other, like meeting someone you already know. Being together can feel natural very quickly. The watch-out is assuming you understand each other without checking, because the fit feels easier than it is.",
    easy: "One person's identity and the other person's emotional style flow in the same direction. The one tends to feel seen, and the other tends to feel at home, without either trying hard. Pairs with this contact often describe an easy rhythm: one leads, the other settles, and both call it normal.",
    hard: "One person's core self pulls against the other person's feelings. What one does without thinking can land on the other as a mood, and what the other needs emotionally can look like a demand to the first. This is a workable contact, but it asks for translation: naming needs out loud instead of expecting them to be obvious.",
  },
  "Sun|Sun": {
    joined: "Both of you carry the same Sun sign, so your basic way of being in the world rhymes. You are likely to want similar things from a day and to rate the same people. The strength is instant understanding. The risk is doubling the sign's weak spot, since neither of you naturally supplies the opposite habit.",
    easy: "Your two Sun signs sit in signs that get along, the same element or a friendly one. You tend to respect each other's way of doing things even where you differ, and cheering each other on costs neither of you much. Pairs often find shared projects easy to start with this contact in the mix.",
    hard: "Your two Sun signs stand at a friction angle, so your basic styles can grate: one person's normal is the other person's too much, or too little. This is not a verdict against the pair. It is the contact that produces the most honest feedback, as long as both of you can hear a style difference as a difference, not a fault.",
  },
  "Moon|Moon": {
    joined: "Your Moons share a sign, so your emotional weather runs on the same clock. You tend to be comforted by the same things, rattled by the same things, and hungry, tired or quiet at similar times. Home and rest are easy to arrange between you. Heavy days can sync too, so one person's low mood may find the other already there.",
    easy: "Your two Moon signs sit in signs that understand each other, so your feelings tend to arrive in a language the other can read. Comfort is easy to offer because it is easy to recognise. Pairs with this contact often settle arguments quickly, since neither has to explain why something small felt big.",
    hard: "Your Moons stand at a friction angle, so your comfort styles differ: one of you may talk feelings out while the other goes quiet, or one recharges with people while the other recharges alone. Neither way is wrong, but each can misread the other at tired moments. Agreeing on signals early saves a lot of guessing.",
  },
  "Venus|Mars": {
    joined: "Affection and desire sit in the same sign between you, so attraction and liking tend to arrive together rather than in turns. One person's warmth meets the other person's energy in the same register, which is why pairs notice a spark with this contact. The heat is real; keeping it kind is the part to practise.",
    easy: "One person's Venus and the other person's Mars flow well, so affection and pursuit tend to land as intended. Compliments, timing and touch are more likely to be welcome than awkward. This is the classic easy-attraction contact: it does not run a relationship by itself, but it makes the early weather between two people notably warm.",
    hard: "Affection and desire pull at a friction angle here. One person's way of showing love can miss the other person's way of wanting it, so you may get crossed signals: too much, too soon, or warm words at a moment the other wanted action. The pull is usually still there. It is the timing and translation that need care.",
  },
  "Venus|Venus": {
    joined: "Your Venus signs match, so you tend to like the same things: similar taste in rooms, food, music, money habits and free time. Being pleased together is easy, and gifts are rarely hard to choose. The shared blind spot is shared too, since neither of you naturally argues for the taste you both lack.",
    easy: "Your two Venus signs get along, so your styles of affection and pleasure blend without much friction. You are likely to enjoy each other's company in the simple sense: shared treats, shared jokes, an easy sense of what a good evening looks like. Pairs often find this a quietly sustaining contact over years.",
    hard: "Your Venus signs stand at a friction angle, so your tastes and love languages differ. One person's treat can be the other person's chore, and one may show care with words while the other shows it with deeds. The fix is ordinary and it works: ask what lands as care, then believe the answer.",
  },
  "Mars|Mars": {
    joined: "Your Mars signs match, so your energy, pace and temper run on the same settings. You tend to start things the same way and get annoyed by the same things. Working or playing side by side can feel powerful. Arguing can too, because neither of you backs down at a different speed than the other.",
    easy: "Your two Mars signs sit in signs that cooperate, so your drives tend to help rather than block each other. One person's push can arrive just as the other is ready to move. Pairs with this contact often make good teams for physical work, sport, travel and getting difficult things done.",
    hard: "Your Mars signs stand at a friction angle, so your pace and temper differ. One of you may charge while the other circles, or one fights hot while the other goes cold. Competition between you can turn sharp if it is not kept playful. Agreeing who leads on what, job by job, takes most of the sting out.",
  },
  "Sun|Venus": {
    joined: "One person's core self and the other person's Venus share a sign, so the second tends to simply like the first as they are. Admiration and warmth come easily, and being together can feel good for its own sake. It is a kind contact. It does not settle practical questions, but it makes them easier to sit down with.",
    easy: "Identity and affection flow between you, so one person tends to feel appreciated by the other without performing for it. Encouragement lands. Pairs often find this contact in long friendships as much as in romances: it is the feeling of being on the same side, expressed warmly and often.",
    hard: "One person's core self and the other person's affections pull at a friction angle. Admiration may come with a condition attached, or tastes may differ enough that one feels unappreciated doing what the other loves. It usually settles once both learn that being liked and being agreed with are two different gifts.",
  },
  "Moon|Venus": {
    joined: "Feelings and affection share a sign between you, so care tends to be felt as care. One person's moods meet the other person's tenderness in the same language, which makes comfort quick and quarrels shorter. This is one of the gentlest contacts two charts can have. Its only risk is how easy it makes leaning.",
    easy: "One person's Moon and the other person's Venus flow together, so kindness tends to arrive in the form the other can actually receive. Small comforts, food, rest, a well timed kind word: these land. Pairs with this contact often say the other person is easy to be sad around, which is a rarer compliment than it sounds.",
    hard: "Feelings and affection pull at a friction angle. One person may need comfort in a form the other does not instinctively give, so care can be offered sincerely and still miss. Naming the form you need, plainly and before you are upset, is nearly the whole cure for this contact.",
  },
  "Mercury|Mercury": {
    joined: "Your Mercury signs match, so your minds run on similar tracks. You tend to find the same things funny, argue in the same shape, and finish each other's reasoning. Talking together is easy to start and hard to stop. The shared limit is that you may both skip the same step in an argument and call it obvious.",
    easy: "Your two Mercury signs sit in signs that understand each other, so conversation tends to flow across your differences. You may think at different speeds or in different styles, but translation is cheap. Pairs with this contact often solve problems well together, because each can hear the other's point before it is fully built.",
    hard: "Your Mercury signs stand at a friction angle, so your thinking styles differ: one may decide fast and revise later while the other decides slowly and once. Debates can feel personal when they are really about method. The pair gains a lot from one habit: summarising the other person's point back before answering it.",
  },
  "Sun|Mars": {
    joined: "One person's core self and the other person's drive share a sign, so the second tends to push the first into motion, for better and sometimes for louder. Energy between you is rarely the problem. The question this contact asks is who sets the direction, because both the engine and the steering wheel feel strong here.",
    easy: "Identity and drive flow between you, so one person's plans tend to meet the other person's energy at the right moment. Getting things done together feels natural, and encouragement comes out as action, not just words. Pairs with this contact often describe each other as motivating, which is this aspect at its best.",
    hard: "One person's core self and the other person's drive pull at a friction angle. Encouragement can land as pressure, and help can land as taking over. The energy is strong enough to be worth handling carefully: agree the goal out loud, then let the driver drive and the owner of the plan keep the map.",
  },
};

/* One line of plain meaning per planet, used in the contact table and
 * the "more threads" list so no planet name stands unexplained. */
const PLANET_PLAIN = {
  Sun: "identity and drive",
  Moon: "feelings and comfort",
  Mercury: "mind and talking",
  Venus: "affection and taste",
  Mars: "energy and temper",
  Jupiter: "growth and big plans",
  Saturn: "duty, limits and patience",
  Uranus: "change and surprise",
  Neptune: "dreams and imagination",
  Pluto: "depth and intensity",
};

/* The five contact kinds, in plain words. */
const ASPECT_PLAIN = {
  joined: { name: "Joined", gloss: "in the same place, so the theme runs strong" },
  sextile: { name: "Friendly", gloss: "a soft angle, chances that open if you take them" },
  trine: { name: "Flowing", gloss: "an easy angle, things that tend to just work" },
  square: { name: "Friction", gloss: "a sharp angle, where your styles push on each other" },
  opposition: { name: "Head-on", gloss: "facing each other, a pull between two ends" },
};

if (typeof module !== "undefined") module.exports = { SYNASTRY_TEXTS, PLANET_PLAIN, ASPECT_PLAIN };
if (typeof window !== "undefined") {
  window.SYNASTRY_TEXTS = SYNASTRY_TEXTS;
  window.PLANET_PLAIN = PLANET_PLAIN;
  window.ASPECT_PLAIN = ASPECT_PLAIN;
}
