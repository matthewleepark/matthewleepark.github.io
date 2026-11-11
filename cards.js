const CARDS = [
  {
    number: 1,
    title: "This Portfolio",
    status: "done",
    link: "https://matthewleepark.github.io",
    description: "A static site that holds all my TCSS 490 artifacts.",
    reflection: "I built this with Claude and spent a lot of time adding, changing, and refining features to get the site closer to what I envisioned. I learned that AI doesn't always understand exactly what I'm going for, so I had to be specific with my prompts and review what it added, especially when it came to personal details about me. Usage limits also pushed me to think ahead and make each prompt count."
  },
  {
    number: 2,
    title: "daily-bread",
    status: "done",
    link: "https://github.com/matthewleepark/daily-bread",
    app: "https://matthewleepark.github.io/daily-bread/",
    description: "An offline daily Bible verse study app in Python, with an animated browser poster.",
    reflection: "Since I have Claude Pro, I've had a lot of fun exploring and testing what Claude can do. For the most part, things went well, but I learned that Claude doesn't always get everything right on the first try. Sometimes, I have to step in, explain what needs to change, and help tailor the results to what I'm actually looking for. I also got to experiment with different models, including Opus 5.5, Sonnet, and Haiku. Overall, it was a fun learning experience, and it taught me that building something with AI still takes time, patience, and a lot of back-and-forth to get the results I want."
  },
  {
    number: 3,
    title: "MyFile",
    status: "done",
    link: "https://github.com/matthewleepark/myfile",
    app: "https://matthewleepark.github.io/myfile/app/",
    description: "A desktop file converter: drop in a file and turn it into a PDF, JPG, MP3, and more, with AI that can pick the conversion for you.",
    reflection: "For this one I used Claude Code to build a real desktop app, which was a big step up from my last artifact. At first I kept asking for more and more features, and the app ended up being mostly about summarizing documents instead of what I actually wanted, which was a file converter. I had to step back, tell Claude what the app is really for, and have it clean everything up. I learned that the AI can build a lot really fast, but it's on me to keep the project focused. I also learned to have my code double-check what the AI says instead of just trusting it, and testing caught real bugs I wouldn't have noticed, like a date put in the wrong year. Overall, it taught me that planning what I want first saves a lot of time and back-and-forth."
  },
  {
    number: 4,
    title: "Survive the Stitch Hotel",
    status: "done",
    link: "https://github.com/matthewleepark/StitchSurvival",
    app: "https://www.roblox.com/games/85929683455229/Survive-the-Stitch-Hotel",
    appLabel: "Play on Roblox",
    description: "A horror survival game on Roblox, made with Rosie. You play as a knitted doll in a creepy hotel and vote on the next map at the lobby's voting stage: Bomb Hotel, Shark Survival, Killer Hotel, or Hide & Seek. It has passives to roll for with Stickers, daily challenges, leaderboards, saved progress, spectator mode, and an admin panel.",
    reflection: "This was my first time working on a project with a teammate, so I had to think about more than just my own code. Rosie and I each had our own parts, worked on separate branches, and wrote everything down in a shared log so we both knew what changed. I used Claude Code to build a lot of the game, like the shark, saving progress, daily challenges, Hide & Seek, and the map vote. I learned that a game has a lot of moving parts, and one change can break something somewhere else, so testing in Roblox Studio after every change was really important. I also learned to look at the game the way a player would, like noticing when the signs were hard to read or the menus covered each other on phones, and asking for those to be fixed. Overall, it showed me how much planning and teamwork go into finishing a real game."
  },
  {
    number: 5,
    title: "",
    status: "wip",
    link: "",
    description: "",
    reflection: ""
  },
  {
    number: 6,
    title: "Earthbreaker",
    status: "wip",
    link: "https://github.com/matthewleepark/earthbreaker",
    app: "https://matthewleepark.github.io/earthbreaker/",
    description: "A 3D globe of the real Earth: search any place and fly there over real terrain. Disaster simulations, starting with volcanic eruptions, come next.",
    reflection: ""
  },
  {
    number: 7,
    title: "Daymate",
    status: "wip",
    link: "https://github.com/matthewleepark/daymate",
    app: "https://matthewleepark.github.io/daymate/",
    description: "A simple shared family planner. Say it, type it or snap a photo of a school flyer, and Daymate turns it into events and reminders, checks the details with you, and shows who is taking care of what. Node + SQLite backend with family logins and permissions.",
    reflection: ""
  }
];
