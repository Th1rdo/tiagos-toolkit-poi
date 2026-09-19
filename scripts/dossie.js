import { MODULE_ID, paiUI } from "./const.js";
import { pontos, ponto as obterPonto } from "./dados.js";
import { dossieDe, indice } from "./logica.js";
import { marcadores } from "./marcadores.js";

/**
 * O dossiê: a memória da mesa.
 *
 * Fica fechado num separador do canto e nunca se abre sozinho — nem quando chega
 * uma evidência nova, porque nesse momento o que interessa é a ficha junto ao
 * objeto. Serve para quando alguém pergunta «o que é que já sabemos?».
 *
 * Cada ficha sabe de onde veio: passar o rato acende o marcador, clicar leva o
 * mapa até lá. O painel devolve as pessoas à cena em vez de as prender a uma lista.
 */
class Dossie {
  #tab = null;
  #painel = null;
  #aberto = false;

  montar({ aoEscolher }) {
    if (this.#tab) return;
    this.#aoEscolher = aoEscolher;

    const tab = document.createElement("button");
    tab.id = "poi-dossie-tab";
    tab.type = "button";
    tab.innerHTML = `
      <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 3 L12 3 M2 7 L12 7 M2 11 L8 11"></path></svg>
      <span class="poi-dossie-nome">${game.i18n.localize("POI.Dossie")}</span>
      <span class="poi-dossie-conta"></span>`;
    tab.addEventListener("click", () => this.alternar());
    paiUI().appendChild(tab);
    this.#tab = tab;

    const painel = document.createElement("div");
    painel.id = "poi-dossie";
    painel.hidden = true;
    painel.addEventListener("click", (ev) => {
      const ficha = ev.target.closest("[data-ponto]");
      if (ficha) this.#aoEscolher(ficha.dataset.ponto);
    });
    painel.addEventListener("pointerover", (ev) => {
      const ficha = ev.target.closest("[data-ponto]");
      document.querySelectorAll(".poi-marcador").forEach(m =>
        m.classList.toggle("poi-realce", !!ficha && m.dataset.id === ficha.dataset.ponto));
    });
    painel.addEventListener("pointerleave", () =>
      document.querySelectorAll(".poi-realce").forEach(m => m.classList.remove("poi-realce")));
    paiUI().appendChild(painel);
    this.#painel = painel;
  }

  #aoEscolher = () => {};

  alternar() { this.#aberto ? this.fechar() : this.abrir(); }

  abrir() {
    this.#aberto = true;
    this.#painel.hidden = false;
    requestAnimationFrame(() => this.#painel.classList.add("poi-visivel"));
    this.#tab.classList.add("poi-ativo");
    this.desenhar();
  }

  fechar() {
    this.#aberto = false;
    this.#painel.classList.remove("poi-visivel");
    this.#tab.classList.remove("poi-ativo");
    setTimeout(() => { if (!this.#aberto) this.#painel.hidden = true; }, 160);
  }

  desenhar() {
    if (!this.#tab) return;
    const fichas = dossieDe(pontos(), { userId: game.user.id, isGM: game.user.isGM });

    this.#tab.querySelector(".poi-dossie-conta").textContent = fichas.length ? indice(fichas.length) : "";
    this.#tab.hidden = fichas.length === 0 && !game.user.isGM;

    if (!this.#aberto) return;
    this.#painel.innerHTML = `
      <header class="poi-dossie-cabecalho">
        <span class="poi-dossie-titulo">${game.i18n.localize("POI.Dossie")}</span>
        <span class="poi-dossie-meta">${fichas.length} ${game.i18n.localize(fichas.length === 1 ? "POI.Ficha" : "POI.Fichas")}</span>
      </header>
      ${fichas.length ? fichas.map(f => `
        <button type="button" class="poi-ficha ${f.importante ? "poi-importante" : ""}" data-ponto="${f.pontoId}">
          <span class="poi-ficha-linha">
            <span class="poi-indice">${indice(f.numero)}</span>
            <span class="poi-ficha-titulo">${foundry.utils.escapeHTML(f.titulo || game.i18n.localize("POI.SemTitulo"))}</span>
            ${f.hora ? `<span class="poi-hora">${foundry.utils.escapeHTML(f.hora)}</span>` : ""}
          </span>
          <span class="poi-ficha-origem">
            ${indice(f.pontoNumero)} ${foundry.utils.escapeHTML((f.pontoNome ?? "").toUpperCase())}
            ${f.privada ? `<span class="poi-ev-privada">${game.i18n.localize("POI.SoPara")}</span>` : ""}
          </span>
        </button>`).join("") : `<div class="poi-dossie-vazio">${game.i18n.localize("POI.DossieVazio")}</div>`}`;
  }
}

export const dossie = new Dossie();

/** Leva o mapa até ao ponto, devagar. É a ponte de volta do painel para a cena. */
export async function irParaOPonto(id) {
  const p = obterPonto(id);
  if (!p || !canvas?.ready) return;
  await canvas.animatePan({ x: p.x, y: p.y, duration: 400 });
  Hooks.callAll(`${MODULE_ID}.irPara`, id);
  marcadores.selecionar(id);
}
