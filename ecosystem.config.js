module.exports = {
  apps: [{
    name: 'astro-app',
    script: 'npm',
    args: 'run preview',
    cwd: '/path/to/your/astro-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4321
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
