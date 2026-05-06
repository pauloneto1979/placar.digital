function startSportsDataSyncJob(syncService, options = {}) {
  const logger = options.logger || console;
  const intervalMs = options.intervalMs || 60000;
  let stopped = false;

  async function run() {
    if (stopped) return;
    await syncService.syncOnce();
  }

  const timer = setInterval(() => {
    run().catch((error) => {
      logger.warn(`[sports-data-sync] Falha controlada no job: ${error.message}`);
    });
  }, intervalMs);

  if (typeof timer.unref === 'function') timer.unref();
  logger.log('[sports-data-sync] Job agendado a cada 60 segundos.');

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
    run
  };
}

module.exports = {
  startSportsDataSyncJob
};
