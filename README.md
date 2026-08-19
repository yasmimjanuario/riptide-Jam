# Riptide Jam 🐠

Protótipo de um puzzle de cores num aquário/recife, no estilo "Bus Escape /
Traffic Jam" (mesma mecânica do Rush Hour, com peixes em vez de veículos),
misturado com um sistema de metas por cor no estilo "correntes com fila e
cota" — vários peixes precisam se acumular numa cor antes dela fechar e a
próxima abrir. Mobile-first, jogável no navegador, pensado para portar
depois para app nativo.

## Status

**Fase 1 — Passo 1: engine pura do puzzle.** ✅
**Fase 1 — Passo 2: UI do tanque conectada à engine + i18n.** ✅ (redesenhada — ver abaixo)

O tanque é jogável no navegador: grid 10×10 com ~20 peixes, HUD de metas por
cor no topo, toque para mover, nadada de saída, bolinha de "!" + shake
quando bloqueado, bolhas ambiente, cáustica no fundo. i18n (`i18next` +
`react-i18next`) plugado desde já, `pt-BR`/`en-US` completos, seletor de
idioma no header — nenhum texto de UI hardcoded, tudo via `t('...')`.

Próximos passos (ainda não iniciados): vidas/moedas persistentes, dica/
desfazer/embaralhar, modais de vitória/derrota, loja/ranking mock.

### Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
```

## A mecânica (redesenhada)

A primeira versão (peixe entra, peixe sai, tabuleiro esvazia) era simples
demais — não tinha o acúmulo/bloqueio de vários peixes que dá tensão ao
gênero. O redesenho:

- Cada nível tem uma **fila ordenada de metas por cor** (ex: verde precisa
  de 10, azul de 8, amarelo de 6...). Todos os peixes do nível já nascem no
  tabuleiro — nada é reposto depois.
- Só as **3 primeiras metas incompletas da fila ficam com a corrente
  aberta** ao mesmo tempo. Ao bater a cota de uma cor, a corrente dela
  fecha e a próxima da fila abre, mantendo sempre 3 abertas. Um peixe de
  cor ainda travada simplesmente não tem por onde sair — vira bloqueio para
  quem já pode se mover.
- Um 4º e um 5º slot podem ser destravados via um botão de "assistir
  anúncio" — nesta fase é **mock** (mesmo tratamento que a loja/IAP: nota
  clara de que o billing real entra depois).
- Cada peixe tem um **valor** que soma na cota da sua cor ao sair — um
  peixe maior (2–3 células) vale mais, como um ônibus carrega mais gente
  que um carro; existe também uma variante "de luxo" (brilho) que vale
  ainda mais para o mesmo tamanho. A cota é sobre valor somado, não sobre
  quantidade de peixes — então sobra peixe da mesma cor no tabuleiro depois
  que a cota fecha, virando bloqueio permanente para as cores seguintes.

## A engine (`src/engine/`)

Agnóstica de tema — por dentro é `Entity`/`Board`/`Exit`, nunca "peixe" ou
"aquário". A UI decide pintar isso como peixes num tanque.

| Arquivo | Responsabilidade |
| --- | --- |
| `types.ts` | Tipos centrais: `Entity` (com `value`), `Obstacle`, `Exit`, `Board`, `ColorGoal`, `Level`. |
| `grid.ts` | Geometria pura: células ocupadas, célula da frente, caminho até a borda. |
| `rules.ts` | Regras de movimento puras: `canExit`, `tryMoveEntity`, `isSolved`, `isDeadlock` — nunca sabem de metas, só de `board.exits`. |
| `goals.ts` | Camada de metas por cima de `rules.ts`: `getActiveColorIds` (janela das 3 primeiras metas incompletas), `canExitInLevel`, `tryMoveEntityInLevel`, `getLevelStatus`. |
| `placement.ts` | Primitivas de posicionamento compartilhadas pelos dois geradores abaixo. |
| `generator.ts` | Gerador "clássico" (todas as saídas abertas, todo peixe vale 1) — mantido como utilitário/baseline testado. |
| `questGenerator.ts` | Gerador real usado pelo jogo: monta a fila de metas, aloca várias saídas por cor, posiciona os peixes de trás para frente por meta. |
| `solver.ts` / `questSolver.ts` | Solvers por BFS sobre o espaço de estados, para o modo clássico e para níveis com metas. |
| `rng.ts` | PRNG determinístico (mulberry32) — mesma seed sempre gera o mesmo nível. |

### Por que o gerador garante níveis sempre solúveis (mesmo com metas)

Mesma ideia da v1, generalizada: o nível é construído de trás para frente,
mas agora agrupado por meta — os peixes da **última** meta da fila são
colocados primeiro (mais "no fundo"), os da **primeira** meta são colocados
por último (mais acessíveis). Cada peixe só é aceito numa posição se seu
caminho até a saída estiver livre **considerando só quem já foi colocado
antes dele**.

Isso continua valendo porque remover um peixe só libera células e só faz a
janela de cores ativas avançar (nunca volta) — nunca fecha uma porta que já
estava aberta para outro peixe. Peixes "de sobra" (que não são
estritamente necessários para bater a cota) são colocados primeiro de
todos, no fundo, então nunca precisam sair — funcionam como obstáculo fixo
by design. Como checagem final (rápida, O(n) — não é busca, é só repetir a
ordem que a própria geração já provou funcionar), o nível passa por uma
"reprodução" da ordem canônica de remoção antes de ser liberado; se algo
divergir, a tentativa é descartada e regenerada.

### Rodando os testes

```bash
npm install
npm test        # roda a suíte uma vez
npm run test:watch
```

51 testes cobrindo geometria de grid, regras de movimento/vitória/deadlock,
a camada de metas (janela de cores ativas, conclusão por cota e não por
quantidade, override de slots-bônus), os dois geradores (determinismo por
seed, ausência de sobreposição, solubilidade garantida em várias seeds) e
um cross-check independente via BFS num nível pequeno.

## UI (`src/`)

| Pasta/arquivo | Responsabilidade |
| --- | --- |
| `theme/palette.ts` | Único lugar que mapeia `ColorId` da engine → cor visual + chave i18n (8 cores). |
| `state/useGameStore.ts` | Store Zustand: gera o nível (`generateQuestLevel`), deriva progresso/cores-ativas/status a cada jogada, guarda os slots-bônus e o estado de "bloqueado". |
| `components/Tank.tsx` | O tanque: grid, bolhas, cáustica, monta `Fish`/`ExitMarker`/`ObstacleMark`. |
| `components/GoalBar.tsx` | HUD de metas: chip por cor (ativa com progresso, completa com ✓, travada, ou com botão de destravar via "anúncio" mock). |
| `components/Fish.tsx` | Peixe: idle bob, cauda balançando, gira para seu sentido fixo, badge de valor, brilho "de luxo", esmaece se a cor ainda não abriu, nadada de saída, shake + "!" quando bloqueado. |
| `components/ExitMarker.tsx` | Abertura na parede — visual muda entre ativa (brilhando), travada (apagada) e completa (contorno). |
| `components/ObstacleMark.tsx` | Coral fixo — nunca se move, nunca é tocável. |
| `components/Bubbles.tsx` | Bolhas subindo no fundo, puramente ambiente. |
| `i18n/index.ts` + `locales/*.json` | Setup do i18next, detecção automática de idioma, `pt-BR`/`en-US`. |

---

<details>
<summary>Notas do template Vite (React + TypeScript)</summary>

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

</details>
