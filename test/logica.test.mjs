import test from "node:test";
import assert from "node:assert/strict";
import {
  indice, proximoNumero, visivelPara, pontosVisiveis, evidenciasVisiveis,
  estadoDoPonto, caminhosDoCartao, ladoDoRotulo, resumoDoMestre, dossieDe,
  proximoNumeroDeEvidencia, nomeLimpo
} from "../scripts/logica.js";

const ana = "ana", rui = "rui";

const corpo = {
  id: "p1", numero: 1, nome: "Corpo", ajuda: "explicito",
  caminhos: [
    { id: "c1", texto: "Examinar os ferimentos", pericia: "Medicina" },
    { id: "c2", texto: "Procurar objetos pessoais", pericia: "Investigação" }
  ],
  evidencias: [
    { id: "e1", numero: 1, titulo: "Corte na mão", revelada: true, para: null, hora: "22:47" },
    { id: "e2", numero: 4, titulo: "Bilhete no bolso", revelada: false, para: null }
  ]
};
const janela = { id: "p2", numero: 2, nome: "Janela", evidencias: [{ id: "e3", numero: 2, titulo: "Vidro", revelada: true, para: [ana], hora: "22:43" }] };
const quadro = { id: "p3", numero: 3, nome: "Quadro", oculto: true, evidencias: [] };
const lixo = { id: "p4", numero: 4, nome: "Lixo", esgotado: true, evidencias: [] };
const cena = [corpo, janela, quadro, lixo];

test("índice de dois dígitos", () => {
  assert.equal(indice(3), "03");
  assert.equal(indice(12), "12");
});

test("o número seguinte não reaproveita buracos", () => {
  assert.equal(proximoNumero(cena), 5);
  assert.equal(proximoNumero([{ numero: 2 }]), 3);
  assert.equal(proximoNumero([]), 1);
});

test("visibilidade: null é toda a gente, array é escolha, mestre vê sempre", () => {
  assert.equal(visivelPara(null, ana), true);
  assert.equal(visivelPara([rui], ana), false);
  assert.equal(visivelPara([rui], ana, true), true);
});

test("o jogador não vê pontos ocultos; o mestre vê", () => {
  assert.deepEqual(pontosVisiveis(cena, { userId: ana }).map(p => p.id), ["p1", "p2", "p4"]);
  assert.equal(pontosVisiveis(cena, { userId: ana, isGM: true }).length, 4);
});

test("evidência privada só chega a quem foi endereçada", () => {
  assert.equal(evidenciasVisiveis(janela, { userId: ana }).length, 1);
  assert.equal(evidenciasVisiveis(janela, { userId: rui }).length, 0);
  assert.equal(evidenciasVisiveis(corpo, { userId: rui }).length, 1, "a revelada pública chega a todos");
});

test("estado do ponto — sem percentagens, sem contagens", () => {
  assert.equal(estadoDoPonto(corpo, { userId: ana }), "anotado");
  assert.equal(estadoDoPonto(janela, { userId: rui }), "disponivel", "o Rui não viu nada aqui");
  assert.equal(estadoDoPonto(janela, { userId: ana }), "anotado");
  assert.equal(estadoDoPonto(lixo, { userId: ana }), "esgotado");
  assert.equal(estadoDoPonto(quadro, { userId: ana }), "oculto");
  assert.equal(estadoDoPonto(quadro, { userId: "gm", isGM: true }), "fantasma");
});

test("grau de ajuda: livre esconde os caminhos, guiado esconde a perícia", () => {
  assert.equal(caminhosDoCartao({ ...corpo, ajuda: "livre" }).length, 0);
  const guiado = caminhosDoCartao({ ...corpo, ajuda: "guiado" });
  assert.equal(guiado.length, 2);
  assert.equal(guiado[0].pericia, undefined);
  assert.equal(caminhosDoCartao(corpo)[0].pericia, "Medicina");
});

test("o rótulo vira-se quando o ponto está encostado à borda", () => {
  assert.deepEqual(ladoDoRotulo({ x: 100, y: 500, largura: 1920, altura: 1080 }), { dx: 1, dy: -1, alinhamento: "esquerda" });
  assert.equal(ladoDoRotulo({ x: 1850, y: 500, largura: 1920, altura: 1080 }).dx, -1);
  assert.equal(ladoDoRotulo({ x: 100, y: 40, largura: 1920, altura: 1080 }).dy, 1);
});

test("resumo do mestre", () => {
  assert.equal(resumoDoMestre(corpo), "2 pistas · 1 revelada");
  assert.equal(resumoDoMestre(quadro), "oculto");
  assert.equal(resumoDoMestre(lixo), "esgotado");
  assert.equal(resumoDoMestre({ evidencias: [] }), "sem evidências");
  assert.equal(resumoDoMestre({ evidencias: [{ revelada: false }] }), "1 pista");
});

test("dossiê: só o que é meu, por ordem de número", () => {
  const daAna = dossieDe(cena, { userId: ana });
  assert.deepEqual(daAna.map(f => f.numero), [1, 2]);
  assert.equal(daAna[1].privada, true);
  assert.equal(daAna[0].pontoNome, "Corpo");
  assert.deepEqual(dossieDe(cena, { userId: rui }).map(f => f.numero), [1]);
});

test("o dossiê do mestre não mostra o que ainda não foi revelado", () => {
  assert.deepEqual(dossieDe(cena, { userId: "gm", isGM: true }).map(f => f.numero), [1, 2]);
});

test("numeração de evidências é contínua na cena", () => {
  assert.equal(proximoNumeroDeEvidencia(cena), 5);
  assert.equal(proximoNumeroDeEvidencia([]), 1);
});

test("nome sempre utilizável", () => {
  assert.equal(nomeLimpo("  Mesa "), "Mesa");
  assert.equal(nomeLimpo(""), "Ponto");
  assert.equal(nomeLimpo(undefined, "Sem nome"), "Sem nome");
});
