# Tiago's Toolkit: Points of Interest

Pontos de interesse sobre o mapa do Foundry. O mestre marca uma coisa na cena, dá-lhe um nome e uma
descrição; os jogadores passam o rato, veem o nome, clicam e leem.

É só isto — e é de propósito.

---

## Instalar

Foundry → **Add-on Modules → Install Module** → colar em *Manifest URL*:

```
https://github.com/Th1rdo/tiagos-toolkit-poi/releases/latest/download/module.json
```

Foundry v13 e v14. Sem dependências.

## O gesto

Há três coisas para aprender, e nenhuma delas precisa de manual:

| | |
|---|---|
| **Passar o rato** | aparece o número e o nome |
| **Clicar** | abre o cartão com a descrição |
| **Arrastar** *(mestre)* | muda o ponto de sítio |

`Esc` fecha o que estiver aberto.

## Criar e editar (mestre)

Na barra dos tokens há **um** botão: a mira. Liga-a e cada clique no mapa cria um ponto — podes marcar
cinco coisas seguidas sem sair do modo. `Esc` sai.

O ponto nasce **visível** e com o painel aberto, à espera do nome.

**O mestre edita o cartão que os jogadores veem.** Não há painel de edição à parte: é o mesmo cartão,
com o nome e a descrição editáveis no sítio. Guarda sozinho meio segundo depois de parares de escrever.

No mesmo cartão escolhes o **aspeto do marcador**:

- **forma** — retícula, anel, losango, cruz, quadrado
- **cor** — a do mundo, ou osso, sangue, gelo, limo, violeta
- **tamanho** — um cursor, com o marcador a mudar à vista
- **opacidade** — quanto se vê do marcador em repouso; com o rato por cima vai sempre a 100%

O olho no canto esconde o ponto dos jogadores (fica a tracejado, só para ti). Apagar está no fundo.
Botão direito num marcador abre o cartão diretamente.

## Onde os dados vivem

Nas flags da própria cena. Sobrevivem a um F5 de qualquer um, chegam sozinhos a quem entra atrasado,
e uma cena duplicada leva os pontos com ela. Só o mestre escreve.

> [!NOTE]
> Esconder é esconder na interface, não é segredo criptográfico: os dados da cena chegam ao cliente
> de todos. Serve contra o acidente, não contra quem abrir a consola de propósito.

## API

```js
game.poi.criar(x, y);      // coordenadas da cena
game.poi.abrir(id);        // abre o cartão de um ponto
game.poi.colocar(true);    // liga a mira
game.poi.pontos();         // a lista da cena atual
```

## Desenvolvimento

```bash
npm test          # lógica pura + verificação de integridade
npm run test:dom  # bancada de browser (precisa de Chrome): posicionamento, cor, opacidade, arrastar
```

A bancada monta um `stage` falso com a **matriz do PIXI desatualizada de propósito** — a armadilha que
fazia os pontos fugirem do sítio ao dar zoom — e verifica que o módulo a ignora.

A verificação recusa caminhos partidos, imports inexistentes, chaves de tradução em falta (incluindo as
que são montadas em tempo de execução) e classes de CSS usadas no JS que não existem na folha de estilo.
