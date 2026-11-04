export interface ToC {
  url: string;
  content: string;
  depth: number;
}

export interface GlobalForm {
  id: string;
  menus: InputType[];
}

/** An inline Template (a `{ztmpl …}` marker followed by a code span), placed via `<codeinline id>` in content. */
export interface InlineTemplate {
  id: string;
  lang?: string;
}

export interface HelpPageData {
  toc: ToC[];
  content: string;
  meta: {
    title: string;
    cname: string;
    /** Config `filter` (spec "Protocol enforcement"): page-wide scheme enforcement. */
    filter?: ZDocFilter;
  };
  compiledTemplates: Record<string, string>;
  codeBlocks: Array<{
    id: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
    append?: boolean;
  }>;
  /** Global Input forms (ADR 0007), placed via `<globalmenu id>` in content. */
  globalForms: GlobalForm[];
  /** Inline Templates (spec "Inline Templates"), placed via `<codeinline id>` in content. */
  inlineTemplates: InlineTemplate[];
}

export interface ZDocConfigOnDisk {
  _?: string; // Title
  block?: string[];
  input?: Record<string, ZDocInput | null>;
  filter?: ZDocFilter | null;
}

/** Config `filter` (spec "Protocol enforcement"): a filtered page forces the chosen scheme everywhere. */
export interface ZDocFilter {
  scheme?: string;
}

export interface ZDocConfig {
  name: string;
  _: string; // Title
  block: string[];
  input: Record<string, ZDocInput>;
  filter?: ZDocFilter | null;
}

export interface ZDocInputCommon {
  _: string;
  note?: string;
}

export interface ZDocInputOptionSelect {
  _?: string;
  /** Companion variable values; non-string values (e.g. the boolean `sid` flag) are legal and render through mustache sections. */
  [key: string]: string | number | boolean | null | undefined;
}

export interface ZDocInputOption extends ZDocInputCommon {
  /** The option set; a null entry means the key itself serves as the label. */
  option: Record<string, ZDocInputOptionSelect | null>;
  default?: string;
}

export interface ZDocInputBool extends ZDocInputCommon {
  true?: string | null;
  false?: string | null;
  default?: boolean;
}

export interface ZDocInputText extends ZDocInputCommon {
  default?: string;
}

export type ZDocInput = ZDocInputOption | ZDocInputBool | ZDocInputText;

export interface MenuValue {
  [key: string]: string | number | boolean | null;
}

export interface InputCommon {
  title?: string;
  note?: string;
}

export interface Menu extends InputCommon {
  items: Array<[string, MenuValue]>;
}

export interface BooleanInput extends InputCommon {
  name: string;
  defaultValue: boolean;
  trueValue: string | boolean;
  falseValue: string | boolean;
}

export interface TextInput extends InputCommon {
  name: string;
  defaultValue?: string;
}

export type InputType = Menu | TextInput | BooleanInput;

/**
 * One discriminant-aware shape over the InputType variants — select menu,
 * switch, text — each with its own typed case. Shared by the initial-state
 * builder (template-render) and the input form renderer (InputMenu) so the
 * `'items' in menu` / `'trueValue' in menu` cascade lives in one place.
 */
export function foldInput<T>(
  menu: InputType,
  cases: {
    select: (menu: Menu) => T;
    switch: (menu: BooleanInput) => T;
    text: (menu: TextInput) => T;
  },
): T {
  if ('items' in menu) return cases.select(menu);
  if ('trueValue' in menu) return cases.switch(menu);
  return cases.text(menu);
}