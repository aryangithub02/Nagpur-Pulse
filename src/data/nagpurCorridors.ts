export interface ArterialCorridorRoute {
  id: string;
  name: string;
  shortName: string;
  code: string;
  corridorType: 'Radial Arterial' | 'Ring Road' | 'Highway Flyover' | 'Metro Transit';
  description: string;
  junctionIds: number[];
  baseLengthKm: number;
}

/**
 * Key Nagpur Arterial corridors organized strictly in linear geographic order
 * to ensure smooth, natural connecting routes without zig-zags.
 */
export const NAGPUR_ARTERIAL_CORRIDORS: ArterialCorridorRoute[] = [
  {
    id: 'wardha-road-corridor',
    name: 'Wardha Road Corridor (NH-44 South)',
    shortName: 'Wardha Rd (South)',
    code: 'R-01',
    corridorType: 'Radial Arterial',
    description: 'Double-decker flyover & Metro arterial connecting South Nagpur to Sitabuldi',
    junctionIds: [9, 18, 2, 34, 35, 11, 40], // Bardi -> Jhansi Rani -> Lokmat -> Ajni -> Chhatrapati -> Airport -> Manish Nagar
    baseLengthKm: 8.8,
  },
  {
    id: 'kamptee-road-corridor',
    name: 'Kamptee Road Corridor (NH-44 North)',
    shortName: 'Kamptee Rd (North)',
    code: 'R-02',
    corridorType: 'Radial Arterial',
    description: 'Sadar elevated flyover connecting Sitabuldi to North Nagpur & Kamptee',
    junctionIds: [22, 10, 1, 4, 3, 6, 12, 30], // Sitabuldi -> KP -> LIC -> Kadbi -> Gaddi Godam -> Indora -> Automotive -> Kamptee
    baseLengthKm: 10.5,
  },
  {
    id: 'central-avenue-corridor',
    name: 'Central Avenue Arterial (East-West)',
    shortName: 'Central Ave (East)',
    code: 'R-03',
    corridorType: 'Radial Arterial',
    description: 'Commercial lifeline connecting Sitabuldi to East wholesale markets and Pardi',
    junctionIds: [17, 22, 25, 5, 21, 8, 29], // Variety -> Sitabuldi -> Cotton Market -> Golibar -> Itwari -> Vaishnodevi -> Pardi
    baseLengthKm: 7.6,
  },
  {
    id: 'amravati-whc-corridor',
    name: 'Amravati Road / WHC Corridor (West)',
    shortName: 'Amravati / WHC (West)',
    code: 'R-04',
    corridorType: 'Radial Arterial',
    description: 'Western corridor connecting Civil Lines, Dharampeth, and Law College Square',
    junctionIds: [23, 10, 17, 18, 20, 15, 19], // RBI -> KP -> Variety -> Jhansi Rani -> Kachipura -> Shankar Nagar -> LAD
    baseLengthKm: 5.4,
  },
  {
    id: 'south-ambazari-vnit-corridor',
    name: 'South Ambazari & VNIT Campus Corridor',
    shortName: 'VNIT / Ambazari',
    code: 'R-05',
    corridorType: 'Radial Arterial',
    description: 'Connecting Lokmat to Bajaj Nagar, VNIT, Mate Square & Hingna',
    junctionIds: [2, 20, 16, 13, 14, 28, 31], // Lokmat -> Kachipura -> Ajit Bakery -> Laxmi Nagar -> Shraddhanand -> Mate -> Hingna
    baseLengthKm: 6.8,
  },
  {
    id: 'ring-road-south-belt',
    name: 'Nagpur Outer Ring Road (South Belt)',
    shortName: 'Ring Road (South)',
    code: 'RR-01',
    corridorType: 'Ring Road',
    description: 'High-speed bypass from Hingna through Pratap Nagar, Manewada to Dighori',
    junctionIds: [31, 33, 28, 35, 32, 36], // Hingna -> Pratap Nagar -> Mate -> Chhatrapati -> Manewada -> Dighori
    baseLengthKm: 11.5,
  },
  {
    id: 'ring-road-north-belt',
    name: 'Nagpur Outer Ring Road (North Belt)',
    shortName: 'Ring Road (North)',
    code: 'RR-02',
    corridorType: 'Ring Road',
    description: 'Northern arc connecting Mankapur, Koradi, Indora, and Automotive',
    junctionIds: [27, 26, 7, 6, 12, 29], // Katol Road -> Mankapur -> Mental Hospital -> Indora -> Automotive -> Pardi
    baseLengthKm: 13.2,
  },
  {
    id: 'great-nag-road-corridor',
    name: 'Great Nag Road Medical Corridor',
    shortName: 'Medical / Sakkardara',
    code: 'R-06',
    corridorType: 'Radial Arterial',
    description: 'Emergency route linking Cotton Market, Medical Square, Sakkardara, and Dighori',
    junctionIds: [25, 24, 39, 36], // Cotton Market -> Medical -> Sakkardara -> Dighori
    baseLengthKm: 5.8,
  },
];
