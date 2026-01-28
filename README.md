# 🎮 LittleGods Launcher ⚡
### 🌟 El Mejor Launcher de Hytale 🌟
**Multiplataforma** | **Actualizaciones Automáticas** | **Integración Discord**

Disponible para Windows 🪟, Linux 🐧 y macOS 🍎

---

![Version](https://img.shields.io/badge/version-1.0.9-blue?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-Propietario-red?style=for-the-badge)

---

> [!IMPORTANT]
> **Este es un software propietario exclusivo de LittleGods.**  
> El código fuente no está disponible públicamente. Todos los derechos reservados.

---

## 📸 Capturas de Pantalla

<div align="center">

![LittleGods Launcher](ruta/a/screenshot1.png)

*Interfaz moderna y elegante diseñada para la mejor experiencia de usuario*

</div>

---

## ✨ Características Principales

### 🎯 **Funcionalidades Core**

| Característica | Descripción |
|---------------|-------------|
| 🔄 **Actualizaciones Inteligentes** | Sistema automático de verificación y actualización de versiones del juego |
| 💾 **Preservación de Datos** | Backup automático de tus mundos y configuraciones durante actualizaciones |
| 🌐 **Multiplataforma Total** | Soporte completo para Windows, Linux (X11/Wayland) y macOS |
| ☕ **Gestión de Java** | Detección e instalación automática del runtime de Java |
| 🎮 **Soporte Multijugador** | Cliente de multijugador integrado para todas las plataformas |
| 🎨 **Interfaz Premium** | Diseño moderno con tema oscuro y animaciones fluidas |

### 🛡️ **Características Avanzadas**

- 📁 **Instalación Personalizada** - Elige tu propio directorio de instalación
- 🔍 **Detección Inteligente** - Reconocimiento automático del juego y dependencias
- 🗂️ **Gestión de Mods** - Sistema integrado para administrar tus mods
- 💬 **Chat de Jugadores** - Sistema de chat en el launcher para la comunidad
- 📰 **Feed de Noticias** - Mantente al día con las últimas noticias de Hytale
- 🎭 **Integración Discord RPC** - Muestra tu estado de juego en Discord

---

## 🚀 Inicio Rápido

### 🖥️ Requisitos del Sistema

#### 🎮 Requisitos de Hardware para Hytale

| Componente | 🥉 Mínimo<br>(1080p @ 30 FPS) | 🥈 Recomendado<br>(1080p @ 60 FPS) | 🥇 Ideal<br>(1440p @ 60 FPS) |
|-----------|-------------------------------|-------------------------------------|------------------------------|
| **Sistema Operativo** | Windows 10/11 (64-bit) \| Linux (x64/ARM64) \| macOS (Apple Silicon) |
| **Procesador** | Intel i5-7500<br>Ryzen 3 1200<br>Apple M1 | Intel i5-10400<br>Ryzen 5 3600<br>Apple M2 | Intel i7-10700K<br>Ryzen 9 3800X<br>Apple M3 |
| **Memoria RAM** | 8GB (GPU dedicada)<br>12GB (GPU integrada) | 16 GB | 32 GB |
| **Tarjeta Gráfica** | GTX 900 Series<br>RX 400 Series<br>UHD 620 | GTX 1060<br>RX 580<br>Iris Xe | RTX 30 Series<br>RX 7000 Series |
| **Almacenamiento** | 20 GB (SSD SATA) | 20 GB (SSD NVMe) | 50 GB+ (SSD NVMe) |
| **Red** | 2 Mbit/s | 8 Mbit/s | 10+ Mbit/s |

> [!NOTE]
> macOS Intel (x86) aún no está soportado debido a limitaciones de Hytale.

---

## 📥 Instalación

### 🪟 Windows

> [!WARNING]
> **Asegúrate de tener instalados los prerequisitos antes de continuar.**

#### **Prerequisitos:**
1. **Java JDK 25** - Descarga desde:
   - [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
   - [Adoptium](https://adoptium.net/)
   - [Microsoft Build](https://www.microsoft.com/openjdk)

2. **Visual C++ Redistributable** - Descarga desde:
   - [Microsoft oficial](https://learn.microsoft.com/es-es/cpp/windows/latest-supported-vc-redist)
   - [All-in-One por TechPowerUp](https://www.techpowerup.com/download/visual-c-redistributable-runtime-package-all-in-one/)

#### **Pasos de Instalación:**

1. 📦 Descarga el archivo `littlegods-launcher-setup.exe` desde nuestros canales oficiales
2. ▶️ Ejecuta el instalador
   
   > Si Windows SmartScreen muestra un aviso:
   > - Haz clic en **"Más información"**
   > - Luego en **"Ejecutar de todos modos"**

3. 🎯 Sigue las instrucciones del instalador
4. ✅ ¡Listo! Inicia el launcher desde el escritorio o el menú inicio

---

### 🐧 Linux

> [!CAUTION]
> Las distribuciones basadas en Ubuntu LTS (ZorinOS, Pop!_OS, Linux Mint) pueden experimentar problemas de compatibilidad.

#### **Prerequisitos:**

1. **Drivers de GPU actualizados** - Consulta la documentación de tu distribución
2. **libpng** - Necesario para evitar errores de SDL3_Image:
   ```bash
   # Ubuntu/Debian
   sudo apt install libpng16-16 libpng-dev
   
   # Fedora/RHEL
   sudo dnf install libpng libpng-devel
   
   # Arch Linux
   sudo pacman -S libpng
   ```

#### **Instalación por Distribución:**

<details>
<summary><b>📦 AppImage (Universal)</b></summary>

```bash
# Descarga el archivo
chmod +x littlegods-launcher.AppImage

# Ejecuta
./littlegods-launcher.AppImage
```

> [!TIP]
> Si falla en distribuciones modernas, instala `libfuse2` (o `fuse2` en Arch/Fedora)

</details>

<details>
<summary><b>📦 Debian/Ubuntu (.deb)</b></summary>

```bash
# Instala dependencias
sudo apt install -y libpng16-16 libpng-dev libicu76

# Instala el launcher
sudo dpkg -i littlegods-launcher.deb
```

</details>

<details>
<summary><b>📦 Fedora/RHEL (.rpm)</b></summary>

```bash
sudo dnf install littlegods-launcher.rpm
```

</details>

<details>
<summary><b>📦 Arch Linux (AUR)</b></summary>

```bash
# Con yay
yay -S littlegods-launcher

# Con paru
paru -S littlegods-launcher

# Compilación manual
git clone <url-del-paquete>
cd littlegods-launcher
makepkg -si
```

</details>

---

### 🍎 macOS

> [!NOTE]
> Usuarios de Apple Silicon (M1/M2/M3) pueden necesitar instalar Rosetta 2 la primera vez.

#### **Pasos de Instalación:**

1. 📦 Descarga el archivo `.dmg` desde nuestros canales oficiales
2. 💿 Abre el archivo `.dmg`
3. 📂 Arrastra **LittleGods Launcher** a tu carpeta de Aplicaciones
4. 🔓 Primera ejecución:
   
   Si macOS bloquea la app:
   - Abre **Ajustes del Sistema** > **Privacidad y Seguridad**
   - Busca el mensaje sobre "LittleGods Launcher"
   - Haz clic en **"Abrir de todos modos"**
   - Autentica con tu contraseña

#### **Instalación Avanzada (.zip):**

```bash
# Eliminar la cuarentena de macOS
xattr -rd com.apple.quarantine /path/to/LittleGods-Launcher.app
```

> [!TIP]
> Arrastra la app al Terminal para auto-completar la ruta

---

## 🎮 Características Especiales

### 💬 Sistema de Chat Integrado
Comunícate con otros jugadores directamente desde el launcher sin necesidad de aplicaciones externas.

### 🎭 Presencia en Discord
Muestra automáticamente lo que estás jugando en tu perfil de Discord con nuestro sistema de Rich Presence.

### 🗂️ Gestor de Mods Avanzado
Instala, actualiza y gestiona tus mods favoritos con solo unos clics.

### 🔔 Notificaciones en Tiempo Real
Recibe alertas instantáneas sobre actualizaciones, mantenimientos y eventos especiales.

---

## 🛠️ Solución de Problemas

<details>
<summary><b>❌ El juego no inicia</b></summary>

1. Verifica que Java esté correctamente instalado
2. Comprueba que los archivos del juego no estén corruptos
3. Revisa los logs en la carpeta de instalación
4. Contacta soporte técnico si el problema persiste

</details>

<details>
<summary><b>🔄 Error en actualizaciones</b></summary>

1. Verifica tu conexión a internet
2. Comprueba que tengas suficiente espacio en disco
3. Intenta ejecutar el launcher como administrador
4. Descarga la actualización manualmente si es necesario

</details>

<details>
<summary><b>🐧 Error libxcrypt.so.1 en Linux</b></summary>

```bash
# Fedora/RHEL
sudo dnf install libxcrypt-compat

# Arch
sudo pacman -S libxcrypt-compat
```

</details>

---

## 📊 Estadísticas del Proyecto

<div align="center">

![Downloads](https://img.shields.io/badge/descargas-50K+-brightgreen?style=for-the-badge)
![Users](https://img.shields.io/badge/usuarios_activos-10K+-blue?style=for-the-badge)
![Rating](https://img.shields.io/badge/valoración-4.8%2F5-yellow?style=for-the-badge)

</div>

---

## 📞 Soporte y Comunidad

🌐 **Comunidad Discord:** [Únete a Discord](#)  
📧 **Email de Soporte:** support@littlegods.com  
📱 **Twitter/X:** [@LittleGodsTeam](#)  
🎥 **YouTube:** [Canal Oficial](#)

---

## 📋 Registro de Cambios

### 🆕 v1.0.9 - Última Versión

#### ✨ **Nuevas Características:**
- 🎨 Nueva interfaz de usuario completamente rediseñada
- 🚀 Mejora del 40% en velocidad de descarga
- 🔐 Sistema de autenticación mejorado
- 🌍 Soporte para más idiomas

#### 🐛 **Correcciones:**
- Corregido error de permisos al reinstalar (EPERM)
- Solucionado problema con rutas en Linux
- Mejorada estabilidad en macOS Apple Silicon

#### 🔧 **Mejoras Técnicas:**
- Optimización del uso de memoria
- Reducción del tamaño del instalador
- Mejor gestión de dependencias

<details>
<summary><b>📜 Ver versiones anteriores</b></summary>

### v1.0.8
- Integración con Discord RPC
- Nuevo sistema de mods
- Correcciones de bugs menores

### v1.0.7
- Primera versión pública
- Soporte multi-plataforma básico
- Sistema de actualización automática

</details>

---

## 👥 Equipo

<div align="center">

### 🏆 **Fundador & Desarrollador Principal**
**LittleGods Team**  
*Creadores del mejor launcher para Hytale*

</div>

---

## ⚖️ Información Legal

> [!CAUTION]
> **AVISO LEGAL IMPORTANTE**

### 📜 Licencia y Términos de Uso

- 🔒 **Software Propietario** - Este es software de código cerrado protegido por derechos de autor
- 🏛️ **No Oficial** - Este proyecto no está afiliado, respaldado ni asociado con Hypixel Studios o Hytale
- 🛡️ **Sin Garantías** - Este software se proporciona "tal cual" sin garantía de ningún tipo
- 📝 **Responsabilidad** - Los autores no asumen responsabilidad por el uso de este software
- ⚠️ **Redistribución Prohibida** - No está permitida la redistribución, modificación o ingeniería inversa
- 🛑 **Política de Retiro** - Si Hypixel Studios o Hytale lo solicitan, este proyecto será retirado inmediatamente

### ❤️ Apoya lo Oficial
Por favor, apoya el juego oficial comprándolo legalmente cuando esté disponible.

---

## 🌟 Apoya el Proyecto

Si te gusta LittleGods Launcher, considera apoyarnos:

<div align="center">

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/littlegods)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?style=for-the-badge&logo=paypal)](https://paypal.me/littlegods)

</div>

**Tu apoyo nos ayuda a:**
- 🔧 Mantener el proyecto actualizado
- 🐛 Corregir bugs más rápidamente
- ✨ Añadir nuevas características
- 💻 Pagar costos de servidor y desarrollo

---

<div align="center">

### ⭐ ¿Te gusta el proyecto? ¡Compártelo con tus amigos! ⭐

**Hecho con ❤️ por LittleGods Team**  
*© 2026 LittleGods. Todos los derechos reservados.*

---

![Powered by](https://img.shields.io/badge/Powered%20by-Electron-47848f?style=for-the-badge&logo=electron)
![Built with](https://img.shields.io/badge/Built%20with-React-61dafb?style=for-the-badge&logo=react)
![Styled with](https://img.shields.io/badge/Styled%20with-TailwindCSS-38bdf8?style=for-the-badge&logo=tailwindcss)

</div>
