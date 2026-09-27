# Relatório de Segurança — DomingosCabombo/AutomationBloggerv1

**Scan:** `cmuj91x2802y17xtmwwbwv5xp` · MANUAL · branch `main` · commit `783e5c1f737a`
**Status:** COMPLETED · **Executado em:** 2026-09-27T03:30:33.821Z · **Concluído em:** 2026-09-27T03:42:00.102Z
**Relatório gerado em:** 2026-09-27T03:45:21.329Z por GitGuard

## Instruções para a IA que for corrigir isto

- Repositório alvo: DomingosCabombo/AutomationBloggerv1, branch "main", commit 783e5c1f737a736399f652186c89783ad6348574. Aplique as correções diretamente nesse checkout.
- Em "dependencyUpgrades", cada entrada agrupa TODOS os CVEs de um mesmo pacote — faça UM upgrade por pacote (para "recommendedVersion" ou mais recente), não uma correção por CVE.
- Em "secrets", nunca tente adivinhar ou reconstruir o valor original do segredo (ele foi propositalmente redigido) — apenas remova/rotacione conforme "remediation".
- Depois de aplicar as correções, rode os testes existentes do projeto e, se disponível, o linter/build antes de considerar concluído.

## Resumo

- **Total de findings:** 143
- **Por severidade:** HIGH: 64 · MEDIUM: 70 · LOW: 9
- **Por scanner:** SEMGREP: 17 · TRIVY: 121 · GITLEAKS: 5

## Dependências para atualizar

### 📦 `axios` (56 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `1.14.0` para `1.18.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-44487 | axios: Axios: Information disclosure of proxy credentials via redirect flows | 1.16.0, 0.32.0 |
| HIGH | CVE-2026-44488 | axios: Axios: Denial of Service due to unenforced request and response size limits | 1.16.0 |
| HIGH | CVE-2026-44494 | axios: Axios: Man-in-the-Middle (MITM) attack via Prototype Pollution | 1.16.0 |
| HIGH | CVE-2026-44495 | axios: Axios: Information disclosure due to prototype pollution vulnerability | 1.15.2, 0.31.1 |
| HIGH | CVE-2026-44496 | axios: Axios: Client-side Denial of Service via unescaped regex metacharacters in XSRF cookie name | 1.16.0, 0.32.0 |
| HIGH | CVE-2026-42033 | axios: Axios: HTTP Transport Hijacking via Prototype Pollution | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42035 | axios: Axios: Arbitrary HTTP header injection via prototype pollution | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42043 | axios: Axios: NO_PROXY bypass via crafted URL | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42264 | axios: Axios: Prototype pollution allows information disclosure and request manipulation | 1.15.2 |
| HIGH | CVE-2026-44486 | axios: Axios: Information disclosure of proxy credentials via HTTP redirects | 1.16.0, 0.32.0 |
| HIGH | CVE-2026-44487 | axios: Axios: Information disclosure of proxy credentials via redirect flows | 1.16.0, 0.32.0 |
| HIGH | CVE-2026-44488 | axios: Axios: Denial of Service due to unenforced request and response size limits | 1.16.0 |
| HIGH | CVE-2026-44494 | axios: Axios: Man-in-the-Middle (MITM) attack via Prototype Pollution | 1.16.0 |
| HIGH | CVE-2026-44495 | axios: Axios: Information disclosure due to prototype pollution vulnerability | 1.15.2, 0.31.1 |
| HIGH | CVE-2026-44496 | axios: Axios: Client-side Denial of Service via unescaped regex metacharacters in XSRF cookie name | 1.16.0, 0.32.0 |
| HIGH | CVE-2026-42033 | axios: Axios: HTTP Transport Hijacking via Prototype Pollution | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42035 | axios: Axios: Arbitrary HTTP header injection via prototype pollution | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42043 | axios: Axios: NO_PROXY bypass via crafted URL | 1.15.1, 0.31.1 |
| HIGH | CVE-2026-42264 | axios: Axios: Prototype pollution allows information disclosure and request manipulation | 1.15.2 |
| HIGH | CVE-2026-44486 | axios: Axios: Information disclosure of proxy credentials via HTTP redirects | 1.16.0, 0.32.0 |
| MEDIUM | CVE-2026-67316 | axios: axios: Prototype Pollution allows unauthorized data transmission and network redirection | 1.18.0, 0.33.0 |
| MEDIUM | CVE-2026-67317 | axios: axios: Denial of Service via maxBodyLength bypass with ReadableStream | 1.18.0 |
| MEDIUM | CVE-2026-67318 | axios: axios: Denial of Service due to maxBodyLength bypass in HTTP/2 requests | 1.18.0 |
| MEDIUM | CVE-2026-67319 | axios: axios: Information disclosure and data manipulation via prototype pollution | 0.33.0, 1.18.0 |
| MEDIUM | CVE-2025-62718 | axios: Axios: Server-Side Request Forgery and proxy bypass due to improper hostname normalization | 1.15.0, 0.31.0 |
| MEDIUM | CVE-2026-40175 | axios: Axios: Remote Code Execution via Prototype Pollution escalation | 1.15.0, 0.31.0 |
| MEDIUM | CVE-2026-42034 | axios: Axios: Denial of Service via oversized streamed uploads bypassing body limits | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42036 | axios: Axios: Denial of Service via unbounded stream consumption when 'responseType: 'stream'' is used | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42037 | axios: Node.js: Axios: Information disclosure via CRLF injection in multipart Content-Type header | 1.15.1 |
| MEDIUM | CVE-2026-42038 | axios: Axios: Information disclosure due to `no_proxy` bypass | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42039 | axios: Node.js: Axios: Denial of Service via unbounded recursion in toFormData with deeply nested request data | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42041 | axios: Axios: Authentication bypass due to prototype pollution of HTTP error handling | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42042 | axios: Axios: XSRF token bypass leading to information disclosure | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42044 | axios: Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget | 1.15.2 |
| MEDIUM | CVE-2026-44490 | axios: Axios: Information disclosure and denial of service due to prototype pollution | 1.16.0, 0.32.0 |
| MEDIUM | CVE-2026-67312 | axios: axios: Denial of Service via uncontrolled recursion in form data processing | 0.33.0, 1.18.0 |
| MEDIUM | CVE-2026-67313 | axios versions 0.28.0 and later contain uncontrolled recursion in form ... | 0.33.0, 1.18.0 |
| MEDIUM | CVE-2026-67316 | axios: axios: Prototype Pollution allows unauthorized data transmission and network redirection | 1.18.0, 0.33.0 |
| MEDIUM | CVE-2026-67317 | axios: axios: Denial of Service via maxBodyLength bypass with ReadableStream | 1.18.0 |
| MEDIUM | CVE-2026-67318 | axios: axios: Denial of Service due to maxBodyLength bypass in HTTP/2 requests | 1.18.0 |
| MEDIUM | CVE-2026-67319 | axios: axios: Information disclosure and data manipulation via prototype pollution | 0.33.0, 1.18.0 |
| MEDIUM | CVE-2026-40175 | axios: Axios: Remote Code Execution via Prototype Pollution escalation | 1.15.0, 0.31.0 |
| MEDIUM | CVE-2026-42034 | axios: Axios: Denial of Service via oversized streamed uploads bypassing body limits | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42036 | axios: Axios: Denial of Service via unbounded stream consumption when 'responseType: 'stream'' is used | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2025-62718 | axios: Axios: Server-Side Request Forgery and proxy bypass due to improper hostname normalization | 1.15.0, 0.31.0 |
| MEDIUM | CVE-2026-42037 | axios: Node.js: Axios: Information disclosure via CRLF injection in multipart Content-Type header | 1.15.1 |
| MEDIUM | CVE-2026-42038 | axios: Axios: Information disclosure due to `no_proxy` bypass | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42039 | axios: Node.js: Axios: Denial of Service via unbounded recursion in toFormData with deeply nested request data | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42041 | axios: Axios: Authentication bypass due to prototype pollution of HTTP error handling | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42042 | axios: Axios: XSRF token bypass leading to information disclosure | 1.15.1, 0.31.1 |
| MEDIUM | CVE-2026-42044 | axios: Axios: Invisible JSON Response Tampering via Prototype Pollution Gadget | 1.15.2 |
| MEDIUM | CVE-2026-44490 | axios: Axios: Information disclosure and denial of service due to prototype pollution | 1.16.0, 0.32.0 |
| MEDIUM | CVE-2026-67312 | axios: axios: Denial of Service via uncontrolled recursion in form data processing | 0.33.0, 1.18.0 |
| MEDIUM | CVE-2026-67313 | axios versions 0.28.0 and later contain uncontrolled recursion in form ... | 0.33.0, 1.18.0 |
| LOW | CVE-2026-42040 | axios: Axios: Incorrect null byte handling can lead to data integrity issues | 1.15.1, 0.31.1 |
| LOW | CVE-2026-42040 | axios: Axios: Incorrect null byte handling can lead to data integrity issues | 1.15.1, 0.31.1 |

### 📦 `brace-expansion` (5 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `2.0.1` para `5.0.8, 3.0.3, 2.1.3, 1.1.17` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-13149 | brace-expansion: Brace-expansion: Denial of Service due to exponential-time complexity | 5.0.7, 1.1.16, 2.1.2 |
| HIGH | CVE-2026-14257 | brace-expansion: Brace-expansion: Denial of Service via memory exhaustion in expand() function | 5.0.8, 3.0.3, 2.1.3, 1.1.17 |
| HIGH | CVE-2026-69152 | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation | 1.1.18, 2.1.4, 3.0.6, 5.0.9 |
| MEDIUM | CVE-2026-33750 | brace-expansion: brace-expansion: Denial of Service via zero step value in brace pattern | 5.0.5, 3.0.2, 2.0.3, 1.1.13 |
| LOW | CVE-2025-5889 | brace-expansion: juliangruber brace-expansion index.js expand redos | 2.0.2, 1.1.12, 3.0.1, 4.0.1 |

### 📦 `form-data` (2 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `4.0.5` para `2.5.6, 3.0.5, 4.0.6` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-12143 | form-data: form-data: Form field override via CRLF injection | 2.5.6, 3.0.5, 4.0.6 |
| HIGH | CVE-2026-12143 | form-data: form-data: Form field override via CRLF injection | 2.5.6, 3.0.5, 4.0.6 |

### 📦 `glob` (1 CVE) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `10.4.5` para `11.1.0, 10.5.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2025-64756 | glob: glob: Command Injection Vulnerability via Malicious Filenames | 11.1.0, 10.5.0 |

### 📦 `lodash` (3 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `4.17.21` para `4.18.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-4800 | lodash: lodash: Arbitrary code execution via untrusted input in template imports | 4.18.0 |
| MEDIUM | CVE-2025-13465 | lodash: prototype pollution in _.unset and _.omit functions | 4.17.23 |
| MEDIUM | CVE-2026-2950 | lodash: Lodash: Prototype pollution allows deletion of built-in prototype properties via array path bypass | 4.18.0 |

### 📦 `minimatch` (3 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `9.0.5` para `10.2.3, 9.0.7, 8.0.6, 7.4.8, 6.2.2, 5.1.8, 4.2.5, 3.1.4` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-26996 | minimatch: minimatch: Denial of Service via specially crafted glob patterns | 10.2.1, 9.0.6, 8.0.5, 7.4.7, 6.2.1, 5.1.7, 4.2.4, 3.1.3 |
| HIGH | CVE-2026-27903 | minimatch: minimatch: Denial of Service due to unbounded recursive backtracking via crafted glob patterns | 10.2.3, 9.0.7, 8.0.6, 7.4.8, 6.2.2, 5.1.8, 4.2.5, 3.1.3 |
| HIGH | CVE-2026-27904 | minimatch: Minimatch: Denial of Service via catastrophic backtracking in glob expressions | 10.2.3, 9.0.7, 8.0.6, 7.4.8, 6.2.2, 5.1.8, 4.2.5, 3.1.4 |

### 📦 `nanoid` (3 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `3.3.11` para `3.3.18, 5.1.6` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-67213 | nanoid: nanoid: Denial of Service via infinite loop in random ID generation | 3.3.18, 5.1.6 |
| HIGH | CVE-2026-67214 | nanoid: nanoid: Denial of Service via negative size input in non-secure module functions | 3.3.16, 5.1.16 |
| HIGH | CVE-2026-73086 | nanoid: nanoid: Predictable ID generation due to integer overflow | 3.3.12, 5.1.11 |

### 📦 `picomatch` (2 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `2.3.1` para `4.0.4, 3.0.2, 2.3.2` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-33671 | picomatch: Picomatch: Regular Expression Denial of Service via crafted extglob patterns | 4.0.4, 3.0.2, 2.3.2 |
| MEDIUM | CVE-2026-33672 | picomatch: Picomatch: Data integrity compromised via method injection with crafted POSIX bracket expressions | 4.0.4, 3.0.2, 2.3.2 |

### 📦 `postcss` (4 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `8.5.3` para `8.5.23` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-45623 | postcss: PostCSS: Information disclosure and denial of service via crafted CSS input | 8.5.12 |
| HIGH | CVE-2026-73646 | postcss: PostCSS: Information disclosure via path traversal in source map auto-loading | 8.5.18 |
| MEDIUM | CVE-2026-41305 | postcss: PostCSS: Cross-Site Scripting (XSS) via improper escaping of style closing tags | 8.5.10 |
| MEDIUM | CVE-2026-69153 | postcss: PostCSS: Information disclosure via crafted sourceMappingURL | 8.5.23 |

### 📦 `undici` (12 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `7.24.6` para `7.29.0, 8.9.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-12151 | undici: undici: Denial of Service due to unbounded memory growth via WebSocket frames | 6.27.0, 7.28.0, 8.5.0 |
| HIGH | CVE-2026-13697 | undici: undici: Information disclosure and Denial of Service via malformed Cache-Control directives | 7.29.0, 8.9.0 |
| HIGH | CVE-2026-6734 | undici: undici: Information disclosure and data integrity issues due to incorrect Socks5ProxyAgent connection routing | 7.28.0, 8.2.0 |
| HIGH | CVE-2026-9697 | undici: undici: Man-in-the-Middle attack via ignored TLS options with SOCKS5 proxy | 7.28.0, 8.5.0 |
| MEDIUM | CVE-2026-14643 | undici: undici: Cross-user information disclosure due to improper Cache-Control directive parsing | 7.29.0, 8.9.0 |
| MEDIUM | CVE-2026-15157 | undici: undici: HTTP header injection via unvalidated blob-like body type property | 6.28.0, 7.29.0, 8.9.0 |
| MEDIUM | CVE-2026-16728 | undici: undici: Response desynchronization via retry interceptor with mismatched Content-Length | 6.28.0, 7.29.0, 8.9.0 |
| MEDIUM | CVE-2026-16729 | undici: Undici: Cookie attribute injection allows bypassing security protections | 6.28.0, 7.29.0, 8.9.0 |
| MEDIUM | CVE-2026-9678 | undici: Undici: Information disclosure due to improper cache-control header parsing | 7.28.0, 8.5.0 |
| MEDIUM | CVE-2026-9679 | undici: undici vulnerable to HTTP header injection via Set-Cookie percent-decoding | 6.27.0, 7.28.0, 8.5.0 |
| LOW | CVE-2026-11525 | undici: undici: Weakening of cookie SameSite policy due to incorrect parsing of Set-Cookie header | 6.27.0, 7.28.0, 8.5.0 |
| LOW | CVE-2026-6733 | undici: Undici: Response queue poisoning on reused keep-alive sockets can lead to incorrect response delivery. | 6.27.0, 7.28.0, 8.5.0 |

### 📦 `ws` (4 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `8.20.0` para `8.20.1` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-48779 | ws: ws: Denial of Service via memory exhaustion from small WebSocket fragments | 5.2.5, 6.2.4, 7.5.11, 8.21.0 |
| HIGH | CVE-2026-48779 | ws: ws: Denial of Service via memory exhaustion from small WebSocket fragments | 5.2.5, 6.2.4, 7.5.11, 8.21.0 |
| MEDIUM | CVE-2026-45736 | ws: ws: Uninitialized memory disclosure via `websocket.close()` with `TypedArray` | 8.20.1 |
| MEDIUM | CVE-2026-45736 | ws: ws: Uninitialized memory disclosure via `websocket.close()` with `TypedArray` | 8.20.1 |

### 📦 `multer` (11 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `1.4.5-lts.2` para `2.3.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2025-47935 | Multer vulnerable to Denial of Service via memory leaks from unclosed streams | 2.0.0 |
| HIGH | CVE-2025-47944 | Multer vulnerable to Denial of Service from maliciously crafted requests | 2.0.0 |
| HIGH | CVE-2025-48997 | multer: Multer vulnerable to Denial of Service via unhandled exception | 2.0.1 |
| HIGH | CVE-2025-7338 | multer: Multer Denial of Service | 2.0.2 |
| HIGH | CVE-2026-2359 | multer: Multer: Denial of Service via dropped file upload connections | 2.1.0 |
| HIGH | CVE-2026-3304 | multer: Multer: Denial of Service via malformed requests | 2.1.0 |
| HIGH | CVE-2026-3520 | multer: Multer: Denial of Service via malformed requests | 2.1.1 |
| HIGH | CVE-2026-5079 | multer: Multer: Denial of Service via deeply nested field names in multipart form data | 2.2.0, 3.0.0-alpha.2 |
| HIGH | CVE-2026-82333 | multer vulnerable to Denial of Service via oversized array index in field names | 2.3.0 |
| HIGH | CVE-2026-77078 | multer vulnerable to Denial of Service via crafted multipart field names | 2.3.0 |
| LOW | CVE-2026-77063 | multer vulnerable to file size limit bypass via async fileFilter race condition | 2.3.0 |

### 📦 `@remix-run/router` (2 CVEs) — severidade máxima: HIGH

**Ação recomendada:** atualizar de `1.23.0` para `1.23.3` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| HIGH | CVE-2026-22029 | @remix-run/router: react-router: React Router vulnerable to XSS via Open Redirects | 1.23.2 |
| MEDIUM | CVE-2026-40181 | react-router: React Router: Open redirect vulnerability via specially crafted URLs | 1.23.3 |

### 📦 `follow-redirects` (2 CVEs) — severidade máxima: MEDIUM

**Ação recomendada:** atualizar de `1.15.11` para `1.16.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| MEDIUM | — | follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets | 1.16.0 |
| MEDIUM | — | follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets | 1.16.0 |

### 📦 `react-router` (4 CVEs) — severidade máxima: MEDIUM

**Ação recomendada:** atualizar de `6.30.0` para `7.18.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| MEDIUM | CVE-2025-68470 | react-router: React Router unexpected external redirect | 6.30.2, 7.9.6 |
| MEDIUM | CVE-2026-40181 | react-router: React Router: Open redirect vulnerability via specially crafted URLs | 7.14.1, 6.30.4 |
| MEDIUM | CVE-2026-53666 | react-router: React Router: Information disclosure via client-side constructor execution | 7.18.0 |
| MEDIUM | CVE-2026-53669 | react-router: React Router: Open Redirect vulnerability via backslashes in navigation components | 7.18.0 |

### 📦 `yaml` (1 CVE) — severidade máxima: MEDIUM

**Ação recomendada:** atualizar de `2.7.1` para `2.8.3, 1.10.3` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| MEDIUM | CVE-2026-33532 | yaml: yaml: Denial of Service via deeply nested YAML document parsing | 2.8.3, 1.10.3 |

### 📦 `qs` (3 CVEs) — severidade máxima: MEDIUM

**Ação recomendada:** atualizar de `6.14.2` para `6.16.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| MEDIUM | CVE-2026-82417 | qs: qs: Denial of Service via improper validation in stringify function | 6.16.0 |
| MEDIUM | CVE-2026-8723 | qs: qs: Denial of Service due to improper handling of null/undefined array elements | 6.15.2 |
| MEDIUM | CVE-2026-82562 | qs: qs: Denial of Service via array limit bypass in query string parsing | 6.16.0 |

### 📦 `uuid` (1 CVE) — severidade máxima: MEDIUM

**Ação recomendada:** atualizar de `9.0.1` para `11.1.1, 12.0.1, 13.0.1` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| MEDIUM | CVE-2026-41907 | uuid: uuid: Out-of-bounds write vulnerability impacts data integrity and confidentiality | 11.1.1, 12.0.1, 13.0.1 |

### 📦 `postcss-selector-parser` (1 CVE) — severidade máxima: LOW

**Ação recomendada:** atualizar de `6.1.2` para `6.1.3, 7.1.3` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| LOW | CVE-2026-9358 | postcss-selector-parser: Postcss: Denial of Service via uncontrolled recursion in AST Serialization | 6.1.3, 7.1.3 |

### 📦 `body-parser` (1 CVE) — severidade máxima: LOW

**Ação recomendada:** atualizar de `1.20.4` para `1.20.6, 2.3.0` (ou superior).

| Severidade | CVE | Descrição | Corrigido em |
|---|---|---|---|
| LOW | CVE-2026-12590 | body-parser: body-parser: Denial of Service via invalid limit option | 1.20.6, 2.3.0 |

## Segredos expostos

### 🔑 trigger_scrape.mjs:2 — Secret detected: Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data. (HIGH)

Regra: `jwt`

**Remediação:** Remova o valor do código-fonte e mova para uma variável de ambiente / secret manager. Se for uma credencial real (não um placeholder de exemplo), revogue-a imediatamente — ela já está exposta no histórico do Git mesmo após removida do arquivo atual.

### 🔑 restart_tunnel.mjs:70 — Secret detected: Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data. (HIGH)

Regra: `jwt`

**Remediação:** Remova o valor do código-fonte e mova para uma variável de ambiente / secret manager. Se for uma credencial real (não um placeholder de exemplo), revogue-a imediatamente — ela já está exposta no histórico do Git mesmo após removida do arquivo atual.

### 🔑 restart_tunnel.mjs:69 — Secret detected: Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data. (HIGH)

Regra: `jwt`

**Remediação:** Remova o valor do código-fonte e mova para uma variável de ambiente / secret manager. Se for uma credencial real (não um placeholder de exemplo), revogue-a imediatamente — ela já está exposta no histórico do Git mesmo após removida do arquivo atual.

### 🔑 test_scraping.mjs:4 — Secret detected: Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data. (HIGH)

Regra: `jwt`

**Remediação:** Remova o valor do código-fonte e mova para uma variável de ambiente / secret manager. Se for uma credencial real (não um placeholder de exemplo), revogue-a imediatamente — ela já está exposta no histórico do Git mesmo após removida do arquivo atual.

### 🔑 crystal-jackrabbit-jump/src/integrations/supabase/client.ts:5 — Secret detected: Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data. (HIGH)

Regra: `jwt`

**Remediação:** Remova o valor do código-fonte e mova para uma variável de ambiente / secret manager. Se for uma credencial real (não um placeholder de exemplo), revogue-a imediatamente — ela já está exposta no histórico do Git mesmo após removida do arquivo atual.

## Outros findings

| Severidade | Scanner | Categoria | Título | Local |
|---|---|---|---|---|
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.generic.secrets.security.detected-jwt-token.detected-jwt-token | /scan/restart_tunnel.mjs:70 |
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.generic.secrets.security.detected-jwt-token.detected-jwt-token | /scan/restart_tunnel.mjs:69 |
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.javascript.lang.security.detect-child-process.detect-child-process | /scan/crystal-jackrabbit-jump/tunnel-manager.ts:17 |
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.generic.secrets.security.detected-jwt-token.detected-jwt-token | /scan/trigger_scrape.mjs:2 |
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.generic.secrets.security.detected-jwt-token.detected-jwt-token | /scan/test_scraping.mjs:4 |
| HIGH | SEMGREP | SAST | Semgrep Finding: rules.generic.secrets.security.detected-jwt-token.detected-jwt-token | /scan/crystal-jackrabbit-jump/src/integrations/supabase/client.ts:5 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected | /scan/trainable_slogan_mixer.py:69 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator | /scan/crystal-jackrabbit-jump/src/components/ui/sidebar.tsx:661 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp | /scan/crystal-jackrabbit-jump/supabase/functions/music-automation/index.ts:47 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.lang.security.insecure-hash-algorithms-md5.insecure-hash-algorithm-md5 | /scan/extract_slogan_positions.py:54 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.ajinabraham.njsscan.headers.header_cors_star.express_cors | /scan/server.js:17 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected | /scan/trainable_slogan_mixer.py:101 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.fastapi.security.wildcard-cors.wildcard-cors | /scan/trainable_slogan_mixer.py:291 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.lang.security.insecure-hash-algorithms-md5.insecure-hash-algorithm-md5 | /scan/trainable_slogan_mixer.py:446 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.python.lang.security.insecure-hash-algorithms-md5.insecure-hash-algorithm-md5 | /scan/trainable_slogan_mixer.py:460 |
| MEDIUM | SEMGREP | SAST | Semgrep Finding: rules.ajinabraham.njsscan.generic.hardcoded_secrets.node_username | /scan/trigger_scrape.mjs:3 |
| LOW | SEMGREP | SAST | Semgrep Finding: rules.javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage | /scan/server.js:12 |
