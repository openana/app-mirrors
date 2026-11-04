import { useState } from 'react';
import type { InputType, MenuValue } from '@/lib/help/types';

/**
 * Interactive form for a set of input menus (select / switch / text).
 * Shared by block-local inputs (CodeBlock) and Global Input forms
 * (rendered at `<globalmenu>` placeholders, ADR 0007). The selection
 * values live in the caller's store; only the selected option indices
 * are owned here.
 */
export default function CodeBlockMenu({
  menus,
  state,
  onChange,
}: {
  menus: InputType[];
  state: MenuValue;
  onChange: (newState: MenuValue) => void;
}) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    menus.map((menu) => ('items' in menu ? 0 : -1)),
  );

  const handleSelectChange = (
    menuIndex: number,
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newItemIndex = Number.parseInt(e.target.value, 10);
    const menu = menus[menuIndex];
    if (!menu || !('items' in menu)) return;

    // Remove keys from the old item's values
    const oldItemIndex = selectedIndices[menuIndex] ?? 0;
    const [, oldValues] = menu.items[oldItemIndex] || [];
    const newState = { ...state };
    if (oldValues) {
      for (const key of Object.keys(oldValues)) {
        delete newState[key];
      }
    }

    // Add the new item's values
    const [, newValues] = menu.items[newItemIndex] || [];
    if (newValues) Object.assign(newState, newValues);

    setSelectedIndices((prev) => {
      const next = [...prev];
      next[menuIndex] = newItemIndex;
      return next;
    });
    onChange(newState);
  };

  const handleTextChange = (
    menu: Extract<InputType, { name: string }>,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onChange({ ...state, [menu.name]: e.target.value });
  };

  const handleBoolChange = (
    menu: Extract<InputType, { name: string; trueValue: unknown }>,
  ) => {
    const currentVal = state[menu.name];
    const newVal = currentVal === menu.trueValue ? menu.falseValue : menu.trueValue;
    onChange({ ...state, [menu.name]: newVal });
  };

  if (menus.length === 0) return null;

  return (
    <div className="codeblock-menus">
      {menus.map((menu, menuIndex) => {
        if ('items' in menu) {
          return (
            <div className="codeblock-menu" key={menu.title || menuIndex}>
              <span className="codeblock-menu-label">{menu.title}</span>
              <select
                className="codeblock-select"
                onChange={(e) => handleSelectChange(menuIndex, e)}
                defaultValue="0"
              >
                {menu.items.map(([label], i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if ('trueValue' in menu) {
          return (
            <div className="codeblock-menu" key={menu.title || menuIndex}>
              <label className="codeblock-checkbox-label">
                <input
                  type="checkbox"
                  checked={state[menu.name] === menu.trueValue}
                  onChange={() => handleBoolChange(menu)}
                />
                <span>{menu.title}</span>
              </label>
            </div>
          );
        }

        // Text input
        return (
          <div className="codeblock-menu" key={menu.title || menuIndex}>
            <span className="codeblock-menu-label">{menu.title}</span>
            <input
              className="codeblock-text-input"
              type="text"
              defaultValue={(menu as { defaultValue?: string }).defaultValue || ''}
              onChange={(e) => handleTextChange(menu, e)}
            />
          </div>
        );
      })}
    </div>
  );
}
