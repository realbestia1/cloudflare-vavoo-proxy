# Vavoo.js su Cloudflare

Worker Cloudflare per:

- estrarre link `vavoo.to` e restituire un redirect `302` verso lo stream finale;
- fare da proxy a playlist `M3U` e riscrivere automaticamente i link Vavoo;
- mostrare una pagina info e uno stato JSON per debug.

Questo progetto e' pensato per essere pubblicato su **Cloudflare Workers**.  
Se vuoi gestire bene il problema IPv6, e' consigliato usare **un dominio personalizzato** invece del solo `workers.dev`.

## File del progetto

- `vavoo.js`: Worker principale.
- `disable_ipv6.js`: script API Cloudflare per provare a spegnere IPv6 sulla zona.
- `GUIDA_TOKEN.txt`: note rapide per creare il token API.

## Endpoint disponibili

Dopo il deploy avrai questi endpoint:

- `/`
  Pagina info del worker.
- `/status`
  Stato del worker e IP rilevato.
- `/manifest.m3u8?url=https://vavoo.to/...`
  Estrae lo stream e restituisce `302`.
- `/proxy/hls/manifest.m3u8?d=https://vavoo.to/...`
  Alias compatibile con il parametro `d`.
- `/playlist?url=https://esempio1.m3u;https://esempio2.m3u`
  Unisce piu' playlist e riscrive i canali Vavoo.

## Come pubblicarlo su Cloudflare

### Metodo rapido dal sito Cloudflare

1. Vai su `Cloudflare Dashboard`.
2. Apri `Workers & Pages`.
3. Clicca `Create application`.
4. Scegli `Create Worker`.
5. Dai un nome al worker.
6. Apri l'editor del worker.
7. Sostituisci tutto il contenuto con il codice di `vavoo.js`.
8. Clicca `Deploy`.

Subito dopo avrai un URL del tipo:

```text
https://nome-worker.tuosubdomain.workers.dev
```

Questo va bene per test veloci, ma **non e' la soluzione migliore per il problema IPv6**.

## Come collegarlo a un dominio personalizzato

Per far funzionare bene la parte IPv4/IPv6 conviene pubblicare il worker su un hostname tuo, per esempio:

```text
https://vavoo.tuodominio.com
```

### Requisiti

- il dominio deve essere gia' gestito da Cloudflare come **zona attiva**;
- il worker deve essere gia' deployato.

### Passaggi

1. Vai in `Workers & Pages`.
2. Apri il tuo worker.
3. Vai in `Settings`.
4. Apri `Domains & Routes`.
5. Clicca `Add`.
6. Scegli `Custom Domain`.
7. Inserisci un hostname, ad esempio `vavoo.tuodominio.com`.
8. Conferma con `Add Custom Domain`.

Cloudflare crea in automatico il record DNS e il certificato.

## Dominio gratis da DigitalPlat

Se non hai un dominio tuo, puoi prima crearne uno gratis da:

```text
https://domain.digitalplat.org/
```

L'idea e' questa:

1. registri un dominio free su DigitalPlat;
2. colleghi quel dominio a Cloudflare;
3. gestisci il dominio da Cloudflare come zona attiva;
4. usi quel dominio per creare un **custom domain** del Worker.

Questo passaggio e' importante perche' il solo URL `workers.dev` va bene per test, ma non ti da lo stesso controllo di una zona Cloudflare tua.

In pratica il dominio free serve per:

- avere un dominio personalizzato tipo `vavoo.tuodominio.com`;
- collegare il Worker a un hostname tuo;
- gestire meglio il traffico IPv6 da Cloudflare;
- poter disabilitare IPv6 sulla zona, se disponibile, oppure bloccarlo con regole Cloudflare.

Quindi il flusso corretto e':

```text
DigitalPlat -> Cloudflare -> Custom Domain del Worker
```

Senza un dominio personalizzato, la gestione IPv6 e' molto piu' limitata.

## Perche' il dominio personalizzato e' importante

Il codice del worker rifiuta le richieste dove l'IP client risulta IPv6:

```js
if (clientIP && clientIP.includes(':')) {
  return new Response('IPv6 connections are not allowed for this service.', { status: 403, headers: CORS_HEADERS });
}
```

Con `workers.dev` non controlli una tua zona DNS completa.  
Con un **dominio personalizzato**, invece, puoi applicare le impostazioni della tua zona Cloudflare, come:

- gestione IPv6 lato zona;
- regole WAF;
- eventuali regole per bloccare traffico IPv6.

In pratica:

- `workers.dev`: utile per test;
- `custom domain`: consigliato per uso reale.

## Come disabilitare IPv6 su Cloudflare

### Punto importante

Secondo la documentazione ufficiale Cloudflare, la voce **IPv6 Compatibility** e' una funzione di zona e la disattivazione completa e' disponibile solo in certi casi di piano/account.  
Inoltre, anche quando IPv6 e' disattivato, Cloudflare segnala che puo' comunque arrivare traffico IPv6 in casi particolari; per bloccarlo del tutto suggerisce anche regole WAF.

Quindi la guida pratica e':

### Opzione 1: spegnere IPv6 Compatibility dalla dashboard

Se il tuo piano/zona lo permette:

1. Apri il dominio in Cloudflare.
2. Vai su `Network`.
3. Cerca `IPv6 Compatibility`.
4. Disattivala.

### Opzione 2: usare lo script API `disable_ipv6.js`

Lo script fa una chiamata API a:

```text
PATCH /zones/{zone_id}/settings/ipv6
```

con:

```json
{ "value": "off" }
```

### Come usarlo

1. Recupera il tuo `Zone ID` da Cloudflare.
2. Crea un API Token con permesso:
   `Zone` -> `Zone Settings` -> `Edit`
3. Inserisci `ZONE_ID` e `API_TOKEN` dentro `disable_ipv6.js`.
4. Esegui lo script con Node.js:

```bash
node disable_ipv6.js
```

Se l'account o il piano non consentono la modifica, Cloudflare restituira' un errore API.

## Se non puoi disabilitare IPv6 globalmente

Su molte configurazioni Cloudflare la soluzione piu' pratica e' usare un **dominio personalizzato** e bloccare il traffico IPv6 con una regola WAF.

Idea base della regola:

```text
ip.src in {::/0}
```

Se vuoi evitare di bloccare subrequest generate da Workers, Cloudflare suggerisce di aggiungere:

```text
and cf.worker.upstream_zone == ""
```

Questa strada ha senso solo sul tuo hostname Cloudflare, non sul semplice URL `workers.dev`.

## Test veloci

### Status

```text
https://vavoo.tuodominio.com/status
```

Controlla in JSON:

- `client_info.ip`
- `client_info.is_ipv6`

### Stream Vavoo

```text
https://vavoo.tuodominio.com/manifest.m3u8?url=https%3A%2F%2Fvavoo.to%2F...
```

Se tutto va bene, il worker risponde con un redirect `302`.

### Playlist

```text
https://vavoo.tuodominio.com/playlist?url=https://site1.com/list.m3u;https://site2.com/list.m3u
```

## Note utili

- Il worker accetta anche il parametro `ip` nella query string per forzare l'IP client quando la richiesta arriva da un backend/proxy che conosce gia' l'IP reale.
- Il worker risponde con `403` se l'IP rilevato e' IPv6.
- Per uso stabile, meglio hostname dedicato tipo `vavoo.tuodominio.com`.
- Non pubblicare su GitHub token o credenziali Cloudflare reali.

## Fonti ufficiali Cloudflare

- Custom Domains per Workers: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Routes e `workers.dev`: https://developers.cloudflare.com/workers/configuration/routing/
- IPv6 Compatibility: https://developers.cloudflare.com/network/ipv6-compatibility/
- API zona `settings/ipv6`: https://developers.cloudflare.com/api/resources/zones/subresources/settings/models/ipv6/
