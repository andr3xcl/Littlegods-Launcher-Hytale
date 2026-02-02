{ pkgs ? import <nixpkgs> { } }:

let
  # Definimos las dependencias una vez para reutilizarlas
  myBuildInputs = with pkgs; [
    # Gráficos
    xorg.libX11
    xorg.libXcursor
    xorg.libXi
    xorg.libXrandr
    xorg.libXinerama
    xorg.libXext
    mesa
    libglvnd

    # Audio (PipeWire / Pulse)
    pipewire
    libpulseaudio
    alsa-lib
    bash

    # Multimedia / Input / System
    SDL2
    sdl3
    sdl3-image
    libpng
    glib
    dbus
    stdenv.cc.cc.lib
    
    # Common Game Deps
    vulkan-loader
    udev
    zlib
    openssl
    icu
    libuuid
  ];

  # Pre-calculamos la ruta de las librerías en Nix
  myLibPath = pkgs.lib.makeLibraryPath myBuildInputs;
in

pkgs.mkShell {
  buildInputs = myBuildInputs;

  shellHook = ''
    # Asegurar que las librerías estén disponibles
    export LD_LIBRARY_PATH="${myLibPath}:$LD_LIBRARY_PATH"
    
    # Variables gráficas
    if [ -z "$DISPLAY" ]; then
      export DISPLAY=":0"
    fi
    
    # --- VARIABLES CLAVE PARA PIPEWIRE ---
    if [ -z "$XDG_RUNTIME_DIR" ]; then
      export XDG_RUNTIME_DIR="/run/user/$(id -u)"
    fi
    
    # Forzar a SDL3 a usar PipeWire
    export SDL_AUDIODRIVER=pipewire
    
    echo "Entorno listo con SDL3, PipeWire y gráficos. Ejecutando HytaleClient..."
  '';
}
