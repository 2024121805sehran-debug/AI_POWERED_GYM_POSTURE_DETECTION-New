const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  console.clear();
  log('╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                                      ║', 'cyan');
  log('║          🤖 AI GYM POSTURE DETECTION - UNIFIED LAUNCHER               ║', 'bright');
  log('║                                                                      ║', 'cyan');
  log('║   Sharda University - PBL-2 (CSP-297) - Semester 4th Term 2502       ║', 'cyan');
  log('║   Team 4: Vansh Bhardwaj (2024182457) | Sehran Fayaz (2024121805)     ║', 'cyan');
  log('║                                                                      ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();
}

class ServiceManager {
  constructor() {
    this.processes = [];
    this.projectDir = path.resolve(__dirname);
  }

  async checkDependencies() {
    log('📍 Project Directory: ' + this.projectDir, 'dim');
    log('');

    // Check backend venv
    const venvPath = path.join(this.projectDir, 'backend', 'venv', 'Scripts', 'python.exe');
    if (!fs.existsSync(venvPath)) {
      log('⚠️  Python virtual environment not found!', 'yellow');
      log('   Creating venv and installing dependencies...', 'yellow');
      
      const setup = spawn('python', ['-m', 'venv', 'venv'], {
        cwd: path.join(this.projectDir, 'backend'),
        shell: true
      });
      
      await new Promise((resolve) => {
        setup.on('close', resolve);
      });
      
      log('   Installing Python dependencies (this may take a few minutes)...', 'yellow');
      const pipInstall = spawn('venv\\Scripts\\pip', ['install', '-r', 'requirements.txt'], {
        cwd: path.join(this.projectDir, 'backend'),
        shell: true
      });
      
      await new Promise((resolve) => {
        pipInstall.on('close', resolve);
      });
      
      log('   ✓ Backend dependencies installed', 'green');
    }

    // Check node_modules
    const nodeModulesPath = path.join(this.projectDir, 'frontend', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log('⚠️  Frontend node_modules not found!', 'yellow');
      log('   Installing npm packages...', 'yellow');
      
      const npmInstall = spawn('npm', ['install'], {
        cwd: path.join(this.projectDir, 'frontend'),
        shell: true,
        stdio: 'inherit'
      });
      
      await new Promise((resolve) => {
        npmInstall.on('close', resolve);
      });
      
      log('   ✓ Frontend dependencies installed', 'green');
    }

    console.log();
  }

  startBackend() {
    log('🖥️  Starting Backend (FastAPI) on http://localhost:8000 ...', 'blue');
    
    const backend = spawn('venv\\Scripts\\python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'], {
      cwd: path.join(this.projectDir, 'backend'),
      shell: true
    });

    backend.stdout.on('data', (data) => {
      process.stdout.write(`${colors.blue}[BACKEND]${colors.reset} ${data}`);
    });

    backend.stderr.on('data', (data) => {
      process.stderr.write(`${colors.yellow}[BACKEND]${colors.reset} ${data}`);
    });

    backend.on('close', (code) => {
      log(`Backend process exited with code ${code}`, 'red');
    });

    this.processes.push(backend);
    return backend;
  }

  startFrontend() {
    log('⚛️  Starting Frontend (React) on http://localhost:3000 ...', 'magenta');
    
    const frontend = spawn('npm', ['start'], {
      cwd: path.join(this.projectDir, 'frontend'),
      shell: true,
      env: { ...process.env, BROWSER: 'none' } // Don't auto-open browser
    });

    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Compiled successfully') || output.includes('ready')) {
        log('[FRONTEND] ✓ Compiled successfully!', 'green');
        log('', 'reset');
        log('╔══════════════════════════════════════════════════════════════════════╗', 'green');
        log('║                     ✅ SERVICES READY                                  ║', 'bright');
        log('╠══════════════════════════════════════════════════════════════════════╣', 'green');
        log('║  🌐 Dashboard: http://localhost:3000                                 ║', 'cyan');
        log('║  🔌 API Docs:  http://localhost:8000/docs                           ║', 'cyan');
        log('║  📹 Video:     http://localhost:8000/video                          ║', 'cyan');
        log('╚══════════════════════════════════════════════════════════════════════╝', 'green');
        log('', 'reset');
        log('Press Ctrl+C to stop all services', 'dim');
        log('', 'reset');
      } else {
        process.stdout.write(`${colors.magenta}[FRONTEND]${colors.reset} ${data}`);
      }
    });

    frontend.stderr.on('data', (data) => {
      process.stderr.write(`${colors.yellow}[FRONTEND]${colors.reset} ${data}`);
    });

    frontend.on('close', (code) => {
      log(`Frontend process exited with code ${code}`, 'red');
    });

    this.processes.push(frontend);
    return frontend;
  }

  setupShutdownHandlers() {
    const shutdown = () => {
      log('\n\n🛑 Shutting down services...', 'yellow');
      
      this.processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });

      // Force kill after 5 seconds
      setTimeout(() => {
        this.processes.forEach(proc => {
          if (proc && !proc.killed) {
            proc.kill('SIGKILL');
          }
        });
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', shutdown);
  }

  async run() {
    printBanner();
    
    await this.checkDependencies();
    
    this.setupShutdownHandlers();
    
    // Start backend first
    this.startBackend();
    
    // Wait for backend to initialize
    log('⏳ Waiting for backend to initialize...', 'dim');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Start frontend
    this.startFrontend();
  }
}

// Run the manager
const manager = new ServiceManager();
manager.run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
