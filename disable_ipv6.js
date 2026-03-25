// disable_ipv6.js
// Questo script disabilita IPv6 sulla tua zona Cloudflare per forzare l'uso di IPv4.

// 1. INSERISCI QUI I TUOI DATI
const ZONE_ID = "";
const API_TOKEN = "";

// 2. CODICE DELLO SCRIPT
async function disableIPv6() {
    if (ZONE_ID.includes("INSERISCI") || API_TOKEN.includes("INSERISCI")) {
        console.error("ERRORE: Devi aprire questo file e inserire il tuo Zone ID e API Token nelle prime righe!");
        return;
    }

    const url = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/ipv6`;

    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ value: "off" })
        });

        const data = await response.json();

        if (data.success) {
            console.log("\nSUCCESS! IPv6 è stato disabilitato.");
            console.log("Ora i visitatori useranno IPv4 e il tuo worker vedrà il loro vero IP.");
        } else {
            console.error("\nERRORE API:", data.errors);
        }
    } catch (error) {
        console.error("\nERRORE DI CONNESSIONE:", error.message);
    }
}

disableIPv6();
