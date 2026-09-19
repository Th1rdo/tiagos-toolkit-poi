import { TEMPO, paiUI } from "./const.js";
import { marcadores } from "./marcadores.js";
import { indice } from "./logica.js";

/**
 * A ficha de evidência: o momento em que a mesa fica a saber uma coisa.
 *
 * Sai do ponto por um fio, assenta ao lado e fica um bocado — depois vai-se
 * embora sozinha, porque a partir daí o sítio dela é o dossiê. É a diferença
 * entre arquivar uma prova e apanhar um prémio: nada de fanfarra, mas também
 * não passa despercebido.
 */
const DURACAO = 7000;

let el = null;
let timer = null;

function montar() {
  if (el) return el;
  el = document.createElement("div");
  el.id = "poi-ficha";
  el.hidden = true;
  el.addEventListener("click", () => esconder());
  paiUI().appendChild(el);
  return el;
}

export function mostrarFicha({ pontoId, evidencia, ponto }) {
  montar();
  clearTimeout(timer);

  el.classList.toggle("poi-importante", !!evidencia.importante);
  el.innerHTML = `
    <div class="poi-traco"></div>
    <div class="poi-ev-cabeca">
      <span class="poi-ev-numero">${game.i18n.format("POI.Evidencia", { n: indice(evidencia.numero) })}${evidencia.hora ? ` · ${foundry.utils.escapeHTML(evidencia.hora)}` : ""}</span>
      ${Array.isArray(evidencia.para) ? `<span class="poi-ev-privada">${game.i18n.localize("POI.SoPara")}</span>` : ""}
    </div>
    ${evidencia.titulo?.trim() ? `<div class="poi-ev-titulo">${foundry.utils.escapeHTML(evidencia.titulo)}</div>` : ""}
    ${evidencia.texto?.trim() ? `<div class="poi-ev-texto">${foundry.utils.escapeHTML(evidencia.texto)}</div>` : ""}
    <div class="poi-ficha-origem">${indice(ponto.numero)} ${foundry.utils.escapeHTML((ponto.nome ?? "").toUpperCase())}</div>`;

  const alvo = marcadores.ecraDe(pontoId) ?? { x: globalThis.innerWidth / 2, y: globalThis.innerHeight / 2 };
  el.hidden = false;
  el.style.transform = `translate3d(${Math.round(Math.min(alvo.x + 40, globalThis.innerWidth - 360))}px, ${Math.round(Math.max(24, alvo.y - 120))}px, 0)`;

  // marcar o ponto enquanto a ficha está no ar
  document.querySelector(`.poi-marcador[data-id="${pontoId}"]`)?.classList.add("poi-a-revelar");
  requestAnimationFrame(() => el.classList.add("poi-visivel"));
  if (evidencia.importante) document.body.classList.add("poi-foco");

  timer = setTimeout(esconder, DURACAO + (evidencia.importante ? TEMPO.IMPORTANTE : 0));
}

export function esconder() {
  clearTimeout(timer);
  if (!el) return;
  el.classList.remove("poi-visivel");
  document.body.classList.remove("poi-foco");
  document.querySelectorAll(".poi-a-revelar").forEach(m => m.classList.remove("poi-a-revelar"));
  setTimeout(() => { if (el && !el.classList.contains("poi-visivel")) el.hidden = true; }, 200);
}
