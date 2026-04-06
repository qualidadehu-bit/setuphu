import { apiClient } from '@/api/apiClient';

/**
 * Notifica equipe de Higiene quando um leito está livre para higienização
 */
export async function notificarHigiene(leito, unidade, quarto) {
  try {
    await apiClient.entities.Notificacao.create({
      titulo: '🔔 Novo Leito Livre',
      mensagem: `Unidade ${unidade}, Quarto ${quarto}, Leito ${leito} aguardando higienização.`,
      tipo: 'higiene',
      leito,
      unidade,
      quarto,
      categoria_destino: 'higiene',
      rota: `/higiene?unidade=${encodeURIComponent(unidade)}&quarto=${encodeURIComponent(quarto)}`,
      status: 'pendente'
    });
    console.log(`[NOTIF DB] Higiene notificada para leito ${leito}`);
  } catch (error) {
    console.error('Erro ao notificar higiene:', error);
  }
}

/**
 * Notifica Maqueiros quando um leito foi higienizado e está pronto
 */
export async function notificarMaqueiro(leito, unidade, quarto) {
  try {
    await apiClient.entities.Notificacao.create({
      titulo: '✅ Leito Liberado',
      mensagem: `Unidade ${unidade}, Quarto ${quarto}, Leito ${leito} higienizado e pronto para novo paciente.`,
      tipo: 'transporte',
      leito,
      unidade,
      quarto,
      categoria_destino: 'maqueiro',
      rota: `/maqueiro?unidade=${encodeURIComponent(unidade)}&quarto=${encodeURIComponent(quarto)}`,
      status: 'pendente'
    });
    console.log(`[NOTIF DB] Maqueiro notificado para leito ${leito}`);
  } catch (error) {
    console.error('Erro ao notificar maqueiro:', error);
  }
}

/**
 * Notifica Maqueiro quando um escriturário chama
 */
export async function notificarMaqueiroChamada(leito, unidade, quarto) {
  try {
    await apiClient.entities.Notificacao.create({
      titulo: '🏃 Chamado para Leito',
      mensagem: `Comparecer ao Leito ${leito} (Unidade ${unidade}, Quarto ${quarto}).`,
      tipo: 'transporte',
      leito,
      unidade,
      quarto,
      categoria_destino: 'maqueiro',
      rota: `/maqueiro?unidade=${encodeURIComponent(unidade)}&quarto=${encodeURIComponent(quarto)}`,
      status: 'pendente'
    });
    
    // Alerta gestor também
    await apiClient.entities.Notificacao.create({
      titulo: '🔔 NIR: Maqueiro Acionado',
      mensagem: `Maqueiro solicitado no Leito ${leito} (${unidade}).`,
      tipo: 'alerta_critico',
      leito,
      unidade,
      quarto,
      categoria_destino: 'gestor',
      rota: '/gestor/monitoramento',
      status: 'pendente'
    });
    console.log(`[NOTIF DB] Chamado de maqueiro registrado para leito ${leito}`);
  } catch (error) {
    console.error('Erro ao chamar maqueiro:', error);
  }
}

/**
 * Notifica Gestor quando um leito ultrapassa SLA
 */
export async function notificarGestorAtraso(leito, unidade, quarto, tempoMinutos, metaMinutos) {
  try {
    await apiClient.entities.Notificacao.create({
      titulo: '⚠️ Atraso no Setup',
      mensagem: `Leito ${leito} da Unidade ${unidade} aguardando há ${tempoMinutos} min (meta: ${metaMinutos} min).`,
      tipo: 'alerta_critico',
      leito,
      unidade,
      quarto,
      categoria_destino: 'gestor',
      rota: '/gestor/monitoramento',
      status: 'pendente'
    });
  } catch (error) {
    console.error('Erro ao notificar gestor:', error);
  }
}

/**
 * Marca uma notificação específica como concluída no DB
 */
export async function marcarNotificacaoComoLida(notifId) {
  try {
    await apiClient.entities.Notificacao.update(notifId, {
      status: 'concluida',
      data_conclusao: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como concluída:', error);
  }
}

/**
 * Auto-conclui notificações pendentes para um leito específico e categoria
 */
export async function concluirNotificacoesDoLeito(leito, categoria_destino) {
  try {
    const notifs = await apiClient.entities.Notificacao.filter({
      leito: leito,
      categoria_destino: categoria_destino,
      status: 'pendente'
    });
    
    for (const n of notifs) {
      await marcarNotificacaoComoLida(n.id);
    }
  } catch(e) {
    console.error('Erro ao autoconcluir notificações:', e);
  }
}