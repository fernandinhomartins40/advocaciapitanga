// Função de mapeamento do controller
function mapearTipoParte(tipo) {
  const tipoUpper = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Polo ativo (autor)
  if (tipoUpper.includes('AUTOR') || tipoUpper.includes('REQUERENTE') || tipoUpper.includes('ATIVO') ||
      tipoUpper.includes('EXEQUENTE') || tipoUpper.includes('CREDOR')) {
    return 'AUTOR';
  }

  // Polo passivo (réu)
  if (tipoUpper.includes('REU') || tipoUpper.includes('REQUERIDO') || tipoUpper.includes('PASSIVO') ||
      tipoUpper.includes('EXECUTADO') || tipoUpper.includes('DEVEDOR')) {
    return 'REU';
  }

  // Terceiros
  if (tipoUpper.includes('TERCEIRO')) {
    return 'TERCEIRO_INTERESSADO';
  }

  // Outros
  if (tipoUpper.includes('ASSISTENTE')) {
    return 'ASSISTENTE';
  }

  if (tipoUpper.includes('DENUNCIADO')) {
    return 'DENUNCIADO_LIDE';
  }

  if (tipoUpper.includes('CHAMADO')) {
    return 'CHAMADO_PROCESSO';
  }

  // Default: terceiro
  return 'TERCEIRO_INTERESSADO';
}

// Testar com os dados extraídos
const partesExtraidas = [
  { tipo: 'Exequente', nome: 'ISRAEL PADILHA MARTINS' },
  { tipo: 'Executado', nome: 'REINALDO GOLANOSKI' },
  { tipo: 'Terceiros', nome: 'GIOVANA CAROLINE PANARO GOLANOSKI' },
  { tipo: 'Terceiros', nome: 'JAIME ANTÔNIO DAL PIVA' },
  { tipo: 'Terceiros', nome: 'Luciana Campos Scarton' }
];

console.log('=== TESTE DE MAPEAMENTO ===\n');

partesExtraidas.forEach((parte, i) => {
  const tipoMapeado = mapearTipoParte(parte.tipo);
  console.log(`[${i}] ${parte.nome}`);
  console.log(`    Tipo original: "${parte.tipo}"`);
  console.log(`    Tipo mapeado: "${tipoMapeado}"`);
  console.log(`    É AUTOR? ${tipoMapeado === 'AUTOR' ? 'SIM ✓' : 'NÃO'}`);
  console.log('');
});

// Buscar primeira parte AUTOR
const primeiraParteAutor = partesExtraidas.find(p => mapearTipoParte(p.tipo) === 'AUTOR');

console.log('=== RESULTADO ===');
if (primeiraParteAutor) {
  console.log('✓ Primeira parte AUTOR encontrada:', primeiraParteAutor.nome);
} else {
  console.log('✗ NENHUMA parte AUTOR encontrada!');
  console.log('Partes disponíveis:', partesExtraidas.map(p => `"${p.nome}" (${p.tipo})`));
}
