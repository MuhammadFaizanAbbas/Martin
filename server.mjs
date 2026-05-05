import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT_DIR = process.cwd();
const API_ENTRY = path.join(ROOT_DIR, "api", "index.js");
const PORT = Number(process.env.PORT || 3001);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

async function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    const content = await fs.readFile(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!key || process.env[key] != null) continue;
      process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Failed to read .env:", error.message);
    }
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function createResponseAdapter(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.hasHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(payload));
      return this;
    },
    end(payload = "") {
      res.end(payload);
      return this;
    },
  };
}

async function parseRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return undefined;

  const raw = Buffer.concat(chunks).toString("utf8");
  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }

  return raw;
}

async function handleApiRequest(req, res, url) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    await fs.access(API_ENTRY);
  } catch {
    res.statusCode = 404;
    res.end("API route not found");
    return;
  }

  try {
    const mod = await import(`${pathToFileURL(API_ENTRY).href}?t=${Date.now()}`);
    const handler = mod.default;

    if (typeof handler !== "function") {
      res.statusCode = 500;
      res.end("Invalid API handler");
      return;
    }

    const reqBody = await parseRequestBody(req);
    const reqAdapter = {
      method: req.method,
      headers: req.headers,
      url: req.url,
      query: Object.fromEntries(url.searchParams.entries()),
      body: reqBody,
    };
    const resAdapter = createResponseAdapter(res);

    await handler(reqAdapter, resAdapter);

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        status: "error",
        message: error.message,
      }),
    );
  }
}

async function handleStaticRequest(res, url) {
  const relativePath =
    url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT_DIR, relativePath);

  if (!filePath.startsWith(ROOT_DIR + path.sep) && filePath !== path.join(ROOT_DIR, "index.html")) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      const content = await fs.readFile(indexPath);
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME_TYPES[".html"]);
      res.end(content);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}

await loadEnvFile();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApiRequest(req, res, url);
    return;
  }

  await handleStaticRequest(res, url);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local dev server running at http://127.0.0.1:${PORT}`);
});
