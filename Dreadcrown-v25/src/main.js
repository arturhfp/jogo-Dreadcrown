/* =====================================================================
   Ponto de entrada do motor 3D
   ---------------------------------------------------------------------
   RESPONSABILIDADE: iniciar o motor 3D depois que o jogo (React) já está na página.
   Se o WebGL não existir, não faz nada e o jogo continua na versão 2D.
   ===================================================================== */
import { ENABLED } from './core/util.js';
import { iniciar3D } from './ui/ponte.js';

if (ENABLED) iniciar3D(); else console.info('[3D] indisponível — mantendo a versão 2D');
