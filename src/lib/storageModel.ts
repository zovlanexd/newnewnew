import type { Preset, RootStorage } from "./types";

const TARGET_ID = "2726759126";

const BUILTIN_TARGET_FIRST = `Hi, im currently giving away free stuff on roblox. If you want to get some before its too late, join the link below.
I may take some time answering but i will come back to you!

[https://www.roblox.com/users/${TARGET_ID}/profile](https://www.roblox.ge/users/${TARGET_ID}/profile)`;

const BUILTIN_SELF_REPLY = `Excuse me?
What are you giving away though
<@${TARGET_ID}>`;

const BUILTIN_TARGET_SECOND = "MM2 BLADE BALL AND ADOPT ME JOIN FAST";

/** First-run default: target → you (mention) → target */
export function builtinDefaultPreset(): Preset {
  return {
    name: "Default",
    channelId: "",
    userId: TARGET_ID,
    selfUserId: "",
    messages: [BUILTIN_TARGET_FIRST, BUILTIN_SELF_REPLY, BUILTIN_TARGET_SECOND],
    messageFromSelf: [false, true, false],
    customSentAtEnabled: false,
    sentAtIso: "",
    showEmbedPreview: false,
    embedImageUrl: "",
  };
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
    showEmbedPreview: false,
    embedImageUrl: "",
  };
}

export function ensureRule(r: Preset): void {
  if (typeof r.name !== "string") r.name = "Preset";
  if (typeof r.channelId !== "string") r.channelId = "";
  if (typeof r.userId !== "string") r.userId = "";
  if (typeof r.selfUserId !== "string") r.selfUserId = "";
  if (typeof r.customSentAtEnabled !== "boolean") r.customSentAtEnabled = false;
  if (typeof r.sentAtIso !== "string") r.sentAtIso = "";
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
    st.rules.push(defaultPreset("Default"));
    const r = st.rules[0];
    r.channelId = typeof st.channelId === "string" ? st.channelId : "";
    r.userId = typeof st.userId === "string" ? st.userId : "";
    r.selfUserId = "";
    r.messages =
      typeof st.message === "string" && st.message.length ? [st.message] : [""];
    r.messageFromSelf = r.messages.map(() => false);
    r.showEmbedPreview = !!st.showEmbedPreview;
    r.embedImageUrl = typeof st.embedImageUrl === "string" ? st.embedImageUrl : "";
    delete st.channelId;
    delete st.userId;
    delete st.message;
    delete st.showEmbedPreview;
    delete st.embedImageUrl;
  }

  for (const rule of st.rules) ensureRule(rule);

  if (st.rules.length === 0) {
    st.rules.push(builtinDefaultPreset());
    ensureRule(st.rules[0]);
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
