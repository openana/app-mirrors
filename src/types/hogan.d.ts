declare module 'hogan.js' {
  interface HoganTemplate {
    render(context: Record<string, unknown>): string;
  }

  interface HoganStatic {
    compile(template: string, options?: { asString?: boolean }): HoganTemplate;
  }

  const Hogan: HoganStatic;
  export default Hogan;
}