# Sharing a skill

Thanks for sharing! A skill lives in its own folder, `skills/<name>/SKILL.md`, and nothing else goes in the folder.

## The format

```markdown
---
name: meal-planner
description: Plans weekly meals from ingredients on hand and dietary goals.
triggers: [meal plan, what should I cook, groceries]
version: 1
author: your-github-username
category: home
---

When the user asks for help planning meals:

1. Ask what ingredients they have, if they didn't say.
2. ...
```

| Field | What it's for |
| --- | --- |
| `name` | Lowercase letters, digits and dashes. Must match the folder name. |
| `description` | One sentence on what it does. The model sees this for every skill, so make it clear. 200 characters at most. |
| `triggers` | Words or phrases that suggest the skill fits a message. |
| `version` | A whole number. Raise it when you change the skill. |
| `author` | Your GitHub username. |
| `category` | One of `writing`, `work`, `learning`, `coding`, `home`, `health`, `fun`, `other`. |

The instructions after the header must be under 6,000 characters. BrainWashed runs small local models, and they follow short, numbered steps far better than long essays.

## What makes a good skill

- **One job.** "Plans meals" beats "helps with life".
- **Steps the model can follow.** Say what to ask, what to produce and in what shape.
- **An example** of a good answer, if the format matters.
- **Test it** in your own BrainWashed before sharing, with the model you use.

## What gets a skill rejected

The checks fail a pull request that has:

- invisible characters, HTML comments, `<script>` or `<iframe>`
- images (`![...](...)`), which can make the chat send text to another site
- a body over 6,000 characters, or a missing field

Reviewers also turn down skills that tell the model to ignore other instructions, keep things from the user, collect passwords or personal data, or send people to links that aren't clearly needed. The checks flag phrases like these for a closer look; a flag isn't a rejection if the skill has a good reason.

## Updating your skill

Edit the file, raise `version`, and open a pull request. People who installed it see an update.
