# Tiago's Toolkit: Points of Interest

Uma camada de anotação sobre a cena do Foundry. O mestre marca o que há para investigar num sítio;
os jogadores veem anotações discretas sobre os objetos e decidem o que examinar.

**O módulo aponta para o que vale a pena olhar. Nunca diz o que significa.**
Não conta pistas, não mostra percentagens, não declara casos resolvidos.

---

## Instalar

Foundry → **Add-on Modules → Install Module** → colar em *Manifest URL*:

```
https://github.com/Th1rdo/tiagos-toolkit-poi/releases/latest/download/module.json
```

Compatível com Foundry v13 e v14. Sem dependências.

## Usar, como mestre

Na barra de ferramentas dos tokens aparecem três botões:

| Botão | O que faz |
|---|---|
| Lupa | Liga o **Modo Investigação** para toda a mesa (`Ctrl+Shift+I`) |
| Mira | Liga a **colocação**: cada clique no mapa cria um ponto |
| Pasta | Abre o **dossiê** (`Ctrl+Shift+D`) |

**Criar um ponto:** ligar a mira, clicar no objeto. O ponto nasce **oculto** e o editor abre com o cursor no nome.
Escrever o nome, fechar. Quatro segundos.

**O editor** guarda sozinho meio segundo depois de parares de escrever. Tem três campos à vista — nome,
descrição, evidências — e tudo o resto dobrado em *Avançado*.

**Com o rato num marcador** aparece uma barra com quatro ações, sem abrir nada:

- revelar ou esconder o ponto
- revelar a próxima evidência
- marcar como esgotado
- editar

**Arrastar um marcador** muda-o de sítio.

## O que os jogadores veem

Marcadores discretos: uma retícula, um número e — com o rato por cima — o nome.
Clicar abre um cartão amarrado ao objeto, com a descrição, os caminhos possíveis e o que já foi descoberto.
`Esc` fecha.

Quando revelas uma evidência, ela sai do ponto e assenta ao lado durante alguns segundos; depois disso
vive no **dossiê**, com hora e origem. Clicar numa ficha do dossiê leva o mapa de volta ao ponto.

## Graus de ajuda

Cada ponto escolhe quanto é que o módulo adianta:

- **Livre** — só o objeto e a descrição. O jogador diz o que faz.
- **Guiado** — mostra caminhos possíveis («Examinar os ferimentos»).
- **Explícito** — os mesmos caminhos, com a perícia à direita, em metadados.

É uma definição por ponto: a mesma cena pode ter um corpo guiado e uma janela livre.

## Quem vê o quê

Quatro alturas independentes: o ponto, a descrição, cada evidência e (em breve) o anexo.
Um ponto pode ser visível a todos e ter uma evidência endereçada só a um jogador — que a vê marcada
com **só para ti** e decide se conta ou se cala.

> [!NOTE]
> Esconder aqui é esconder na interface, não é segredo criptográfico: os dados da cena chegam ao
> cliente de todos. Serve contra o acidente, não contra quem abrir a consola de propósito.

## API

```js
game.poi.criar(x, y, "Mesa");   // cria um ponto nas coordenadas da cena
game.poi.editar(id);            // abre o editor
game.poi.modo();                // liga/desliga o Modo Investigação
game.poi.dossie();              // abre/fecha o dossiê
game.poi.irPara(id);            // leva o mapa até ao ponto
game.poi.olhem(id);             // leva a cena de TODA a gente até ao ponto
game.poi.ardosia("Apartamento 3B", "22:41");
game.poi.repor();               // tudo volta a oculto e por revelar
```

## Onde os dados vivem

Nas flags da própria cena. Sobrevivem a um F5 de qualquer um, chegam sozinhos a quem entra atrasado,
e uma cena duplicada leva os pontos com ela. Só o mestre escreve.

## Nesta versão (0.1.0)

Feito: marcadores e estados, cartão, três graus de ajuda, evidências com revelação e dossiê,
modo investigação, ardósia, permissões por ponto e por evidência, editor com guarda automática,
arrastar, cor de acento configurável.

Por fazer: sons, ligações entre evidências, quadro de cordéis, temas completos, anexos de imagem,
moldes de ponto, exportar o dossiê para diário.

## Desenvolvimento

```bash
npm test      # lógica pura + verificação de integridade
```

A verificação de integridade recusa caminhos partidos, chaves de tradução em falta e classes de CSS
usadas no JS que não existem na folha de estilo.
