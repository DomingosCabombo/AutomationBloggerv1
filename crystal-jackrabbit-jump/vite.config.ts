import { defineConfig, Plugin } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { startAndSyncTunnel } from "./tunnel-manager";
import { IncomingMessage, ServerResponse } from "http";

function tunnelPlugin(): Plugin {
  return {
    name: "tunnel-manager",
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.url === "/api/start-tunnel" && req.method === "POST") {
            console.log("[TunnelPlugin] Recebido pedido para gerar túnel...");
            try {
              const url = await startAndSyncTunnel();
              console.log("[TunnelPlugin] Túnel gerado:", url);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, url }));
            } catch (error: any) {
              console.error("[TunnelPlugin] ERRO:", error.message);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: false,
                  error: error.message || "Erro desconhecido",
                })
              );
            }
            return;
          }
          next();
        }
      );
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [tunnelPlugin(), dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
