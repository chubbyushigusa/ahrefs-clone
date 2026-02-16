import type { DnsInfo } from "@/types";

export async function getDnsInfo(domain: string): Promise<DnsInfo | null> {
  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`
    );
    const data = await response.json();

    const a: string[] = [];
    const aaaa: string[] = [];
    const mx: { exchange: string; priority: number }[] = [];
    const ns: string[] = [];
    const txt: string[] = [];
    const cname: string[] = [];

    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.type === 1) a.push(answer.data);
        if (answer.type === 28) aaaa.push(answer.data);
        if (answer.type === 5) cname.push(answer.data);
      }
    }

    // Fetch MX records
    try {
      const mxRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
      const mxData = await mxRes.json();
      if (mxData.Answer) {
        for (const answer of mxData.Answer) {
          if (answer.type === 15) {
            const parts = answer.data.split(" ");
            mx.push({ priority: parseInt(parts[0]), exchange: parts[1] });
          }
        }
      }
    } catch {}

    // Fetch NS records
    try {
      const nsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`);
      const nsData = await nsRes.json();
      if (nsData.Answer) {
        for (const answer of nsData.Answer) {
          if (answer.type === 2) ns.push(answer.data);
        }
      }
    } catch {}

    // Fetch TXT records
    try {
      const txtRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`);
      const txtData = await txtRes.json();
      if (txtData.Answer) {
        for (const answer of txtData.Answer) {
          if (answer.type === 16) txt.push(answer.data.replace(/"/g, ""));
        }
      }
    } catch {}

    return { a, aaaa, mx, ns, txt, cname };
  } catch {
    return null;
  }
}
