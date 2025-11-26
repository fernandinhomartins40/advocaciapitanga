import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';

// Importar rotas
import authRoutes from './routes/auth.routes';
import clienteRoutes from './routes/cliente.routes';
import advogadoRoutes from './routes/advogado.routes';
import processoRoutes from './routes/processo.routes';
import documentoRoutes from './routes/documento.routes';
import mensagemRoutes from './routes/mensagem.routes';
import iaRoutes from './routes/ia.routes';

const app = express();

// Confiar no proxy (Nginx)
app.set('trust proxy', 1);

// Middlewares de segurança
app.use(helmet());

// Configurar CORS origins
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }

  // Fallback para desenvolvimento
  return [
    'http://localhost:3000',
    'http://localhost',
    'https://advocaciapitanga.com.br',
    'https://www.advocaciapitanga.com.br',
    'http://advocaciapitanga.com.br',
    'http://www.advocaciapitanga.com.br'
  ];
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Rate limiting - mais permissivo para evitar bloqueios
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // limite de 500 requisições por IP (aumentado)
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  skip: (req) => {
    // Não aplicar rate limit em rotas de autenticação
    return req.path === '/api/auth/me' || req.path === '/api/health';
  }
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/advogado', advogadoRoutes);
app.use('/api/processos', processoRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/mensagens', mensagemRoutes);
app.use('/api/ia', iaRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorMiddleware);

export default app;
