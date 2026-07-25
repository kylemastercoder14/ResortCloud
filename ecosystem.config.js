module.exports = {
  apps: [
    {
      name: "resortcloud",
      script: "node_modules/.bin/next",
      args: "start",
      interpreter: "bun",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 1500,
      },
    },
  ],
};