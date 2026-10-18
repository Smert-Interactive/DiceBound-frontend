import { useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem { id: string; label: string; content: ReactNode; disabled?: boolean }
export function Tabs({ items, value, onChange, label }: {
  items: readonly TabItem[]; value: string; onChange: (id: string) => void; label: string;
}) {
  const prefix = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const enabled = items.filter(item => !item.disabled);
  function onKeyDown(event: KeyboardEvent, current: string) {
    const index = enabled.findIndex(item => item.id === current);
    let next: TabItem | undefined;
    if (event.key === "ArrowRight") next = enabled[(index + 1) % enabled.length];
    else if (event.key === "ArrowLeft") next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled.at(-1);
    if (!next) return;
    event.preventDefault();
    refs.current.get(next.id)?.focus();
    onChange(next.id);
  }
  return <div className="ui-tabs">
    <div className="ui-tabs__list" role="tablist" aria-label={label}>
      {items.map(item => <button key={item.id} ref={node => { if (node) refs.current.set(item.id, node); else refs.current.delete(item.id); }}
        type="button" role="tab" className="ui-tabs__tab" id={`${prefix}-tab-${item.id}`}
        aria-controls={`${prefix}-panel-${item.id}`} aria-selected={value === item.id}
        tabIndex={value === item.id ? 0 : -1} disabled={item.disabled}
        onClick={() => onChange(item.id)} onKeyDown={event => onKeyDown(event, item.id)}>
        <span className="ui-tabs__label">{item.label}</span>
        <span className="ui-tabs__width" aria-hidden="true">{item.label}</span>
      </button>)}
    </div>
    {items.map(item => <div key={item.id} role="tabpanel" id={`${prefix}-panel-${item.id}`}
      aria-labelledby={`${prefix}-tab-${item.id}`} hidden={value !== item.id} tabIndex={0}>{item.content}</div>)}
  </div>;
}
