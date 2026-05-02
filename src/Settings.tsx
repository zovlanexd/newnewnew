import { NavigationNative, React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import EditPreset from "./EditPreset";
import { pushSubPage } from "./lib/nav";
import { defaultPreset, ensureRoot } from "./lib/storageModel";
import { replayCached } from "./lib/replay";
import type { RootStorage } from "./lib/types";

const { ScrollView } = General;
const { FormSection, FormRow, FormSwitchRow } = Forms;

export default function Settings(): React.ReactElement {
  useProxy(storage);
  const st = storage as unknown as RootStorage;
  ensureRoot(st);
  const navigation = NavigationNative.useNavigation();

  const openEditor = (index: number): void => {
    pushSubPage(navigation, "Edit preset", () =>
      React.createElement(EditPreset, { ruleIndex: index }),
    );
  };

  const createPreset = (): void => {
    const next = defaultPreset("New preset");
    st.rules = [...st.rules, next];
    openEditor(st.rules.length - 1);
  };

  const replayNow = (): void => {
    try {
      replayCached(st, true);
    } catch (e) {
      showToast(String((e as Error)?.message || e), getAssetIDByName("Small"));
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
      <FormSection title="Presets">
        {st.rules.length === 0 ? (
          <FormRow label="No presets yet — add one below" />
        ) : (
          st.rules.map((rule, i) => (
            <FormRow
              key={i}
              label={rule.name || "Unnamed"}
              subLabel={
                rule.channelId && rule.userId
                  ? `${rule.channelId.slice(0, 8)}… · ${rule.userId.slice(0, 8)}…`
                  : "Set channel & user IDs"
              }
              trailing={FormRow.Arrow}
              onPress={() => openEditor(i)}
            />
          ))
        )}
        <FormRow label="New preset" trailing={FormRow.Arrow} onPress={createPreset} />
      </FormSection>

      <FormSection title="Replay & cache">
        <FormSwitchRow
          label="Auto-replay cached after load"
          subLabel="Re-inject messages saved from Send now"
          value={st.autoReplayOnLoad}
          onValueChange={(v: boolean) => {
            st.autoReplayOnLoad = v;
          }}
        />
        <FormRow label={`Replay now (${st.cached?.length ?? 0} cached)`} trailing={FormRow.Arrow} onPress={replayNow} />
        <FormRow
          label="Clear cached messages"
          trailing={FormRow.Arrow}
          onPress={() => {
            st.cached = [];
            showToast("Cleared cache.", getAssetIDByName("Check"));
          }}
        />
      </FormSection>
    </ScrollView>
  );
}
