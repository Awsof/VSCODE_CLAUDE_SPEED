/**
 * ScenarioExecutor — Executor de cenários com passos sequenciais
 */
const ScenarioExecutor = (() => {
  const state = {
    isRunning: false,
    currentScenario: null,
    currentStep: 0,
    results: [],
    listeners: []
  };

  /**
   * Registrar listener
   */
  const on = (eventType, callback) => {
    state.listeners.push({ eventType, callback });
  };

  /**
   * Disparar evento
   */
  const _emit = (eventType, data) => {
    state.listeners
      .filter(l => l.eventType === eventType)
      .forEach(l => {
        try {
          l.callback(data);
        } catch (error) {
          console.error(`[ScenarioExecutor] Erro em listener ${eventType}:`, error);
        }
      });
  };

  /**
   * Executar cenário com passos sequenciais
   */
  const execute = async (scenarioId) => {
    const scenario = ScenariosManager.getById(scenarioId);
    if (!scenario) {
      throw new Error('Cenário não encontrado');
    }

    state.isRunning = true;
    state.currentScenario = scenario;
    state.currentStep = 0;
    state.results = [];

    _emit('scenario-start', { scenario });

    try {
      for (let stepIndex = 0; stepIndex < scenario.passos.length; stepIndex++) {
        if (state.isRunning === false) {
          _emit('scenario-aborted', {});
          break;
        }

        state.currentStep = stepIndex;
        const passo = scenario.passos[stepIndex];

        _emit('step-start', {
          scenarioId,
          stepIndex,
          step: passo
        });

        // Executar passo
        const stepResults = await _executStep(passo);
        state.results.push(...stepResults);

        _emit('step-complete', {
          scenarioId,
          stepIndex,
          results: stepResults
        });

        // Delay entre passos (200ms)
        await UtilsEngine.sleep(200);
      }

      _emit('scenario-complete', {
        scenario,
        results: state.results,
        stats: _calculateStats()
      });

      return state.results;

    } catch (error) {
      console.error('[ScenarioExecutor] Erro ao executar cenário:', error);
      _emit('scenario-error', { error: error.message });
      return state.results;
    } finally {
      state.isRunning = false;
    }
  };

  /**
   * Executar um passo individual
   * Passo contém: profileId, requests, concorrencia
   */
  const _executStep = async (passo) => {
    const profile = ProfilesManager.getById(passo.profileId);
    if (!profile) {
      console.error(`[ScenarioExecutor] Perfil ${passo.profileId} não encontrado`);
      return [];
    }

    const config = {
      requestsPerProfile: passo.requests || 1,
      concurrency: passo.concorrencia || 1,
      rampUp: 0,
      timeout: 120
    };

    return new Promise((resolve) => {
      const stepResults = [];

      RunnerEngine.on('request-complete', (result) => {
        stepResults.push(result);
      });

      RunnerEngine.on('batch-complete', () => {
        resolve(stepResults);
      });

      RunnerEngine.executeBatch([profile], config);
    });
  };

  /**
   * Cancelar execução
   */
  const abort = () => {
    state.isRunning = false;
    RunnerEngine.abort();
  };

  /**
   * Obter status
   */
  const getStatus = () => ({
    isRunning: state.isRunning,
    currentScenario: state.currentScenario?.nome || null,
    currentStep: state.currentStep,
    totalSteps: state.currentScenario?.passos.length || 0,
    completedResults: state.results.length
  });

  /**
   * Calcular estatísticas dos resultados
   */
  const _calculateStats = () => {
    if (state.results.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }

    const successful = state.results.filter(r => r.success).length;
    const failed = state.results.filter(r => !r.success).length;
    const totalDuration = state.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total: state.results.length,
      successful,
      failed,
      successRate: ((successful / state.results.length) * 100).toFixed(1),
      totalDuration,
      avgDuration: Math.round(totalDuration / state.results.length)
    };
  };

  return {
    execute,
    abort,
    getStatus,
    on
  };
})();
