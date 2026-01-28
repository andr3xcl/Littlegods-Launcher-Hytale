import { BrowserWindow } from "electron";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import { logger } from "../logger";


export const checkNixInstalled = (): boolean => {
    if (process.platform !== "linux") return true;

    
    let commandExists = false;
    try {
        execSync("nix --version", { stdio: "ignore" });
        commandExists = true;
    } catch {
        commandExists = false;
    }

    
    const traces = ["/nix", "/etc/nix", "/etc/systemd/system/nix-daemon.service"];
    const traceExists = traces.some(path => fs.existsSync(path));

    return commandExists || traceExists;
};


export const installNix = async (win: BrowserWindow): Promise<boolean> => {
    if (process.platform !== "linux") return true;

    logger.info("Starting Nix installation diagnostics...");

    
    const dependencies = ["curl", "xz", "bash"];
    for (const dep of dependencies) {
        try {
            execSync(`which ${dep}`, { stdio: "ignore" });
        } catch {
            const msg = `ERROR: Falta dependencia: ${dep}. Instálala con: sudo apt install ${dep}`;
            logger.error(msg);
            win.webContents.send("install-progress", { phase: "nix-install", percent: -1, message: msg });
            return false;
        }
    }

    
    const conflicts = [
        { path: "/etc/bash.bashrc.backup-before-nix", msg: "Conflicto: ya existe un backup de Nix. Ejecuta: sudo mv /etc/bash.bashrc.backup-before-nix /etc/bash.bashrc" },
        { path: "/etc/zshrc.backup-before-nix", msg: "Conflicto: ya existe un backup de Nix (zsh). Ejecuta: sudo mv /etc/zshrc.backup-before-nix /etc/zshrc" },
        { path: "/etc/profile.d/nix.sh.backup-before-nix", msg: "Conflicto: ya existe un backup de Nix (sh). Ejecuta: sudo rm /etc/profile.d/nix.sh.backup-before-nix" },
    ];

    for (const conflict of conflicts) {
        if (fs.existsSync(conflict.path)) {
            logger.warn(conflict.msg);
            win.webContents.send("install-progress", { phase: "nix-install", percent: -1, message: conflict.msg });
            return false;
        }
    }

    win.webContents.send("install-progress", {
        phase: "nix-install",
        percent: -1,
        message: "Iniciando instalador (aparecerá ventana para contraseña)..."
    });

    return new Promise((resolve, reject) => {
        
        const installCmd = `curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install | bash -s -- --daemon`;

        
        const nixProcess = spawn("pkexec", ["bash", "-c", installCmd], {
            windowsHide: true,
            env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" }
        });

        const handleOutput = (data: any, isError = false) => {
            const lines = data.toString().split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (isError) {
                    logger.warn(`[Nix Install Error] ${trimmed}`);
                } else {
                    logger.info(`[Nix Install] ${trimmed}`);
                }

                win.webContents.send("install-progress", {
                    phase: "nix-install",
                    percent: -1,
                    message: trimmed
                });
            }
        };

        if (nixProcess.stdout) nixProcess.stdout.on("data", handleOutput);
        if (nixProcess.stderr) nixProcess.stderr.on("data", (data) => handleOutput(data, true));

        nixProcess.on("error", (error) => {
            logger.error("Error al iniciar proceso de Nix:", error);
            reject(error);
        });

        nixProcess.on("close", (code) => {
            logger.info(`Instalación de Nix terminó con código ${code}`);
            if (code === 0) {
                logger.info("Nix instalado con éxito.");
                win.webContents.send("nix-status-changed", true);
                resolve(true);
            } else {
                const finalMsg = `Error (Code ${code}). Verifica tu contraseña o prueba en terminal: sh <(curl -L https://nixos.org/nix/install) --daemon`;
                logger.error(finalMsg);
                win.webContents.send("install-progress", { phase: "nix-install", percent: -1, message: finalMsg });
                resolve(false);
            }
        });
    });
};


export const uninstallNix = async (win: BrowserWindow): Promise<boolean> => {
    if (process.platform !== "linux") return true;

    logger.info("Starting Nix uninstallation...");

    win.webContents.send("install-progress", {
        phase: "nix-uninstall",
        percent: -1,
        message: "Iniciando desinstalación (aparecerá ventana para contraseña)..."
    });

    return new Promise((resolve) => {
        
        const uninstallScript = `
            # 1. Stop and disable services
            systemctl stop nix-daemon.service nix-daemon.socket || true
            systemctl disable nix-daemon.service nix-daemon.socket || true
            rm -f /etc/systemd/system/nix-daemon.service /etc/systemd/system/nix-daemon.socket || true
            systemctl daemon-reload || true

            # 2. Remove files and directories
            rm -rf /nix /etc/nix /root/.nix-profile /root/.nix-defexpr /root/.nix-channels || true

            # 3. Restore shell config backups
            for conf in /etc/bash.bashrc /etc/bashrc /etc/zshrc /etc/profile.d/nix.sh; do
                backup="$conf.backup-before-nix"
                if [ -f "$backup" ]; then
                    mv "$backup" "$conf" || true
                elif [[ "$conf" == *nix.sh* ]]; then
                    rm -f "$conf" || true
                fi
            done

            # 4. Remove users and groups
            for user in $(getent passwd | cut -d: -f1 | grep '^nixbld'); do
                userdel "$user" || true
            done
            groupdel nixbld || true
        `;

        const p = spawn("pkexec", ["bash", "-c", uninstallScript], {
            windowsHide: true
        });

        p.on("error", (err) => {
            logger.error("Error al iniciar pkexec para desinstalación:", err);
            win.webContents.send("install-progress", {
                phase: "nix-uninstall",
                percent: -1,
                message: `Error al iniciar autorización: ${err.message}`
            });
            resolve(false);
        });

        p.on("close", (code) => {
            logger.info(`Desinstalación terminada con código ${code}`);
            if (code === 0) {
                win.webContents.send("install-progress", {
                    phase: "nix-uninstall",
                    percent: 100,
                    message: "Nix ha sido desinstalado completamente."
                });
                win.webContents.send("nix-status-changed", false);
                resolve(true);
            } else {
                win.webContents.send("install-progress", {
                    phase: "nix-uninstall",
                    percent: -1,
                    message: "Error en la desinstalación (¿contraseña incorrecta o cancelado?)"
                });
                resolve(false);
            }
        });
    });
};
