module.exports = {
  apps: [
    {
      name: 'placar-digital',
      script: './app.js',
      cwd: '/var/www/placar.digital/current',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/log/placar.digital/app-error.log',
      out_file: '/var/log/placar.digital/app-out.log',
      log_file: '/var/log/placar.digital/app-combined.log',
      time: true,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,
      autorestart: true,
      restart_delay: 3000
    }
  ]
};
