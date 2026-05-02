import type { Preset, RootStorage } from "./types";

export function defaultPreset(name: string): Preset {
  return {
    name: name || "New preset",
    channelId: "",
    userId: "",
    messages: [""],
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
    r.messages =
      typeof st.message === "string" && st.message.length ? [st.message] : [""];
    r.showEmbedPreview = !!st.showEmbedPreview;
    r.embedImageUrl = typeof st.embedImageUrl === "string" ? st.embedImageUrl : "";
    delete st.channelId;
    delete st.userId;
    delete st.message;
    delete st.showEmbedPreview;
    delete st.embedImageUrl;
  }

  for (const rule of st.rules) ensureRule(rule);
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
