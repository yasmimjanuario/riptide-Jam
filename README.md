# Riptide Jam 🚗

Protótipo de um puzzle de trânsito num pátio/estacionamento, no estilo "Bus
Puzzle: Brain Games" / "Traffic Jam" (mesma mecânica do Rush Hour): motos,
carros e ônibus coloridos, cada um com sua saída sempre aberta, presos uns
aos outros até você abrir caminho. Mobile-first, jogável no navegador,
pensado para portar depois para app nativo.

## Status

**Fase 1 — Passo 1: engine pura do puzzle.** ✅
**Fase 1 — Passo 2: UI do tabuleiro conectada à engine + i18n.** ✅

O pátio é jogável no navegador: grid renderizado a partir do `Board` da
engine, veículos coloridos (moto/carro/ônibus conforme o tamanho da peça),
toque para mover, saída deslizando pra fora, shake + "!" quando bloqueado,
cones de sinalização como obstáculo fixo. i18n (`i18next` + `react-i18next`)
plugado desde já, `pt-BR`/`en-US` completos, seletor de idioma no header —
nenhum texto de UI hardcoded, tudo via `t('...')`.

Próximos passos (ainda não iniciados): HUD (vidas/moedas/nível) + ações
(dica/desfazer/embaralhar), modais de vitória/derrota, loja/ranking mock.

> Nota: já existiu (e foi revertido) um redesign de mecânica com fila de
> metas por cor/cota — o pedido foi voltar pra ideia inicial (Rush Hour
> clássico: cada cor sempre tem saída aberta), então essa camada de metas
> não está mais no jogo. O histórico do git ainda tem os dois commits caso
> valha revisitar a ideia depois.

### Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
```

### Estrutura da UI (`src/`)

| Pasta/arquivo | Responsabilidade |
| --- | --- |
| `engine/` | Motor puro do puzzle (ver seção abaixo) — sem React. |
| `theme/palette.ts` | Único lugar que mapeia `ColorId` da engine → cor visual + chave i18n. A engine não conhece hex codes. |
| `theme/vehicleKind.ts` | Mapeia o `length` (1–3) da peça pra um tipo de veículo (moto/carro/ônibus) — decisão só de UI, a engine não sabe disso. |
| `state/useGameStore.ts` | Store Zustand: gera o nível (via `generateLevel`), expõe `attemptMove`/`startNewLevel`, guarda o estado de "bloqueado" para a UI. |
| `components/Board.tsx` | O tabuleiro: asfalto com faixas de vaga, monta `Vehicle`/`ExitMarker`/`Barrier`. |
| `components/Vehicle.tsx` | Um veículo: desenhado com coordenadas normalizadas ao longo/através do eixo de movimento (funciona igual em qualquer orientação, sem distorcer peças verticais compridas), roda, farol/lanterna, janelas conforme o tipo, saída deslizando (`AnimatePresence`), shake + "!" quando bloqueado. |
| `components/ExitMarker.tsx` | Placa de saída colorida com seta, na borda correspondente à direção/linha da saída. |
| `components/Barrier.tsx` | Cone de sinalização fixo — nunca se move, nunca é tocável. |
| `i18n/index.ts` + `locales/*.json` | Setup do i18next, detecção automática de idioma do navegador, `pt-BR`/`en-US`. |

## A engine (`src/engine/`)

A engine é agnóstica de tema — por dentro tudo é `Entity`, `Board`, `Exit`,
nunca "veículo" ou "pátio". A camada visual é quem decide pintar isso como
carros num estacionamento (podia virar peixes, blocos, o que for, sem tocar
na engine).

| Arquivo | Responsabilidade |
| --- | --- |
| `types.ts` | Tipos centrais: `Entity`, `Obstacle`, `Exit`, `Board`, `Direction`, etc. |
| `grid.ts` | Geometria pura: células ocupadas por uma entidade, célula da frente, caminho até a borda. |
| `rules.ts` | Regras do jogo: `canExit`, `tryMoveEntity`, `isSolved`, `isDeadlock`, `getBoardStatus`. |
| `solver.ts` | Solver por BFS sobre o espaço de estados ("quais entidades restam"), usado para validar solubilidade. |
| `generator.ts` | Gerador de níveis: constrói o tabuleiro de trás para frente e garante solubilidade por construção, com o solver como checagem final. |
| `rng.ts` | PRNG determinístico (mulberry32) — mesma seed sempre gera o mesmo nível. |

### Mecânica implementada

- Tabuleiro em grid (`width` × `height`), cada `Entity` ocupa 1–3 células em
  linha reta, com cor e sentido de movimento fixos desde a geração (moto =
  1 célula, carro = 2, ônibus = 3, na camada visual).
- Saídas (`Exit`) nas bordas, sempre abertas: uma entidade só sai se
  existir uma saída na mesma linha/coluna, na mesma direção e da mesma cor.
- Uma entidade só se move se todas as células entre ela e a borda, no seu
  sentido, estiverem livres de outras entidades e obstáculos fixos.
- Movimento bloqueado não altera o tabuleiro (`tryMoveEntity` retorna
  `moved: false`) — cabe à UI mostrar o feedback de "não deu" sem gastar vida.
- Vitória: todas as entidades saíram (`isSolved`). Deadlock: restam
  entidades mas nenhuma pode se mover (`isDeadlock`) — isso é derrota de
  nível na Fase 2 (perde vida).

### Por que o gerador garante níveis sempre solúveis

O nível é construído de trás para frente: primeiro as saídas, depois as
entidades, uma a uma. Cada nova entidade só é aceita numa posição se o
caminho dela até a saída atribuída estiver livre **considerando apenas as
entidades já colocadas antes dela**.

Como remover uma entidade só libera células (nunca ocupa novas), essa
relação de bloqueio é monótona: a ordem de colocação, lida de trás para
frente, é sempre uma ordem de jogo válida — a última entidade colocada pode
sair primeiro (nada foi colocado depois dela para bloqueá-la), e assim por
diante. Como checagem final (e é barato para os tamanhos de tabuleiro
usados aqui), o tabuleiro pronto ainda passa pelo `solveBoard` (BFS); se
por algum motivo divergir, a tentativa é descartada e regenerada.

### Rodando os testes

```bash
npm install
npm test        # roda a suíte uma vez
npm run test:watch
```

34 testes cobrindo geometria de grid, regras de movimento/vitória/deadlock,
o solver (incluindo um caso de fila onde uma entidade bloqueia outra da
mesma cor) e o gerador (determinismo por seed, ausência de sobreposição,
solubilidade garantida em 30 seeds diferentes).

---

<details>
<summary>Notas do template Vite (React + TypeScript)</summary>

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

</details>
