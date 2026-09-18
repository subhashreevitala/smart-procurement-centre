"""
Procurement Centre Portal - Self-Bootstrapping Startup Controller
Automatically creates virtual environments, installs missing dependencies, seeds database,
and launches both FastAPI (:8000) and Next.js (:3000) concurrently with unified logging.
"""

import os
import sys
import subprocess
import threading
import time
import webbrowser
import signal
import urllib.request
from pathlib import Path

# Enable ANSI escape sequences on Windows
if os.name == "nt":
    os.system("")

# ANSI Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR = BACKEND_DIR / "venv"

# Determine Python and NPM executables
if os.name == "nt":
    venv_python = VENV_DIR / "Scripts" / "python.exe"
    npm_cmd = "npm.cmd"
else:
    venv_python = VENV_DIR / "bin" / "python"
    npm_cmd = "npm"

processes = []

def stream_output(process, prefix, color):
    """Reads lines from a subprocess and prints with a colored prefix."""
    try:
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            cleaned = line.rstrip()
            if cleaned:
                print(f"{color}{BOLD}[{prefix}]{RESET} {cleaned}", flush=True)
    except Exception:
        pass

def cleanup_processes():
    """Terminates all running child processes cleanly."""
    print(f"\n{MAGENTA}{BOLD}[SYSTEM]{RESET} Shutting down servers...", flush=True)
    for p in processes:
        if p.poll() is None:
            try:
                if os.name == "nt":
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    p.terminate()
            except Exception:
                pass
    print(f"{GREEN}{BOLD}[SYSTEM]{RESET} All services stopped cleanly. Goodbye!\n", flush=True)

def signal_handler(sig, frame):
    cleanup_processes()
    sys.exit(0)

def wait_and_open_browser(url, delay_seconds=3):
    """Checks backend health then opens the browser."""
    for _ in range(20):
        time.sleep(0.5)
        try:
            req = urllib.request.urlopen("http://127.0.0.1:8000/", timeout=1)
            if req.getcode() == 200:
                print(f"{GREEN}{BOLD}[SYSTEM]{RESET} Backend is healthy and responding on http://127.0.0.1:8000 !", flush=True)
                break
        except Exception:
            pass

    time.sleep(delay_seconds)
    print(f"{MAGENTA}{BOLD}[SYSTEM]{RESET} Opening web app in browser: {url}", flush=True)
    webbrowser.open(url)

def ensure_backend_environment():
    """Ensures backend virtual environment exists and has required packages installed."""
    global venv_python

    # 1. Create venv if missing
    if not venv_python.exists():
        print(f"{YELLOW}{BOLD}[SETUP]{RESET} Backend virtual environment not found. Creating {VENV_DIR}...", flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])
            print(f"{GREEN}{BOLD}[SETUP]{RESET} Virtual environment created successfully!", flush=True)
        except Exception as e:
            print(f"{RED}[ERROR] Failed to create venv using {sys.executable}: {e}{RESET}")
            print(f"{YELLOW}[FALLBACK] Will attempt running with global Python.{RESET}")
            venv_python = Path(sys.executable)

    python_bin = str(venv_python) if venv_python.exists() else sys.executable

    # 2. Check if all required packages are installed
    check_code = "import uvicorn, fastapi, sqlalchemy, jose, passlib, faker"
    test_proc = subprocess.run([python_bin, "-c", check_code], capture_output=True)
    
    if test_proc.returncode != 0:
        print(f"{YELLOW}{BOLD}[SETUP]{RESET} Installing backend dependencies from requirements.txt...", flush=True)
        req_file = BACKEND_DIR / "requirements.txt"
        if req_file.exists():
            cmd = [python_bin, "-m", "pip", "install", "-r", str(req_file)]
        else:
            cmd = [python_bin, "-m", "pip", "install", "fastapi", "uvicorn[standard]", "sqlalchemy", "pydantic", "python-jose[cryptography]", "passlib[bcrypt]", "bcrypt", "python-multipart", "requests", "faker", "websockets", "httpx", "firebase-admin"]
        
        try:
            subprocess.check_call(cmd)
            print(f"{GREEN}{BOLD}[SETUP]{RESET} Backend dependencies installed successfully!", flush=True)
        except Exception as e:
            print(f"{RED}[ERROR] Failed to install backend dependencies: {e}{RESET}")

    # 3. Check if SQLite database exists, if not seed it
    db_file = BACKEND_DIR / "procurement.db"
    if not db_file.exists():
        print(f"{YELLOW}{BOLD}[SETUP]{RESET} Initial database not found. Seeding initial data...", flush=True)
        seed_script = BACKEND_DIR / "scripts" / "seed_data.py"
        if seed_script.exists():
            try:
                subprocess.check_call([python_bin, str(seed_script)])
                print(f"{GREEN}{BOLD}[SETUP]{RESET} Database seeded with demo farmers and Mandis!", flush=True)
            except Exception as e:
                print(f"{RED}[WARNING] Could not seed database: {e}{RESET}")

    return python_bin

def ensure_frontend_environment():
    """Checks frontend node_modules."""
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print(f"{YELLOW}{BOLD}[SETUP]{RESET} Frontend node_modules not found. Running npm install...", flush=True)
        try:
            subprocess.check_call([npm_cmd, "install"], cwd=str(FRONTEND_DIR), shell=(os.name == "nt"))
            print(f"{GREEN}{BOLD}[SETUP]{RESET} Frontend dependencies installed successfully!", flush=True)
        except Exception as e:
            print(f"{RED}[ERROR] Failed to run npm install: {e}{RESET}")

def main():
    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    print(f"{GREEN}{BOLD}====================================================================={RESET}")
    print(f"{GREEN}{BOLD}          PROCUREMENT CENTRE PORTAL - STARTUP CONTROLLER          {RESET}")
    print(f"{GREEN}{BOLD}====================================================================={RESET}")
    print(f"{DIM}Root Directory:    {ROOT_DIR}{RESET}")
    print(f"{DIM}Backend API:       http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs){RESET}")
    print(f"{DIM}Frontend App:      http://localhost:3000{RESET}")
    print(f"{GREEN}{BOLD}====================================================================={RESET}\n")

    # Step 1: Self-bootstrapping checks
    python_bin = ensure_backend_environment()
    ensure_frontend_environment()

    print(f"\n{GREEN}{BOLD}[SYSTEM]{RESET} Environment verified! Starting services...\n", flush=True)

    # Step 2: Start Backend
    print(f"{CYAN}{BOLD}[SYSTEM]{RESET} Starting FastAPI Backend on {BOLD}http://127.0.0.1:8000{RESET} ...", flush=True)
    backend_cmd = [python_bin, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    
    try:
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(BACKEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )
        processes.append(backend_proc)
        
        t_backend = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", CYAN), daemon=True)
        t_backend.start()
    except Exception as e:
        print(f"{RED}[ERROR] Failed to start backend: {e}{RESET}")
        cleanup_processes()
        return

    # Step 3: Start Frontend
    is_prod = "--prod" in sys.argv
    if is_prod:
        print(f"{YELLOW}{BOLD}[SYSTEM]{RESET} Starting Next.js Frontend (PRODUCTION) on {BOLD}http://localhost:3000{RESET} ...", flush=True)
        build_id_file = FRONTEND_DIR / ".next" / "BUILD_ID"
        if not build_id_file.exists():
            print(f"{YELLOW}{BOLD}[SYSTEM]{RESET} Production build not found. Building Next.js app (this may take a minute)...", flush=True)
            subprocess.check_call([npm_cmd, "run", "build"], cwd=str(FRONTEND_DIR), shell=(os.name == "nt"))
        frontend_cmd = [npm_cmd, "start"]
    else:
        print(f"{YELLOW}{BOLD}[SYSTEM]{RESET} Starting Next.js Frontend (DEV) on {BOLD}http://localhost:3000{RESET} ...", flush=True)
        frontend_cmd = [npm_cmd, "run", "dev"]
    
    try:
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
            shell=(os.name == "nt")
        )
        processes.append(frontend_proc)
        
        t_frontend = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND", YELLOW), daemon=True)
        t_frontend.start()
    except Exception as e:
        print(f"{RED}[ERROR] Failed to start frontend: {e}{RESET}")
        cleanup_processes()
        return

    # Step 4: Health check & Open Browser
    browser_thread = threading.Thread(target=wait_and_open_browser, args=("http://localhost:3000", 2), daemon=True)
    browser_thread.start()

    print(f"\n{GREEN}{BOLD}[SYSTEM] Both services running! Press Ctrl+C to stop all servers.{RESET}\n", flush=True)

    # Keep alive and monitor child processes
    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print(f"{RED}[BACKEND] Server exited with code {backend_proc.poll()}{RESET}")
                break
            if frontend_proc.poll() is not None:
                print(f"{RED}[FRONTEND] Server exited with code {frontend_proc.poll()}{RESET}")
                break
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_processes()

if __name__ == "__main__":
    main()
