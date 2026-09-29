import { toPg, vec } from "../lib/helpers";

const vq = toPg(await vec("query", "por qué mi espresso sale ácido"));

console.log("✓ vector de la pregunta listo");
