// Aviso si el npm que instala no aplica min-release-age (H9). Esa opción
// del `.npmrc` del proyecto existe desde npm 11.10.0 y rechaza instalar una
// versión publicada hace menos de tres días: la ventana donde se suelen
// colar los ataques a la cadena de suministro (Shai-Hulud, chalk, axios...).
// Un npm más viejo la ignora en silencio -- no falla, no avisa -- así que
// scripts/npm-deps.mjs añade este aviso aparte, solo cuando el paso de
// preparación instala algo (si no, saldría en cada arranque aunque no
// faltase nada).
//
// Funciones puras: reciben la cadena de user-agent, nunca leen el entorno
// ni ejecutan `npm --version` (más lento en cada arranque, ver H5).

const MIN_VERSION = [11, 10, 0];

// La versión de npm en `npm_config_user_agent`
// («npm/10.9.0 node/v22.12.0 linux x64 workspaces/false», que npm pone en
// el entorno de sus scripts), o null si quien instala no es npm (pnpm,
// yarn) o falta la variable (el script se ejecutó directamente con node).
export function npmVersionFromUserAgent(userAgent) {
  const match = /^npm\/(\d+)\.(\d+)\.(\d+)/.exec(userAgent ?? "");
  return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

// true si `version` («x.y.z») ya aplica min-release-age (>= 11.10.0).
// Numérico por componente, nunca como texto: como cadenas, "9.9.0" >
// "11.10.0" (compara el carácter "9" con "1").
export function supportsMinReleaseAge(version) {
  const parts = version.split(".").map(Number);
  for (let i = 0; i < MIN_VERSION.length; i++) {
    if (parts[i] !== MIN_VERSION[i]) return parts[i] > MIN_VERSION[i];
  }
  return true; // igual a MIN_VERSION: ya la aplica
}

// La línea de aviso para el `npm_config_user_agent` recibido, o null si no
// hace falta: no es npm, falta la variable, o su versión ya aplica
// min-release-age.
export function npmMinReleaseAgeNotice(userAgent) {
  const version = npmVersionFromUserAgent(userAgent);
  if (!version || supportsMinReleaseAge(version)) return null;
  return `Tu npm (${version}) no aplica el retardo de seguridad (min-release-age): actualízalo con \`npm install -g npm@11\`.`;
}
