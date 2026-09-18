declare module 'prismjs' {
  interface Grammar {
    [key: string]: any;
  }

  function highlight(text: string, grammar: Grammar, language: string): string;
  function tokenize(text: string, grammar: Grammar): Array<string | Token>;
  
  const languages: {
    [key: string]: Grammar;
  };

  class Token {
    type: string;
    content: string | Token[];
    alias: string | string[];
    matchedIndex: number;
    length: number;
  }

  export { highlight, tokenize, languages, Token };
  export default { highlight, tokenize, languages };
}

declare module 'prismjs/components/prism-*' {
  // Side-effect imports for language support
}