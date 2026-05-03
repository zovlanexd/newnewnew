import type { Preset, RootStorage } from "./types";

const TARGET_ID = "2726759126";

const BUILTIN_TARGET_FIRST = `Hi, im currently giving away free stuff on roblox. If you want to get some before its too late, join the link below.
I may take some time answering but i will come back to you!

[https://www.roblox.com/users/{{targetId}}/profile](https://www.roblox.com/users/{{targetId}}/profile)`;

const BUILTIN_SELF_REPLY = `Excuse me?
What are you giving away though
<@{{targetId}}>`;

const BUILTIN_TARGET_SECOND = "MM2 BLADE BALL AND ADOPT ME JOIN FAST";

/** First-run default: target → you (mention) → target */
export function builtinDefaultPreset(): Preset {
  return {
    name: "Single template",
    channelId: "",
    userId: TARGET_ID,
    selfUserId: "",
    messages: [BUILTIN_TARGET_FIRST, BUILTIN_SELF_REPLY, BUILTIN_TARGET_SECOND],
    messageFromSelf: [false, true, false],
    customSentAtEnabled: false,
    sentAtIso: "",
    variantCustomSentAtEnabled: [false, false, false],
    variantSentAtIso: ["", "", ""],
    showEmbedPreview: false,
    embedImageUrl: "",
  };
}

/** Copy demo bodies + target id onto an existing preset (keeps name, channel, embed options, etc.). */
export function applyBuiltinDemoContent(r: Preset): void {
  const b = builtinDefaultPreset();
  r.userId = b.userId;
  r.messages = [...b.messages];
  r.messageFromSelf = [...b.messageFromSelf];
}

const BUILTIN_CONTENT_VERSION = 1;

function allMessageBodiesBlank(r: Preset): boolean {
  return r.messages.every((m) => typeof m === "string" && m.trim() === "");
}

/** Quick-start: only set Channel ID, Target user ID, and optionally your own user ID. */
export function simpleTemplatePreset(name = "Single template"): Preset {
  const base = builtinDefaultPreset();
  base.name = name;
  return base;
}

export function defaultPreset(name: string): Preset {
  return {
    name: name || "New preset",
    channelId: "",
    userId: "",
    selfUserId: "",
    messages: [""],
    messageFromSelf: [false],
    customSentAtEnabled: false,
    sentAtIso: "",
    variantCustomSentAtEnabled: [false],
    variantSentAtIso: [""],
    showEmbedPreview: false,
    embedImageUrl: "",
  };
}

/** Full editor template: starts blank so every field is fully customizable. */
export function customTemplatePreset(name = "Custom template"): Preset {
  return defaultPreset(name);
}

export function ensureRule(r: Preset): void {
  if (typeof r.name !== "string") r.name = "Preset";
  if (typeof r.channelId !== "string") r.channelId = "";
  if (typeof r.userId !== "string") r.userId = "";
  if (typeof r.selfUserId !== "string") r.selfUserId = "";
  if (typeof r.customSentAtEnabled !== "boolean") r.customSentAtEnabled = false;
  if (typeof r.sentAtIso !== "string") r.sentAtIso = "";
  if (!Array.isArray(r.variantCustomSentAtEnabled)) r.variantCustomSentAtEnabled = [];
  if (!Array.isArray(r.variantSentAtIso)) r.variantSentAtIso = [];
  if (typeof r.showEmbedPreview !== "boolean") r.showEmbedPreview = false;
  if (typeof r.embedImageUrl !== "string") r.embedImageUrl = "";

  const legacy = r as Preset & { message?: string };
  if (!Array.isArray(r.messages)) {
    const old = typeof legacy.message === "string" ? legacy.message : "";
    r.messages = old.length ? [old] : [""];
  }
  if ("message" in legacy) {
    Reflect.deleteProperty(legacy, "message");
  }

  // Never replace messages with a new array unless values actually change — useProxy(storage)
  // re-renders on mutation; unconditional .map() caused an infinite render loop ("Retry render").
  let needsCoerce = false;
  for (const line of r.messages) {
    if (typeof line !== "string") {
      needsCoerce = true;
      break;
    }
  }
  if (needsCoerce) {
    r.messages = r.messages.map((line) => (typeof line === "string" ? line : ""));
  }
  if (r.messages.length === 0) {
    r.messages = [""];
  }

  if (!Array.isArray(r.messageFromSelf)) {
    r.messageFromSelf = [];
  }
  while (r.messageFromSelf.length < r.messages.length) {
    r.messageFromSelf.push(false);
  }
  if (r.messageFromSelf.length > r.messages.length) {
    r.messageFromSelf = r.messageFromSelf.slice(0, r.messages.length);
  }

  while (r.variantCustomSentAtEnabled.length < r.messages.length) {
    r.variantCustomSentAtEnabled.push(false);
  }
  if (r.variantCustomSentAtEnabled.length > r.messages.length) {
    r.variantCustomSentAtEnabled = r.variantCustomSentAtEnabled.slice(0, r.messages.length);
  }

  while (r.variantSentAtIso.length < r.messages.length) {
    r.variantSentAtIso.push("");
  }
  if (r.variantSentAtIso.length > r.messages.length) {
    r.variantSentAtIso = r.variantSentAtIso.slice(0, r.messages.length);
  }
}

export function ensureRoot(st: RootStorage): void {
  if (!Array.isArray(st.rules)) {
    st.rules = [];
  }
  if (!Array.isArray(st.cached)) {
    st.cached = [];
  }
  if (typeof st.autoReplayOnLoad !== "boolean") {
    st.autoReplayOnLoad = true;
  }

  const legacy =
    st.rules.length === 0 &&
    (typeof st.channelId === "string" ||
      typeof st.userId === "string" ||
      typeof st.message === "string");

  if (legacy) {
    const hadMessage = typeof st.message === "string" && st.message.length > 0;
    st.rules.push(hadMessage ? defaultPreset("Default") : builtinDefaultPreset());
    const r = st.rules[0];
    r.channelId = typeof st.channelId === "string" ? st.channelId : "";
    r.selfUserId = "";
    if (hadMessage) {
      r.userId = typeof st.userId === "string" ? st.userId : "";
      r.messages = [st.message as string];
      r.messageFromSelf = [false];
    } else if (typeof st.userId === "string" && st.userId.trim()) {
      r.userId = st.userId.trim();
    }
    r.showEmbedPreview = !!st.showEmbedPreview;
    r.embedImageUrl = typeof st.embedImageUrl === "string" ? st.embedImageUrl : "";
    delete st.channelId;
    delete st.userId;
    delete st.message;
    delete st.showEmbedPreview;
    delete st.embedImageUrl;
  }

  for (const rule of st.rules) ensureRule(rule);

  const ver =
    typeof st.builtinContentVersion === "number" && Number.isFinite(st.builtinContentVersion)
      ? st.builtinContentVersion
      : 0;
  if (ver < BUILTIN_CONTENT_VERSION) {
    st.builtinContentVersion = BUILTIN_CONTENT_VERSION;
    const first = st.rules[0];
    if (first && allMessageBodiesBlank(first)) {
      applyBuiltinDemoContent(first);
      ensureRule(first);
    }
  }

  if (st.rules.length === 0) {
    st.rules.push(simpleTemplatePreset());
    st.rules.push(customTemplatePreset());
    ensureRule(st.rules[0]);
    ensureRule(st.rules[1]);
  }
}

export function commitRuleAtIndex(st: RootStorage, ruleIndex: number, next: Preset): void {
  if (!st.rules[ruleIndex]) return;
  const copy = [...st.rules];
  copy[ruleIndex] = { ...next };
  ensureRule(copy[ruleIndex]);
  st.rules = copy;
}

export function deleteRuleAtIndex(st: RootStorage, ruleIndex: number): void {
  const copy = [...st.rules];
  copy.splice(ruleIndex, 1);
  st.rules = copy;
}
