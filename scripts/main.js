import { MODULE_ID, log } from "./const.js";
import { pontos, criarPonto, aoMudar, cenaAtual } from "./dados.js";
import { marcadores } from "./marcadores.js";
import { painel } from "./painel.js";

/**
 * Montagem do módulo.
 *
 * O estado vive todo nas flags da cena; este ficheiro só liga os fios: a cena
 * muda, redesenha-se; o mestre clica, escreve-se.
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

  game.keybindings.register(MODULE_ID, "colocar", {
    name: "POI.Atalho.Colocar",
    editable: [{ key: "KeyP", modifiers: ["Control", "Shift"] }],
    restricted: true,
    onDown: () => { alternarColocacao(); return true; }
  });
});

/** A cor de acento é uma variável de CSS: muda o módulo inteiro de uma vez. */
function aplicarAcento(cor = game.settings.get(MODULE_ID, "acento")) {
  document.documentElement.style.setProperty("--poi-acento", cor || "#C98B3C");
}

/** Liga/desliga a colocação e mantém o botão da barra a dizer a verdade. */
function alternarColocacao(ligado = !marcadores.aColocar) {
  marcadores.modoColocar(ligado);
  ui.controls?.render();
}

/** Um botão só, no grupo dos tokens — onde o mestre já tem a mão. */
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM || Array.isArray(controls)) return;
  const grupo = controls.tokens ?? Object.values(controls)[0];
  if (!grupo?.tools) return;

  grupo.tools.poiColocar = {
    name: "poiColocar",
    order: Object.keys(grupo.tools).length + 1,
    title: "POI.Ferramentas.Colocar",
    icon: "fa-solid fa-crosshairs",
    toggle: true,
    active: marcadores.aColocar,
    visible: true,
    onChange: (_ev, ativo) => marcadores.modoColocar(ativo)
  };
});

function redesenhar() {
  marcadores.desenhar();
  if (painel.aberto) painel.desenhar();
}

Hooks.once("ready", () => {
  aplicarAcento();
  document.body.classList.toggle("poi-rotulos-sempre", game.settings.get(MODULE_ID, "rotulosSempre"));

  marcadores.montar({
    aoSelecionar: (id) => painel.mostrar(id),
    aoColocar: async (alvo) => {
      const novo = await criarPonto({ x: alvo.x, y: alvo.y });
      if (!novo) return;
      marcadores.desenhar();
      marcadores.selecionar(novo.id);     // o painel abre com o cursor no nome
    }
  });
  painel.montar();

  // clicar no mapa fecha o que estiver aberto: o mapa volta a ser o assunto
  document.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest("#poi-painel, .poi-marcador")) return;
    if (marcadores.selecionado) marcadores.selecionar(null);
  });

  globalThis.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (marcadores.aColocar) return alternarColocacao(false);
    if (marcadores.selecionado) marcadores.selecionar(null);
  });

  aoMudar(redesenhar);
  redesenhar();

  /** API pública, para macros. */
  game.poi = {
    criar: (x, y) => criarPonto({ x, y }),
    abrir: (id) => marcadores.selecionar(id),
    colocar: (ligado) => alternarColocacao(ligado),
    pontos: () => pontos(),
    cena: () => cenaAtual()
  };

  log("pronto");
});

Hooks.on("canvasReady", () => redesenhar());
