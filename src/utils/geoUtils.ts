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

/**
 * Checks if a junction belongs to the target zone.
 * Matches strings such as "Zone 4 - South" with "SOUTH" or "Zone 2 - North" with "NORTH".
 * If targetZone is 'ALL' or empty, matches all junctions.
 */
export function isJunctionInZone(
  junctionZone: string | undefined | null,
  targetZone: string | undefined | null
): boolean {
  if (!targetZone || targetZone === 'ALL') return true;
  if (!junctionZone) return false;
  const upperJunc = junctionZone.toUpperCase();
  const upperTarget = targetZone.toUpperCase();
  return upperJunc.includes(upperTarget);
}

export const ZONE_CENTERS: Record<string, { lat: number; lng: number; zoom: number; name: string }> = {
  ALL: { lat: 21.1458, lng: 79.0882, zoom: 12.2, name: 'Nagpur Metropolitan' },
  CENTRAL: { lat: 21.1465, lng: 79.0825, zoom: 14.0, name: 'Zone 1 - Central' },
  NORTH: { lat: 21.1720, lng: 79.0980, zoom: 13.8, name: 'Zone 2 - North' },
  EAST: { lat: 21.1520, lng: 79.1320, zoom: 13.8, name: 'Zone 3 - East' },
  SOUTH: { lat: 21.1120, lng: 79.0820, zoom: 13.8, name: 'Zone 4 - South' },
  WEST: { lat: 21.1380, lng: 79.0550, zoom: 13.8, name: 'Zone 5 - West' },
};

export interface TrafficCongestionClassification {
  level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  color: string;
  badgeClass: string;
  speedColor: string;
  label: string;
}

/**
 * Standardized Traffic Congestion Classifier:
 * - CRITICAL (Red #EF4444): Active Incident / Gridlock / Speed < 15 km/h
 * - HIGH (Orange #F97316): Heavy Congestion / Speed 15-25 km/h
 * - MODERATE (Yellow #EAB308): Moderate Congestion / Speed 25-35 km/h
 * - LOW (Green #22C55E): Fluid Flow / Speed >= 35 km/h
 */
export function getTrafficCongestion(
  speed: number,
  hasIncident: boolean = false,
  rawCongestion?: string,
  rawLevel?: string
): TrafficCongestionClassification {
  const normCongestion = (rawCongestion || '').toLowerCase();
  const normLevel = (rawLevel || '').toLowerCase();

  // 1. CRITICAL -> RED
  if (hasIncident || speed < 15 || normLevel === 'gridlock' || normCongestion === 'gridlock') {
    return {
      level: 'CRITICAL',
      color: '#EF4444',
      badgeClass: 'bg-[#1a0505]/95 text-red-300 border-red-500/80 shadow-red-500/20',
      speedColor: 'text-rose-400',
      label: 'Critical (Gridlock)',
    };
  }

  // 2. HIGH -> ORANGE
  if (speed < 25 || normLevel === 'heavy' || normCongestion === 'heavy') {
    return {
      level: 'HIGH',
      color: '#F97316',
      badgeClass: 'bg-[#1a0e05]/95 text-orange-300 border-orange-500/80 shadow-orange-500/20',
      speedColor: 'text-orange-400',
      label: 'High (Heavy)',
    };
  }

  // 3. MODERATE -> YELLOW
  if (speed < 35 || normLevel === 'moderate' || normCongestion === 'moderate') {
    return {
      level: 'MODERATE',
      color: '#EAB308',
      badgeClass: 'bg-[#1a1705]/95 text-yellow-300 border-yellow-500/80 shadow-yellow-500/20',
      speedColor: 'text-yellow-400',
      label: 'Moderate',
    };
  }

  // 4. LOW -> GREEN
  return {
    level: 'LOW',
    color: '#22C55E',
    badgeClass: 'bg-[#051a0d]/95 text-emerald-300 border-emerald-500/80 shadow-emerald-500/20',
    speedColor: 'text-emerald-400',
    label: 'Fluid (Low)',
  };
}
