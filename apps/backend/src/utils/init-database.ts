import { prisma } from '../lib/prisma';
import { logger } from './logger';

/**
 * Verifica se o banco de dados está inicializado com dados necessários
 * Se não estiver, registra aviso para executar o seed
 */
export async function checkDatabaseInitialization(): Promise<void> {
  try {
    logger.info('🔍 Verificando inicialização do banco de dados...');

    // Verificar se existe pelo menos um usuário administrador
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADVOGADO',
        email: 'admin@pitanga.com',
      },
    });

    if (adminCount === 0) {
      logger.warn('⚠️ AVISO: Banco de dados não contém usuário administrador padrão!');
      logger.warn('📝 Execute o seed do banco de dados:');
      logger.warn('   npm run seed --workspace=database');
      logger.warn('   OU: npx prisma db seed --schema=./packages/database/prisma/schema.prisma');
      logger.warn('');
      logger.warn('📧 Credenciais padrão após seed:');
      logger.warn('   Email: admin@pitanga.com');
      logger.warn('   Senha: Pitanga@2024!Admin');
      return;
    }

    // Contar total de usuários
    const totalUsers = await prisma.user.count();

    logger.info(`✅ Banco de dados inicializado corretamente`);
    logger.info(`📊 Total de usuários: ${totalUsers}`);
    logger.info(`👤 Administradores: ${adminCount}`);

    // Verificar integridade dos dados
    const usersWithoutRole = await prisma.user.count({
      where: {
        AND: [
          { advogado: null },
          { cliente: null },
        ],
      },
    });

    if (usersWithoutRole > 0) {
      logger.warn(`⚠️ Encontrados ${usersWithoutRole} usuário(s) sem perfil (advogado/cliente)`);
    }
  } catch (error) {
    logger.error('❌ Erro ao verificar inicialização do banco de dados:', error);
    logger.error('🔄 Tentando conectar ao banco de dados...');

    // Tentar conectar para ver se o problema é de conexão
    try {
      await prisma.$connect();
      logger.info('✅ Conexão com banco de dados estabelecida');
    } catch (connectError) {
      logger.error('❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados');
      logger.error('   Verifique a variável DATABASE_URL');
      throw connectError;
    }
  }
}

/**
 * Garante que o banco de dados está pronto antes de iniciar a aplicação
 */
export async function ensureDatabaseReady(): Promise<void> {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 3000; // 3 segundos

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`🔄 Tentativa ${attempt}/${MAX_RETRIES} de conectar ao banco de dados...`);

      // Tentar conectar
      await prisma.$connect();

      // Executar uma query simples para verificar
      await prisma.$queryRaw`SELECT 1`;

      logger.info('✅ Banco de dados pronto!');

      // Verificar inicialização
      await checkDatabaseInitialization();

      return;
    } catch (error) {
      logger.error(`❌ Tentativa ${attempt}/${MAX_RETRIES} falhou:`, error);

      if (attempt === MAX_RETRIES) {
        logger.error('❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados após múltiplas tentativas');
        throw new Error('Database connection failed after maximum retries');
      }

      logger.info(`⏳ Aguardando ${RETRY_DELAY / 1000}s antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}
