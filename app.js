require('dotenv').config();

const express = require('express');
const { query, closePool } = require('./src/db');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const result = await query('select now() as database_time');

    res.json({
      status: 'ok',
      app: 'placar.digital',
      database: 'connected',
      databaseTime: result.rows[0].database_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      app: 'placar.digital',
      database: 'unavailable',
      message: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    app: 'placar.digital',
    status: 'online'
  });
});

const server = app.listen(port, () => {
  console.log(`placar.digital rodando em http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
