export interface ToC {
  url: string;
  content: string;
  depth: number;
}

export interface HelpPageData {
  toc: ToC[];
  content: string; // Serialized React tree (JSON)
  meta: {
    title: string;
    cname: string;
  };
  compiledTemplates: Record<string, string>;
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
  [key: string]: string | undefined;
}

export interface ZDocInputOption extends ZDocInputCommon {
  option: Record<string, ZDocInputOptionSelect>;
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
  [key: string]: string | boolean;
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