import { NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { NagpurJunction } from '../types/traffic';

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function estimateEtaMinutes(distanceKm: number, speedKmH: number = 42): number {
  if (distanceKm <= 0.1) return 1;
  const minutes = (distanceKm / speedKmH) * 60;
  return Math.max(1, Math.round(minutes));
}

export function findNearestJunction(
  latitude: number,
  longitude: number
): { junction: NagpurJunction; distanceKm: number } {
  let closestJunction = NAGPUR_JUNCTIONS[0];
  let minDistance = calculateHaversineDistanceKm(
    latitude,
    longitude,
    closestJunction.latitude,
    closestJunction.longitude
  );

  for (const j of NAGPUR_JUNCTIONS) {
    const dist = calculateHaversineDistanceKm(latitude, longitude, j.latitude, j.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestJunction = j;
    }
  }

  return { junction: closestJunction, distanceKm: minDistance };
}

export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const theta = Math.atan2(y, x);
  const bearing = (theta * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function moveTowardsTarget(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  stepFactor: number = 0.04
): { lat: number; lng: number; reached: boolean } {
  const dist = calculateHaversineDistanceKm(currentLat, currentLng, targetLat, targetLng);
  
  if (dist < 0.05) {
    return { lat: targetLat, lng: targetLng, reached: true };
  }

  const dLat = targetLat - currentLat;
  const dLng = targetLng - currentLng;

  return {
    lat: currentLat + dLat * stepFactor,
    lng: currentLng + dLng * stepFactor,
    reached: false
  };
}
