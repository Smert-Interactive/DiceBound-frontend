import { useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import "./Tabs.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

export function Tabs({ items, value, onChange, label }: TabsProps) {
  const prefix = useId();
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const enabledTabs = items.filter((item) => !item.disabled);
  const activeTab = enabledTabs.find((item) => item.id === value);
  // В Tab-порядке всегда одна вкладка. Если выбранной нет (value не совпал ни с чем),
  // это первая доступная, иначе список вкладок нельзя было бы достичь с клавиатуры.
  const focusableId = activeTab?.id ?? enabledTabs[0]?.id;

  function handleKeyDown(event: KeyboardEvent, currentId: string) {
    const currentIndex = enabledTabs.findIndex((item) => item.id === currentId);
    let nextTab: TabItem | undefined;

    switch (event.key) {
      case "ArrowRight":
        nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length];
        break;
      case "ArrowLeft":
        nextTab = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length];
        break;
      case "Home":
        nextTab = enabledTabs[0];
        break;
      case "End":
        nextTab = enabledTabs.at(-1);
        break;
      default:
        return;
    }

    if (!nextTab) return;

    event.preventDefault();
    buttonRefs.current.get(nextTab.id)?.focus();
    onChange(nextTab.id);
  }

  function rememberButton(id: string, button: HTMLButtonElement | null) {
    if (button) {
      buttonRefs.current.set(id, button);
    } else {
      buttonRefs.current.delete(id);
    }
  }

  return (
    <div className="ui-tabs">
      <div className="ui-tabs__list" role="tablist" aria-label={label}>
        {items.map((item) => {
          const selected = activeTab?.id === item.id;

          return (
            <button
              key={item.id}
              ref={(button) => rememberButton(item.id, button)}
              type="button"
              role="tab"
              className="ui-tabs__tab"
              id={`${prefix}-tab-${item.id}`}
              aria-controls={selected ? `${prefix}-panel-${item.id}` : undefined}
              aria-selected={selected}
              tabIndex={item.id === focusableId ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => handleKeyDown(event, item.id)}
            >
              <span className="ui-tabs__label">{item.label}</span>
              <span className="ui-tabs__width" aria-hidden="true">{item.label}</span>
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div
          key={activeTab.id}
          role="tabpanel"
          id={`${prefix}-panel-${activeTab.id}`}
          aria-labelledby={`${prefix}-tab-${activeTab.id}`}
          tabIndex={0}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
