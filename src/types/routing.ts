export interface GeoJSONGeometry {
  type: string;
  coordinates: [number, number][]; // [longitude, latitude]
}

export interface RoutingPoint {
  latitude: number;
  longitude: number;
}

export interface RoutingResponse {
  unitId: string;
  junctionId: string;
  distanceMeters: number;
  distanceKm: number;
  estimatedTimeSeconds: number;
  estimatedTimeMinutes: number;
  routeGeometry: GeoJSONGeometry;
  route?: RoutingPoint[];
  isSimulated: boolean;
}

export interface RouteCalculation {
  originJunctionId: number;
  destinationJunctionId: number;
  originName: string;
  destinationName: string;
  distanceKm: number;
  travelTimeMinutes: number;
  normalTravelTimeMinutes: number;
  delayMinutes: number;
  routeCoordinates: [number, number][]; // [lat, lng]
  instructions: string[];
}
