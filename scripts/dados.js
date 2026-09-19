import { MODULE_ID, FLAG, FLAG_ARDOSIA, AJUDA, warn } from "./const.js";
import { proximoNumero, proximoNumeroDeEvidencia, horaCurta, nomeLimpo } from "./logica.js";

/**
 * Onde os pontos vivem: numa flag da **cena**.
 *
 * Porquê a cena e não um socket com estado em memória: o Foundry sincroniza
 * flags com toda a gente sozinho, guarda-as no mundo e entrega-as a quem chega
 * atrasado. Uma investigação a meio sobrevive a um F5 de qualquer um, incluindo
 * o do mestre — que é precisamente quando isto costuma partir.
 *
 * Só o mestre escreve. O servidor recusaria a escrita de um jogador de qualquer
 * maneira; aqui avisamos antes, para o erro não sair em inglês no meio da sessão.
 */

export const cenaAtual = () => canvas?.scene ?? game.scenes?.current ?? null;

export function pontos(cena = cenaAtual()) {
  const lista = cena?.getFlag(MODULE_ID, FLAG);
  return Array.isArray(lista) ? lista : [];
}

export const ponto = (id, cena = cenaAtual()) => pontos(cena).find(p => p.id === id) ?? null;

export const ardosia = (cena = cenaAtual()) => cena?.getFlag(MODULE_ID, FLAG_ARDOSIA) ?? null;

function souMestre() {
  if (game.user.isGM) return true;
  ui.notifications.warn(game.i18n.localize("POI.Avisos.SoMestre"));
  return false;
}

/** Toda a escrita relê a lista antes de gravar: dois cliques seguidos não se atropelam. */
async function gravar(transformar, cena = cenaAtual()) {
  if (!cena || !souMestre()) return null;
  const lista = transformar(pontos(cena));
  await cena.setFlag(MODULE_ID, FLAG, lista);
  return lista;
}

const novoId = () => foundry.utils.randomID();

// ------------------------------------------------------------------ pontos

/** Nasce oculto: o mestre decide quando é que a mesa passa a vê-lo. */
export async function criarPonto({ x, y, nome = "", cena = cenaAtual() } = {}) {
  if (!cena || !souMestre()) return null;
  const novo = {
    id: novoId(),
    numero: proximoNumero(pontos(cena)),
    x: Math.round(x),
    y: Math.round(y),
    nome: nomeLimpo(nome, ""),
    descricao: "",
    ajuda: AJUDA.GUIADO,
    oculto: true,
    esgotado: false,
    para: null,
    caminhos: [],
    evidencias: []
  };
  await gravar(lista => [...lista, novo], cena);
  return novo;
}

export const atualizarPonto = (id, patch) =>
  gravar(lista => lista.map(p => (p.id === id ? { ...p, ...patch } : p)));

export const removerPonto = (id) => gravar(lista => lista.filter(p => p.id !== id));

export const moverPonto = (id, x, y) => atualizarPonto(id, { x: Math.round(x), y: Math.round(y) });

export const alternarOculto = (id) => {
  const p = ponto(id);
  return p ? atualizarPonto(id, { oculto: !p.oculto }) : null;
};

export const alternarEsgotado = (id) => {
  const p = ponto(id);
  return p ? atualizarPonto(id, { esgotado: !p.esgotado }) : null;
};

// ------------------------------------------------------------------ evidências

export async function adicionarEvidencia(pontoId, { titulo = "", texto = "", importante = false } = {}) {
  const cena = cenaAtual();
  if (!cena || !souMestre()) return null;
  const ev = {
    id: novoId(),
    numero: proximoNumeroDeEvidencia(pontos(cena)),
    titulo: titulo.trim(),
    texto: texto.trim(),
    importante,
    revelada: false,
    para: null,
    hora: null
  };
  await gravar(lista => lista.map(p => (p.id === pontoId ? { ...p, evidencias: [...(p.evidencias ?? []), ev] } : p)), cena);
  return ev;
}

const mexerNaEvidencia = (pontoId, evId, mudar) =>
  gravar(lista => lista.map(p => (p.id !== pontoId ? p : {
    ...p,
    evidencias: (p.evidencias ?? []).map(e => (e.id === evId ? mudar(e) : e))
  })));

/**
 * Revelar carimba a hora. É o que transforma uma nota do mestre numa ficha de
 * processo — e é por isso que o dossiê consegue mostrar quando é que a mesa soube.
 */
export const revelarEvidencia = (pontoId, evId, { para = null } = {}) =>
  mexerNaEvidencia(pontoId, evId, e => ({ ...e, revelada: true, para, hora: e.hora ?? horaCurta() }));

export const esconderEvidencia = (pontoId, evId) =>
  mexerNaEvidencia(pontoId, evId, e => ({ ...e, revelada: false, para: null, hora: null }));

export const atualizarEvidencia = (pontoId, evId, patch) =>
  mexerNaEvidencia(pontoId, evId, e => ({ ...e, ...patch }));

export const removerEvidencia = (pontoId, evId) =>
  gravar(lista => lista.map(p => (p.id !== pontoId ? p : { ...p, evidencias: (p.evidencias ?? []).filter(e => e.id !== evId) })));

/** A próxima por revelar, que é o que o botão rápido do mestre precisa de saber. */
export const proximaPorRevelar = (p) => (p?.evidencias ?? []).find(e => !e.revelada) ?? null;

// ------------------------------------------------------------------ caminhos

export const adicionarCaminho = (pontoId, { texto = "", pericia = "" } = {}) =>
  gravar(lista => lista.map(p => (p.id !== pontoId ? p : {
    ...p,
    caminhos: [...(p.caminhos ?? []), { id: novoId(), texto: texto.trim(), pericia: pericia.trim() }]
  })));

export const atualizarCaminho = (pontoId, caminhoId, patch) =>
  gravar(lista => lista.map(p => (p.id !== pontoId ? p : {
    ...p,
    caminhos: (p.caminhos ?? []).map(c => (c.id === caminhoId ? { ...c, ...patch } : c))
  })));

export const removerCaminho = (pontoId, caminhoId) =>
  gravar(lista => lista.map(p => (p.id !== pontoId ? p : { ...p, caminhos: (p.caminhos ?? []).filter(c => c.id !== caminhoId) })));

// ------------------------------------------------------------------ cena

export async function definirArdosia({ local = "", hora = "" } = {}) {
  const cena = cenaAtual();
  if (!cena || !souMestre()) return;
  await cena.setFlag(MODULE_ID, FLAG_ARDOSIA, { local: local.trim(), hora: hora.trim() });
}

/** Repor a cena: tudo volta a oculto e por revelar. Serve para reutilizar um mapa. */
export async function reporCena() {
  await gravar(lista => lista.map(p => ({
    ...p,
    oculto: true,
    esgotado: false,
    evidencias: (p.evidencias ?? []).map(e => ({ ...e, revelada: false, para: null, hora: null }))
  })));
}

/** Avisa quem precisar (a camada de marcadores, o cartão, o dossiê) que algo mudou. */
export function aoMudar(callback) {
  Hooks.on("updateScene", (cena, mudou) => {
    if (cena.id !== cenaAtual()?.id) return;
    if (!foundry.utils.hasProperty(mudou, `flags.${MODULE_ID}`)) return;
    callback();
  });
  Hooks.on("canvasReady", () => callback());
}

export function semCena() {
  if (cenaAtual()) return false;
  warn("não há cena ativa");
  return true;
}
