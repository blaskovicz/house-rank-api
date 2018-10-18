import geoipLite from "geoip-lite";
const logger = console;
export interface Location {
  latitude: number;
  longitude: number;
}
export async function locationResolver(
  obj,
  args,
  { req: { ip } },
  info
): Promise<Location> {
  const location = geoipLite.lookup(ip);
  if (!location) {
    return;
  }

  return {
    latitude: location.ll[0],
    longitude: location.ll[1]
  };
}
