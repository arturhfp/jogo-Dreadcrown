/* =====================================================================
   Cinemática inversa de dois ossos
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Resolve braços/pernas com a lei dos cossenos e um vetor-polo (direção do cotovelo), girando os ossos reais do esqueleto para a mão alcançar um alvo.
   RELAÇÃO COM OUTROS MÓDULOS: Só util.js. Usado por arco.js.
   API PÚBLICA: twoBoneIK(ombro, cotovelo, mão, alvoMundo, poloMundo), aimBone.
   
   ===================================================================== */
import { Quaternion, V3, clamp } from '../core/util.js';

/* ---- IK de dois ossos (lei dos cossenos + vetor polo) ---- */
const _w1 = new Quaternion(), _w2 = new Quaternion(), _w3 = new Quaternion(), _vA = V3(), _vB = V3(), _vC = V3(), _vD = V3();
function aimBone(bone, childW, targetW) {
  bone.getWorldPosition(_vA); _vB.copy(childW).sub(_vA).normalize(); _vC.copy(targetW).sub(_vA).normalize();
  _w1.setFromUnitVectors(_vB, _vC); bone.getWorldQuaternion(_w2); _w2.premultiply(_w1);
  bone.parent.getWorldQuaternion(_w3).invert(); bone.quaternion.copy(_w3.multiply(_w2)); bone.updateMatrixWorld(true);
}
function twoBoneIK(U, F, H, target, pole) {
  const s = U.getWorldPosition(V3()), e = F.getWorldPosition(V3()), h = H.getWorldPosition(V3());
  const l1 = s.distanceTo(e), l2 = e.distanceTo(h), dv = target.clone().sub(s); let d = dv.length();
  d = clamp(d, Math.abs(l1 - l2) + .01, l1 + l2 - .005); const u = dv.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pp = pole.clone().sub(s); pp.addScaledVector(u, -pp.dot(u)); if (pp.lengthSq() < 1e-8) pp.set(0, -1, 0); pp.normalize();
  const elbow = s.clone().addScaledVector(u, a).addScaledVector(pp, hh);
  aimBone(U, e, elbow);
  const e2 = F.getWorldPosition(V3()), h2 = H.getWorldPosition(V3()); aimBone(F, h2, s.clone().addScaledVector(u, d));
}

export { twoBoneIK };
