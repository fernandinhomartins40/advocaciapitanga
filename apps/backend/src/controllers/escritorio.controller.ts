import { Response } from 'express';
import { AuthRequest } from '../types';
import { EscritorioService } from '../services/escritorio.service';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '@prisma/client';

export class EscritorioController {
  private escritorioService: EscritorioService;

  constructor() {
    this.escritorioService = new EscritorioService();
  }

  /**
   * GET /api/escritorio
   * Obter dados do escritório do usuário
   */
  async obterEscritorio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const escritorio = await this.escritorioService.obterEscritorio(req.user.userId);

      if (!escritorio) {
        res.status(404).json({ error: 'Escritório não encontrado' });
        return;
      }

      res.json(escritorio);
    } catch (error: any) {
      console.error('Erro ao obter escritório:', error);
      res.status(500).json({ error: error.message || 'Erro ao obter escritório' });
    }
  }

  /**
   * PUT /api/escritorio
   * Atualizar dados do escritório (apenas admin)
   */
  async atualizarEscritorio(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.escritorioId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { nome, cnpj } = req.body;

      const escritorio = await this.escritorioService.atualizarEscritorio(req.escritorioId, {
        nome,
        cnpj,
      });

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.PROFILE_UPDATED,
        entityType: 'Escritorio',
        entityId: escritorio.id,
        newValue: JSON.stringify({ nome, cnpj }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(escritorio);
    } catch (error: any) {
      console.error('Erro ao atualizar escritório:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar escritório' });
    }
  }

  /**
   * GET /api/escritorio/membros
   * Listar membros do escritório
   */
  async listarMembros(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.escritorioId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const membros = await this.escritorioService.listarMembros(req.escritorioId);

      res.json(membros);
    } catch (error: any) {
      console.error('Erro ao listar membros:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar membros' });
    }
  }

  /**
   * POST /api/escritorio/membros
   * Adicionar novo membro ao escritório
   */
  async adicionarMembro(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.escritorioId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { nome, email, role, oab, telefone, permissoes } = req.body;

      // Validações
      if (!nome || !email || !role) {
        res.status(400).json({ error: 'Nome, email e role são obrigatórios' });
        return;
      }

      if (role === 'ADVOGADO' && !oab) {
        res.status(400).json({ error: 'OAB é obrigatória para advogados' });
        return;
      }

      if (!['ADVOGADO', 'ASSISTENTE', 'ESTAGIARIO'].includes(role)) {
        res.status(400).json({ error: 'Role inválido' });
        return;
      }

      const resultado = await this.escritorioService.adicionarMembro({
        escritorioId: req.escritorioId,
        nome,
        email,
        role,
        oab,
        telefone,
        permissoes,
        convidadoPor: req.user.userId,
      });

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.MEMBRO_ADICIONADO,
        entityType: 'MembroEscritorio',
        entityId: resultado.membro.id,
        newValue: JSON.stringify({ nome, email, role }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json(resultado);
    } catch (error: any) {
      console.error('Erro ao adicionar membro:', error);
      res.status(400).json({ error: error.message || 'Erro ao adicionar membro' });
    }
  }

  /**
   * PUT /api/escritorio/membros/:id/permissoes
   * Atualizar permissões de um membro
   */
  async atualizarPermissoes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { id } = req.params;
      const permissoes = req.body;

      const membro = await this.escritorioService.atualizarPermissoes(id, permissoes);

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.PERMISSAO_ALTERADA,
        entityType: 'MembroEscritorio',
        entityId: id,
        newValue: JSON.stringify(permissoes),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(membro);
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar permissões' });
    }
  }

  /**
   * PATCH /api/escritorio/membros/:id/desativar
   * Desativar membro
   */
  async desativarMembro(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { id } = req.params;

      const membro = await this.escritorioService.desativarMembro(id);

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.USUARIO_DESATIVADO,
        entityType: 'MembroEscritorio',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(membro);
    } catch (error: any) {
      console.error('Erro ao desativar membro:', error);
      res.status(500).json({ error: error.message || 'Erro ao desativar membro' });
    }
  }

  /**
   * PATCH /api/escritorio/membros/:id/reativar
   * Reativar membro
   */
  async reativarMembro(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { id } = req.params;

      const membro = await this.escritorioService.reativarMembro(id);

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.USUARIO_ATIVADO,
        entityType: 'MembroEscritorio',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(membro);
    } catch (error: any) {
      console.error('Erro ao reativar membro:', error);
      res.status(500).json({ error: error.message || 'Erro ao reativar membro' });
    }
  }

  /**
   * DELETE /api/escritorio/membros/:id
   * Remover membro permanentemente
   */
  async removerMembro(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const { id } = req.params;

      await this.escritorioService.removerMembro(id);

      await AuditService.createLog({
        userId: req.user.userId,
        action: AuditAction.MEMBRO_REMOVIDO,
        entityType: 'MembroEscritorio',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Membro removido com sucesso' });
    } catch (error: any) {
      console.error('Erro ao remover membro:', error);
      res.status(500).json({ error: error.message || 'Erro ao remover membro' });
    }
  }
}
