// Utility function to extract the domain from a URL
export function extractDomain(url: string): string {
  let domain = url?.replace(/(^\w+:|^)\/\//, "");
  domain = domain?.split("/")[0];
  domain = domain?.split("?")[0];
  if (domain?.includes("@")) {
    domain = domain?.split("@")[1];
  }
  if (domain?.includes("-")) {
    domain = domain?.split("-")[0];
  }
  if (domain?.includes("www.")) {
    domain = domain?.replace(/^www\./, "");
  }
  return domain;
}
