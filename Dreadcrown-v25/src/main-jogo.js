/* =====================================================================
   Ponto de entrada do jogo (sem React): interface própria + motor de regras + 3D.
   A camada 3D ainda observa o DOM (ui/ponte.js); migração para eventos está em docs/MIGRACAO.md.
   ===================================================================== */
import { iniciarJogo } from './ui/jogo/app.js';
import { ENABLED } from './core/util.js';
import { iniciar3D } from './ui/ponte.js';

iniciarJogo();
if (ENABLED) iniciar3D(); else console.info('[3D] indisponível — mantendo a versão 2D');
