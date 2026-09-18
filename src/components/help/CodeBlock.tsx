import { useState, useMemo, useCallback } from 'react';
import Hogan from 'hogan.js';
import type { InputType, MenuValue } from '@/lib/help/types';

interface CodeBlockProps {
  templateId: string;
  compiledTemplates: Record<string, string>;
  menus?: InputType[];
  lang?: string;
  filepath?: string;
  /** Mirror endpoint URL, e.g. "mirrors.tuna.tsinghua.edu.cn" */
  mirrorUrl?: string;
  /** Page slug, e.g. "debian" — appended to endpoint */
  cname?: string;
  sudoEnabled?: boolean;
  httpsEnabled?: boolean;
}

function createInitialState(menus: InputType[]): MenuValue {
  return menus.reduce<MenuValue>((acc, menu) => {
    let value: MenuValue;
    if ('items' in menu) {
      value = menu.items[0]?.[1] || {};
    } else if ('trueValue' in menu) {
      value = { [menu.name]: menu.defaultValue ? menu.trueValue : menu.falseValue };
    } else {
      value = { [menu.name]: menu.defaultValue || '' };
    }
    return { ...acc, ...value };
  }, {});
}

function CodeBlockMenu({
  menus,
  state,
  onChange,
  selectedIndices,
  onSelectChange,
}: {
  menus: InputType[];
  state: MenuValue;
  onChange: (newState: MenuValue) => void;
  selectedIndices: number[];
  onSelectChange: (menuIndex: number, itemIndex: number) => void;
}) {
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

    onSelectChange(menuIndex, newItemIndex);
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

export default function CodeBlock({
  templateId,
  compiledTemplates,
  menus = [],
  lang,
  filepath,
  mirrorUrl,
  cname,
  sudoEnabled = false,
  httpsEnabled = true,
}: CodeBlockProps) {
  const [menuState, setMenuState] = useState<MenuValue>(() =>
    createInitialState(menus),
  );
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    menus.map((menu) => ('items' in menu ? 0 : -1)),
  );
  const [copied, setCopied] = useState(false);

  const renderedCode = useMemo(() => {
    const rawTemplate = compiledTemplates[templateId];
    if (!rawTemplate) return '(template not found)';

    try {
      const template = Hogan.compile(rawTemplate);
      const scheme = httpsEnabled ? 'https' : 'http';
      const endpoint = mirrorUrl
        ? `${scheme}://${mirrorUrl}${cname ? `/${cname}` : ''}`
        : '(no mirror selected)';
      const vars: MenuValue = {
        ...menuState,
        endpoint,
        host: mirrorUrl || '(no mirror selected)',
        path: '',
        sudo: sudoEnabled ? 'sudo ' : '',
        sudoE: sudoEnabled ? 'sudo -E ' : '',
        http_protocol: httpsEnabled ? 'https://' : 'http://',
        scheme,
      };
      return template.render(vars);
    } catch {
      return rawTemplate;
    }
  }, [templateId, compiledTemplates, menuState, mirrorUrl, sudoEnabled, httpsEnabled]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(renderedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [renderedCode]);

  return (
    <div className="codeblock-container">
      {menus.length > 0 && (
        <CodeBlockMenu
          menus={menus}
          state={menuState}
          onChange={setMenuState}
          selectedIndices={selectedIndices}
          onSelectChange={(menuIndex, itemIndex) => {
            setSelectedIndices((prev) => {
              const next = [...prev];
              next[menuIndex] = itemIndex;
              return next;
            });
          }}
        />
      )}
      <div className="codeblock-wrapper">
        <div className="codeblock-header">
          {lang && <span className="codeblock-lang">{lang}</span>}
          {filepath && <span className="codeblock-filepath">{filepath}</span>}
          <button
            className="codeblock-copy"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <span className="material-icons" style={{ fontSize: 16 }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <pre className={`codeblock-pre${lang ? ` language-${lang}` : ''}`}>
          <code>{renderedCode}</code>
        </pre>
      </div>
    </div>
  );
}
