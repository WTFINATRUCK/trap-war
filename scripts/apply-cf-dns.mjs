const ZONE_ID = "8e380c446ee65e5edb008b12b2cce276";
const TARGET = "1dbe9f448e0e942a.vercel-dns-017.com";
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) { console.error("Set CLOUDFLARE_API_TOKEN"); process.exit(1); }
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function api(path, opts={}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  return r.json();
}
const list = await api(`/zones/${ZONE_ID}/dns_records?per_page=100`);
if (!list.success) { console.error(list); process.exit(1); }
console.log("Records:", list.result.map(r => `${r.type} ${r.name} -> ${r.content}`).join("\n"));
for (const r of list.result) {
  if ((r.name === "trap-war.com" || r.name === "www.trap-war.com") && ["A","AAAA","CNAME"].includes(r.type)) {
    const d = await api(`/zones/${ZONE_ID}/dns_records/${r.id}`, { method: "DELETE" });
    console.log("Deleted", r.type, r.name, d.success);
  }
}
for (const name of ["@", "www"]) {
  const c = await api(`/zones/${ZONE_ID}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type: "CNAME", name, content: TARGET, proxied: false, ttl: 1 }),
  });
  console.log("Create", name, c.success, c.errors || c.result?.content);
}
