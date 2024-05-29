import {
  HotkeyActionNameType,
  HotkeySettingType,
  EditorType,
  actionPostfixSelectNthCharacter,
} from "@/type/preload";

type HotkeyClassificationType = {
  label: string;
  children: {
    label: string;
    editors: EditorType[];
    actions: HotkeyActionNameType[];
  }[];
};

export const hotkeyClassifications: HotkeyClassificationType[] = [
  {
    label: "共通",
    children: [
      {
        label: "共通操作",
        editors: ["talk", "song"],
        actions: ["元に戻す", "やり直す"],
      },
      {
        label: "ファイル（共通）",
        editors: ["talk", "song"],
        actions: [
          "新規プロジェクト",
          "プロジェクトを名前を付けて保存",
          "プロジェクトを上書き保存",
          "プロジェクトを読み込む",
        ],
      },
      {
        label: "ファイル（トーク）",
        editors: ["talk"],
        actions: ["テキストを読み込む"],
      },
    ],
  },
  {
    label: "トーク",
    children: [
      {
        label: "音声操作",
        editors: ["talk"],
        actions: [
          "音声書き出し",
          "選択音声を書き出し",
          "音声を繋げて書き出し",
          "再生/停止",
          "連続再生/停止",
        ],
      },
      {
        label: "詳細調整操作",
        editors: ["talk"],
        actions: [
          "ｱｸｾﾝﾄ欄を表示",
          "ｲﾝﾄﾈｰｼｮﾝ欄を表示",
          "長さ欄を表示",
          "全体のイントネーションをリセット",
          "選択中のアクセント句のイントネーションをリセット",
        ],
      },
      {
        label: "テキスト欄操作",
        editors: ["talk"],
        actions: [
          "テキスト欄を追加",
          "テキスト欄を複製",
          "テキスト欄を削除",
          "テキスト欄からフォーカスを外す",
          "テキスト欄にフォーカスを戻す",
        ],
      },
      {
        label: "キャラクター選択",
        editors: ["talk"],
        actions: [
          ...Array.from({ length: 10 }, (_, index) => {
            return `${index + 1}${actionPostfixSelectNthCharacter}` as HotkeyActionNameType;
          }),
        ],
      },
    ],
  },
  {
    label: "ソング",
    children: [
      {
        label: "ノーツ操作",
        editors: ["song"],
        actions: [
          "コピー",
          "切り取り",
          "貼り付け",
          "すべて選択",
          "選択解除",
          "全セルを選択",
        ],
      },
    ],
  },
];

export type HotkeyEditorSettingType = HotkeySettingType & {
  editors: EditorType[];
};

export const getHotkeyEditorSettings = (
  hotkeySettings: HotkeySettingType[],
): HotkeyEditorSettingType[] => {
  return hotkeySettings.map((hotkeySetting) => {
    const editors = hotkeyClassifications.flatMap(
      (hotkeyClassification) =>
        hotkeyClassification.children.find((child) =>
          child.actions.includes(hotkeySetting.action),
        )?.editors || [],
    );

    return {
      action: hotkeySetting.action,
      combination: hotkeySetting.combination,
      editors: editors,
    };
  });
};
