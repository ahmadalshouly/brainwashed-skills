# BrainWashed Skills

Skills that people shared for [BrainWashed](https://github.com/ahmadalshouly/brainwashed), the private AI that runs on your own computer.

A skill teaches your AI how to do one job well, like planning meals or writing emails. It's a single `SKILL.md` file: a short header, then instructions in plain Markdown. BrainWashed adds a skill's instructions to the prompt when a message matches it. Skills never run code.

**Browse them at [ahmadalshouly.github.io/brainwashed-skills](https://ahmadalshouly.github.io/brainwashed-skills/).**

## Install a skill

- **Admin page:** open **Skills**, then **Community**, and pick one. You see the whole skill, plus anything that looks risky, before it's installed.
- **Terminal:** `brainwashed skills search meal`, then `brainwashed skills install meal-planner`.
- **Updates:** the admin page shows **Update** next to skills with a newer version, or run `brainwashed skills update`. A skill you changed on your computer is never updated without asking.

You can also install a skill straight from a link to any `SKILL.md` on the web, in the same Community tab or with `brainwashed skills install https://...`.

## Share a skill

The quickest way is the **Share** button next to your skill in the admin page. It opens GitHub with your skill filled in, and GitHub turns it into a pull request. Or add `skills/<name>/SKILL.md` yourself and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the format and what reviewers look for.

## How it stays safe

A skill is text that goes into your AI's instructions, so a bad one could try to override your instructions, hide things from you or leak your chats. So:

1. Every pull request is checked automatically. Hidden characters, HTML comments, scripts and images (which can send chat text to another site) are rejected outright. Phrases like "ignore previous instructions" are flagged for the reviewer.
2. A maintainer reads every skill before it merges.
3. The index pins each skill to the exact commit that was reviewed, with its SHA-256. BrainWashed refuses a file that doesn't match.
4. BrainWashed shows you the whole skill and the same warnings again before installing.

Found a skill that misbehaves? [Open an issue](https://github.com/ahmadalshouly/brainwashed-skills/issues).

## For your own team

`node scripts/skills.mjs build <folder>` builds the same `index.json` from any fork. Point BrainWashed at it under **Settings → Community skills index**.

## License

Apache-2.0. By contributing a skill you agree to share it under this license.
