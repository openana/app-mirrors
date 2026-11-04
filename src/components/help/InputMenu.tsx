import { useState } from 'react';
import { foldInput } from '@/lib/help/types';
import type { BooleanInput, InputType, MenuValue, TextInput } from '@/lib/help/types';

/**
 * Interactive form for a set of input menus (select / switch / text): the
 * inputs of a Template (glossary: Template), whether block-local or a Global
 * Input form (rendered at `<globalmenu>` placeholders, ADR 0007). The
 * selection values live in the caller's store; only the selected option
 * indices are owned here.
 */
export default function InputMenu({
  menus,
  state,
  onChange,
}: {
  menus: InputType[];
  state: MenuValue;
  onChange: (newState: MenuValue) => void;
}) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    menus.map((menu) => foldInput(menu, { select: () => 0, switch: () => -1, text: () => -1 })),
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

  const handleTextChange = (menu: TextInput, e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...state, [menu.name]: e.target.value });
  };

  const handleBoolChange = (menu: BooleanInput) => {
    const currentVal = state[menu.name];
    const newVal = currentVal === menu.trueValue ? menu.falseValue : menu.trueValue;
    onChange({ ...state, [menu.name]: newVal });
  };

  if (menus.length === 0) return null;

  return (
    <div className="codeblock-menus">
      {menus.map((menu, menuIndex) =>
        foldInput(menu, {
          select: (m) => (
            <div className="codeblock-menu" key={m.title || menuIndex}>
              <span className="codeblock-menu-label">{m.title}</span>
              <select
                className="codeblock-select"
                onChange={(e) => handleSelectChange(menuIndex, e)}
                defaultValue="0"
              >
                {m.items.map(([label], i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ),
          switch: (m) => (
            <div className="codeblock-menu" key={m.title || menuIndex}>
              <label className="codeblock-checkbox-label">
                <input
                  type="checkbox"
                  checked={state[m.name] === m.trueValue}
                  onChange={() => handleBoolChange(m)}
                />
                <span>{m.title}</span>
              </label>
            </div>
          ),
          text: (m) => (
            <div className="codeblock-menu" key={m.title || menuIndex}>
              <span className="codeblock-menu-label">{m.title}</span>
              <input
                className="codeblock-text-input"
                type="text"
                defaultValue={m.defaultValue || ''}
                onChange={(e) => handleTextChange(m, e)}
              />
            </div>
          ),
        }),
      )}
    </div>
  );
}
