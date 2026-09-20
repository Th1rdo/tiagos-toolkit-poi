import { MODULE_ID, FLAG, TAMANHO, OPACIDADE } from "./const.js";
import { proximoNumero, tamanhoValido, opacidadeValida, formaValida, corValida } from "./logica.js";

/**
 * Onde os pontos vivem: numa flag da **cena**.
 *
 * O Foundry sincroniza flags com toda a gente sozinho, guarda-as no mundo e
 * entrega-as a quem chega atrasado. Um mapa anotado sobrevive a um F5 de
 * qualquer um — incluindo o do mestre, que é quando isto costuma partir.
 *
 * Só o mestre escreve; o servidor recusaria a escrita de um jogador de qualquer
 * maneira, e assim o aviso sai na língua da mesa em vez de um erro em inglês.
 */

export const cenaAtual = () => canvas?.scene ?? game.scenes?.current ?? null;

export function pontos(cena = cenaAtual()) {
  const lista = cena?.getFlag(MODULE_ID, FLAG);
  return Array.isArray(lista) ? lista : [];
}

export const ponto = (id, cena = cenaAtual()) => pontos(cena).find(p => p.id === id) ?? null;

function souMestre() {
  if (game.user.isGM) return true;
  ui.notifications.warn(game.i18n.localize("POI.Avisos.SoMestre"));
  return false;
}

/** Toda a escrita relê a lista antes de gravar: dois cliques seguidos não se atropelam. */
async function gravar(transformar, cena = cenaAtual()) {
  if (!cena || !souMestre()) return null;
  await cena.setFlag(MODULE_ID, FLAG, transformar(pontos(cena)));
}

/**
 * Nasce visível e com o nome por escrever.
 *
 * Nascer oculto obrigava a dois passos para a coisa mais comum de todas —
 * apontar para uma mesa e dizer «isto aqui». Quem quer preparar em segredo
 * esconde depois, num clique.
 */
export async function criarPonto({ x, y } = {}) {
  const cena = cenaAtual();
  if (!cena || !souMestre()) return null;
  const novo = {
    id: foundry.utils.randomID(),
    numero: proximoNumero(pontos(cena)),
    x: Math.round(x),
    y: Math.round(y),
    nome: "",
    descricao: "",
    oculto: false,
    forma: "reticula",
    cor: "acento",
    tamanho: TAMANHO.padrao,
    opacidade: OPACIDADE.padrao
  };
  await gravar(lista => [...lista, novo], cena);
  return novo;
}

/** Guarda só o que interessa, e valida o que veio da interface. */
export function atualizarPonto(id, patch = {}) {
  const limpo = { ...patch };
  if ("tamanho" in limpo) limpo.tamanho = tamanhoValido(limpo.tamanho);
  if ("opacidade" in limpo) limpo.opacidade = opacidadeValida(limpo.opacidade);
  if ("forma" in limpo) limpo.forma = formaValida(limpo.forma);
  if ("cor" in limpo) limpo.cor = corValida(limpo.cor);
  return gravar(lista => lista.map(p => (p.id === id ? { ...p, ...limpo } : p)));
}

export const removerPonto = (id) => gravar(lista => lista.filter(p => p.id !== id));

export const moverPonto = (id, x, y) => atualizarPonto(id, { x: Math.round(x), y: Math.round(y) });

export const alternarOculto = (id) => {
  const p = ponto(id);
  return p ? atualizarPonto(id, { oculto: !p.oculto }) : null;
};

/** Avisa quem precisa (marcadores, painel) de que a cena mudou. */
export function aoMudar(callback) {
  Hooks.on("updateScene", (cena, mudou) => {
    if (cena.id !== cenaAtual()?.id) return;
    if (!foundry.utils.hasProperty(mudou, `flags.${MODULE_ID}`)) return;
    callback();
  });
}
