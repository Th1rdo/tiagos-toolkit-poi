/** Identidade do módulo e constantes partilhadas. */
export const MODULE_ID = "tiagos-toolkit-poi";

/** Os pontos moram numa flag da própria cena. */
export const FLAG = "pontos";

/** As formas do marcador. O nome é a chave: entra no `data-forma` do elemento. */
export const FORMAS = ["reticula", "anel", "losango", "cruz", "quadrado"];

/** Paleta curta. "acento" segue a cor do mundo; as outras são escolhas por ponto. */
export const CORES = {
  acento: null,
  osso: "#F2F0EA",
  sangue: "#B1161A",
  gelo: "#6BA8C6",
  limo: "#6FA86B",
  violeta: "#9D6BC6"
};

/** Tamanho do marcador: multiplicador sobre 24 px. */
export const TAMANHO = { min: 0.6, max: 2.6, passo: 0.1, padrao: 1 };

export const log = (...args) => console.log(`${MODULE_ID} |`, ...args);
export const warn = (...args) => console.warn(`${MODULE_ID} |`, ...args);

/**
 * Onde a camada é pendurada.
 *
 * Dentro de `#interface` os marcadores ficam por cima do mapa e por baixo dos
 * painéis do Foundry. Se esse elemento estiver transformado (escala de
 * interface), o `position: fixed` deixa de ser relativo à janela e tudo sai do
 * sítio: nesse caso vamos para o `body`.
 */
export function paiUI() {
  const alvo = document.getElementById("interface");
  if (!alvo) return document.body;
  const t = getComputedStyle(alvo).transform;
  return (!t || t === "none") ? alvo : document.body;
}
