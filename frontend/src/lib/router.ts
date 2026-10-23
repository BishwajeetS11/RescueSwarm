export type Route =
  | { name: "home" }
  | { name: "scenario"; id: string }
  | { name: "create" }
  | { name: "run"; id: string }
  | { name: "compare"; a?: string; b?: string }
  | { name: "about" };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [path = "/", query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "about") return { name: "about" };
  if (parts[0] === "compare") {
    const params = new URLSearchParams(query);
    const a = params.get("a") ?? undefined;
    const b = params.get("b") ?? undefined;
    return { name: "compare", ...(a ? { a } : {}), ...(b ? { b } : {}) };
  }
  if (parts[0] === "scenarios" && parts[1] === "new") return { name: "create" };
  if (parts[0] === "scenarios" && parts[1]) return { name: "scenario", id: parts[1] };
  if (parts[0] === "runs" && parts[1]) return { name: "run", id: parts[1] };
  return { name: "home" };
}

export function href(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "about":
      return "#/about";
    case "compare": {
      const params = new URLSearchParams();
      if (route.a) params.set("a", route.a);
      if (route.b) params.set("b", route.b);
      const query = params.toString();
      return query ? `#/compare?${query}` : "#/compare";
    }
    case "create":
      return "#/scenarios/new";
    case "scenario":
      return `#/scenarios/${route.id}`;
    case "run":
      return `#/runs/${route.id}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}
