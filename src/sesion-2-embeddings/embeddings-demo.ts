// Sesión 2 — Embeddings desde cero.
// Corre:  npm install   (una vez, baja @xenova/transformers)
//         npm run embed:demo
// La 1a vez descarga el modelo (~120 MB) y lo cachea; luego es instantáneo.
//
// Qué demuestra: cada frase se vuelve un vector de 384 números, y la cercanía
// entre vectores captura SIGNIFICADO, no palabras compartidas.
import { pipeline } from '@xenova/transformers';

// Modelo real de Cata (multilingüe, bueno en español). Siempre 384 números.
const embed = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

// e5 exige prefijos: "query:" para la pregunta, "passage:" para los textos guardados.
async function vec(prefijo: 'query' | 'passage', texto: string): Promise<number[]> {
  const out = await embed(`${prefijo}: ${texto}`, { pooling: 'mean', normalize: true });
  return Array.from(out.data as Float32Array);
}

// Con vectores normalizados, la similitud coseno = producto punto (1 = igual, 0 = sin relación).
const coseno = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

const pregunta = 'por qué mi espresso sale ácido';

const lecciones = [
  { id: 'shot-acido',   texto: 'Cuando el espresso queda subextraído tiende a saber agrio o avinagrado. Suele deberse a un molido demasiado grueso, agua poco caliente o un tiempo de extracción corto: el agua no alcanza a disolver los azúcares y solo arrastra los ácidos.' },
  { id: 'acido-quim',   texto: 'El ácido sulfúrico es un compuesto altamente corrosivo empleado en la industria química y en el tratamiento de metales. Su manejo exige equipo de protección por el riesgo de quemaduras.' },
  { id: 'espuma-leche', texto: 'Para lograr una buena microespuma calienta la leche hasta unos 60 grados e incorpora aire con la punta de la varilla del vaporizador, girando el jarro para crear un remolino uniforme.' },
  { id: 'gatos',        texto: 'Los gatos domésticos duermen en promedio dieciséis horas al día y prefieren lugares cálidos y elevados para descansar sin sentirse amenazados.' },
];

const vq = await vec('query', pregunta);
console.log(`\nLa pregunta se volvió un vector de ${vq.length} números:`);
console.log(`   [${vq.slice(0, 8).map(n => n.toFixed(4)).join(', ')}, ...]  (hasta 384)\n`);

const rank: { id: string; sim: number }[] = [];
for (const l of lecciones) rank.push({ id: l.id, sim: coseno(vq, await vec('passage', l.texto)) });
rank.sort((a, b) => b.sim - a.sim);

console.log(`PREGUNTA:  "${pregunta}"\n`);
console.log('Ranking por similitud de SIGNIFICADO (1 = idéntico, 0 = sin relación):\n');
rank.forEach((r, i) => console.log(`  ${i + 1}.  ${r.sim.toFixed(3)}  [${r.id}]`));
console.log(`\n→ Gana la lección que de verdad responde, aunque no comparta las palabras de la pregunta.`);
console.log(`→ Ojo: e5 comprime todo a una banda alta (~0.75–0.90). Lo que importa es el ORDEN, no el número absoluto.`);
