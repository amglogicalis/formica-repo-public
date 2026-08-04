<p align="center">
  <img src="https://raw.githubusercontent.com/amglogicalis/formica-repo-public/main/assets/logo_formica.png" alt="Formica Logo" width="220" />
</p>

# 🐜 FORMICA — The Formic Mesh: Event Mesh, K/V Cache & Universal Purging

<p align="center">
  <b>Terra Ecosystem • Distributed Event Mesh, K/V Store, WAF Guard & Modular Garbage Collector at $0 Server Cost</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/terra-formica"><img src="https://img.shields.io/badge/npm-terra--formica-10b981.svg?style=for-the-badge&logo=npm" alt="NPM Package" /></a>
  <a href="https://amglogicalis.github.io/formica-repo-public/"><img src="https://img.shields.io/badge/Queen%20Studio-ONLINE-10b981.svg?style=for-the-badge&logo=githubpages" alt="Live Console" /></a>
  <a href="https://github.com/amglogicalis/formica-repo-public"><img src="https://img.shields.io/badge/Server%20Cost-%240%20Forever-f59e0b.svg?style=for-the-badge" alt="Zero Server Cost" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" /></a>
</p>

---

## 💡 ¿Qué es FORMICA?

**FORMICA (The Formic Mesh)** es la plataforma distribuida de conectividad, almacenamiento de estado en caché, observabilidad y purgado efímero universal del **Ecosistema Terra**.

Inspirada en la organización autónoma de las colonias de hormigas, Formica actúa como el **sistema nervioso central** para aplicaciones en la nube y microservicios, operando con **$0 de coste en servidores** y **cero dependencias cautivas**.

---

## 🏛️ Los 6 Módulos de Formica

1. **👑 Queen (Plano de Control & Dashboard)**: Consola Web interactiva 24/7 y mapa de topología en vivo.
2. **🧪 Pheromones (Event Mesh & Pub/Sub)**: Bus de mensajes asíncronos por tópicos con reintentos y colas DLQ.
3. **🕳️ Chambers (Distributed K/V Store & Cache)**: Almacén de estado ultrarrápido en Git/RAM con expiración TTL y tags.
4. **🍃 Foragers (Telemetría & Log Aggregator)**: Ingesta de registros de auditoría y Correlation IDs.
5. **🛡️ Soldiers (WAF Guard & Security Gateway)**: Rate limiting, filtro de IPs y validación de firmas HMAC.
6. **🌾 Legionarys (Universal Purge Engine)**: **Motor de purga modular universal**: Simulación previa (*Dry-Run*) y ejecución de limpieza con adaptadores pluggable para **Sinchlor**, **Rolla**, **Ballom**, **Lumina**, **Termes**, **Combase** y proveedores personalizados.

---

## 🌐 Consola Web Online & Local (Queen Studio)

Accede a la consola interactiva directamente desde la web o ejecútala offline:

👉 **[ACCEDER A LA CONSOLA WEB ONLINE DE FORMICA](https://amglogicalis.github.io/formica-repo-public/)**

<p align="center">
  <img src="https://raw.githubusercontent.com/amglogicalis/formica-repo-public/main/assets/preview_consola_web.PNG" alt="Formica Queen Studio Web Console Preview" width="100%" />
</p>

---

## 📦 Instalación Global e Instrucciones CLI

Para usar Formica desde la terminal o importar su SDK en TypeScript/Node.js, instala el paquete oficial de NPM:

```bash
npm install -g terra-formica
```

### Comandos de la CLI Global:

| Comando | Descripción |
| :--- | :--- |
| `formica studio --port 3740` | Lanza el servidor estático local de Formica Queen Studio en `http://localhost:3740`. |
| `formica pub --topic <t> --message <m>` | Publica un evento Pub/Sub en el tópico especificado. |
| `formica sub --topic <t> --name <subscriber>` | Crea una suscripción activa a un tópico. |
| `formica kv set --key <k> --value <v> --ttl 3600` | Guarda una entrada K/V en Chambers con tiempo de vida (TTL). |
| `formica kv get --key <k>` | Consulta el valor de una clave K/V en Chambers. |
| `formica kv list` | Lista todas las entradas K/V almacenadas. |
| `formica purge dry-run` | **Simulador Dry-Run de Purga**: Muestra los elementos expirados liberables sin borrarlos. |
| `formica purge execute` | **Ejecutor de Purga**: Elimina de forma limpia todos los datos expirados. |

---

## 💻 Ejemplo de Uso del SDK en TypeScript / Node.js

```typescript
import { Formica } from 'terra-formica';

const formica = new Formica({
  githubToken: process.env.GITHUB_TOKEN,
  vaultId: 'default-colony'
});

await formica.init();

// 🧪 1. Publicar evento Pub/Sub (Pheromones)
await formica.publishEvent('user.signup', 'Lumina-IAM', { userId: 'usr_9981', email: 'user@terra.org' });

// 🕳️ 2. Guardar en K/V Chambers con TTL de 1 hora
await formica.setK/V('session_token_123', 'authenticated', 'auth-namespace', ['session'], 3600);

// 🌾 3. Ejecutar simulación Dry-Run de Purga Universal
const report = await formica.runPurgeDryRun();
console.log(`Elementos expirados encontrados: ${report.totalItemsPurged}, Bytes a liberar: ${report.bytesSaved}`);

// 🌾 4. Ejecutar Purga Real
await formica.executePurge(report);
```

---

<p align="center">
  <sub>Desarrollado bajo la filosofía Terra • Infraestructura Efímera de Coste $0</sub>
</p>
