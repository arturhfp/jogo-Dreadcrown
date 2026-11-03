#!/usr/bin/env python3
"""Migração ÚNICA (já executada): extrai de um HTML monolítico v22/v23 os blocos que viraram arquivos.
Mantido só como registro de como o projeto foi dividido; NÃO faz parte do fluxo normal de desenvolvimento."""
import re, sys, os, json, base64
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def blocks():
    pos = 0
    for m in re.finditer(r'<(script|style)([^>]*)>', s):
        if m.start() < pos: continue
        k = m.end()
        while True:
            j = s.index('</' + m.group(1) + '>', k)
            if s[j-1] != '\\': break
            k = j + 1
        yield m.group(1), m.group(2), s[m.end():j]; pos = j
B = list(blocks())
def w(path, text, mode='w'):
    p = os.path.join(dst, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, mode, encoding=None if 'b' in mode else 'utf-8').write(text)
names = {'v17-animation-overhaul': 'animacoes-v17', 'v18-4-visual-fix': 'correcao-visual-v18-4', 'v18-5-combat-equipment': 'equipamento-combate-v18-5',
         'v18-5-racial-visuals': 'visuais-raciais-v18-5', 'v18-9-clip-fix': 'corte-v18-9', 'v18-9-skill-labels': 'rotulos-habilidades-v18-9',
         'v18-10-portraits-css': 'retratos', 'v18-11-scene-css': 'cenario', 'v18-6-fixes': 'ajustes-v18-6', 'gl3d-css': 'palco3d', 'v15-visual-overhaul': 'visual-v15'}
n_anon = 0
for kind, attrs, body in B:
    idm = re.search(r'id="([^"]+)"', attrs); i = idm.group(1) if idm else None
    if kind == 'style':
        if i is None: n_anon += 1; nm = 'jogo-base' if n_anon == 1 else 'ajuste-anonimo'
        else: nm = names[i]
        w(f'src/styles/{nm}.css', body.strip('\n') + '\n')
    elif i == 'orc-glb':
        w('assets/modelos/orc.glb', base64.b64decode(body.strip()), 'wb')
    elif i == 'engine-3d': pass
    elif i == 'v18-10-portraits':
        imgs = {}
        def rep(m):
            data = base64.b64decode(m.group(2)); key = 'img%03d' % len(imgs); imgs[key] = (m.group(1), data); return '"@@' + key + '@@"'
        t = re.sub(r'"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)"', rep, body)
        mP = re.search(r'const P=(\{.*?\});\n', t, re.S); mS = re.search(r'const S=(\{.*?\});\n', t, re.S)
        def conv(txt):
            d = json.loads(txt); out = {}
            for k, v in d.items():
                key = re.search(r'@@(img\d+)@@', v[2]).group(1); ext = {'jpeg': 'jpg'}.get(imgs[key][0], imgs[key][0]); fn = k.replace('|', '_') + '.' + ext
                w('assets/retratos/' + fn, imgs[key][1], 'wb'); out[k] = [v[0], v[1], 'assets/retratos/' + fn]
            return out
        P = conv(mP.group(1)); S = conv(mS.group(1))
        w('src/ui/retratos-dados.js', '/* Tabela de retratos: chave "raça|classe[|subclasse]" -> [deslocamento x, y, caminho da imagem]. Gerada na migração;\n   o build do HTML único troca os caminhos por data URIs. */\nwindow.__RETRATOS = { P: ' + json.dumps(P, ensure_ascii=False) + ', S: ' + json.dumps(S, ensure_ascii=False) + ' };\n')
        t = t.replace(mP.group(0), 'const P=window.__RETRATOS.P;\n').replace(mS.group(0), 'const S=window.__RETRATOS.S;\n')
        w('src/ui/retratos.js', t.strip('\n') + '\n')
    elif i in ('v18-4-mobile-visuals', 'v18-5-progression-guard', 'v18-11-scene', 'v17-class-script'):
        nm = {'v18-4-mobile-visuals': 'visuais-mobile', 'v18-5-progression-guard': 'avanco-automatico', 'v18-11-scene': 'cenario', 'v17-class-script': 'classe-v17'}[i]
        w(f'src/ui/{nm}.js', body.strip('\n') + '\n')
    elif kind == 'script' and 'module' in attrs and i is None:
        w('src/vendor/game-bundle.js', body.strip('\n') + '\n')
print('ok', len(B), 'blocos')
