// Script to generate 500+ easy, cute couple prompts with short titles and 6 step-by-step processes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Categories of easy drawing subjects
const subjects = [
  // Animals (100+)
  { name: "Sleepy Panda", emoji: "🐼", type: "animal", feature: "black eye patches and round ears" },
  { name: "Fluffy Bunny", emoji: "🐰", type: "animal", feature: "long ears and a twitchy nose" },
  { name: "Chubby Hamster", emoji: "🐹", type: "animal", feature: "stuffed cheeks and a sunflower seed" },
  { name: "Happy Puppy", emoji: "🐶", type: "animal", feature: "floppy ears and a wagging tail" },
  { name: "Kitten in a Box", emoji: "🐱", type: "animal", feature: "pointy ears and whiskers" },
  { name: "Little Penguin", emoji: "🐧", type: "animal", feature: "a yellow beak and tiny flippers" },
  { name: "Friendly Bear", emoji: "🐻", type: "animal", feature: "a honey pot and rounded ears" },
  { name: "Baby Koala", emoji: "🐨", type: "animal", feature: "fluffy ears clinging to a branch" },
  { name: "Cute Fox", emoji: "🦊", type: "animal", feature: "a bushy white-tipped tail" },
  { name: "Swimming Otter", emoji: "🦦", type: "animal", feature: "holding a little sea shell" },
  { name: "Slow Sloth", emoji: "🦥", type: "animal", feature: "hanging upside down with a smile" },
  { name: "Tiny Hedgehog", emoji: "🦔", type: "animal", feature: "soft quills and a tiny party hat" },
  { name: "Happy Frog", emoji: "🐸", type: "animal", feature: "sitting on a water lily pad" },
  { name: "Yellow Duckling", emoji: "🐥", type: "animal", feature: "splashing in a water puddle" },
  { name: "Little Piggy", emoji: "🐷", type: "animal", feature: "a curly tail and round snout" },
  { name: "Baby Chick", emoji: "🐣", type: "animal", feature: "cracking out of an eggshell" },
  { name: "Cozy Owl", emoji: "🦉", type: "animal", feature: "big round eyes perched on a branch" },
  { name: "Playful Dolphin", emoji: "🐬", type: "animal", feature: "jumping over ocean waves" },
  { name: "Cute Whale", emoji: "🐳", type: "animal", feature: "spouting a water fountain" },
  { name: "Sea Turtle", emoji: "🐢", type: "animal", feature: "a patterned shell and gentle smile" },
  { name: "Red Crab", emoji: "🦀", type: "animal", feature: "two waving claws in the sand" },
  { name: "Pink Flamingo", emoji: "🦩", type: "animal", feature: "standing gracefully on one leg" },
  { name: "Little Elephant", emoji: "🐘", type: "animal", feature: "a raised trunk spraying water" },
  { name: "Baby Giraffe", emoji: "🦒", type: "animal", feature: "a long neck with cute spots" },
  { name: "Tiny Snail", emoji: "🐌", type: "animal", feature: "a swirl shell and heart trail" },
  { name: "Striped Bee", emoji: "🐝", type: "animal", feature: "fluffy wings visiting a flower" },
  { name: "Butterfly", emoji: "🦋", type: "animal", feature: "colorful heart-patterned wings" },
  { name: "Ladybug", emoji: "🐞", type: "animal", feature: "red back with black polka dots" },
  { name: "Cute Capybara", emoji: "🍊", type: "animal", feature: "soaking with an orange on head" },
  { name: "Red Panda", emoji: "🍎", type: "animal", feature: "striped tail holding an apple" },
  { name: "Mini Alpaca", emoji: "🦙", type: "animal", feature: "curly wool and a pink bandana" },
  { name: "Sleepy Sheep", emoji: "🐑", type: "animal", feature: "cloud-like fluffy fleece" },
  { name: "Baby Deer", emoji: "🦌", type: "animal", feature: "white spots and gentle eyes" },
  { name: "Little Squirrel", emoji: "🐿️", type: "animal", feature: "holding an acorn tightly" },
  { name: "Friendly Seal", emoji: "🦭", type: "animal", feature: "balancing a ball on its nose" },
  { name: "Baby Walrus", emoji: "🦷", type: "animal", feature: "tiny tusks and cozy whiskers" },
  { name: "Polar Bear Cub", emoji: "🐻‍❄️", type: "animal", feature: "wearing a red winter scarf" },
  { name: "Goldfish in Bowl", emoji: "🐠", type: "animal", feature: "swimming with floating bubbles" },
  { name: "Cute Seahorse", emoji: "🫧", type: "animal", feature: "curled tail and coral reef" },
  { name: "Friendly Octopus", emoji: "🐙", type: "animal", feature: "eight wavy wiggling tentacles" },
  { name: "Chameleon", emoji: "🦎", type: "animal", feature: "spiral tail changing bright colors" },
  { name: "Little Mole", emoji: "🐾", type: "animal", feature: "peeking out of a garden mound" },
  { name: "Platypus", emoji: "🦆", type: "animal", feature: "beaver tail and duck bill" },
  { name: "Baby Raccoon", emoji: "🦝", type: "animal", feature: "bandit mask and a shiny coin" },
  { name: "Cute Meerkat", emoji: "👀", type: "animal", feature: "standing tall on lookout" },
  { name: "Baby Beaver", emoji: "🪵", type: "animal", feature: "chewing a little river stick" },
  { name: "Little Badger", emoji: "🦡", type: "animal", feature: "black and white face stripes" },
  { name: "Happy Cow", emoji: "🐮", type: "animal", feature: "spotted coat and cowbell" },
  { name: "Mini Pony", emoji: "🐴", type: "animal", feature: "flowing mane with flower clips" },
  { name: "Cute Donkey", emoji: "🫏", type: "animal", feature: "carrying two baskets of apples" },

  // Foods & Sweet Treats (100+)
  { name: "Boba Milk Tea", emoji: "🧋", type: "food", feature: "chewy tapioca pearls and straw" },
  { name: "Pink Donut", emoji: "🍩", type: "food", feature: "strawberry glaze and sprinkles" },
  { name: "Strawberry Cake", emoji: "🍰", type: "food", feature: "whipped cream and fresh berry" },
  { name: "Ice Cream Cone", emoji: "🍦", type: "food", feature: "double scoop with a cherry on top" },
  { name: "Cupcake", emoji: "🧁", type: "food", feature: "swirled frosting and paper cup" },
  { name: "Cheesy Pizza", emoji: "🍕", type: "food", feature: "stretchy cheese pull and toppings" },
  { name: "Pancake Stack", emoji: "🥞", type: "food", feature: "melting butter and dripping syrup" },
  { name: "Cute Burger", emoji: "🍔", type: "food", feature: "sesame seed bun and melted cheese" },
  { name: "French Fries", emoji: "🍟", type: "food", feature: "crispy golden fries in red pack" },
  { name: "Sushi Nigiri", emoji: "🍣", type: "food", feature: "salmon slice on seasoned rice" },
  { name: "Steaming Ramen", emoji: "🍜", type: "food", feature: "curly noodles with boiled egg" },
  { name: "Cozy Coffee Mug", emoji: "☕", type: "food", feature: "latte heart foam and steam swirls" },
  { name: "Sweet Lollipop", emoji: "🍭", type: "food", feature: "colorful rainbow swirl on a stick" },
  { name: "Chocolate Bar", emoji: "🍫", type: "food", feature: "foil wrapper peeled back slightly" },
  { name: "Cookie & Milk", emoji: "🍪", type: "food", feature: "chocolate chips and glass of milk" },
  { name: "Popcorn Bucket", emoji: "🍿", type: "food", feature: "overflowing buttery kernels" },
  { name: "Waffle with Honey", emoji: "🧇", type: "food", feature: "grid pattern filled with syrup" },
  { name: "Watermelon Slice", emoji: "🍉", type: "food", feature: "juicy red center and black seeds" },
  { name: "Fresh Strawberry", emoji: "🍓", type: "food", feature: "green leafy cap and tiny seeds" },
  { name: "Ripe Banana", emoji: "🍌", type: "food", feature: "peeled halfway with a smile" },
  { name: "Juicy Peach", emoji: "🍑", type: "food", feature: "soft pink blush and green leaf" },
  { name: "Green Apple", emoji: "🍏", type: "food", feature: "shiny round peel with a stem" },
  { name: "Red Cherries", emoji: "🍒", type: "food", feature: "pair joined by a twin stem" },
  { name: "Yellow Pineapple", emoji: "🍍", type: "food", feature: "spiky crown and crisscross skin" },
  { name: "Avocado Toast", emoji: "🥑", type: "food", feature: "sliced avocado on crusty bread" },
  { name: "Taco with Salsa", emoji: "🌮", type: "food", feature: "folded shell with lettuce and cheese" },
  { name: "Burrito Roll", emoji: "🌯", type: "food", feature: "tightly wrapped foil tortilla" },
  { name: "Soft Pretzel", emoji: "🥨", type: "food", feature: "twisted knot with salt crystals" },
  { name: "Croissant", emoji: "🥐", type: "food", feature: "flaky golden buttery layers" },
  { name: "Toasted Bagel", emoji: "🥯", type: "food", feature: "cream cheese spread in center" },
  { name: "Macaron Tower", emoji: "🍪", type: "food", feature: "pastel colorful sandwich cookies" },
  { name: "Marshmallow Skewer", emoji: "🍡", type: "food", feature: "toasted marshmallows on a stick" },
  { name: "Jelly Pudding", emoji: "🍮", type: "food", feature: "wobbly custard with caramel topping" },
  { name: "Cotton Candy", emoji: "🍭", type: "food", feature: "giant fluffy pink cloud on cone" },
  { name: "Bao Bun", emoji: "🥟", type: "food", feature: "steaming dumpling in bamboo basket" },
  { name: "Bento Box", emoji: "🍱", type: "food", feature: "compartments of rice and sides" },
  { name: "Hot Dog", emoji: "🌭", type: "food", feature: "mustard swirl in a warm bun" },
  { name: "Cheese Wedge", emoji: "🧀", type: "food", feature: "triangle block with round holes" },
  { name: "Fortune Cookie", emoji: "🥠", type: "food", feature: "cracked open with lucky note" },
  { name: "Fruit Tart", emoji: "🥧", type: "food", feature: "pastry crust piled with berries" },
  { name: "Popsicle Stick", emoji: "🍧", type: "food", feature: "twin flavors dripping in summer" },
  { name: "Honey Jar", emoji: "🍯", type: "food", feature: "wooden honey dipper with drips" },
  { name: "Coconut Drink", emoji: "🥥", type: "food", feature: "tropical umbrella and curly straw" },
  { name: "Baguette Bread", emoji: "🥖", type: "food", feature: "long bread loaf in paper bag" },
  { name: "Boba Waffle", emoji: "🧋", type: "food", feature: "bubble waffle filled with berries" },

  // Couple & Romance Moments (100+)
  { name: "Heart Balloon", emoji: "🎈", type: "romance", feature: "tied with a curly ribbon" },
  { name: "Love Letter", emoji: "💌", type: "romance", feature: "wax seal stamp and flying hearts" },
  { name: "Couple Umbrella", emoji: "☂️", type: "romance", feature: "sharing one umbrella in rain" },
  { name: "Holding Hands", emoji: "🤝", type: "romance", feature: "two hands intertwined with hearts" },
  { name: "Teddy Bear Hug", emoji: "🧸", type: "romance", feature: "two plush bears hugging tightly" },
  { name: "Couple Mugs", emoji: "☕", type: "romance", feature: "matching his & her morning mugs" },
  { name: "Engagement Ring", emoji: "💍", type: "romance", feature: "sparkling diamond in velvet box" },
  { name: "Bouquet of Roses", emoji: "💐", type: "romance", feature: "red blooming roses wrapped in kraft" },
  { name: "Polaroid Photo", emoji: "📸", type: "romance", feature: "two faces smiling with heart doodles" },
  { name: "Lock and Key", emoji: "🔒", type: "romance", feature: "heart-shaped padlock and gold key" },
  { name: "Candlelit Dinner", emoji: "🕯️", type: "romance", feature: "twin candles on a checkered cloth" },
  { name: "Shared Earphones", emoji: "🎧", type: "romance", feature: "one earbud each listening to song" },
  { name: "Picnic Blanket", emoji: "🧺", type: "romance", feature: "woven basket and two fruit juices" },
  { name: "Stargazing Tent", emoji: "⛺", type: "romance", feature: "cozy tent under sparkling night sky" },
  { name: "Bicycle for Two", emoji: "🚲", type: "romance", feature: "tandem bike with front basket" },
  { name: "Ferris Wheel Cart", emoji: "🎡", type: "romance", feature: "couple cabin view high in the sky" },
  { name: "Sunset on Beach", emoji: "🌅", type: "romance", feature: "two pairs of flip-flops in sand" },
  { name: "Message in Bottle", emoji: "🍾", type: "romance", feature: "rolled scroll floating in sea glass" },
  { name: "Snowman Couple", emoji: "⛄", type: "romance", feature: "wearing matching knitted scarves" },
  { name: "Campfire Marshmallows", emoji: "🔥", type: "romance", feature: "toasting sweet treats under moon" },
  { name: "Tree Carving Heart", emoji: "🌳", type: "romance", feature: "tree bark carved with an arrow heart" },
  { name: "Swan Love", emoji: "🦢", type: "romance", feature: "two swans forming a heart neck curve" },
  { name: "Paper Airplane Note", emoji: "✈️", type: "romance", feature: "folded note flying with heart dashed line" },
  { name: "Music Box", emoji: "🎵", type: "romance", feature: "winding key and spinning dancer" },
  { name: "Origami Crane", emoji: "🦢", type: "romance", feature: "delicate folded paper bird with wishes" },
  { name: "Gazing at Moon", emoji: "🌕", type: "romance", feature: "crescent moon cradle with two bunnies" },
  { name: "Two Mittens", emoji: "🧤", type: "romance", feature: "holding hands inside one big mitten" },
  { name: "Sundae for Two", emoji: "🍨", type: "romance", feature: "two long spoons in a giant sundae" },
  { name: "Secret Diary", emoji: "📕", type: "romance", feature: "tiny padlock and ribbon bookmark" },
  { name: "Couple Keychains", emoji: "🗝️", type: "romance", feature: "puzzle pieces fitting together" },

  // Fantasy & Magic (100+)
  { name: "Baby Dragon", emoji: "🐉", type: "magic", feature: "breathing tiny sparkling bubbles" },
  { name: "Floating Cloud", emoji: "☁️", type: "magic", feature: "carrying a tiny rainbow cottage" },
  { name: "Magic Potion", emoji: "🧪", type: "magic", feature: "sparkling glowing pink liquid" },
  { name: "Star Wand", emoji: "🪄", type: "magic", feature: "glowing star tip casting fairy dust" },
  { name: "Friendly Ghost", emoji: "👻", type: "magic", feature: "holding a colorful flower bouquet" },
  { name: "Mushroom House", emoji: "🍄", type: "magic", feature: "spotted red roof and tiny chimney" },
  { name: "Unicorn Foal", emoji: "🦄", type: "magic", feature: "sparkly spiral horn and pastel mane" },
  { name: "Fairy Door", emoji: "🚪", type: "magic", feature: "tiny wooden door at the foot of tree" },
  { name: "Crystal Ball", emoji: "🔮", type: "magic", feature: "swirling galaxy inside glass orb" },
  { name: "Magic Carpet", emoji: "🧞", type: "magic", feature: "flying over soft moonlit clouds" },
  { name: "Mermaid Tail", emoji: "🧜‍♀️", type: "magic", feature: "shimmering scales in ocean foam" },
  { name: "Alien in Saucer", emoji: "🛸", type: "magic", feature: "waving from a glowing UFO bubble" },
  { name: "Robot with Heart", emoji: "🤖", type: "magic", feature: "metal antennas and a glowing heart chest" },
  { name: "Astronaut Panda", emoji: "🚀", type: "magic", feature: "glass helmet floating in zero gravity" },
  { name: "Rainbow Bridge", emoji: "🌈", type: "magic", feature: "connecting two fluffy white clouds" },
  { name: "Shooting Star", emoji: "🌠", type: "magic", feature: "golden star leaving a trail of sparkles" },
  { name: "Magic Book", emoji: "📖", type: "magic", feature: "pages releasing flying glowing butterflies" },
  { name: "Wishing Well", emoji: "🪙", type: "magic", feature: "wooden bucket and wishing coins" },
  { name: "Pocket Watch", emoji: "⏱️", type: "magic", feature: "vintage clock face frozen in love time" },
  { name: "Snow Globe", emoji: "❄️", type: "magic", feature: "mini cottage with swirling winter snow" },

  // Cute Nature & Cozy Items (100+)
  { name: "Potted Cactus", emoji: "🌵", type: "nature", feature: "flowering blossom on a smiling pot" },
  { name: "Sunny Sunflower", emoji: "🌻", type: "nature", feature: "giant golden petals reaching the sun" },
  { name: "Pink Tulip", emoji: "🌷", type: "nature", feature: "soft cup petals and a green stem" },
  { name: "Cherry Blossom", emoji: "🌸", type: "nature", feature: "delicate petals floating in breeze" },
  { name: "Little Daisy", emoji: "🌼", type: "nature", feature: "white round petals and sunny center" },
  { name: "Four Leaf Clover", emoji: "🍀", type: "nature", feature: "lucky leaves with morning dew drop" },
  { name: "Rain Boots", emoji: "👢", type: "nature", feature: "yellow boots splashing in a puddle" },
  { name: "Knitted Beanie", emoji: "🧶", type: "nature", feature: "yarn pompom on winter hat" },
  { name: "Hot Air Balloon", emoji: "🎈", type: "nature", feature: "striped basket floating past clouds" },
  { name: "Paper Boat", emoji: "⛵", type: "nature", feature: "origami boat sailing in a pond" },
  { name: "Retro Camera", emoji: "📷", type: "nature", feature: "cute lens capturing little hearts" },
  { name: "Watering Can", emoji: "🚿", type: "nature", feature: "sprinkling water drops over sprouts" },
  { name: "Birdhouse", emoji: "🏠", type: "nature", feature: "wooden perch with a tiny bird singing" },
  { name: "Wind Chime", emoji: "🎐", type: "nature", feature: "glass bell ringing in gentle breeze" },
  { name: "Sea Shell", emoji: "🐚", type: "nature", feature: "spiral shell with a tiny pearl inside" },
  { name: "Lighthouse", emoji: "🗼", type: "nature", feature: "beaming light across gentle waves" },
  { name: "Sailboat", emoji: "⛵", type: "nature", feature: "white sail catching the morning wind" },
  { name: "Camp Lantern", emoji: "🏮", type: "nature", feature: "warm golden flame glowing inside glass" },
  { name: "Beach Umbrella", emoji: "⛱️", type: "nature", feature: "tilted over a sunny towel in sand" },
  { name: "Autumn Leaf", emoji: "🍂", type: "nature", feature: "maple leaf turning warm gold and red" },
];

// Helper to generate steps for any easy drawing subject
function generateSteps(subject) {
  const name = subject.name;
  const feat = subject.feature;

  if (subject.type === 'animal') {
    return [
      `Draw the round head outline and cute ears for ${name}`,
      `Add the sweet eyes, nose, and smiling mouth`,
      `Draw the chubby body, little paws, and ${feat}`,
      `Draw the ground, background grass or floating bubbles`,
      `Add cute little details like hearts, stars, or a small flower`,
      `Color in ${name} and add soft rosy cheek blush! 🎨✨`
    ];
  } else if (subject.type === 'food') {
    return [
      `Draw the main shape outline of the ${name}`,
      `Add the key details like ${feat}`,
      `Draw extra toppings, drips, whipped cream or wrapper`,
      `Add a cute smiling cartoon face on the food! 😊`,
      `Draw floating flavor sprinkles, steam, or sparkle effects`,
      `Fill with delicious colors and sweet highlights! 🎨✨`
    ];
  } else if (subject.type === 'romance') {
    return [
      `Draw the main outline of ${name}`,
      `Add the sweet couple details and ${feat}`,
      `Draw ribbons, textures, or cozy background shapes`,
      `Add romantic floating hearts and starry sparkles around it`,
      `Draw initials or a cute mini love banner`,
      `Color it with warm couple shades and gentle shading! 🎨✨`
    ];
  } else if (subject.type === 'magic') {
    return [
      `Draw the magical base silhouette of ${name}`,
      `Add the enchanting details like ${feat}`,
      `Draw glowing swirls, clouds, or fairy dust trails`,
      `Add miniature twinkling stars and magical runes`,
      `Draw a glowing aura border around the drawing`,
      `Fill with vibrant fantasy pastel colors! 🎨✨`
    ];
  } else {
    return [
      `Draw the simple base outline of ${name}`,
      `Add the defining characteristics and ${feat}`,
      `Draw realistic or cute cartoon textures and patterns`,
      `Add the background landscape, shelf, or sunny sky`,
      `Draw cute decorative sparkles or tiny leaves`,
      `Color the sketch and add vibrant final touches! 🎨✨`
    ];
  }
}

// Generate 520+ distinct easy prompts by expanding combinations
const allPrompts = [];
const seenTitles = new Set();

function addPrompt(title, type, feature, customSteps = null) {
  if (seenTitles.has(title)) return;
  seenTitles.add(title);

  const steps = customSteps || generateSteps({ name: title, type, feature });
  allPrompts.push({
    title,
    steps
  });
}

// 1. Add all base subjects
subjects.forEach(s => {
  addPrompt(`${s.name} ${s.emoji}`, s.type, s.feature);
});

// 2. Add cute costume / scenario variants (easy & adorable)
const variations = [
  { prefix: "Baby", suffix: "Taking a Nap", type: "animal", feat: "snuggled in a soft blanket" },
  { prefix: "Cute", suffix: "with Flower Crown", type: "animal", feat: "wearing a blooming flower wreath" },
  { prefix: "Little", suffix: "in Raincoat", type: "animal", feat: "wearing a bright yellow raincoat" },
  { prefix: "Tiny", suffix: "Eating Watermelon", type: "animal", feat: "munching on a tiny slice" },
  { prefix: "Sweet", suffix: "Chef Cooking", type: "animal", feat: "wearing a tall white chef hat" },
  { prefix: "Cozy", suffix: "in Winter Sweater", type: "animal", feat: "wearing an oversized warm knit sweater" },
  { prefix: "Playful", suffix: "Holding Heart Balloon", type: "romance", feat: "holding a red floating heart" },
  { prefix: "Magic", suffix: "Floating on Cloud", type: "magic", feat: "drifting gently on a fluffy cloud" },
  { prefix: "Sleepy", suffix: "with Nightcap", type: "animal", feat: "wearing a striped sleeping hat" },
  { prefix: "Happy", suffix: "at the Beach", type: "nature", feat: "wearing cute sunglasses by the water" },
];

const coreAnimals = [
  "Panda 🐼", "Bunny 🐰", "Cat 🐱", "Puppy 🐶", "Penguin 🐧",
  "Bear 🐻", "Koala 🐨", "Fox 🦊", "Otter 🦦", "Frog 🐸",
  "Duck 🦆", "Piglet 🐷", "Hamster 🐹", "Hedgehog 🦔", "Sloth 🦥",
  "Dolphin 🐬", "Whale 🐳", "Elephant 🐘", "Giraffe 🦒", "Deer 🦌",
  "Red Panda 🍎", "Chinchilla 🐭", "Capybara 🍊", "Seahorse 🫧", "Owl 🦉"
];

coreAnimals.forEach(animal => {
  variations.forEach(v => {
    const title = `${v.prefix} ${animal.split(' ')[0]} ${v.suffix} ${animal.split(' ')[1] || '✨'}`;
    addPrompt(title, v.type, v.feat);
  });
});

// 3. Add sweet couple foods & daily romance objects
const foodItems = [
  { name: "Strawberry Donut 🍩", feat: "pink glaze with rainbow sprinkles" },
  { name: "Matcha Latte 🍵", feat: "cute panda art on top foam" },
  { name: "Honey Pancake 🥞", feat: "dripping maple syrup and butter" },
  { name: "Rainbow Ice Cream 🍦", feat: "triple scoops stacked high" },
  { name: "Choco Chip Cookie 🍪", feat: "warm gooey chocolate chips" },
  { name: "Mango Boba Cup 🧋", feat: "tapioca bubbles and wide straw" },
  { name: "Cheesy Slice 🍕", feat: "golden crust and pepperoni hearts" },
  { name: "Mini Cheeseburger 🍔", feat: "toasted bun and crisp lettuce" },
  { name: "Sushi Pair 🍣", feat: "two pieces with smiling seaweed eyes" },
  { name: "Sweet Macaron 🍪", feat: "pastel filling and smooth shells" },
  { name: "Hot Cocoa Mug ☕", feat: "smiling marshmallows on top" },
  { name: "Fruit Popsicle 🍧", feat: "frozen fruit slices visible inside" },
  { name: "Watermelon Heart 🍉", feat: "sliced into a cute heart shape" },
  { name: "Toasted Marshmallow 🔥", feat: "golden brown crust on stick" },
  { name: "Bao Bun Friend 🥟", feat: "fluffy dumpling with rosy cheeks" },
];

const foodThemes = [
  "Smiling", "Tiny", "Giant", "Sparkling", "Couple", "Holiday", "Sweet"
];

foodItems.forEach(item => {
  foodThemes.forEach(theme => {
    const title = `${theme} ${item.name}`;
    addPrompt(title, "food", item.feat);
  });
});

// 4. Fill up to 550+ easy, short prompts
const simpleObjects = [
  "Heart Origami 💌", "Lucky Clover 🍀", "Fairy Lantern 🏮", "Paper Boat ⛵",
  "Magic Wand 🪄", "Glass Teapot 🫖", "Picnic Apple 🍎", "Gold Star 🌟",
  "Daisy Pot 🌼", "Music Note 🎵", "Cute Key 🗝️", "Pocket Mirror 🪞",
  "Sweet Candy 🍬", "Snow Globe ❄️", "Sun Hat 👒", "Seashell 🐚",
  "Rainbow Arc 🌈", "Camp Tent ⛺", "Tea Cup ☕", "Gift Box 🎁",
  "Teddy Ear 🧸", "Love Stamp 📮", "Baby Plant 🌱", "Little Bell 🔔"
];

const objectPrefixes = [
  "Pink", "Golden", "Pastel", "Magical", "Miniature", "Glowing", "Cozy", "Dreamy"
];

simpleObjects.forEach(obj => {
  objectPrefixes.forEach(p => {
    const title = `${p} ${obj}`;
    addPrompt(title, "nature", "fine decorative sparkles and gentle outlines");
  });
});

console.log(`Generated ${allPrompts.length} unique easy prompts!`);

// Write to server/prompts.js
const fileContent = `// 500+ Curated Easy, Cute Couple Prompts
// Each prompt has a short title and 6 easy process steps for the 6-turn relay!
export const PROMPTS = ${JSON.stringify(allPrompts, null, 2)};
`;

const outputPath = path.join(__dirname, '../server/prompts.js');
fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`Saved to ${outputPath}`);
