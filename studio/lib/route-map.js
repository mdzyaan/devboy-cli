const DEFAULT_PORT = process.env.NEXT_PUBLIC_DEVBOY_PORT || '3000';

export function findRouteForHandler(routes, handlerPath) {
  if (!handlerPath) return null;
  const normalized = handlerPath.replace(/^\.\//, '');
  return (
    (routes || []).find(
      (r) => r.handler === normalized || r.handler === handlerPath
    ) || null
  );
}

export function localRouteUrl(route, port = DEFAULT_PORT) {
  if (!route?.path) return null;
  return `http://localhost:${port}${route.path}`;
}
