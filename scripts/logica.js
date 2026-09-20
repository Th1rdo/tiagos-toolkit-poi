import { FORMAS, CORES, TAMANHO, OPACIDADE } from "./const.js";

/**
 * Regras puras — sem `game`, sem DOM, sem canvas. É isto que os testes cobrem.
 */

/** "3" → "03". O número é a identidade do ponto: a mesa fala dele em voz alta. */
export const indice = (n) => String(n ?? 0).padStart(2, "0");

/** O número seguinte, sem reaproveitar buracos: renumerar por baixo dos pés confunde a mesa. */
export function proximoNumero(pontos = []) {
  return pontos.reduce((maior, p) => Math.max(maior, p.numero ?? 0), 0) + 1;
}

/** Nome sempre utilizável: um ponto sem nome continua a ser clicável e falável. */
export const nomeLimpo = (nome, fallback = "Ponto") => (nome ?? "").trim() || fallback;

/** Os pontos que este cliente desenha. Oculto é oculto — menos para o mestre. */
export function pontosVisiveis(pontos = [], { isGM = false } = {}) {
  return isGM ? [...pontos] : pontos.filter(p => !p.oculto);
}

/** Um ponto vale a pena abrir se tiver alguma coisa para ler. */
export const temTexto = (ponto) => !!(ponto?.nome?.trim() || ponto?.descricao?.trim());

/**
 * Para que lado sai a linha-guia do rótulo.
 *
 * Por omissão sobe para a direita; vira-se quando não há espaço. Sem isto, um
 * ponto no canto direito escrevia o nome para fora do ecrã.
 */
export function ladoDoRotulo({ x, y, largura, altura, margem = 220 }) {
  return {
    dx: x > largura - margem ? -1 : 1,
    dy: y < margem * 0.5 ? 1 : -1
  };
}

/** Nunca confiar num valor que veio de fora: tamanho fora da escala parte o desenho. */
export function tamanhoValido(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return TAMANHO.padrao;
  return Math.min(TAMANHO.max, Math.max(TAMANHO.min, Math.round(n * 10) / 10));
}

export function opacidadeValida(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return OPACIDADE.padrao;
  return Math.min(OPACIDADE.max, Math.max(OPACIDADE.min, Math.round(n * 100) / 100));
}

export const formaValida = (f) => (FORMAS.includes(f) ? f : FORMAS[0]);
export const corValida = (c) => (c in CORES ? c : "acento");

/** O aspeto de um ponto, já resolvido — é o que a camada de marcadores desenha. */
export function aparencia(ponto) {
  return {
    forma: formaValida(ponto?.forma),
    cor: corValida(ponto?.cor),
    tamanho: tamanhoValido(ponto?.tamanho),
    opacidade: opacidadeValida(ponto?.opacidade)
  };
}
