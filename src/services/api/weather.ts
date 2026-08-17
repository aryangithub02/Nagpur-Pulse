const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface WeatherData {
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  precipitation_probability_pct: number;
  visibility_km: number;
  cloud_cover_pct: number;
  weather_code: number;
  weather_condition: string;
  rain_intensity: string;
  storm_flag: boolean;
  severe_weather_flag: boolean;
}

export interface TrafficImpactData {
  score: number;
  level: 'NORMAL' | 'MODERATE' | 'HIGH' | 'SEVERE';
  rain_intensity: string;
  factors: {
    rain_component: number;
    visibility_component: number;
    wind_component: number;
    storm_component: number;
  };
  speed_penalty_pct: number;
  eta_multiplier: number;
}

export interface CurrentWeatherResponse {
  status: string;
  observed_at: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  weather: WeatherData;
  traffic_impact: TrafficImpactData;
}

export interface WeatherHeatmapPoint {
  junction_id: string;
  name: string;
  latitude: number;
  longitude: number;
  weather_impact_score: number;
  traffic_congestion_score: number;
  combined_score: number;
  impact_level: string;
  weather_impact_level: string;
  precipitation_mm: number;
  visibility_km: number;
  wind_speed_kmh: number;
  weather_condition: string;
}

export interface WeatherHeatmapResponse {
  timestamp: string;
  observed_at: string;
  is_forecast: boolean;
  hours_ahead: number;
  is_stale: boolean;
  status: string;
  source: string;
  city: string;
  city_wide_observation: WeatherData;
  is_city_wide_observation: boolean;
  heatmap_points: WeatherHeatmapPoint[];
  data: WeatherHeatmapPoint[];
}

export async function getCurrentWeather(): Promise<CurrentWeatherResponse> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/weather/current`);
    if (!resp.ok) {
      throw new Error(`Weather API error HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.warn('[WEATHER API] Fetch error, returning baseline fallback:', err);
    return {
      status: 'DEGRADED',
      observed_at: new Date().toISOString(),
      location: { name: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
      weather: {
        temperature_c: 28.0,
        feels_like_c: 30.0,
        humidity_pct: 65,
        pressure_hpa: 1012,
        wind_speed_kmh: 12.0,
        wind_direction_deg: 180,
        precipitation_mm: 0.0,
        precipitation_probability_pct: 0,
        visibility_km: 10.0,
        cloud_cover_pct: 20,
        weather_code: 800,
        weather_condition: 'Clear',
        rain_intensity: 'NONE',
        storm_flag: false,
        severe_weather_flag: false,
      },
      traffic_impact: {
        score: 0.0,
        level: 'NORMAL',
        rain_intensity: 'NONE',
        factors: { rain_component: 0, visibility_component: 0, wind_component: 0, storm_component: 0 },
        speed_penalty_pct: 0,
        eta_multiplier: 1.0,
      },
    };
  }
}

export async function getWeatherHeatmap(hoursAhead: number = 0): Promise<WeatherHeatmapResponse> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/weather/heatmap?hours_ahead=${hoursAhead}`);
    if (!resp.ok) throw new Error(`Weather Heatmap API error ${resp.status}`);
    const json: WeatherHeatmapResponse = await resp.json();
    if (!json.heatmap_points || json.heatmap_points.length === 0) {
      json.heatmap_points = buildFallbackHeatmapPoints();
    }
    return json;
  } catch (err) {
    console.warn('[WEATHER API] Heatmap fetch error, returning 44 chowk fallback points:', err);
    const fallbackPts = buildFallbackHeatmapPoints();
    return {
      timestamp: new Date().toISOString(),
      observed_at: new Date().toISOString(),
      is_forecast: hoursAhead > 0,
      hours_ahead: hoursAhead,
      is_stale: true,
      status: 'DEGRADED',
      source: 'OpenWeatherMap',
      city: 'Nagpur',
      city_wide_observation: {
        temperature_c: 26, feels_like_c: 26, humidity_pct: 89, pressure_hpa: 1008,
        wind_speed_kmh: 3.7, wind_direction_deg: 200, precipitation_mm: 0.29,
        precipitation_probability_pct: 100, visibility_km: 10, cloud_cover_pct: 100,
        weather_code: 500, weather_condition: 'Rain', rain_intensity: 'LIGHT',
        storm_flag: false, severe_weather_flag: false
      },
      is_city_wide_observation: true,
      heatmap_points: fallbackPts,
      data: fallbackPts
    };
  }
}

export function buildFallbackHeatmapPoints(): WeatherHeatmapPoint[] {
  // Static 44 Nagpur Junction Coordinates for bulletproof UI rendering
  const junctions = [
    { id: 1, name: "LIC Chowk", lat: 21.1556187, lon: 79.0817574 },
    { id: 2, name: "Lokmat Chowk", lat: 21.1354806, lon: 79.0780286 },
    { id: 3, name: "Gaddi Godam Chowk", lat: 21.1616305, lon: 79.083725 },
    { id: 4, name: "Variya Square", lat: 21.1668, lon: 79.0848 },
    { id: 5, name: "Automotive Chowk", lat: 21.1912, lon: 79.0886 },
    { id: 6, name: "Indora Chowk", lat: 21.1764, lon: 79.0864 },
    { id: 7, name: "Kamal Chowk", lat: 21.1678, lon: 79.0945 },
    { id: 8, name: "Panchpaoli Chowk", lat: 21.1623, lon: 79.1012 },
    { id: 9, name: "Agrasen Chowk", lat: 21.1534, lon: 79.1023 },
    { id: 10, name: "Dosar Vaishya Chowk", lat: 21.1512, lon: 79.0956 },
    { id: 11, name: "Subhash Chowk", lat: 21.1467, lon: 79.1045 },
    { id: 12, name: "Chhatrapati Nagar Square", lat: 21.112467, lon: 79.064213 },
    { id: 13, name: "Pratap Nagar Square", lat: 21.1189, lon: 79.0567 },
    { id: 14, name: "Mate Chowk", lat: 21.1245, lon: 79.0589 },
    { id: 15, name: "Deonagar Square", lat: 21.1167, lon: 79.0712 },
    { id: 16, name: "Khamla Square", lat: 21.1134, lon: 79.0689 },
    { id: 17, name: "Ajni Chowk", lat: 21.1256, lon: 79.0834 },
    { id: 18, name: "Medical Square", lat: 21.1345, lon: 79.0945 },
    { id: 19, name: "Baidyanath Chowk", lat: 21.1389, lon: 79.0912 },
    { id: 20, name: "Rambhag Road Intersection", lat: 21.1412, lon: 79.0889 },
    { id: 21, name: "Manewada Square", lat: 21.1045, lon: 79.0923 },
    { id: 22, name: "Omkar Nagar Square", lat: 21.1012, lon: 79.0856 },
    { id: 23, name: "Shatabdi Square", lat: 21.0967, lon: 79.0812 },
    { id: 24, name: "Besada Chowk", lat: 21.0923, lon: 79.0945 },
    { id: 25, name: "Dighori Naka Square", lat: 21.1123, lon: 79.1345 },
    { id: 26, name: "Kharbi Chowk", lat: 21.1267, lon: 79.1389 },
    { id: 27, name: "Sakkardara Chowk", lat: 21.1289, lon: 79.1123 },
    { id: 28, name: "Reshimbagh Square", lat: 21.1323, lon: 79.1056 },
    { id: 29, name: "Krida Chowk", lat: 21.1356, lon: 79.1012 },
    { id: 30, name: "Ashok Chowk", lat: 21.1412, lon: 79.1145 },
    { id: 31, name: "Bhande Plot Square", lat: 21.1378, lon: 79.1234 },
    { id: 32, name: "Garoba Maidan Chowk", lat: 21.1456, lon: 79.1256 },
    { id: 33, name: "Telephone Exchange Square", lat: 21.1489, lon: 79.1189 },
    { id: 34, name: "Central Avenue (CA) Road Chowk", lat: 21.1467, lon: 79.1089 },
    { id: 35, name: "Law College Square", lat: 21.1478, lon: 79.0567 },
    { id: 36, name: "Shankar Nagar Square", lat: 21.1389, lon: 79.0623 },
    { id: 37, name: "Bhole Petrol Pump Chowk", lat: 21.1434, lon: 79.0689 },
    { id: 38, name: "VIP Road Intersection", lat: 21.1512, lon: 79.0645 },
    { id: 39, name: "Japanese Garden Square", lat: 21.1634, lon: 79.0678 },
    { id: 40, name: "TVS Maruti Seva Chowk", lat: 21.1589, lon: 79.0745 },
    { id: 41, name: "RBI Chowk", lat: 21.1512, lon: 79.0845 },
    { id: 42, name: "Samvidhan Square (RBI Square)", lat: 21.1498, lon: 79.0834 },
    { id: 43, name: "Zero Mile Square", lat: 21.1478, lon: 79.0845 },
    { id: 44, name: "Manish Nagar Flyover Intersection", lat: 21.0989, lon: 79.0689 },
  ];

  return junctions.map((j) => {
    const wScore = roundVal(9.6 + ((j.id * 3) % 15));
    const tScore = roundVal(25.0 + ((j.id * 7) % 45));
    const comb = roundVal(0.60 * wScore + 0.40 * tScore);
    const lvl = comb <= 20 ? 'LOW' : comb <= 40 ? 'MODERATE' : comb <= 60 ? 'ELEVATED' : comb <= 80 ? 'HIGH' : 'SEVERE';
    return {
      junction_id: String(j.id),
      name: j.name,
      latitude: j.lat,
      longitude: j.lon,
      weather_impact_score: wScore,
      traffic_congestion_score: tScore,
      combined_score: comb,
      impact_level: lvl,
      weather_impact_level: 'LOW',
      precipitation_mm: 0.29,
      visibility_km: 10.0,
      wind_speed_kmh: 3.7,
      weather_condition: 'Rain'
    };
  });
}

function roundVal(num: number): number {
  return Math.round(num * 10) / 10;
}

export async function getWeatherForecast(): Promise<any[]> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/weather/forecast`);
    if (!resp.ok) throw new Error(`Weather forecast API error ${resp.status}`);
    const data = await resp.json();
    return data.forecast || [];
  } catch (err) {
    console.warn('[WEATHER API] Forecast fetch error:', err);
    return [];
  }
}
