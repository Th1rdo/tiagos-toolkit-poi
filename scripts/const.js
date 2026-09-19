/** Identidade do módulo e constantes partilhadas. */
export const MODULE_ID = "tiagos-toolkit-poi";
export const SOCKET = `module.${MODULE_ID}`;

/** Onde os pontos moram: uma flag na própria cena. */
export const FLAG = "pontos";
export const FLAG_ARDOSIA = "ardosia";   // { local, hora } — a etiqueta do canto

/** Graus de ajuda de um ponto. O visual é o mesmo; muda o que o cartão mostra. */
export const AJUDA = {
  LIVRE: "livre",           // só o objeto
  GUIADO: "guiado",         // caminhos possíveis
  EXPLICITO: "explicito"    // caminhos + perícia
};

/** Mensagens de socket. Quase tudo viaja nas flags da cena; isto é o resto. */
export const MSG = {
  OLHEM: "olhem"            // mestre → todos: olhem para este ponto
};

/**
 * Tempos, em ms. Uma só curva para tudo (no CSS), nada acima de 400.
 * Mexer aqui muda o carácter do módulo: rápido é o ponto.
 */
export const TEMPO = {
  HOVER: 110,
  CARTAO: 180,
  FECHO: 140,
  DESENHO: 220,
  ESCADA: 40,          // atraso entre marcadores a entrar
  REVELACAO: 240,
  IMPORTANTE: 400
};

export const log = (...args) => console.log(`${MODULE_ID} |`, ...args);
export const warn = (...args) => console.warn(`${MODULE_ID} |`, ...args);

/**
 * Onde a camada é pendurada.
 *
 * Dentro de `#interface` os marcadores ficam por cima do mapa e por baixo dos
 * painéis do Foundry — que é exatamente a ordem que queremos. Se esse elemento
 * estiver transformado (escala de interface), o `position: fixed` deixava de ser
 * relativo à janela e tudo saía do sítio: nesse caso vamos para o `body`.
 */
export function paiUI() {
  const alvo = document.getElementById("interface");
  if (!alvo) return document.body;
  const t = getComputedStyle(alvo).transform;
  return (!t || t === "none") ? alvo : document.body;
}
