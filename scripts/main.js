import { MODULE_ID, SOCKET, MSG, log } from "./const.js";
import { pontos, ponto as obterPonto, criarPonto, definirArdosia, reporCena, aoMudar, cenaAtual } from "./dados.js";
import { marcadores } from "./marcadores.js";
import { cartao } from "./cartao.js";
import { editor } from "./editor.js";
import { dossie, irParaOPonto } from "./dossie.js";
import { mostrarFicha } from "./ficha.js";
import { aplicarModo, alternarModo, modoLigado } from "./modo.js";
import { pontosVisiveis, evidenciasVisiveis } from "./logica.js";

/**
 * Montagem do módulo.
 *
 * Tudo o que é estado vive nas flags da cena; este ficheiro só liga os fios:
 * quando a cena muda, redesenha; quando o mestre carrega num botão, escreve.
 */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "acento", {
    name: "POI.Config.Acento", hint: "POI.Config.AcentoHint",
    scope: "world", config: true, type: String, default: "#C98B3C",
    onChange: (v) => aplicarAcento(v)
  });

  game.settings.register(MODULE_ID, "rotulosSempre", {
    name: "POI.Config.RotulosSempre", hint: "POI.Config.RotulosSempreHint",
    scope: "client", config: true, type: Boolean, default: false,
    onChange: (v) => document.body.classList.toggle("poi-rotulos-sempre", v)
  });

  game.keybindings.register(MODULE_ID, "modo", {
    name: "POI.Atalho.Modo",
    editable: [{ key: "KeyI", modifiers: ["Control", "Shift"] }],
    restricted: true,
    onDown: () => { alternarModo(); return true; }
  });

  game.keybindings.register(MODULE_ID, "dossie", {
    name: "POI.Atalho.Dossie",
    editable: [{ key: "KeyD", modifiers: ["Control", "Shift"] }],
    onDown: () => { dossie.alternar(); return true; }
  });
});

/** A cor de acento é uma variável de CSS: muda o módulo inteiro de uma vez. */
function aplicarAcento(cor = game.settings.get(MODULE_ID, "acento")) {
  document.documentElement.style.setProperty("--poi-acento", cor || "#C98B3C");
}

/** Ferramentas no grupo dos tokens — o mesmo sítio onde o mestre já tem a mão. */
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM || Array.isArray(controls)) return;
  const grupo = controls.tokens ?? Object.values(controls)[0];
  if (!grupo?.tools) return;
  const ordem = Object.keys(grupo.tools).length;

  grupo.tools.poiModo = {
    name: "poiModo",
    order: ordem + 1,
    title: "POI.Ferramentas.Modo",
    icon: "fa-solid fa-magnifying-glass",
    toggle: true,
    active: modoLigado(),
    visible: true,
    onChange: () => alternarModo()
  };

  grupo.tools.poiAdicionar = {
    name: "poiAdicionar",
    order: ordem + 2,
    title: "POI.Ferramentas.Adicionar",
    icon: "fa-solid fa-crosshairs",
    toggle: true,
    active: marcadores.aColocar,
    visible: true,
    onChange: (_ev, ativo) => marcadores.modoColocar(ativo)
  };

  grupo.tools.poiDossie = {
    name: "poiDossie",
    order: ordem + 3,
    title: "POI.Ferramentas.Dossie",
    icon: "fa-solid fa-folder-open",
    button: true,
    visible: true,
    onChange: () => dossie.alternar()
  };
});

// ------------------------------------------------------------------ o que já foi visto
// Para saber o que é *novo*: sem isto, entrar numa cena a meio mostrava todas as
// fichas de uma vez, como se tudo tivesse acabado de ser descoberto.
let jaVistas = new Set();

function inventarioDeEvidencias() {
  const vistas = new Set();
  for (const p of pontosVisiveis(pontos(), { userId: game.user.id, isGM: game.user.isGM })) {
    for (const e of evidenciasVisiveis(p, { userId: game.user.id, isGM: false })) vistas.add(e.id);
  }
  return vistas;
}

function novidades() {
  const agora = inventarioDeEvidencias();
  const novas = [...agora].filter(id => !jaVistas.has(id));
  jaVistas = agora;
  if (!novas.length) return;

  // uma de cada vez: se o mestre revelar duas seguidas, a segunda substitui a primeira
  const id = novas[novas.length - 1];
  for (const p of pontos()) {
    const ev = (p.evidencias ?? []).find(e => e.id === id);
    if (ev) return mostrarFicha({ pontoId: p.id, evidencia: ev, ponto: p });
  }
}

function redesenhar({ fichasNovas = true } = {}) {
  marcadores.desenhar();
  if (cartao.aberto) cartao.desenhar();
  if (editor.aberto) editor.desenhar();
  dossie.desenhar();
  aplicarModo();
  if (fichasNovas) novidades();
}

Hooks.once("ready", () => {
  aplicarAcento();
  document.body.classList.toggle("poi-rotulos-sempre", game.settings.get(MODULE_ID, "rotulosSempre"));

  marcadores.montar({
    aoSelecionar: (id) => {
      cartao.mostrar(id);
      if (!id) editor.fechar();
    },
    aoColocar: async (alvo) => {
      const novo = await criarPonto({ x: alvo.x, y: alvo.y });
      if (!novo) return;
      marcadores.desenhar();
      marcadores.selecionar(novo.id);
      editor.abrir(novo.id);
    }
  });
  cartao.montar();
  editor.montar();
  dossie.montar({ aoEscolher: (id) => irParaOPonto(id) });

  // clicar fora fecha o cartão; o mapa volta a ser o assunto
  document.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest("#poi-cartao, #poi-editor, .poi-marcador, #poi-dossie, #poi-dossie-tab")) return;
    if (marcadores.selecionado) marcadores.selecionar(null);
  });

  Hooks.on(`${MODULE_ID}.editar`, (id) => editor.abrir(id));

  aoMudar(() => redesenhar());
  game.socket.on(SOCKET, (msg) => {
    if (msg?.type === MSG.OLHEM && msg.pontoId) irParaOPonto(msg.pontoId);
  });

  jaVistas = inventarioDeEvidencias();
  redesenhar({ fichasNovas: false });

  /** API pública: dá jeito em macros e no ecrã de preparação. */
  game.poi = {
    criar: (x, y, nome) => criarPonto({ x, y, nome }),
    editar: (id) => editor.abrir(id),
    modo: () => alternarModo(),
    dossie: () => dossie.alternar(),
    irPara: (id) => irParaOPonto(id),
    ardosia: (local, hora) => definirArdosia({ local, hora }),
    repor: () => reporCena(),
    /** «Olhem todos para o 02»: leva a cena de toda a gente até ao ponto. */
    olhem: (id) => {
      if (!game.user.isGM || !obterPonto(id)) return;
      game.socket.emit(SOCKET, { type: MSG.OLHEM, pontoId: id });
      irParaOPonto(id);
    },
    pontos: () => pontos(),
    cena: () => cenaAtual()
  };

  log("pronto");
});

Hooks.on("canvasReady", () => {
  jaVistas = inventarioDeEvidencias();
  redesenhar({ fichasNovas: false });
});
