import { createServer } from "node:http";

// Armazenamento descartável em memória, exclusivo da rede de integração.
const arquivos = new Map();
createServer(async (req, res) => {
  if (req.url === "/health") { res.end("ok"); return; }
  if (req.method === "PUT") {
    const partes = [];
    for await (const parte of req) partes.push(parte);
    arquivos.set(req.url, Buffer.concat(partes));
    res.writeHead(201).end();
    return;
  }
  if (req.method === "GET" && arquivos.has(req.url)) {
    res.end(arquivos.get(req.url));
    return;
  }
  res.writeHead(404).end();
}).listen(9000, "0.0.0.0");
