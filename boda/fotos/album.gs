/**
 * Álbum de la boda de Caleb & Anyi
 *
 * Recibe las fotos que suben los invitados desde https://calebbarrios99.github.io/boda/fotos/
 * y las guarda en una carpeta privada de tu Google Drive (solo tú la ves).
 * Cada archivo queda con el nombre de quien la subió y la hora, por ejemplo:
 *   "Ana Pérez · 21.34.05 · IMG_1234.jpg"
 *
 * CÓMO ACTIVARLO (una sola vez, mejor desde un computador)
 * 1. Entra a https://script.google.com con tu cuenta de Google y toca "Proyecto nuevo".
 * 2. Borra lo que trae el editor, pega TODO este archivo y guarda (ícono del disquete).
 *    Si quieres, ponle de nombre "Álbum boda".
 * 3. Arriba, en la lista de funciones, elige "configurar" y toca "Ejecutar".
 *    Google pedirá permisos: "Revisar permisos" → tu cuenta → "Configuración avanzada"
 *    → "Ir a Álbum boda (no seguro)" → "Permitir".
 *    (El aviso sale porque el script es tuyo y Google no lo ha revisado; es normal.)
 *    En el registro de ejecución aparecerá el enlace a la carpeta "Fotos boda Caleb & Anyi".
 * 4. Toca "Implementar" → "Nueva implementación" → en el engranaje elige "Aplicación web".
 *      Ejecutar como: Yo
 *      Quién tiene acceso: Cualquier usuario
 *    y toca "Implementar".
 * 5. Copia la "URL de la aplicación web" (termina en /exec) y pégala en SCRIPT_URL,
 *    al inicio del <script> de boda/fotos/index.html.
 *
 * Si después cambias este código, publica los cambios con "Implementar" → "Administrar implementaciones"
 * → lápiz → Versión: "Nueva versión". Así la URL sigue siendo la misma.
 */

const CARPETA = 'Fotos boda Caleb & Anyi';
const ZONA = 'America/Bogota';
const MAX_BYTES = 40 * 1024 * 1024;   // ninguna foto debería pasar de esto

// Ejecútala una vez desde el editor: crea la carpeta y te muestra su enlace.
function configurar() {
  const carpeta = carpetaAlbum_();
  Logger.log('Listo. Las fotos llegarán a: ' + carpeta.getUrl());
}

// Cada foto llega como texto JSON: { nombre, archivo, tipo, datos (base64) }.
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const tipo = String(d.tipo || '').toLowerCase();
    if (!/^image\/[a-z0-9.+-]+$/.test(tipo)) return responder_({ ok: false, error: 'solo-fotos' });

    const bytes = Utilities.base64Decode(String(d.datos || ''));
    if (!bytes.length || bytes.length > MAX_BYTES) return responder_({ ok: false, error: 'tamano' });

    const quien = limpiar_(d.nombre, 60) || 'Invitado';
    const original = limpiar_(d.archivo, 80) || 'foto.jpg';
    const ahora = new Date();
    const hora = Utilities.formatDate(ahora, ZONA, 'HH.mm.ss');

    const archivo = carpetaAlbum_().createFile(Utilities.newBlob(bytes, tipo, quien + ' · ' + hora + ' · ' + original));
    archivo.setDescription('Subida por ' + quien + ' el ' + Utilities.formatDate(ahora, ZONA, 'dd/MM/yyyy HH:mm'));
    return responder_({ ok: true });
  } catch (err) {
    console.error(err);
    return responder_({ ok: false, error: 'servidor' });
  }
}

// Al abrir la URL en el navegador solo confirma que está funcionando.
function doGet() {
  return responder_({ ok: true, album: 'Caleb & Anyi' });
}

// La carpeta se crea una sola vez y se recuerda su id (aunque la muevas o le cambies el nombre).
function carpetaAlbum_() {
  const props = PropertiesService.getScriptProperties();
  const usar = id => {
    if (!id) return null;
    try { const f = DriveApp.getFolderById(id); return f.isTrashed() ? null : f; } catch (e) { return null; }
  };
  const lista = usar(props.getProperty('CARPETA_ID'));
  if (lista) return lista;

  const candado = LockService.getScriptLock();
  candado.waitLock(20000);   // evita que dos fotos simultáneas creen dos carpetas
  try {
    const otra = usar(props.getProperty('CARPETA_ID'));
    if (otra) return otra;
    const nueva = DriveApp.createFolder(CARPETA);
    props.setProperty('CARPETA_ID', nueva.getId());
    return nueva;
  } finally {
    candado.releaseLock();
  }
}

function limpiar_(texto, max) {
  return String(texto || '').replace(/[\u0000-\u001f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
