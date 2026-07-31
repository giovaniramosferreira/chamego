// Dinheiro trafega e é guardado em centavos, sempre inteiro. Ponto flutuante
// em conta de casal produz centavo fantasma (0,1 + 0,2 não dá 0,3), e o dia em
// que a soma do mês fecha em R$ 1.799,99 ninguém confia mais no app.
//
// O nó é a digitação: "1.800" em pt-BR é mil e oitocentos, mas `Number()` lê
// 1,8. Errar aqui não dá erro na tela — dá um valor mil vezes menor.

export function paraCentavos(texto) {
  const limpo = String(texto ?? '').replace(/[^\d.,]/g, '').trim();
  if (!limpo) return null;

  let normal;
  if (limpo.includes(',')) {
    // Com vírgula, o ponto só pode ser separador de milhar: "1.800,50".
    normal = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // Sem vírgula, mas em grupos de três: "1.800" é mil e oitocentos.
    normal = limpo.replace(/\./g, '');
  } else {
    // Sobrou "1800" ou "1800.50" — o ponto aqui é decimal mesmo.
    normal = limpo;
  }

  const n = Number(normal);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatarBRL(centavos) {
  if (centavos === null || centavos === undefined) return '';
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Pro campo de edição: sem "R$", do jeito que se digita.
export function paraCampo(centavos) {
  if (centavos === null || centavos === undefined) return '';
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
