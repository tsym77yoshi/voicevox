import { it, expect } from "vitest";
import { HotkeyActionNameType, hotkeyActionNameSchema } from "@/type/preload";
import { hotkeyClassifications } from "@/components/Dialog/HotkeyClassification";

it("ホットキーの分類に過不足がない", () => {
  const actions = hotkeyActionNameSchema.options;
  const classifiedActions: HotkeyActionNameType[] = [];
  hotkeyClassifications.forEach((classification) => {
    classification.children.forEach((child) => {
      child.actions.forEach((action) => {
        classifiedActions.push(action);
      });
    });
  });
  expect(classifiedActions.sort()).toEqual(actions.sort());
});
