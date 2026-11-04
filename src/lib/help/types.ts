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
}

export interface ZDocConfig {
  name: string;
  _: string; // Title
  block: string[];
  input: Record<string, ZDocInput>;
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