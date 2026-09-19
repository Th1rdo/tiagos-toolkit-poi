import { MODULE_ID, log, paiUI } from "./const.js";
import { cenaAtual, ardosia } from "./dados.js";

/**
 * Modo Investigação.
 *
 * Não é um ecrã novo: é a mesma cena, mais quieta. A interface do Foundry desce
 * de volume (e volta ao normal mal o rato lá chegue), as bordas escurecem um
 * pouco e os marcadores entram. Sem cartazes de «MODO ATIVADO» — quem estiver
 * distraído só repara que a sala ficou mais silenciosa.
 *
 * O estado vive na cena: quem chegar depois entra já em modo de investigação.
 */
const FLAG_MODO = "modo";

export const modoLigado = (cena = cenaAtual()) => !!cena?.getFlag(MODULE_ID, FLAG_MODO);

export async function alternarModo() {
  const cena = cenaAtual();
  if (!cena || !game.user.isGM) return;
  await cena.setFlag(MODULE_ID, FLAG_MODO, !modoLigado(cena));
  log(`modo investigação ${modoLigado(cena) ? "ligado" : "desligado"}`);
}

let ardosiaEl = null;

/** Aplica (ou desfaz) o modo neste cliente. Chamado sempre que a cena muda. */
export function aplicarModo() {
  const ligado = modoLigado();
  document.body.classList.toggle("poi-modo", ligado);

  if (!ardosiaEl) {
    ardosiaEl = document.createElement("div");
    ardosiaEl.id = "poi-ardosia";
    paiUI().appendChild(ardosiaEl);
  }

  const dados = ardosia();
  const local = dados?.local?.trim();
  const hora = dados?.hora?.trim();
  ardosiaEl.hidden = !ligado;
  ardosiaEl.innerHTML = ligado ? `
    <div class="poi-ardosia-topo">
      <span class="poi-ardosia-traco"></span>
      <span class="poi-ardosia-rotulo">${game.i18n.localize("POI.Investigacao")}</span>
    </div>
    ${local || hora ? `<div class="poi-ardosia-linha">${[local, hora].filter(Boolean).map(foundry.utils.escapeHTML).join(" &nbsp;·&nbsp; ")}</div>` : ""}` : "";
}
