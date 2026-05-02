export function pushSubPage(
  navigation: { push: (route: string, params: Record<string, unknown>) => void; getState?: () => { routeNames?: string[] } },
  title: string,
  render: () => unknown,
): void {
  const payload = { title, render };
  let route = "PUPU_CUSTOM_PAGE";
  try {
    const rn = navigation.getState?.()?.routeNames;
    if (Array.isArray(rn)) {
      if (rn.includes("PUPU_CUSTOM_PAGE")) route = "PUPU_CUSTOM_PAGE";
      else if (rn.includes("VendettaCustomPage")) route = "VendettaCustomPage";
    }
  } catch (_) {}
  try {
    navigation.push(route, payload);
  } catch (_) {
    try {
      navigation.push(route === "PUPU_CUSTOM_PAGE" ? "VendettaCustomPage" : "PUPU_CUSTOM_PAGE", payload);
    } catch (_) {}
  }
}
