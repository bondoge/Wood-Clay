// Shared between CatalogClient.tsx (client component) and page.tsx (server
// component) — deliberately its own plain module, not exported from
// CatalogClient.tsx itself. A "use client" file's exports become opaque
// client-reference stubs when imported from server code (React Server
// Components can't hand a server component the real value of a client
// module's export, only a serializable component reference), so a plain
// constant re-exported from CatalogClient.tsx resolves to a function/proxy
// on the server side, not the number — confirmed the hard way.
export const PAGE_SIZE = 24;
