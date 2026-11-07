import { format } from "npm:date-fns@4";
export function greet(name: string, d: Date): string { return "hello " + name + " " + format(d, "yyyy-MM-dd"); }
export async function weather(): Promise<string> { const r = await fetch("https://api.example.com/w"); return (await r.json()).sky; }
