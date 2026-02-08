/**
 * Libère le port donné en arrêtant les processus qui l'écoutent.
 * Usage manuel : node scripts/kill-port.js [port]
 * Par défaut : port 3000.
 * À utiliser uniquement quand vous voulez un serveur "frais" (ex. avant test:e2e:fresh).
 */
const { exec } = require('child_process');

const port = process.argv[2] || '3000';

console.log(`Tentative de libération du port ${port}...`);

if (process.platform === 'win32') {
  exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
    if (!stdout || !stdout.trim()) {
      console.log(`Port ${port} déjà libre`);
      return;
    }
    const lines = stdout.trim().split('\n');
    let killed = 0;
    lines.forEach((line) => {
      const match = line.trim().match(/(\d+)$/);
      if (match) {
        const pid = match[1];
        if (pid && pid !== '0') {
          exec(`taskkill /PID ${pid} /F 2>nul`, (err) => {
            if (!err) killed++;
          });
        }
      }
    });
    setTimeout(() => {
      console.log(`${killed} processus arrêté(s) sur le port ${port}`);
    }, 500);
  });
} else {
  exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, () => {
    console.log(`Port ${port} libéré (UNIX)`);
  });
}
