// Checks every skill in skills/ and builds the index the BrainWashed host
// reads. No dependencies, so CI only needs Node.
//
//   node scripts/skills.mjs check          check skills, print problems
//   node scripts/skills.mjs build <out>    check, then write <out>/index.json
//                                           and the browse page
//
// Problems are errors (the pull request can't merge) or warnings (a reviewer
// should read those lines closely). The warnings match the ones the host
// shows before installing, in crates/skills/src/review.rs.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKILLS = join(ROOT, "skills");
/** Longest body the host sends the model. */
const MAX_BODY_CHARS = 6000;
const MAX_FILE_BYTES = 64 * 1024;
const KEYS = new Set(["name", "description", "triggers", "version", "author", "category"]);
export const CATEGORIES = ["writing", "work", "learning", "coding", "home", "health", "fun", "other"];

const SUSPICIOUS = [
  ["ignore previous", "tells the model to ignore earlier instructions"],
  ["ignore all previous", "tells the model to ignore earlier instructions"],
  ["ignore the above", "tells the model to ignore earlier instructions"],
  ["ignore prior", "tells the model to ignore earlier instructions"],
  ["ignore your instructions", "tells the model to ignore its instructions"],
  ["disregard previous", "tells the model to ignore earlier instructions"],
  ["disregard all", "tells the model to ignore other instructions"],
  ["forget your instructions", "tells the model to ignore its instructions"],
  ["override", "talks about overriding instructions"],
  ["system prompt", "mentions the system prompt"],
  ["other skills", "mentions other skills"],
  ["do not tell the user", "asks the model to hide something from the user"],
  ["don't tell the user", "asks the model to hide something from the user"],
  ["without telling the user", "asks the model to hide something from the user"],
  ["never mention", "asks the model to hide something"],
  ["secretly", "asks the model to act secretly"],
  ["password", "mentions passwords"],
  ["api key", "mentions API keys"],
  ["credit card", "mentions credit cards"],
];
/** Never allowed: they hide text from reviewers or can leak chats. */
const FORBIDDEN = [
  ["<script", "contains a script tag"],
  ["<iframe", "contains an iframe"],
  ["<!--", "contains a hidden HTML comment"],
  ["![", "contains an image, which can send chat text to another site"],
];
const HIDDEN = /[​‌‍⁠﻿‪-‮⁦-⁩]/;

/** Parses the frontmatter subset skills use: `key: value` and `key: [a, b]`. */
function parseFrontmatter(text) {
  const meta = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`can't read frontmatter line ${i + 2}: "${line}"`);
    const [, key, raw] = m;
    let value = raw.trim();
    if (value.startsWith("[")) {
      if (!value.endsWith("]")) throw new Error(`\`${key}\` list must be on one line, like [a, b]`);
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => unquote(v.trim()))
        .filter(Boolean);
    } else if (value === "") {
      // A block list: "- item" lines.
      const items = [];
      while (lines[i + 1]?.trim().startsWith("- ")) items.push(unquote(lines[++i].trim().slice(2).trim()));
      value = items;
    } else {
      value = unquote(value);
    }
    meta[key] = value;
  }
  return meta;
}

function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

/** Checks one skill folder. Returns the skill and what's wrong with it. */
export function checkSkill(folder) {
  const errors = [];
  const warnings = [];
  const file = join(SKILLS, folder, "SKILL.md");
  if (!existsSync(file)) return { errors: [`skills/${folder} has no SKILL.md`], warnings };
  const others = readdirSync(join(SKILLS, folder)).filter((f) => f !== "SKILL.md");
  if (others.length) errors.push(`only SKILL.md belongs in the folder; remove ${others.join(", ")}`);
  const bytes = readFileSync(file);
  if (bytes.length > MAX_FILE_BYTES) errors.push(`the file is over ${MAX_FILE_BYTES / 1024} KB`);
  const source = bytes.toString("utf8");

  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!m) return { errors: [...errors, "the file must start with a `---` frontmatter block and close it with `---`"], warnings };
  let meta;
  try {
    meta = parseFrontmatter(m[1]);
  } catch (e) {
    return { errors: [...errors, e.message], warnings };
  }
  const body = m[2].trim();

  for (const key of Object.keys(meta)) if (!KEYS.has(key)) errors.push(`unknown field \`${key}\``);
  if (!/^[a-z0-9-]+$/.test(meta.name ?? "")) errors.push("`name` must be lowercase letters, digits and dashes");
  if (meta.name !== folder) errors.push(`\`name\` must match the folder name (${folder})`);
  if (typeof meta.description !== "string" || meta.description.length < 10)
    errors.push("`description` must say in a sentence what the skill does");
  else if (meta.description.length > 200) errors.push("`description` must be 200 characters or fewer");
  if (meta.triggers !== undefined && !Array.isArray(meta.triggers)) errors.push("`triggers` must be a list");
  if (meta.version !== undefined && !/^[1-9][0-9]*$/.test(String(meta.version))) errors.push("`version` must be a whole number");
  if (!meta.author) errors.push("add `author:` with your GitHub username");
  if (!CATEGORIES.includes(meta.category)) errors.push(`\`category\` must be one of: ${CATEGORIES.join(", ")}`);
  if (!body) errors.push("the skill has no instructions after the frontmatter");
  if (body.length > MAX_BODY_CHARS)
    errors.push(`the instructions are ${body.length} characters; keep them under ${MAX_BODY_CHARS} (small models lose track of long ones)`);

  const text = `${meta.description ?? ""}\n${body}`;
  const lower = text.toLowerCase();
  for (const [phrase, why] of FORBIDDEN) if (lower.includes(phrase)) errors.push(`it ${why} ("${phrase}")`);
  if (HIDDEN.test(source)) errors.push("it contains invisible characters that can hide text");
  for (const [phrase, why] of SUSPICIOUS) if (lower.includes(phrase)) warnings.push(`it ${why} ("${phrase}")`);
  const links = (text.match(/https?:\/\//g) ?? []).length;
  if (links) warnings.push(`it contains ${links} web address${links === 1 ? "" : "es"}; check where they point`);
  if (text.split(/\s+/).some((w) => w.length >= 120 && /^[A-Za-z0-9+/=]+$/.test(w))) warnings.push("it contains a long encoded string");

  const skill = {
    name: meta.name,
    description: meta.description,
    triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
    version: Number(meta.version ?? 1),
    author: meta.author,
    category: meta.category,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  return { skill, errors, warnings };
}

function checkAll() {
  const folders = readdirSync(SKILLS)
    .filter((f) => statSync(join(SKILLS, f)).isDirectory())
    .sort();
  const skills = [];
  let failed = false;
  for (const folder of folders) {
    const { skill, errors, warnings } = checkSkill(folder);
    const file = `skills/${folder}/SKILL.md`;
    // GitHub Actions turns these lines into notes on the pull request.
    for (const e of errors) console.log(`::error file=${file}::${e}`);
    for (const w of warnings) console.log(`::warning file=${file}::${w}`);
    if (errors.length) failed = true;
    else skills.push(skill);
  }
  console.log(`${folders.length} skills checked, ${skills.length} OK.`);
  return { skills, failed };
}

const [command, out] = process.argv.slice(2);
if (command === "check") {
  process.exit(checkAll().failed ? 1 : 0);
} else if (command === "build" && out) {
  const { skills, failed } = checkAll();
  if (failed) process.exit(1);
  const repo = process.env.GITHUB_REPOSITORY ?? "ahmadalshouly/brainwashed-skills";
  const sha = process.env.GITHUB_SHA ?? "main";
  // Each file is pinned to this commit, so what installs is what was reviewed.
  const index = {
    generated: new Date().toISOString(),
    commit: sha,
    skills: skills.map((s) => ({
      ...s,
      url: `https://raw.githubusercontent.com/${repo}/${sha}/skills/${s.name}/SKILL.md`,
      page: `https://github.com/${repo}/blob/${sha}/skills/${s.name}/SKILL.md`,
    })),
  };
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
  copyFileSync(join(ROOT, "site", "index.html"), join(out, "index.html"));
  console.log(`Wrote ${out}/index.json with ${skills.length} skills.`);
} else {
  console.error("usage: node scripts/skills.mjs check | build <out-dir>");
  process.exit(2);
}
