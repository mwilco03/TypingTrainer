import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ProgressionEngine from '../engine/ProgressionEngine';

// ============================================================================
// TYPING JOURNAL
// Free-form writing using only mastered keys. Kids type anything they want,
// but the keyboard only accepts keys they've learned through lessons/games.
// Creates ownership, creative expression, and reinforces learned keys.
// ============================================================================

const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.','/'],
];

// Simple word bank for filtering by mastered keys
const WORD_BANK = [
  // 1-2 letter
  'a','i','an','as','at','be','by','do','go','he','if','in','is','it','me','my','no','of',
  'on','or','so','to','up','us','we',
  // 3 letter
  'ace','add','age','ago','aid','aim','air','all','and','ant','any','ape','arc','are','ark',
  'arm','art','ash','ask','ate','awe','axe','bad','bag','ban','bar','bat','bed','bet','big',
  'bin','bit','bow','box','boy','bud','bug','bun','bus','but','buy','cab','can','cap','car',
  'cat','cob','cod','cog','cop','cow','cry','cub','cud','cup','cur','cut','dab','dad','dam',
  'day','den','dew','did','dig','dim','dip','doe','dog','don','dot','dry','dub','dud','due',
  'dug','dun','duo','dye','ear','eat','eel','egg','ego','elk','elm','emu','end','era','eve',
  'ewe','eye','fan','far','fat','fax','fed','fee','few','fig','fin','fir','fit','fix','fly',
  'foe','fog','for','fox','fry','fun','fur','gag','gal','gap','gas','gel','gem','get','gin',
  'gnu','god','got','gum','gun','gut','guy','gym','had','ham','has','hat','hay','hen','her',
  'hew','hid','him','hip','his','hit','hob','hog','hop','hot','how','hub','hue','hug','hum',
  'hut','ice','icy','ill','imp','ink','inn','ion','ire','irk','its','ivy','jab','jag','jam',
  'jar','jaw','jay','jet','jig','job','jog','jot','joy','jug','jut','keg','ken','key','kid',
  'kin','kit','lab','lad','lag','lap','law','lay','lea','led','leg','let','lid','lie','lip',
  'lit','log','lot','low','lug','mad','man','map','mar','mat','maw','may','men','met','mid',
  'mix','mob','mod','mom','mop','mow','mud','mug','mum','nab','nag','nap','net','new','nil',
  'nip','nit','nod','nor','not','now','nub','nun','nut','oak','oar','oat','odd','ode','off',
  'oft','ohm','oil','old','one','opt','orb','ore','our','out','owe','owl','own','pad','pal',
  'pan','pap','par','pat','paw','pay','pea','peg','pen','pep','per','pet','pew','pie','pig',
  'pin','pit','ply','pod','pop','pot','pow','pro','pry','pub','pug','pun','pup','pus','put',
  'rag','ram','ran','rap','rat','raw','ray','red','ref','rib','rid','rig','rim','rip','rob',
  'rod','roe','rot','row','rub','rug','rum','run','rut','rye','sac','sad','sag','sap','sat',
  'saw','say','sea','set','sew','she','shy','sin','sip','sir','sis','sit','six','ski','sky',
  'sly','sob','sod','son','sop','sot','sow','soy','spa','spy','sty','sub','sue','sum','sun',
  'sup','tab','tad','tag','tan','tap','tar','tat','tax','tea','ten','the','thy','tic','tie',
  'tin','tip','toe','ton','too','top','tot','tow','toy','try','tub','tug','tun','two','urn',
  'use','van','vat','vet','vex','via','vie','vim','vow','wad','wag','war','was','wax','way',
  'web','wed','wet','who','why','wig','win','wit','woe','wok','won','woo','wop','wow','yak',
  'yam','yap','yaw','yea','yes','yet','yew','you','yow','zap','zed','zen','zig','zip','zoo',
  // 4 letter
  'able','ache','acid','aged','also','arch','area','army','auto','away','back','bail','bake',
  'bald','ball','band','bang','bank','bare','bark','barn','base','bath','bead','beak','beam',
  'bean','bear','beat','been','beer','bell','belt','bend','best','bike','bill','bind','bird',
  'bite','blow','blue','blur','boar','boat','body','bold','bolt','bomb','bond','bone','book',
  'boom','boot','bore','born','boss','both','bowl','bulb','bulk','bull','bump','burn','bury',
  'bush','busy','buzz','cafe','cage','cake','calf','call','calm','came','camp','cane','cape',
  'card','care','cart','case','cash','cast','cave','cent','chin','chip','chop','city','clad',
  'clam','clap','claw','clay','clip','club','clue','coal','coat','code','coil','coin','cold',
  'colt','comb','come','cone','cook','cool','cope','copy','cord','core','cork','corn','cost',
  'cosy','coup','crab','crew','crop','crow','cube','cult','curb','cure','curl','cute','damp',
  'dare','dark','dart','dash','data','dawn','dead','deaf','deal','dear','debt','deck','deed',
  'deem','deep','deer','deli','demo','dent','deny','desk','dial','dice','diet','dime','dine',
  'dire','dirt','disc','dish','disk','dock','does','dome','done','doom','door','dose','dove',
  'down','drag','draw','drip','drop','drum','dual','dubs','duck','duel','duke','dull','dumb',
  'dump','dune','dung','dusk','dust','duty','each','earn','ease','east','easy','echo','edge',
  'else','emit','epic','even','ever','evil','exam','exit','eyed','face','fact','fade','fail',
  'fair','fake','fall','fame','fang','fare','farm','fast','fate','fawn','fear','feat','feed',
  'feel','feet','fell','felt','fend','fern','file','fill','film','find','fine','fire','firm',
  'fish','fist','five','flag','flap','flat','flaw','flea','fled','flew','flip','flit','flog',
  'flow','foam','foil','fold','folk','fond','food','fool','foot','ford','fore','fork','form',
  'fort','foul','four','fowl','free','frog','from','fuel','full','fume','fund','furl','fury',
  'fuse','fuss','fuzz','gain','gait','gale','game','gang','gape','garb','gate','gave','gawk',
  'gaze','gear','germ','gift','gild','gill','girl','gist','give','glad','glee','glen','glow',
  'glue','glum','gnat','gnaw','goad','goal','goat','goes','gold','golf','gone','gong','good',
  'goof','grab','grad','gray','grew','grid','grim','grin','grip','grit','grow','gulf','gull',
  'gulp','gust','guts','hack','hail','hair','hale','half','hall','halt','hand','hang','hare',
  'harm','harp','hash','hasp','hate','haul','have','hawk','haze','hazy','head','heal','heap',
  'hear','heat','heed','heel','held','helm','help','herb','herd','here','hero','hide','high',
  'hike','hill','hilt','hind','hint','hire','hiss','hive','hoax','hold','hole','holy','home',
  'hood','hook','hoop','hope','horn','hose','host','hour','howl','huge','hull','hump','hung',
  'hunt','hurl','hurt','hush','hymn','idea','idle','inch','into','iron','isle','item','jack',
  'jade','jail','jamb','jaws','jazz','jean','jest','jobs','join','joke','jolt','jury','just',
  'keen','keep','kelp','kept','kick','kill','kind','king','kiss','kite','knee','knew','knit',
  'knob','knot','know','lace','lack','laid','lair','lake','lamb','lame','lamp','land','lane',
  'lard','lark','lash','lass','last','late','lawn','lazy','lead','leaf','leak','lean','leap',
  'left','lend','lens','lent','less','liar','lice','lick','lieu','life','lift','like','limb',
  'lime','limp','line','link','lint','lion','list','live','load','loaf','loam','loan','lock',
  'loft','logo','lone','long','look','loom','loop','loot','lord','lore','lose','loss','lost',
  'loud','love','luck','lull','lump','lung','lure','lurk','lush','lust','made','mail','main',
  'make','male','mall','malt','mane','many','mare','mark','mars','mash','mask','mass','mast',
  'mate','maze','meal','mean','meat','meek','meet','meld','melt','memo','mend','menu','mere',
  'mesh','mess','mice','mild','mile','milk','mill','mime','mind','mine','mint','mire','miss',
  'mist','moan','moat','mock','mode','mold','mole','mood','moon','moor','more','moss','most',
  'moth','move','much','muck','mule','mull','muse','mush','must','mute','myth','nail','name',
  'nape','navy','near','neat','neck','need','nest','news','next','nice','nick','nine','node',
  'none','noon','norm','nose','note','noun','null','numb','oath','obey','odds','odor','once',
  'only','onto','ooze','open','opus','oral','orca','ours','oust','oven','over','owed','pace',
  'pack','page','paid','pail','pain','pair','pale','palm','pane','pang','pant','park','part',
  'pass','past','path','pave','peak','peal','pear','peat','peck','peek','peel','peer','pelt',
  'pend','perk','pest','pick','pier','pike','pile','pill','pine','pink','pipe','plan','play',
  'plea','plod','plot','plow','ploy','plug','plum','plus','pock','poem','poet','poke','pole',
  'poll','polo','pond','pool','poor','pope','pore','pork','port','pose','post','pour','pray',
  'prey','prod','prop','prow','pull','pulp','pump','punk','pure','push','quit','quiz','race',
  'rack','raft','rage','raid','rail','rain','rake','ramp','rang','rank','rant','rare','rash',
  'rate','rave','read','real','ream','reap','rear','reed','reef','reel','rein','rely','rend',
  'rent','rest','rice','rich','ride','rift','rill','rind','ring','rink','riot','ripe','rise',
  'risk','road','roam','roar','robe','rock','rode','role','roll','roof','room','root','rope',
  'rose','rosy','rote','rout','rove','rude','ruin','rule','rump','rung','runt','ruse','rush',
  'rust','sack','safe','sage','said','sail','sake','sale','salt','same','sand','sane','sang',
  'sank','sash','save','scan','scar','seal','seam','seat','seed','seek','seem','seen','self',
  'sell','send','sent','shed','shin','ship','shoe','shoo','shop','shot','show','shut','sick',
  'side','sift','sigh','sign','silk','sill','silt','sing','sink','sire','site','size','skim',
  'skin','skip','slab','slam','slap','slat','sled','slew','slid','slim','slip','slit','slob',
  'slop','slot','slow','slug','slum','slur','smog','snap','snip','snow','snub','snug','soak',
  'soap','soar','sock','soda','sofa','soft','soil','sold','sole','some','song','soon','soot',
  'sore','sort','soul','sour','span','spar','spec','sped','spin','spit','spot','spry','spur',
  'stab','stag','star','stay','stem','step','stew','stir','stop','stub','stud','stun','such',
  'suit','sulk','sung','sunk','sure','surf','swan','swap','swim','swum','tack','tact','tail',
  'take','tale','talk','tall','tame','tang','tank','tape','tart','task','team','tear','tell',
  'tend','tent','term','test','text','than','that','them','then','they','thin','this','tick',
  'tide','tidy','tied','tier','tile','till','tilt','time','tiny','tire','toad','toil','told',
  'toll','tomb','tone','took','tool','tops','tore','torn','tour','town','trap','tray','tree',
  'trek','trim','trio','trip','trod','trot','true','tuck','tube','tuft','tuna','tune','turf',
  'turn','tusk','twin','type','ugly','undo','unit','unto','upon','urge','used','user','vain',
  'vale','vane','vary','vase','vast','veil','vein','vend','vent','verb','very','vest','veto',
  'view','vine','visa','void','volt','vote','wade','wage','wail','wait','wake','walk','wall',
  'wand','want','ward','warm','warn','warp','wart','wary','wash','wasp','wave','wavy','waxy',
  'weak','weal','wear','weed','week','well','welt','went','were','west','what','when','whim',
  'whip','whom','wick','wide','wife','wild','will','wilt','wily','wimp','wind','wine','wing',
  'wink','wipe','wire','wise','wish','wisp','with','wits','woke','wolf','womb','wood','wool',
  'word','wore','work','worm','worn','wove','wrap','wren','writ','yank','yard','yarn','year',
  'yell','yoga','yoke','your','zeal','zero','zest','zinc','zone','zoom',
];

function getAvailableWords(masteredKeys) {
  const keySet = new Set(masteredKeys.map(k => k.toLowerCase()));
  return WORD_BANK.filter(word =>
    [...word].every(ch => keySet.has(ch))
  );
}

// Sentence prompts built from simple words - filtered by available keys
const PROMPT_TEMPLATES = [
  ['a', 'sad', 'lad'],
  ['dad', 'had', 'a', 'salad'],
  ['all', 'fall', 'fast'],
  ['the', 'dog', 'ran'],
  ['a', 'big', 'fish'],
  ['she', 'had', 'a', 'hat'],
  ['the', 'red', 'bird'],
  ['a', 'cool', 'game'],
  ['the', 'kind', 'king'],
  ['a', 'blue', 'lake'],
  ['a', 'dark', 'cave'],
  ['the', 'gold', 'ring'],
  ['run', 'fast', 'and', 'jump'],
  ['the', 'moon', 'rose'],
  ['a', 'warm', 'fire'],
  ['the', 'wise', 'owl'],
  ['make', 'a', 'wish'],
  ['find', 'the', 'lost', 'key'],
  ['i', 'like', 'cake'],
  ['she', 'is', 'nice'],
  ['he', 'ran', 'home'],
  ['a', 'good', 'book'],
  ['look', 'at', 'the', 'star'],
  ['i', 'had', 'fun'],
  ['the', 'cat', 'sat'],
  ['a', 'long', 'road'],
  ['my', 'best', 'friend'],
  ['the', 'sun', 'is', 'hot'],
  ['a', 'soft', 'bed'],
  ['the', 'fish', 'can', 'swim'],
];

function getPrompts(availableWords) {
  const wordSet = new Set(availableWords);
  return PROMPT_TEMPLATES
    .filter(words => words.every(w => wordSet.has(w)))
    .map(words => words.join(' '));
}

// Journal entry storage key
const JOURNAL_KEY = 'typingTainer_journal';

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

// ============================================================================
// Mini keyboard display
// ============================================================================

function MiniKeyboard({ masteredKeySet, blockedKey }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-xs text-center text-amber-500 mb-2 font-medium">
        Your Available Keys
      </div>
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1 mb-1" style={{ paddingLeft: ri * 16 }}>
          {row.map(key => {
            const isMastered = masteredKeySet.has(key);
            const isBlocked = blockedKey === key;
            return (
              <div
                key={key}
                className={`
                  w-8 h-8 flex items-center justify-center rounded-md text-sm font-mono font-bold
                  transition-all duration-200
                  ${isBlocked
                    ? 'bg-red-200 text-red-600 scale-110 ring-2 ring-red-300'
                    : isMastered
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-gray-100 text-gray-300 border border-gray-200'
                  }
                `}
              >
                {key.toUpperCase()}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex justify-center mt-1">
        <div className="w-48 h-7 flex items-center justify-center rounded-md text-xs font-mono bg-amber-100 text-amber-600 border border-amber-300">
          SPACE
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Journal entries list
// ============================================================================

function EntryList({ entries, onDelete, onClose }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-800">My Journal Entries</h2>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
          >
            Back to Writing
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="text-center py-16 text-amber-600">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-lg font-medium">No entries yet</p>
            <p className="text-sm mt-1 text-amber-500">Start writing to fill your journal!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-amber-500">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {' · '}{entry.wordCount} word{entry.wordCount !== 1 ? 's' : ''}
                    {entry.availableKeys > 0 && ` · ${entry.availableKeys} keys available`}
                  </div>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-gray-300 hover:text-red-400 text-xs ml-2"
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Writing prompts panel
// ============================================================================

function PromptsPanel({ prompts, availableWords, onUsePrompt, onClose }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-amber-600 font-semibold uppercase tracking-wider">
          Writing Ideas
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      {prompts.length > 0 ? (
        <div className="mb-3">
          <div className="text-xs text-amber-500 mb-2">
            Try typing one of these (only uses your mastered keys):
          </div>
          <div className="flex flex-wrap gap-2">
            {prompts.slice(0, 8).map((p, i) => (
              <button
                key={i}
                onClick={() => onUsePrompt(p)}
                className="text-sm px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                &ldquo;{p}&rdquo;
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-500 mb-3">
          Learn more keys to unlock writing prompts!
        </p>
      )}

      {availableWords.length > 0 && (
        <div className="pt-3 border-t border-amber-100">
          <div className="text-xs text-amber-500 mb-1 font-medium">
            Words you can spell ({availableWords.length}):
          </div>
          <div className="text-sm text-amber-700 leading-relaxed">
            {availableWords.slice(0, 40).join(', ')}
            {availableWords.length > 40 && (
              <span className="text-amber-400"> ...and {availableWords.length - 40} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

// Keys that always pass through regardless of mastery
const ALWAYS_ALLOWED = new Set([
  'Backspace', 'Delete', 'Enter', 'Tab', 'Escape',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown',
  ' ', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
]);

export default function TypingJournal({
  progressData,
  onRecordKeystroke,
  onEndSession,
  onNavigate,
}) {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState(loadEntries);
  const [showEntries, setShowEntries] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [blockedKey, setBlockedKey] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const lastKeyTimeRef = useRef(0);
  const previousKeyRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const charCountRef = useRef(0);
  const correctCountRef = useRef(0);
  const keysUsedRef = useRef(new Set());
  const blockedTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const masteredKeys = useMemo(
    () => ProgressionEngine.getMasteredKeys(progressData),
    [progressData]
  );

  const masteredKeySet = useMemo(
    () => new Set(masteredKeys.map(k => k.toLowerCase())),
    [masteredKeys]
  );

  const availableWords = useMemo(
    () => getAvailableWords(masteredKeys),
    [masteredKeys]
  );

  const prompts = useMemo(
    () => getPrompts(availableWords),
    [availableWords]
  );

  // Cleanup blocked key timer
  useEffect(() => {
    return () => {
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Always allow control keys, modifiers, space, backspace, etc.
    if (ALWAYS_ALLOWED.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Only handle single-character printable keys
    if (e.key.length !== 1) return;

    const lower = e.key.toLowerCase();
    const now = Date.now();
    const ikiMs = lastKeyTimeRef.current > 0 ? now - lastKeyTimeRef.current : 0;

    // If no keys tracked yet (brand new user), allow everything
    const hasAnyMetrics = Object.keys(progressData.keyMetrics).length > 0;

    if (!hasAnyMetrics || masteredKeySet.has(lower)) {
      // Key is mastered or no tracking yet - allow
      charCountRef.current += 1;
      correctCountRef.current += 1;
      keysUsedRef.current.add(lower);
      onRecordKeystroke(lower, true, ikiMs, previousKeyRef.current);
    } else {
      // Key not mastered - block input, show indicator
      e.preventDefault();
      charCountRef.current += 1;
      onRecordKeystroke(lower, false, ikiMs, previousKeyRef.current);

      setBlockedKey(lower);
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = setTimeout(() => setBlockedKey(null), 700);
    }

    previousKeyRef.current = lower;
    lastKeyTimeRef.current = now;
  }, [masteredKeySet, progressData.keyMetrics, onRecordKeystroke]);

  // Save an entry to the journal
  const saveEntry = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length < 3) return false;

    const entry = {
      id: Date.now(),
      text: trimmed,
      date: new Date().toISOString(),
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      availableKeys: masteredKeys.length,
    };

    const updated = [entry, ...entries].slice(0, 50);
    setEntries(updated);
    saveEntries(updated);
    setText('');

    // Flash "saved" indicator
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);

    return true;
  }, [text, entries, masteredKeys]);

  // Report session and navigate away
  const handleQuit = useCallback(() => {
    // Save any unsaved text
    if (text.trim().length >= 3) {
      saveEntry();
    }

    const durationMs = Date.now() - sessionStartRef.current;
    const allText = text.trim();
    const wordCount = allText ? allText.split(/\s+/).filter(Boolean).length : 0;
    const minutes = durationMs / 60000;
    const wpm = minutes > 0.1 ? Math.round(wordCount / minutes) : 0;
    const total = charCountRef.current;
    const correct = correctCountRef.current;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

    if (total > 5) {
      onEndSession({
        game: 'journal',
        durationMs,
        wpm,
        accuracy,
        exerciseCount: wordCount,
        keysUsed: [...keysUsedRef.current],
      });
    }

    onNavigate('#/');
  }, [text, saveEntry, onEndSession, onNavigate]);

  const handleUsePrompt = useCallback((prompt) => {
    setText(prev => (prev && !prev.endsWith(' ') ? prev + ' ' : prev) + prompt);
    setShowPrompts(false);
    textareaRef.current?.focus();
  }, []);

  const handleDeleteEntry = useCallback((id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  }, [entries]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const noKeysYet = masteredKeys.length === 0 && Object.keys(progressData.keyMetrics).length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-amber-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleQuit}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium shrink-0"
            >
              ← Back
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-amber-800 truncate">My Typing Journal</h1>
              <p className="text-xs text-amber-600 truncate">Free writing with your mastered keys</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <div className="text-amber-700 hidden sm:block">
              <span className="font-bold">{wordCount}</span> words
            </div>
            <div className="text-amber-600 hidden sm:block">
              <span className="font-bold">{masteredKeys.length}</span> keys
            </div>
            <button
              onClick={() => setShowEntries(!showEntries)}
              className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-medium transition-colors"
            >
              {showEntries ? 'Write' : `Journal (${entries.length})`}
            </button>
          </div>
        </div>
      </div>

      {showEntries ? (
        <EntryList
          entries={entries}
          onDelete={handleDeleteEntry}
          onClose={() => setShowEntries(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Writing area */}
          <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-4 pb-2 flex flex-col">
            {/* Prompt toggle */}
            {masteredKeys.length > 0 && (
              <div className="mb-2">
                {showPrompts ? (
                  <PromptsPanel
                    prompts={prompts}
                    availableWords={availableWords}
                    onUsePrompt={handleUsePrompt}
                    onClose={() => setShowPrompts(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowPrompts(true)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                  >
                    Need an idea? Show writing prompts ▾
                  </button>
                )}
              </div>
            )}

            {/* No keys message */}
            {noKeysYet && (
              <div className="bg-amber-100 rounded-xl p-5 text-center mb-4">
                <div className="text-3xl mb-2">✨</div>
                <p className="text-amber-800 font-medium">Start a lesson first!</p>
                <p className="text-sm text-amber-600 mt-1">
                  Practice in Type Flow or Type Quest to learn keys, then come back to write freely.
                </p>
                <button
                  onClick={() => onNavigate('#/')}
                  className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                >
                  Go to Lessons
                </button>
              </div>
            )}

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  noKeysYet
                    ? 'Learn some keys in a lesson first...'
                    : masteredKeys.length < 5
                    ? 'Type anything using your mastered keys...'
                    : 'Write whatever comes to mind. A story, a list, a thought...'
                }
                className="w-full h-full min-h-[280px] p-6 bg-white rounded-2xl shadow-sm border-2 border-amber-100 focus:border-amber-300 focus:outline-none resize-none text-gray-800 text-lg leading-8 font-mono"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(transparent, transparent 31px, #fef3c7 31px, #fef3c7 32px)',
                  backgroundPosition: '0 27px',
                }}
                disabled={noKeysYet}
                autoFocus={!noKeysYet}
              />

              {/* Blocked key indicator */}
              {blockedKey && (
                <div
                  className="absolute top-4 right-4 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
                  style={{ animation: 'shake 0.4s ease-in-out' }}
                >
                  &apos;{blockedKey.toUpperCase()}&apos; not learned yet
                </div>
              )}

              {/* Saved flash */}
              {savedFlash && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                  Saved!
                </div>
              )}
            </div>

            {/* Save button + word count (mobile) */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-amber-600 sm:hidden">
                {wordCount} word{wordCount !== 1 ? 's' : ''} · {masteredKeys.length} keys
              </div>
              {text.trim().length >= 3 && (
                <button
                  onClick={saveEntry}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm shadow-sm transition-colors ml-auto"
                >
                  Save Entry ({wordCount} word{wordCount !== 1 ? 's' : ''})
                </button>
              )}
            </div>
          </div>

          {/* Mini keyboard at bottom */}
          <div className="bg-white/80 backdrop-blur border-t border-amber-200 px-4 py-3">
            <MiniKeyboard masteredKeySet={masteredKeySet} blockedKey={blockedKey} />
          </div>
        </div>
      )}

      {/* Inline CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
