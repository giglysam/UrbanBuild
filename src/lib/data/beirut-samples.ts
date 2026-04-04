export type BeirutSample = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  defaultRadiusM: number;
};

export const BEIRUT_SAMPLES: BeirutSample[] = [
  {
    id: "downtown",
    name: "Downtown Beirut",
    description: "Central business and civic core",
    lat: 33.8938,
    lng: 35.5018,
    defaultRadiusM: 600,
  },
  {
    id: "gemmayzeh",
    name: "Gemmayzeh / Mar Mikhael",
    description: "Dense mixed-use corridor",
    lat: 33.8972,
    lng: 35.5174,
    defaultRadiusM: 500,
  },
  {
    id: "hamra",
    name: "Hamra",
    description: "Retail and residential intensity",
    lat: 33.8963,
    lng: 35.4823,
    defaultRadiusM: 550,
  },
  {
    id: "basta",
    name: "Basta",
    description: "Historic fabric, mixed conditions",
    lat: 33.8845,
    lng: 35.5035,
    defaultRadiusM: 450,
  },
  {
    id: "waterfront",
    name: "Waterfront edge (Ain Mreisseh)",
    description: "Coastal public realm adjacency",
    lat: 33.9012,
    lng: 35.4839,
    defaultRadiusM: 500,
  },
  {
    id: "peri-central",
    name: "Peri-central residential (Achrafieh slope)",
    description: "Topographic variation, residential grain",
    lat: 33.8889,
    lng: 35.5202,
    defaultRadiusM: 600,
  },
];

export const BEIRUT_DEFAULT_VIEW = {
  lat: 33.8938,
  lng: 35.5018,
  zoom: 12,
};
