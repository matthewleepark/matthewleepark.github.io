# Build Log, Artifact 1

Tool: Claude (chat). Date: 2026-10-08

- I asked Claude to help me build the portfolio site for Artifact 1.
  Claude gave me four files: index.html, style.css, cards.js, script.js.
- I asked where to write the code.
  Claude gave me two options. I chose the GitHub website editor.
- I asked what the assignment wanted and how to start as a beginner.
  Claude explained it and told me to create a GitHub account and a repo.
- I created the repo matthewleepark.github.io and added the files one at a time.
- I turned on GitHub Pages so the site has a public link.

## Changes I made
- Put my GitHub username (matthewleepark) in the GitHub link in index.html and the link on card 1 in cards.js.
- Changed the tagline from "CS student at UW Tacoma" to "CS student at UW".
- Replaced the LinkedIn placeholder with my LinkedIn link.
- Replaced the email placeholder with my email address.
- Filled cards 2 to 5 with my own ideas: Schedule Viewer, Makerspace Hours Tracker, Study Group Checklist, and Launch Window Calculator.
- Redesigned the site with a dark crimson style inspired by a restaurant landing page I liked. Added a giant “PARK” title with my cutout photo layered in front, 매튜 박 in red, mouse movement that creates a depth effect, rising ember particles, pill-shaped navigation, and glass-style artifact cards at the bottom that open a popup when clicked. Kept my original text and left cards.js the same.
- Before choosing the crimson style, I tried several others with Claude and replaced them: space effects, a Korean restaurant menu, a neon pocha menu, a fine-dining tasting menu, a particle background with cursor glow, and a hacker terminal.
- Added a front page with an Enter button. Clicking it slashes the screen in half with a sword cut and sparks, then opens the site. I first had the cut play automatically, then tried a finger swipe, then went back to a cut that only happens after clicking Enter. These are in two new files, intro.js and intro.css, plus two lines in index.html.
- Added atmosphere to the hero, inspired by a Chernobyl series page, a kendo page, and a "2025" portfolio: drifting fog, thin orbit rings, a dot nav on the left for the five artifacts, outlined echo copies under the title, a HUD strip, and a handwritten signature.
- Tried different figures in front of the title: a drawn samurai, then a floating astronaut, then my own photo (Claude removed the background). In the end I removed the figure so the hero shows just my name. intro.js has a SHOW_FIGURE switch if I want it back.
- Added a "different world" you enter after the sword cut, in two new files, world.js and world.css, plus two lines in index.html. The site turns into a blue night landscape with stars, a shooting star, a red sun on a lake, and mountains with my name tucked behind the front ridge. Inspired by four landscape landing pages.
- Added a blade cursor trail: moving the mouse leaves a glowing streak, and fast flicks leave a brighter slash. Clicking a letter in PARK slices it in half.
- Added a secret easter egg: typing "park" plays a cinematic. The color drains, 일섬 ("One Flash") appears and gets sliced, the page shatters into a warp-speed void and slams back together, and an aurora appears in the sky for the rest of the visit.

## Issues
- Have to be very specific and ran out of usage credits since each time you must tailor the work with another prompt.
- I changed direction many times, which used up a lot of prompts. Next time I would collect references first and pick one style before asking for code.
- When I said "replace the samurai," Claude replaced the sword intro instead of the character, so I had to explain what I meant.
- Claude tested the pages before I uploaded them and caught bugs: a class name clash that would have broken my About section, labels showing up on phones, and the page scrolling sideways on mobile.
- Small add-on files were easier than full redesigns, because I only had to upload new files and add a couple of lines to index.html.
