import { Junction } from '../types';

export const NAGPUR_JUNCTIONS: Junction[] = [
  // Central Nagpur / Sitabuldi / Civil Lines
  {
    id: 1,
    name: 'LIC Chowk',
    latitude: 21.1556187,
    longitude: 79.0817574,
    approximate: false,
    zone: 'Central',
    corridor: 'Kamptee Road / Sadar',
    description: 'Crucial intersection linking Sadar commercial area and Kasturchand Park.',
    source: 'Nominatim: LIC Square'
  },
  {
    id: 2,
    name: 'Lokmat Chowk',
    latitude: 21.1354806,
    longitude: 79.0780286,
    approximate: false,
    zone: 'Central',
    corridor: 'Wardha Road / Dhantoli',
    description: 'High-density arterial junction connecting Wardha Road and Dhantoli.',
    source: 'Public map search result for Lokmat Square'
  },
  {
    id: 3,
    name: 'Gaddi Godam Chowk',
    latitude: 21.1616305,
    longitude: 79.083725,
    approximate: false,
    zone: 'Central',
    corridor: 'Kamptee Road / Sadar Flyover',
    description: 'Gateway to North Nagpur along the Sadar flyover corridor.',
    source: 'Nominatim: Gaddi Godam Square'
  },
  {
    id: 4,
    name: 'Kadbi Chowk',
    latitude: 21.15487,
    longitude: 79.08139,
    approximate: true,
    zone: 'Central',
    corridor: 'Kasturchand Park North',
    description: 'Major connector near Kasturchand Park Grounds and Railway Station.',
    source: 'Public map reference near Kasturchand Park / Kadvi Chowk'
  },
  {
    id: 9,
    name: 'Bardi Chowk (Sitabuldi)',
    latitude: 21.1466,
    longitude: 79.0855,
    approximate: true,
    zone: 'Central',
    corridor: 'Sitabuldi Interchange',
    description: 'The commercial heart of Nagpur with intense pedestrian and metro transit.',
    source: 'Approximate Bardi/Sitabuldi area coordinate'
  },
  {
    id: 10,
    name: 'Kasturchand Park Square',
    latitude: 21.155,
    longitude: 79.08139,
    approximate: false,
    zone: 'Central',
    corridor: 'Kingsway / Sadar',
    description: 'Key junction adjacent to KP Metro Station and District Court.',
    source: 'Public reference: Kasturchand Park metro station'
  },
  {
    id: 17,
    name: 'Variety Square',
    latitude: 21.1434953,
    longitude: 79.0809881,
    approximate: false,
    zone: 'Central',
    corridor: 'Sitabuldi / Amravati Road',
    description: 'Prime junction connecting Sitabuldi Market to West Nagpur.',
    source: 'Nominatim: Variety Square'
  },
  {
    id: 18,
    name: 'Jhansi Rani Square',
    latitude: 21.1411618,
    longitude: 79.0801886,
    approximate: false,
    zone: 'Central',
    corridor: 'Sitabuldi / Panchsheel',
    description: 'Bustling transit intersection with Metro Interchange station access.',
    source: 'OSM named square'
  },
  {
    id: 22,
    name: 'Sitabuldi Chowk',
    latitude: 21.1415725,
    longitude: 79.0828592,
    approximate: true,
    zone: 'Central',
    corridor: 'Central Avenue Gateway',
    description: 'Central transport hub connecting East, West, North, and South Nagpur.',
    source: 'OSM Sitabuldi area / metro station reference'
  },
  {
    id: 23,
    name: 'RBI Chowk',
    latitude: 21.1526445,
    longitude: 79.0809738,
    approximate: false,
    zone: 'Central',
    corridor: 'Civil Lines / High Court',
    description: 'Administrative core near Reserve Bank of India and Vidhan Bhavan.',
    source: 'Nominatim: RBI Square'
  },
  {
    id: 25,
    name: 'Cotton Market Chowk',
    latitude: 21.1459896,
    longitude: 79.0897729,
    approximate: false,
    zone: 'Central',
    corridor: 'Railway Station East / Wholesale Market',
    description: 'Historic commercial junction with heavy commercial logistics.',
    source: 'OSM Cotton Market'
  },

  // North Nagpur
  {
    id: 6,
    name: 'Indora Chowk',
    latitude: 21.1736873,
    longitude: 79.1007283,
    approximate: false,
    zone: 'North',
    corridor: 'Kamptee Road / NH-44',
    description: 'Primary North Nagpur node linking Kamptee Road with Outer Ring segments.',
    source: 'Nominatim: Indora Square'
  },
  {
    id: 7,
    name: 'Mental Hospital Chowk',
    latitude: 21.175596,
    longitude: 79.0785247,
    approximate: false,
    zone: 'North',
    corridor: 'Koradi Road',
    description: 'Key junction on Koradi Road leading towards Koradi Thermal Station & Temple.',
    source: 'Nominatim: Pagal Khana Square / Regional Mental Hospital'
  },
  {
    id: 12,
    name: 'Automotive Square',
    latitude: 21.1857923,
    longitude: 79.1195065,
    approximate: false,
    zone: 'North',
    corridor: 'Kamptee Road NH-44 / Ring Road',
    description: 'North-eastern commercial transport nexus with heavy interstate freight traffic.',
    source: 'Nominatim: Automotive Square'
  },
  {
    id: 26,
    name: 'Mankapur Chowk',
    latitude: 21.1878071,
    longitude: 79.0790929,
    approximate: false,
    zone: 'North',
    corridor: 'Koradi Road / Ring Road',
    description: 'Sports complex and residential corridor junction on Northern arterial.',
    source: 'Nominatim: Mankapur Square'
  },
  {
    id: 30,
    name: 'Kamptee Chowk',
    latitude: 21.1888687,
    longitude: 79.1238271,
    approximate: true,
    zone: 'North',
    corridor: 'Kamptee Road Express Corridor',
    description: 'Gateway to Kamptee satellite town and industrial belts.',
    source: 'OSM Kamptee Road reference'
  },
  {
    id: 27,
    name: 'Katol Road Chowk',
    latitude: 21.1695203,
    longitude: 79.0257646,
    approximate: true,
    zone: 'North',
    corridor: 'Katol Road Highway',
    description: 'Western exit highway connecting Nagpur to Katol and Kalmeshwar MIDC.',
    source: 'Map search result for Katol Road junction area'
  },

  // West Nagpur / Dharampeth / VNIT / Hingna
  {
    id: 13,
    name: 'Laxmi Nagar Square',
    latitude: 21.1254686,
    longitude: 79.0639778,
    approximate: false,
    zone: 'West',
    corridor: 'South Ambazari Road / VNIT',
    description: 'Major commercial square near VNIT campus and Ambazari Lake entrance.',
    source: 'Nominatim: Laxmi Nagar Square'
  },
  {
    id: 14,
    name: 'Shraddhanand Peth Square',
    latitude: 21.1254292,
    longitude: 79.0593904,
    approximate: true,
    zone: 'West',
    corridor: 'South Ambazari Road',
    description: 'Busy multi-arm junction with dense retail and academic traffic.',
    source: 'OSM address reference for Shraddhanand Peth Square'
  },
  {
    id: 15,
    name: 'Shankar Nagar Square',
    latitude: 21.1362125,
    longitude: 79.0616442,
    approximate: false,
    zone: 'West',
    corridor: 'North Ambazari Road / WHC Road',
    description: 'High-volume crossroads connecting West High Court Road and Ambazari.',
    source: 'Nominatim: Shankar Nagar Square'
  },
  {
    id: 16,
    name: 'Ajit Bakery Square',
    latitude: 21.129,
    longitude: 79.064,
    approximate: true,
    zone: 'West',
    corridor: 'Bajaj Nagar / WHC Road',
    description: 'Popular landmark junction in Bajaj Nagar culinary and retail district.',
    source: 'Approximate local junction coordinate'
  },
  {
    id: 171,
    name: 'Abhyankar Nagar Square',
    latitude: 21.127,
    longitude: 79.061,
    approximate: true,
    zone: 'West',
    corridor: 'Abhyankar Nagar Road',
    description: 'Key community transit square between VNIT and Bajaj Nagar.',
    source: 'Approximate Abhyankar Nagar junction coordinate'
  },
  {
    id: 181,
    name: 'Alankar Square',
    latitude: 21.1285,
    longitude: 79.0565,
    approximate: true,
    zone: 'West',
    corridor: 'Dharampeth / Ram Nagar',
    description: 'Residential and commercial hub in West Nagpur.',
    source: 'Approximate local junction coordinate'
  },
  {
    id: 19,
    name: 'LAD Square',
    latitude: 21.131,
    longitude: 79.0515,
    approximate: true,
    zone: 'West',
    corridor: 'Shankar Nagar / LAD College Road',
    description: 'Academic corridor junction with heavy student and commute traffic.',
    source: 'Approximate local junction coordinate'
  },
  {
    id: 20,
    name: 'Kachipura Square',
    latitude: 21.1335,
    longitude: 79.067,
    approximate: true,
    zone: 'West',
    corridor: 'Ramdaspeth / WHC Road',
    description: 'Hospital and diagnostic clinic corridor in Ramdaspeth.',
    source: 'Approximate local junction coordinate'
  },
  {
    id: 28,
    name: 'Mate Chowk',
    latitude: 21.1216256,
    longitude: 79.0564783,
    approximate: false,
    zone: 'West',
    corridor: 'Pratap Nagar / VNIT West Gate',
    description: 'Major crossroads connecting Pratap Nagar, Gopal Nagar and VNIT.',
    source: 'OSM named square'
  },
  {
    id: 31,
    name: 'Hingna Chowk (T-Point)',
    latitude: 21.1233698,
    longitude: 79.0436319,
    approximate: false,
    zone: 'West',
    corridor: 'Hingna Road / MIDC Corridor',
    description: 'Industrial gateway towards Hingna MIDC, YCCE, and ICAD.',
    source: 'OSM Hingna T-Point'
  },
  {
    id: 33,
    name: 'Pratap Nagar Chowk',
    latitude: 21.1137148,
    longitude: 79.0567838,
    approximate: false,
    zone: 'West',
    corridor: 'Ring Road South-West',
    description: 'Heavy junction linking Ring Road with Khamla and South West Nagpur.',
    source: 'OSM named square'
  },

  // South Nagpur / Wardha Road / Airport / Manewada
  {
    id: 11,
    name: 'Airport T-Point',
    latitude: 21.103,
    longitude: 79.084,
    approximate: true,
    zone: 'South',
    corridor: 'Wardha Road / Dr. Babasaheb Ambedkar Airport',
    description: 'Gateway intersection for Nagpur International Airport and MIHAN SEZ.',
    source: 'Approximate airport-road T-point coordinate'
  },
  {
    id: 32,
    name: 'Manewada Chowk',
    latitude: 21.1051881,
    longitude: 79.1024825,
    approximate: false,
    zone: 'South',
    corridor: 'Inner Ring Road / Manewada Road',
    description: 'Crucial residential hub on South Nagpur Ring Road with busy flyover below.',
    source: 'Nominatim: Manewada Square'
  },
  {
    id: 34,
    name: 'Ajni Chowk',
    latitude: 21.1182122,
    longitude: 79.0721071,
    approximate: false,
    zone: 'South',
    corridor: 'Wardha Road / Ajni Railway Station',
    description: 'High-speed Wardha Road double-decker flyover section near Ajni Square.',
    source: 'OSM Ajni Square'
  },
  {
    id: 35,
    name: 'Chatrapati Chowk',
    latitude: 21.109139,
    longitude: 79.0696114,
    approximate: true,
    zone: 'South',
    corridor: 'Wardha Road / Ring Road Flyover',
    description: 'Major multi-tier intersection connecting Wardha Road with Ring Road.',
    source: 'Nominatim: Chhatrapati Square'
  },
  {
    id: 40,
    name: 'Manish Nagar–Besa Junction',
    latitude: 21.0849744,
    longitude: 79.0955504,
    approximate: true,
    zone: 'South',
    corridor: 'Besa-Ghogli Road / Manish Nagar Underpass',
    description: 'Fast-growing southern suburb connector towards MIHAN and Besa township.',
    source: 'OSM Besa Square / Manish Nagar-Besa area reference'
  },

  // East Nagpur / Central Avenue / Itwari / Pardi
  {
    id: 5,
    name: 'Golibar Chowk',
    latitude: 21.1614,
    longitude: 79.1059,
    approximate: true,
    zone: 'East',
    corridor: 'Central Avenue North / Timki',
    description: 'High-density commercial wholesale area in Old East Nagpur.',
    source: 'Approximate locality/junction coordinate'
  },
  {
    id: 8,
    name: 'Vaishnodevi Chowk',
    latitude: 21.1480272,
    longitude: 79.1364057,
    approximate: false,
    zone: 'East',
    corridor: 'Central Avenue East / Bagadganj',
    description: 'Central Avenue arterial flyover junction heading towards Pardi.',
    source: 'Nominatim: Vaishnodevi Square'
  },
  {
    id: 21,
    name: 'Itwari Chowk',
    latitude: 21.1569338,
    longitude: 79.1102582,
    approximate: false,
    zone: 'East',
    corridor: 'Itwari Wholesale Trade Center',
    description: 'Historic commercial heartbeat with dense jewelers and textile markets.',
    source: 'OSM named place'
  },
  {
    id: 24,
    name: 'Medical Chowk',
    latitude: 21.1314524,
    longitude: 79.0977219,
    approximate: false,
    zone: 'East',
    corridor: 'Great Nag Road / GMC Hospital',
    description: 'Emergency corridor junction serving Government Medical College & Hospital.',
    source: 'OSM Medical Square'
  },
  {
    id: 29,
    name: 'Pardi Chowk',
    latitude: 21.1450232,
    longitude: 79.168283,
    approximate: true,
    zone: 'East',
    corridor: 'Bhandara Road / NH-53 Elevated Corridor',
    description: 'Eastern entrance highway junction connecting Nagpur to Raipur & Kolkata.',
    source: 'OSM Pardi area reference'
  },
  {
    id: 36,
    name: 'Dighori Chowk',
    latitude: 21.1018,
    longitude: 79.131,
    approximate: true,
    zone: 'East',
    corridor: 'Umred Road / Ring Road South-East',
    description: 'Major junction connecting Ring Road with Umred state highway.',
    source: 'Approximate locality/junction coordinate'
  },
  {
    id: 39,
    name: 'Sakkardara Square',
    latitude: 21.1218473,
    longitude: 79.1152792,
    approximate: true,
    zone: 'East',
    corridor: 'Sakkardara Lake / Ayurvedic College Road',
    description: 'Vibrant multi-arm junction in East Nagpur near historic lake.',
    source: 'OSM Sakkardara area reference'
  }
];

export const NAGPUR_CENTER = {
  lat: 21.1458,
  lng: 79.0882,
  zoom: 13,
};
