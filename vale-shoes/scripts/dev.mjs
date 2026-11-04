// Runs the API server and the Vite dev server together: `npm run dev`
import { spawn } from "node:child_process";
const run = (name, args, color) => {
  const p = spawn("npm", args, { stdio: ["inherit", "pipe", "pipe"], shell: process.platform === "win32" });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (s) => s.on("data", (d) => process.stdout.write(d.toString().split("\n").filter(Boolean).map((l) => tag + l).join("\n") + "\n"));
  pipe(p.stdout);
  pipe(p.stderr);
  p.on("exit", (code) => {
    console.log(`${tag}exited (${code})`);
    process.exit(code ?? 0);
  });
  return p;
};
const procs = [run("api", ["run", "dev", "--prefix", "server"], 33), run("web", ["run", "dev", "--prefix", "client"], 36)];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
