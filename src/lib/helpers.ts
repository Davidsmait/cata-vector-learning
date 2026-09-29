import { pipeline } from "@xenova/transformers";

export const embed = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);

export async function vec(
  prefijo: "query" | "passage",
  texto: string,
): Promise<number[]> {
  const salida = await embed(`${prefijo}: ${texto}`, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(salida.data as Float32Array);
}

export const toPg = (v: number[]) => `[${v.join(",")}]`;
