<template>
  <QDialog
    v-model="hotkeySettingDialogOpenComputed"
    maximized
    transition-show="jump-up"
    transition-hide="jump-down"
    class="hotkey-setting-dialog transparent-backdrop"
  >
    <QLayout container view="hHh Lpr lff" class="bg-background">
      <QHeader class="q-py-sm">
        <QToolbar>
          <QToolbarTitle class="text-display"
            >設定 / キー割り当て</QToolbarTitle
          >
          <QInput
            v-model="hotkeyFilter"
            hide-bottom-space
            dense
            placeholder="検索"
            color="display"
            class="q-mr-sm search-box"
          >
            <template #prepend>
              <QIcon name="search" />
            </template>
            <template #append>
              <QIcon
                v-if="hotkeyFilter !== ''"
                name="close"
                class="cursor-pointer"
                @click="hotkeyFilter = ''"
              />
              <QIcon v-else />
            </template>
          </QInput>
          <QBtn
            round
            flat
            icon="close"
            color="display"
            @click="hotkeySettingDialogOpenComputed = false"
          />
        </QToolbar>
      </QHeader>

      <QPageContainer>
        <QPage>
          <div class="hotkey-tree scroll">
            <div class="hotkey-line header">
              <span>
                <span>操作</span>
                <span class="hotkey-button">ショートカットキー</span>
              </span>
            </div>
            <QTree
              :nodes="hotkeyNode"
              node-key="label"
              dense
              default-expand-all
              :filter="hotkeyFilter"
            >
              <template #default-header="prop">
                <div class="bg-background text-display hotkey-line">
                  <span v-if="prop.node.combination == undefined">
                    {{ prop.node.label }}
                  </span>
                  <span v-else>
                    <span>
                      {{ prop.node.label }}
                    </span>
                    <QBtn
                      dense
                      text-color="display"
                      padding="none sm"
                      flat
                      :disable="checkHotkeyReadonly(prop.node.label)"
                      no-caps
                      :label="
                        getHotkeyText(prop.node.label, prop.node.combination)
                          .split(' ')
                          .map((hotkeyText) => {
                            // Mac の Meta キーは Cmd キーであるため、Meta の表示名を Cmd に置換する
                            // Windows PC では Meta キーは Windows キーだが、使用頻度低と考えられるため暫定的に Mac 対応のみを考慮している
                            return hotkeyText === 'Meta' ? 'Cmd' : hotkeyText;
                          })
                          .join(' + ')
                      "
                      class="hotkey-button"
                      @click="openHotkeyDialog(prop.node.label)"
                    />
                    <QBtn
                      rounded
                      flat
                      icon="settings_backup_restore"
                      padding="none sm"
                      size="1em"
                      :disable="checkHotkeyReadonly(prop.node.label)"
                      @click="resetHotkey(prop.node.label)"
                    >
                      <QTooltip :delay="500">デフォルトに戻す</QTooltip>
                    </QBtn>
                  </span>
                </div>
              </template>
            </QTree>
          </div>
        </QPage>
      </QPageContainer>
    </QLayout>
  </QDialog>

  <QDialog
    no-esc-dismiss
    no-shake
    transition-show="none"
    transition-hide="none"
    :model-value="isHotkeyDialogOpened"
    @update:model-value="closeHotkeyDialog"
  >
    <QCard class="q-py-sm q-px-md">
      <QCardSection align="center">
        <div class="text-h6">ショートカットキーを入力してください</div>
      </QCardSection>
      <QCardSection align="center">
        <template v-for="(hotkey, index) in lastRecord.split(' ')" :key="index">
          <span v-if="index !== 0"> + </span>
          <!--
          Mac の Meta キーは Cmd キーであるため、Meta の表示名を Cmd に置換する
          Windows PC では Meta キーは Windows キーだが、使用頻度低と考えられるため暫定的に Mac 対応のみを考慮している
          -->
          <QChip :ripple="false" color="surface">
            {{ hotkey === "Meta" ? "Cmd" : hotkey }}
          </QChip>
        </template>
        <span v-if="lastRecord !== '' && confirmBtnEnabled"> +</span>
        <div v-if="duplicatedHotkey != undefined" class="text-warning q-mt-lg">
          <div class="text-warning">
            ショートカットキーが次の操作と重複しています
          </div>
          <div class="q-mt-sm text-weight-bold text-warning">
            「{{ duplicatedHotkey.action }}」
          </div>
        </div>
      </QCardSection>
      <QCardActions align="center">
        <QBtn
          padding="xs md"
          label="キャンセル"
          unelevated
          color="surface"
          text-color="display"
          class="q-mt-sm"
          @click="closeHotkeyDialog"
        />
        <QBtn
          padding="xs md"
          label="ショートカットキーを未設定にする"
          unelevated
          color="surface"
          text-color="display"
          class="q-mt-sm"
          @click="
            deleteHotkey(lastAction);
            closeHotkeyDialog();
          "
        />
        <QBtn
          v-if="duplicatedHotkey == undefined"
          padding="xs md"
          label="OK"
          unelevated
          color="primary"
          text-color="display-on-primary"
          class="q-mt-sm"
          :disabled="confirmBtnEnabled"
          @click="
            changeHotkeySettings(lastAction, lastRecord).then(() =>
              closeHotkeyDialog(),
            )
          "
        />
        <QBtn
          v-else
          padding="xs md"
          label="上書きする"
          unelevated
          color="primary"
          text-color="display-on-primary"
          class="q-mt-sm"
          :disabled="confirmBtnEnabled"
          @click="solveDuplicated().then(() => closeHotkeyDialog())"
        />
      </QCardActions>
    </QCard>
  </QDialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { hotkeyClassifications } from "./HotkeyClassification";
import { useStore } from "@/store";
import {
  HotkeyActionNameType,
  HotkeyCombination,
  HotkeySettingType,
} from "@/type/preload";
import { useHotkeyManager, eventToCombination } from "@/plugins/hotkeyPlugin";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
}>();

const store = useStore();

const hotkeySettingDialogOpenComputed = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const isHotkeyDialogOpened = ref(false);

const hotkeyFilter = ref("");

const hotkeySettings = computed(() => store.state.hotkeySettings);

type hotkeyNodeType = {
  label: string;
  children: {
    label: string;
    children: {
      label: HotkeyActionNameType;
      combination: HotkeyCombination;
    }[];
  }[];
};

const hotkeyNode = computed((): hotkeyNodeType[] => {
  const hotkeyNodes: hotkeyNodeType[] = hotkeyClassifications.map(
    (hotkeyClassification) => ({
      label: hotkeyClassification.label,
      children: hotkeyClassification.children.map((child) => ({
        label: child.label,
        children: child.actions.map((action) => ({
          label: action,
          combination: HotkeyCombination(
            hotkeySettings.value.find(
              (hotkeySetting) => hotkeySetting.action === action,
            )?.combination || "",
          ),
        })),
      })),
    }),
  );
  return hotkeyNodes;
});

const lastAction = ref("");
const lastRecord = ref(HotkeyCombination(""));

const recordCombination = (event: KeyboardEvent) => {
  if (!isHotkeyDialogOpened.value) {
    return;
  } else {
    const recordedCombo = eventToCombination(event);
    lastRecord.value = recordedCombo;
    event.preventDefault();
  }
};

const { hotkeyManager } = useHotkeyManager();
const changeHotkeySettings = (
  action: string,
  combination: HotkeyCombination,
) => {
  hotkeyManager.replace({
    action: action as HotkeyActionNameType,
    combination,
  });
  return store.dispatch("SET_HOTKEY_SETTINGS", {
    data: {
      action: action as HotkeyActionNameType,
      combination,
    },
  });
};

const duplicatedHotkey = computed(() => {
  if (lastRecord.value == "") return undefined;
  return hotkeySettings.value.find(
    (item) =>
      item.combination == lastRecord.value && item.action != lastAction.value,
  );
});

// FIXME: actionはHotkeyAction型にすべき
const deleteHotkey = (action: string) => {
  changeHotkeySettings(action, HotkeyCombination(""));
};

const getHotkeyText = (action: string, combo: string) => {
  if (checkHotkeyReadonly(action)) combo = "（読み取り専用）" + combo;
  if (combo == "") return "未設定";
  else return combo;
};

// for later developers, in case anyone wants to add a readonly hotkey
const readonlyHotkeyKeys: string[] = [];

const checkHotkeyReadonly = (action: string) => {
  let flag = false;
  readonlyHotkeyKeys.forEach((key) => {
    if (key == action) {
      flag = true;
    }
  });
  return flag;
};

const openHotkeyDialog = (action: string) => {
  lastAction.value = action;
  lastRecord.value = HotkeyCombination("");
  isHotkeyDialogOpened.value = true;
  document.addEventListener("keydown", recordCombination);
};

const closeHotkeyDialog = () => {
  lastAction.value = "";
  lastRecord.value = HotkeyCombination("");
  isHotkeyDialogOpened.value = false;
  document.removeEventListener("keydown", recordCombination);
};

const solveDuplicated = () => {
  if (duplicatedHotkey.value == undefined)
    throw new Error("duplicatedHotkey.value == undefined");
  deleteHotkey(duplicatedHotkey.value.action);
  return changeHotkeySettings(lastAction.value, lastRecord.value);
};

const confirmBtnEnabled = computed(() => {
  return (
    lastRecord.value == "" ||
    ["Ctrl", "Shift", "Alt", "Meta"].includes(
      lastRecord.value.split(" ")[lastRecord.value.split(" ").length - 1],
    )
  );
});

const resetHotkey = async (action: string) => {
  const result = await store.dispatch("SHOW_CONFIRM_DIALOG", {
    title: "ショートカットキーを初期値に戻します",
    message: `${action}のショートカットキーを初期値に戻します。<br/>本当に戻しますか？`,
    html: true,
    actionName: "初期値に戻す",
    cancel: "初期値に戻さない",
  });
  if (result === "OK") {
    window.backend
      .getDefaultHotkeySettings()
      .then((defaultSettings: HotkeySettingType[]) => {
        const setting = defaultSettings.find((value) => value.action == action);
        if (setting == undefined) {
          return;
        }
        // デフォルトが未設定でない場合は、衝突チェックを行う
        if (setting.combination) {
          const duplicated = hotkeySettings.value.find(
            (item) =>
              item.combination == setting.combination && item.action != action,
          );
          if (duplicated != undefined) {
            openHotkeyDialog(action);
            lastRecord.value = duplicated.combination;
            return;
          }
        }
        changeHotkeySettings(action, setting.combination);
      });
  }
};
</script>

<style scoped lang="scss">
@use "@/styles/variables" as vars;
@use "@/styles/colors" as colors;

.search-box {
  width: 200px;
}

.hotkey-tree {
  width: calc(100vw - #{vars.$window-border-width * 2});
  height: calc(
    100vh - #{vars.$menubar-height + vars.$toolbar-height +
      vars.$window-border-width}
  );

  > :deep(.scroll) {
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .hotkey-line {
    display: flex;
    width: 100%;
    border-bottom: solid 1px colors.$surface;
    padding: 2px 0;

    > span {
      display: flex;
      width: 100%;
      span:first-child {
        width: calc(100% - 30vw);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .hotkey-button {
        min-width: 180px;
      }

      button:last-child {
        margin-left: auto;
        display: none;
        min-width: 180px;
      }
      &:hover {
        button:last-child {
          display: inline-flex;
          color: colors.$display;
          opacity: 0.5;

          &:hover {
            opacity: 1;
          }
        }
      }
    }
  }

  > .header {
    position: sticky;
    top: 0;
    font-weight: bold;
    background-color: colors.$surface;
    z-index: 1;
    padding-left: 0.5em;
  }
}

.q-layout-container > :deep(.absolute-full) {
  right: 0 !important;
  > .scroll {
    width: unset !important;
    overflow: hidden;
  }
}
</style>
