defmodule Fog.Names do
  @places {
    {"Discworld", "Terry Pratchett’s “Discworld” series"},
    {"Arrakis", "Frank Herbert’s “Dune” series"},
    {"R’lyeh", "H.P. Lovecraft’s Cthulhu Mythos"},
    {"Gormenghast", "Mervyn Peake’s “Gormenghast” series"},
    {"Luggnagg", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Lilliput", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Laputa", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Mordor", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Lothlórien", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"The Citadel", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"King’s Landing", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Winterfell", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Casterly Rock", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"The Two Rivers", "Robert Jordan’s “The Wheel of Time” series"},
    {"Tar Valon", "Robert Jordan’s “The Wheel of Time” series"},
    {"Galt’s Gulch", "Ayn Rand’s “Atlas Shrugged”"},
    {"Hogsmeade", "J.K. Rowling’s “Harry Potter” series"},
    {"Diagon Alley", "J.K. Rowling’s “Harry Potter” series"},
    {"Rivendell", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Minas Tirith", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"The Wall", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Casterly Rock", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"The Two Rivers", "Robert Jordan’s “The Wheel of Time” series"},
    {"Tar Valon", "Robert Jordan’s “The Wheel of Time” series"},
    {"Galt’s Gulch", "Ayn Rand’s “Atlas Shrugged”"},
    {"Gondor", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Neverwhere", "Neil Gaiman’s “Neverwhere”"},
    {"Ankh-Morpork", "Terry Pratchett’s “Discworld” series"},
    {"Elfhame", "Holly Black’s “The Folk of the Air” series"},
    {"Red London", "V.E. Schwab’s “Shades of Magic” series"},
    {"Camorr", "Scott Lynch’s “Gentleman Bastard” series"},
    {"Imre", "Patrick Rothfuss’s “The Kingkiller Chronicle” series"},
    {"Roshar", "Brandon Sanderson’s “The Stormlight Archive” series"},
    {"Ravka", "Leigh Bardugo’s “Grishaverse” series"},
    {"Azeroth", "Various authors’ “World of Warcraft” series"},
    {"Middle-earth", "J.R.R. Tolkien’s “The Lord of the Rings” and “The Hobbit”"},
    {"The Shire", "J.R.R. Tolkien’s “The Lord of the Rings” and “The Hobbit”"},
    {"Hogwarts", "J.K. Rowling’s “Harry Potter” series"},
    {"Neverland", "J.M. Barrie’s “Peter Pan”"},
    {"The Capitol", "Suzanne Collins’s “The Hunger Games” series"},
    {"Lilliput", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"R’lyeh", "H.P. Lovecraft’s Cthulhu Mythos"},
    {"Eldorado", "Voltaire’s “Candide”"},
    {"Luggnagg", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Wonderland", "Lewis Carroll’s “Alice’s Adventures in Wonderland”"},
    {"Whoville", "Dr. Seuss’s “How the Grinch Stole Christmas!”"},
    {"Oz", "L. Frank Baum’s “The Wonderful Wizard of Oz”"},
    {"Narnia", "C.S. Lewis’s “The Chronicles of Narnia” series"},
    {"Hogwarts", "J.K. Rowling’s “Harry Potter” series"},
    {"Neverland", "J.M. Barrie’s “Peter Pan”"},
    {"Luggnagg", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Lilliput", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Gulliver’s Island", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Elsinore", "William Shakespeare’s “Hamlet”"},
    {"Sherwood Forest", "Folklore and legends of Robin Hood"},
    {"Avalon", "Arthurian legends"},
    {"Xanadu", "Samuel Taylor Coleridge’s “Kubla Khan”"},
    {"Casablanca", "From the movie “Casablanca”"},
    {"Tralfamadore", "Kurt Vonnegut’s “Slaughterhouse-Five”"},
    {"Midgard", "Norse mythology"},
    {"Riverrun", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Deadalus’ Labyrinth", "Greek mythology"},
    {"Yggdrasil", "Norse mythology"},
    {"Gilead", "Margaret Atwood’s “The Handmaid’s Tale”"},
    {"Luthadel", "Brandon Sanderson’s “Mistborn” series"},
    {"Tortall", "Tamora Pierce’s “Tortall” series"},
    {"Ember", "Jeanne DuPrau’s “The City of Ember”"},
    {"New Atria", "Ursula K. Le Guin’s “The Dispossessed”"},
    {"London Below", "Neil Gaiman’s “Neverwhere”"},
    {"Camazotz", "Madeleine L’Engle’s “A Wrinkle in Time”"},
    {"Fablehaven", "Brandon Mull’s “Fablehaven” series"},
    {"Emberfall", "Brigid Kemmerer’s “A Curse So Dark and Lonely”"},
    {"Terabithia", "Katherine Paterson’s “Bridge to Terabithia”"},
    {"Terre d’Ange", "Jacqueline Carey’s “Kushiel’s Legacy” series"},
    {"Pemberley", "Jane Austen’s “Pride and Prejudice”"},
    {"Diomira", "Italo Calvino’s “Invisible Cities”"},
    {"Castle Rock", "Stephen King’s various works"},
    {"Starns", "Isaac Asimov’s “Foundation” series"},
    {"Terminus", "Isaac Asimov’s “Foundation” series"},
    {"Imladris", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Agartha", "Mythical city in various cultures"},
    {"Baskerville Hall", "Arthur Conan Doyle’s “The Hound of the Baskervilles”"},
    {"Brigadoon", "From the musical “Brigadoon”"},
    {"The Black Land", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"New Crobuzon", "China Miéville’s “Bas-Lag” series"},
    {"Ankh-Morpork", "Terry Pratchett’s “Discworld” series"},
    {"The Magician’s Nephew", "C.S. Lewis’s “The Chronicles of Narnia” series"},
    {"Citadel of Gondor", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Deeping Wall", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Valinor", "J.R.R. Tolkien’s “The Silmarillion”"},
    {"Land of the Houyhnhnms", "Jonathan Swift’s “Gulliver’s Travels”"},
    {"Xanth", "Piers Anthony’s “Xanth” series"},
    {"Lost City of Zinj", "Michael Crichton’s “Congo”"},
    {"Lusitania", "Orson Scott Card’s “Ender’s Game” series"},
    {"Skellige Isles", "Andrzej Sapkowski’s “The Witcher” series"},
    {"The Iron Islands", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Pellinor", "Alison Croggon’s “Pellinor” series"},
    {"Bas-Lag", "China Miéville’s “Perdido Street Station”"},
    {"Krynn", "Margaret Weis and Tracy Hickman’s “Dragonlance” series"},
    {"Alera", "Jim Butcher’s “Codex Alera” series"},
    {"Earthsea", "Ursula K. Le Guin’s “Earthsea” series"},
    {"The Night Circus", "Erin Morgenstern’s “The Night Circus”"},
    {"Amber", "Roger Zelazny’s “The Chronicles of Amber” series"},
    {"Cthulhu Mythos", "H.P. Lovecraft’s various works"},
    {"The Crossroads", "Neil Gaiman’s “American Gods”"},
    {"Vesper Holly’s World", "Lloyd Alexander’s “Vesper Holly” series"},
    {"Panem", "Suzanne Collins’s “The Hunger Games” series"},
    {"Mid-World", "Stephen King’s “The Dark Tower” series"},
    {"Fólkvangr", "Norse mythology"},
    {"Zephyria", "“Krod Mandoon and the Flaming Sword of Fire”"},
    {"Westeros", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Toontown", "“Who Framed Roger Rabbit”"},
    {"Isengard", "J.R.R. Tolkien’s “The Lord of the Rings”"},
    {"Etheria", "“She-Ra: Princess of Power”"},
    {"The Underland", "Suzanne Collins’s “Gregor the Overlander” series"},
    {"Batcave", "Batman comics and media"},
    {"Ambergris", "Jeff VanderMeer’s “City of Saints and Madmen”"},
    {"Hyrule", "“The Legend of Zelda” video game series"},
    {"Skaro", "“Doctor Who”"},
    {"Bambui", "Bessie Head’s “When Rain Clouds Gather”"},
    {"Thedas", "BioWare’s “Dragon Age” series"},
    {"The Blasted Lands", "J.R.R. Tolkien’s “The Silmarillion”"},
    {"Prythian", "Sarah J. Maas’s “A Court of Thorns and Roses” series"},
    {"The Land of Fiction", "“Doctor Who”"},
    {"Kitezh", "Russian folklore and literature"},
    {"Innsmouth", "H.P. Lovecraft’s “The Shadow over Innsmouth”"},
    {"Amberle", "Terry Brooks’s “The Shannara Chronicles”"},
    {"Wakanda", "Marvel’s “Black Panther”"},
    {"Seven Kingdoms", "George R.R. Martin’s “A Song of Ice and Fire” series"},
    {"Emond’s Field", "Robert Jordan’s “The Wheel of Time” series"},
    {"Freljord", "“League of Legends”"},
    {"Tortuga", "“Pirates of the Caribbean”"},
    {"Paradiso", "Dante Alighieri’s “Divine Comedy”"},
    {"Yharnam", "“Bloodborne” video game"},
    {"Aincrad", "Reki Kawahara’s “Sword Art Online” series"},
    {"Cosmere", "Brandon Sanderson’s interconnected universe"},
    {"Orïsha", "Tomi Adeyemi’s “Children of Blood and Bone”"}
  }

  @adjectives {"mysterious", "sparkling", "whispering", "gloomy", "giggling", "swift",
               "enigmatic", "soaring", "nimble", "jovial", "melodic", "daring", "silent",
               "cunning", "mystical", "playful", "majestic", "chirping", "grumpy", "floating",
               "whimsical", "wise", "mystifying", "troublesome", "mesmerizing", "crafty",
               "gallant", "mischievous", "elegant", "stealthy", "dreaming", "gentle", "dashing",
               "frosty", "elusive", "melancholic", "brave", "charming", "radiant", "tranquil",
               "roaring", "gleaming", "tenacious", "enchanting", "mystic", "serene", "valiant",
               "eloquent", "courageous", "graceful", "captivating", "lively", "charismatic",
               "ebullient", "insightful", "free-spirited", "benevolent", "effervescent", "fierce",
               "resilient", "bountiful", "blazing", "effulgent", "witty", "enlightened",
               "vivacious", "unwavering", "ambrosial", "resolute", "intrepid", "nurturing",
               "soothing", "spirited", "prudent", "reverent", "inquisitive", "vigilant",
               "ephemeral", "indomitable", "undaunted", "steadfast", "mirthful", "illustrious",
               "resplendent", "zealous", "timeless", "bewitching", "fiery", "fearless", "arcane",
               "celestial", "enduring", "fervent", "unyielding", "curious", "stoic", "vibrant"}

  @beings {"raven", "dragon", "owl", "phantom", "gnome", "cheetah", "sphinx", "ghost", "eagle",
           "squirrel", "jester", "mermaid", "pirate", "ninja", "fox", "sorcerer", "pixie", "lion",
           "cricket", "dwarf", "cloud", "unicorn", "wizard", "enchanter", "swallow", "sprite",
           "phoenix", "wanderer", "rabbit", "knight", "fairy", "imp", "swan", "panther",
           "dreamer", "deer", "sparrow", "breeze", "cavalier", "snowflake", "shadow", "poet",
           "lionheart", "minstrel", "sunbeam", "dove", "thunder", "star", "explorer", "nymph",
           "oracle", "lotus", "gremlin", "centaur", "bard", "sirena", "dragoon", "cipher",
           "gazelle", "muse", "trickster", "corsair", "showman", "firefly", "sage", "zephyr",
           "fae", "jaguar", "oak", "harvest", "onyx", "gryphon", "riddler", "comet", "luna",
           "willow", "guru", "siren", "titan", "ambrosia", "sentinel", "whimsy", "voyager",
           "nurturer", "gem", "serenade", "gale", "specter", "guardian", "pilgrim", "curious",
           "watcher", "wisp", "conqueror", "beacon", "luminary", "jewel", "cascade", "riddle",
           "zealot", "relic", "enchantress", "crusader", "inferno", "tranquility", "samurai",
           "chimera", "regent", "conjurer", "astral", "harbinger", "stalwart", "prankster",
           "elder", "jubilee", "reveler", "acolyte", "fortress", "seeker", "daydream",
           "merriment", "spectrum", "apparition", "tempest"}

  def place() do
    i = :rand.uniform(@places |> tuple_size()) - 1

    @places |> elem(i) |> elem(0)
  end

  def name() do
    i = :rand.uniform(@adjectives |> tuple_size()) - 1
    adjective = @adjectives |> elem(i) |> String.capitalize()

    i = :rand.uniform(@beings |> tuple_size()) - 1
    being = @beings |> elem(i) |> String.capitalize()

    "#{adjective} #{being}"
  end
end
