const CARDS = [
  {
    number: 1,
    title: "This Portfolio",
    status: "done",
    link: "https://matthewleepark.github.io",
    description: "A static site that holds all five TCSS 490 artifacts.",
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
    link: "https://matthewleepark.github.io/myfile/",
    description: "A desktop file utility where Claude reads your documents and plain code checks everything it says.",
    reflection: "For this artifact I built MyFile, a desktop app where you drop in a file and get the actions that make sense for it, with Claude reading documents through Claude Code in headless mode. The biggest thing I learned was deciding what the model should do and what plain code should check: Claude reads and summarizes, but my own code checks every quote it gives against the real document, asks permission before anything is sent, and only lets it pick from a fixed list of actions. I also built an evaluation with trap documents and a prompt injection, and it showed that Haiku matched Sonnet on my test set at about a tenth of the cost, which changed how I think about picking models. Having several AI reviewers try to break my code found real bugs I would have missed, like a request for one file running on a different file after a quick switch."
  },
  {
    number: 4,
    title: "Idea: Study Group Checklist",
    status: "idea",
    link: "",
    description: "A study group tool where our learning group can share a weekly checklist and see who's done what.",
    reflection: ""
  },
  {
    number: 5,
    title: "Idea: Launch Window Calculator",
    status: "idea",
    link: "",
    description: "A launch-window calculator that tells me when a rocket can reach a target orbit.",
    reflection: ""
  }
];
