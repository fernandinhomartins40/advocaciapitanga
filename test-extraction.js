const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('0002688-54_2024_8_16_0136.html', 'utf-8');
const $ = cheerio.load(html);

console.log('=== TESTE DE EXTRAÇÃO ===\n');

// Buscar todos os h4
console.log('H4s encontrados:');
$('h4').each((i, elem) => {
  const text = $(elem).text().trim();
  console.log(`  [${i}] "${text}"`);
});

console.log('\n=== TESTANDO EXTRAÇÃO DE PARTES ===\n');

const secoes = [
  'Autor', 'Réu',
  'Exequente', 'Executado',
  'Requerente', 'Requerido',
  'Terceiros', 'Terceiro Interessado',
  'Assistente', 'Denunciado à Lide'
];

const partes = [];

secoes.forEach(secao => {
  console.log(`Buscando seção: ${secao}`);

  $('h4').each((i, h4Elem) => {
    const h4Text = $(h4Elem).text().trim();

    if (h4Text === secao) {
      console.log(`  ✓ Seção "${secao}" encontrada!`);

      const tabela = $(h4Elem).nextAll('table.resultTable').first();
      console.log(`  Tabelas encontradas: ${tabela.length}`);

      if (tabela.length > 0) {
        const rows = tabela.find('tbody tr');
        console.log(`  Linhas na tabela: ${rows.length}`);

        rows.each((j, row) => {
          const cells = $(row).find('td');
          console.log(`    Linha ${j}: ${cells.length} células`);

          if (cells.length >= 1) {
            const nomeRaw = cells.eq(0).text();
            const nome = nomeRaw.replace(/\s+/g, ' ').trim();
            console.log(`      Nome RAW length: ${nomeRaw.length}`);
            console.log(`      Nome limpo: "${nome}"`);

            if (nome && nome.length > 3) {
              partes.push({ tipo: secao, nome: nome });
              console.log(`      ✓ Parte adicionada!`);
            }
          }
        });
      }
    }
  });
  console.log('');
});

console.log('\n=== RESULTADO FINAL ===');
console.log(`Total de partes extraídas: ${partes.length}`);
partes.forEach((p, i) => {
  console.log(`  [${i}] ${p.tipo}: ${p.nome}`);
});
