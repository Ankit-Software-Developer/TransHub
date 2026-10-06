module.exports = {
  apps: [
    {
      name: 'transhub-api',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
      },
    },
    {
      name: 'transhub-web',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },
  ],
};
