import { clipboard, NavigationNative, React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { dispatchLocalMessageCreate } from "./lib/dispatch";
import { buildPayload, cloneForStorage } from "./lib/message";
import { commitRuleAtIndex, deleteRuleAtIndex, ensureRoot } from "./lib/storageModel";
import type { Preset, RootStorage } from "./lib/types";

const { ScrollView } = General;
const FormsAny = Forms as typeof Forms & {
  FormInput: React.ComponentType<Record<string, unknown>>;
};
const { FormSection, FormRow, FormSwitchRow, FormInput } = FormsAny;

export default function EditPreset({ ruleIndex }: { ruleIndex: number }): React.ReactElement | null {
  useProxy(storage);
  const st = storage as unknown as RootStorage;
  ensureRoot(st);
  const initial = st.rules[ruleIndex];
  if (!initial) return null;

  const [local, setLocal] = React.useState<Preset>({ ...initial });
  const [sendVariantIdx, setSendVariantIdx] = React.useState(0);
  const ruleRef = React.useRef(local);
  React.useEffect(() => {
    ruleRef.current = local;
  }, [local]);

  React.useEffect(() => {
    const max = Math.max(0, local.messages.length - 1);
    setSendVariantIdx((i) => Math.min(Math.max(0, i), max));
  }, [local.messages.length]);

  const navigation = NavigationNative.useNavigation();
  const isDeletingRef = React.useRef(false);

  React.useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", () => {
      if (isDeletingRef.current || !st.rules[ruleIndex]) return;
      commitRuleAtIndex(st, ruleIndex, ruleRef.current);
    });
    return unsub;
  }, [navigation, ruleIndex, st]);

  const updateField = <K extends keyof Preset>(key: K, value: Preset[K]): void => {
    setLocal((prev) => {
      const n = { ...prev, [key]: value };
      ruleRef.current = n;
      return n;
    });
  };

  const sendNow = (): void => {
    try {
      const payload = buildPayload(ruleRef.current, sendVariantIdx);
      const msg = payload.message as Record<string, unknown>;
      const stored = cloneForStorage(msg);
      if (stored) st.cached.push(stored);
      dispatchLocalMessageCreate(msg);
      queueMicrotask(() => dispatchLocalMessageCreate(msg));
      showToast("Local message injected (saved to local cache).", getAssetIDByName("Check"));
    } catch (e) {
      showToast(String((e as Error)?.message || e), getAssetIDByName("Small"));
    }
  };

  const copyJson = (): void => {
    try {
      const body = JSON.stringify(ruleRef.current, null, 2);
      clipboard.setString(`\`\`\`json\n${body}\n\`\`\``);
      showToast("Copied preset JSON.", getAssetIDByName("CopyIcon"));
    } catch (_) {
      showToast("Copy failed.", getAssetIDByName("Small"));
    }
  };

  const doDelete = (): void => {
    isDeletingRef.current = true;
    deleteRuleAtIndex(st, ruleIndex);
    navigation.goBack();
  };

  const confirmDelete = (): void => {
    showConfirmationAlert({
      title: "Delete preset?",
      content: "This cannot be undone.",
      confirmText: "Delete",
      confirmColor: "red",
      cancelText: "Cancel",
      onConfirm: doDelete,
    });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      <FormSection title="Preset">
        <FormInput title="Name" value={local.name} onChange={(v: string) => updateField("name", v)} placeholder="Label" />
        <FormInput
          title="Channel ID"
          value={local.channelId}
          onChange={(v: string) => updateField("channelId", v)}
          placeholder="Channel snowflake"
        />
        <FormInput
          title="User ID"
          value={local.userId}
          onChange={(v: string) => updateField("userId", v)}
          placeholder="Author user snowflake"
        />
      </FormSection>

      <FormSection title="Messages">
        <FormRow
          label={`Send uses variant ${sendVariantIdx + 1} / ${local.messages.length}`}
          subLabel="Tap to cycle which body Send now uses"
          trailing={FormRow.Arrow}
          onPress={() =>
            setSendVariantIdx((i) => (i + 1) % Math.max(local.messages.length, 1))
          }
        />
        {local.messages.map((text, i) => (
          <FormInput
            key={i}
            title={`Variant ${i + 1}`}
            value={text}
            onChange={(v: string) => {
              const next = [...local.messages];
              next[i] = v;
              updateField("messages", next);
            }}
            placeholder="Text or embed body"
          />
        ))}
        <FormRow
          label="Add message variant"
          trailing={FormRow.Arrow}
          onPress={() => updateField("messages", [...local.messages, ""])}
        />
        {local.messages.length > 1 ? (
          <FormRow
            label="Remove last variant"
            trailing={FormRow.Arrow}
            variant="danger"
            onPress={() => {
              const next = local.messages.slice(0, -1);
              updateField("messages", next.length ? next : [""]);
            }}
          />
        ) : null}
      </FormSection>

      <FormSection title="Sent time">
        <FormSwitchRow
          label="Custom timestamp"
          subLabel="Pick when this message appears to have been sent (local preview only)"
          value={local.customSentAtEnabled}
          onValueChange={(v: boolean) => updateField("customSentAtEnabled", v)}
        />
        <FormInput
          title="Time (ISO 8601)"
          value={local.sentAtIso}
          onChange={(v: string) => updateField("sentAtIso", v)}
          placeholder="2026-05-02T18:30:00.000Z"
        />
        <FormRow
          label="Insert current UTC time"
          subLabel="Sets the field above to now — edit digits if needed"
          trailing={FormRow.Arrow}
          onPress={() => updateField("sentAtIso", new Date().toISOString())}
        />
      </FormSection>

      <FormSection title="Embed">
        <FormSwitchRow
          label="Embed preview"
          subLabel="Show message as a rich embed"
          value={local.showEmbedPreview}
          onValueChange={(v: boolean) => updateField("showEmbedPreview", v)}
        />
        <FormInput
          title="Embed image URL"
          value={local.embedImageUrl}
          onChange={(v: string) => updateField("embedImageUrl", v)}
          placeholder="Optional image URL"
        />
      </FormSection>

      <FormSection title="Actions">
        <FormRow label="Send now (local only)" trailing={FormRow.Arrow} onPress={sendNow} />
        <FormRow label="Copy preset JSON" trailing={FormRow.Arrow} onPress={copyJson} />
        <FormRow label="Delete preset" trailing={FormRow.Arrow} variant="danger" onPress={confirmDelete} />
      </FormSection>
    </ScrollView>
  );
}
