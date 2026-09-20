import test from "node:test";
import assert from "node:assert/strict";
import {
  indice, proximoNumero, nomeLimpo, pontosVisiveis, temTexto,
  ladoDoRotulo, tamanhoValido, formaValida, corValida, aparencia
} from "../scripts/logica.js";

const mesa = { id: "p1", numero: 1, nome: "Mesa", descricao: "Papéis espalhados." };
const oculto = { id: "p2", numero: 2, nome: "Quadro", oculto: true };
const cena = [mesa, oculto];

test("índice de dois dígitos", () => {
  assert.equal(indice(3), "03");
  assert.equal(indice(12), "12");
});

test("o número seguinte não reaproveita buracos", () => {
  assert.equal(proximoNumero(cena), 3);
  assert.equal(proximoNumero([{ numero: 7 }]), 8);
  assert.equal(proximoNumero([]), 1);
});

test("nome sempre utilizável", () => {
  assert.equal(nomeLimpo("  Mesa "), "Mesa");
  assert.equal(nomeLimpo(""), "Ponto");
  assert.equal(nomeLimpo(undefined, "—"), "—");
});

test("o jogador não vê pontos ocultos; o mestre vê", () => {
  assert.deepEqual(pontosVisiveis(cena).map(p => p.id), ["p1"]);
  assert.equal(pontosVisiveis(cena, { isGM: true }).length, 2);
});

test("um ponto vazio não tem nada para abrir", () => {
  assert.equal(temTexto(mesa), true);
  assert.equal(temTexto({ nome: "   ", descricao: "" }), false);
  assert.equal(temTexto({ descricao: "só descrição" }), true);
});

test("o rótulo vira-se quando o ponto está encostado à borda", () => {
  assert.deepEqual(ladoDoRotulo({ x: 100, y: 500, largura: 1920, altura: 1080 }), { dx: 1, dy: -1 });
  assert.equal(ladoDoRotulo({ x: 1850, y: 500, largura: 1920, altura: 1080 }).dx, -1);
  assert.equal(ladoDoRotulo({ x: 100, y: 40, largura: 1920, altura: 1080 }).dy, 1);
});

test("tamanho fora da escala é apertado, não aceite", () => {
  assert.equal(tamanhoValido(1.4), 1.4);
  assert.equal(tamanhoValido(9), 2.6);
  assert.equal(tamanhoValido(0.1), 0.6);
  assert.equal(tamanhoValido("abc"), 1);
  assert.equal(tamanhoValido(undefined), 1);
});

test("forma e cor desconhecidas caem no padrão", () => {
  assert.equal(formaValida("losango"), "losango");
  assert.equal(formaValida("estrela"), "reticula");
  assert.equal(corValida("sangue"), "sangue");
  assert.equal(corValida("arco-íris"), "acento");
});

test("aparência resolve tudo de uma vez, mesmo com um ponto antigo sem campos", () => {
  assert.deepEqual(aparencia({}), { forma: "reticula", cor: "acento", tamanho: 1 });
  assert.deepEqual(aparencia({ forma: "cruz", cor: "gelo", tamanho: 2 }), { forma: "cruz", cor: "gelo", tamanho: 2 });
});
