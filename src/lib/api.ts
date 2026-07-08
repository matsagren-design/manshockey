export async function api<T>(path:string, fallback:T):Promise<T>{try{const r=await fetch(path); if(!r.ok) return fallback; return await r.json()}catch{return fallback}}
