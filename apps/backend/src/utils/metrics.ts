import { metricsLogger } from './logger';

/**
 * Sistema de coleta de métricas da aplicação
 *
 * Coleta e loga métricas importantes como:
 * - Contadores (requisições, erros, etc)
 * - Gauges (uso de memória, conexões ativas, etc)
 * - Histogramas (duração de operações)
 *
 * Em produção, estas métricas podem ser integradas com:
 * - Prometheus
 * - Datadog
 * - CloudWatch
 * - Grafana
 */

interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private labels = new Map<string, Record<string, string>>();

  /**
   * Incrementa um contador
   * Contadores são úteis para eventos acumulativos (requisições, erros, etc)
   *
   * @example
   * metrics.increment('http.requests.total');
   * metrics.increment('http.errors.total', 1, { statusCode: '500' });
   */
  increment(metric: string, value = 1, labels?: Record<string, string>) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);

    if (labels) {
      this.labels.set(metric, labels);
    }
  }

  /**
   * Decrementa um contador
   *
   * @example
   * metrics.decrement('active.connections');
   */
  decrement(metric: string, value = 1, labels?: Record<string, string>) {
    this.increment(metric, -value, labels);
  }

  /**
   * Define um valor gauge
   * Gauges são úteis para valores que sobem e descem (memória, conexões, fila, etc)
   *
   * @example
   * metrics.gauge('memory.usage.bytes', process.memoryUsage().heapUsed);
   * metrics.gauge('database.connections.active', pool.activeConnections);
   */
  gauge(metric: string, value: number, labels?: Record<string, string>) {
    this.gauges.set(metric, value);

    if (labels) {
      this.labels.set(metric, labels);
    }
  }

  /**
   * Adiciona valor a um histograma
   * Histogramas são úteis para distribuições (latência, tamanho de resposta, etc)
   *
   * @example
   * metrics.histogram('http.request.duration.ms', 150);
   * metrics.histogram('response.size.bytes', 1024);
   */
  histogram(metric: string, value: number, labels?: Record<string, string>) {
    const values = this.histograms.get(metric) || [];
    values.push(value);
    this.histograms.set(metric, values);

    if (labels) {
      this.labels.set(metric, labels);
    }
  }

  /**
   * Timer para medir duração de operações
   * Retorna uma função que quando chamada, registra a duração
   *
   * @example
   * const timer = metrics.timer('database.query.duration.ms');
   * await executeQuery();
   * timer(); // Registra a duração
   */
  timer(metric: string, labels?: Record<string, string>) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.histogram(metric, duration, labels);
      return duration;
    };
  }

  /**
   * Reseta um contador específico
   */
  reset(metric: string) {
    this.counters.delete(metric);
    this.gauges.delete(metric);
    this.histograms.delete(metric);
    this.labels.delete(metric);
  }

  /**
   * Reseta todas as métricas
   */
  resetAll() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.labels.clear();
  }

  /**
   * Obtém estatísticas de um histograma
   */
  private getHistogramStats(values: number[]) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { count: values.length, sum, avg, min, max, p50, p95, p99 };
  }

  /**
   * Obtém todas as métricas coletadas
   */
  getMetrics() {
    const metrics: any = {
      counters: {},
      gauges: {},
      histograms: {},
    };

    // Contadores
    this.counters.forEach((value, key) => {
      metrics.counters[key] = {
        value,
        labels: this.labels.get(key),
      };
    });

    // Gauges
    this.gauges.forEach((value, key) => {
      metrics.gauges[key] = {
        value,
        labels: this.labels.get(key),
      };
    });

    // Histogramas com estatísticas
    this.histograms.forEach((values, key) => {
      metrics.histograms[key] = {
        ...this.getHistogramStats(values),
        labels: this.labels.get(key),
      };
    });

    return metrics;
  }

  /**
   * Loga todas as métricas coletadas
   * Chamado periodicamente
   */
  logMetrics() {
    const metrics = this.getMetrics();
    const memoryUsage = process.memoryUsage();

    metricsLogger.info({
      msg: 'Application metrics',
      metrics,
      system: {
        memory: {
          heapUsed_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
          external_mb: Math.round(memoryUsage.external / 1024 / 1024),
        },
        uptime_seconds: Math.round(process.uptime()),
      },
    });

    // Limpar histogramas após logar (manter contadores e gauges)
    this.histograms.clear();
  }

  /**
   * Coleta métricas do sistema (memória, CPU, etc)
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();

    this.gauge('system.memory.heap_used.bytes', memoryUsage.heapUsed);
    this.gauge('system.memory.heap_total.bytes', memoryUsage.heapTotal);
    this.gauge('system.memory.rss.bytes', memoryUsage.rss);
    this.gauge('system.memory.external.bytes', memoryUsage.external);
    this.gauge('system.uptime.seconds', process.uptime());
  }
}

// Instância global do coletor de métricas
export const metrics = new MetricsCollector();

// Logar métricas a cada 60 segundos
const METRICS_INTERVAL = parseInt(process.env.METRICS_INTERVAL || '60000');
if (METRICS_INTERVAL > 0) {
  setInterval(() => {
    metrics.collectSystemMetrics();
    metrics.logMetrics();
  }, METRICS_INTERVAL);
}

/**
 * Middleware para coletar métricas HTTP
 * Adicione ao Express para coletar métricas automaticamente
 */
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const timer = metrics.timer('http.request.duration.ms', {
    method: req.method,
    path: req.route?.path || req.path,
  });

  res.on('finish', () => {
    const duration = timer();

    // Incrementar contador de requisições
    metrics.increment('http.requests.total', 1, {
      method: req.method,
      statusCode: String(res.statusCode),
      path: req.route?.path || 'unknown',
    });

    // Incrementar erros se status >= 400
    if (res.statusCode >= 400) {
      metrics.increment('http.errors.total', 1, {
        method: req.method,
        statusCode: String(res.statusCode),
      });
    }
  });

  next();
};
