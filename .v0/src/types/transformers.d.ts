declare module '@xenova/transformers/dist/transformers.js' {
  export function pipeline(
    task: string,
    model: string,
    options?: any
  ): Promise<any>;
}

declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model: string,
    options?: any
  ): Promise<any>;
}
