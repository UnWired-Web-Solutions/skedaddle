// Auto-generated dashboard data — rebuilt from verified Salesforce exports
// Source: Kira Dowd's Salesforce data (Jul 24, 2026)
// File 1: 1_JobsByTerritory.csv (DO jobs / sold quotes, Jul 2025 - Jun 2026)
// File 3: 3_RevenueByTerritory.csv (monthly revenue by territory)
// GSC/GBP: preserved from previous verified sources
// NO FABRICATED DATA — only verified Salesforce numbers used
export interface SpeciesData {
  species: string;
  total_revenue: number;
  total_jobs: number;
}
export interface SuburbData {
  suburb: string;
  revenue: number;
  jobs: number;
}
export interface GscMonthly {
  month: string;
  clicks: number;
  impressions: number;
  avg_position: number;
}
export interface GbpMonthly {
  month: string;
  searches: number;
  calls: number;
  website_clicks: number;
}
export interface LocationDashboard {
  id: string;
  name: string;
  currency: "CAD" | "USD";
  total_revenue: number;
  total_jobs: number;
  species: SpeciesData[];
  suburbs: SuburbData[];
  gsc: {
    monthly: GscMonthly[];
    total_clicks: number;
    total_impressions: number;
    recent_clicks: number;
  };
  gbp: {
    monthly: GbpMonthly[];
    total_searches: number;
    total_calls: number;
    total_clicks: number;
  };
}
export const DASHBOARD_DATA: Record<string, LocationDashboard> = {
  "hamilton": {
    "id": "hamilton",
    "name": "Hamilton",
    "currency": "CAD",
    "total_revenue": 4205749.92,
    "total_jobs": 2000,
    "species": [
      {
        "species": "Raccoons",
        "total_revenue": 1495898.93,
        "total_jobs": 694
      },
      {
        "species": "Squirrels",
        "total_revenue": 912622.62,
        "total_jobs": 514
      },
      {
        "species": "Bats",
        "total_revenue": 669338.64,
        "total_jobs": 241
      },
      {
        "species": "Mice",
        "total_revenue": 534591.41,
        "total_jobs": 162
      },
      {
        "species": "Skunks",
        "total_revenue": 193161.4,
        "total_jobs": 103
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 143452.8,
        "total_jobs": 66
      },
      {
        "species": "Birds",
        "total_revenue": 120177.93,
        "total_jobs": 149
      },
      {
        "species": "Rats",
        "total_revenue": 73430.7,
        "total_jobs": 34
      },
      {
        "species": "Prevention only",
        "total_revenue": 18909.75,
        "total_jobs": 11
      },
      {
        "species": "Chipmunks",
        "total_revenue": 13260.5,
        "total_jobs": 5
      },
      {
        "species": "Rabbits",
        "total_revenue": 11918.0,
        "total_jobs": 7
      },
      {
        "species": "Foxes",
        "total_revenue": 7842.0,
        "total_jobs": 4
      },
      {
        "species": "Groundhogs",
        "total_revenue": 6762.0,
        "total_jobs": 3
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 1257.0,
        "total_jobs": 2
      },
      {
        "species": "Clean Up",
        "total_revenue": 1240.0,
        "total_jobs": 1
      },
      {
        "species": "Pigeons",
        "total_revenue": 1096.24,
        "total_jobs": 2
      },
      {
        "species": "Opossums",
        "total_revenue": 395.0,
        "total_jobs": 1
      },
      {
        "species": "Unknown Species",
        "total_revenue": 395.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Hamilton",
        "revenue": 533803.99,
        "jobs": 265
      },
      {
        "suburb": "Guelph",
        "revenue": 329893.83,
        "jobs": 147
      },
      {
        "suburb": "Oakville",
        "revenue": 301866.66,
        "jobs": 167
      },
      {
        "suburb": "St. Catharines",
        "revenue": 273036.82,
        "jobs": 130
      },
      {
        "suburb": "Burlington",
        "revenue": 250101.68,
        "jobs": 122
      },
      {
        "suburb": "Mississauga",
        "revenue": 214762.41,
        "jobs": 106
      },
      {
        "suburb": "Kitchener",
        "revenue": 204888.16,
        "jobs": 105
      },
      {
        "suburb": "Niagara Falls",
        "revenue": 182583.15,
        "jobs": 80
      },
      {
        "suburb": "Ancaster",
        "revenue": 179132.57,
        "jobs": 84
      },
      {
        "suburb": "Cambridge",
        "revenue": 162040.96,
        "jobs": 72
      },
      {
        "suburb": "Waterloo",
        "revenue": 157238.93,
        "jobs": 75
      },
      {
        "suburb": "Brampton",
        "revenue": 116280.6,
        "jobs": 55
      },
      {
        "suburb": "Niagara-on-the-Lake",
        "revenue": 114351.62,
        "jobs": 45
      },
      {
        "suburb": "Dundas",
        "revenue": 100508.75,
        "jobs": 47
      },
      {
        "suburb": "Brantford",
        "revenue": 92397.9,
        "jobs": 40
      },
      {
        "suburb": "Fort Erie",
        "revenue": 87694.23,
        "jobs": 40
      },
      {
        "suburb": "Stoney Creek",
        "revenue": 78717.76,
        "jobs": 36
      },
      {
        "suburb": "Milton",
        "revenue": 69061.96,
        "jobs": 36
      },
      {
        "suburb": "Ridgeway",
        "revenue": 54138.17,
        "jobs": 19
      },
      {
        "suburb": "Thorold",
        "revenue": 54082.99,
        "jobs": 31
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 81,
          "calls": 149,
          "website_clicks": 130
        },
        {
          "month": "Nov 2024",
          "searches": 76,
          "calls": 142,
          "website_clicks": 115
        },
        {
          "month": "Dec 2024",
          "searches": 58,
          "calls": 115,
          "website_clicks": 100
        },
        {
          "month": "Jan 2025",
          "searches": 147,
          "calls": 113,
          "website_clicks": 94
        },
        {
          "month": "Feb 2025",
          "searches": 49,
          "calls": 80,
          "website_clicks": 80
        },
        {
          "month": "Mar 2025",
          "searches": 42,
          "calls": 61,
          "website_clicks": 76
        },
        {
          "month": "Apr 2025",
          "searches": 77,
          "calls": 95,
          "website_clicks": 106
        },
        {
          "month": "May 2025",
          "searches": 108,
          "calls": 164,
          "website_clicks": 123
        },
        {
          "month": "Jun 2025",
          "searches": 69,
          "calls": 134,
          "website_clicks": 122
        },
        {
          "month": "Jul 2025",
          "searches": 88,
          "calls": 99,
          "website_clicks": 95
        },
        {
          "month": "Aug 2025",
          "searches": 86,
          "calls": 140,
          "website_clicks": 103
        },
        {
          "month": "Sep 2025",
          "searches": 102,
          "calls": 124,
          "website_clicks": 91
        },
        {
          "month": "Oct 2025",
          "searches": 100,
          "calls": 111,
          "website_clicks": 73
        },
        {
          "month": "Nov 2025",
          "searches": 64,
          "calls": 86,
          "website_clicks": 70
        },
        {
          "month": "Dec 2025",
          "searches": 116,
          "calls": 71,
          "website_clicks": 52
        },
        {
          "month": "Jan 2026",
          "searches": 84,
          "calls": 70,
          "website_clicks": 71
        },
        {
          "month": "Feb 2026",
          "searches": 59,
          "calls": 71,
          "website_clicks": 56
        },
        {
          "month": "Mar 2026",
          "searches": 98,
          "calls": 98,
          "website_clicks": 96
        },
        {
          "month": "Apr 2026",
          "searches": 78,
          "calls": 121,
          "website_clicks": 96
        },
        {
          "month": "May 2026",
          "searches": 98,
          "calls": 151,
          "website_clicks": 116
        },
        {
          "month": "Jun 2026",
          "searches": 92,
          "calls": 126,
          "website_clicks": 99
        }
      ],
      "total_searches": 1772,
      "total_calls": 2321,
      "total_clicks": 1964
    }
  },
  "durham": {
    "id": "durham",
    "name": "Durham",
    "currency": "CAD",
    "total_revenue": 4083486.61,
    "total_jobs": 1463,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 1074556.14,
        "total_jobs": 245
      },
      {
        "species": "Raccoons",
        "total_revenue": 933324.56,
        "total_jobs": 398
      },
      {
        "species": "Squirrels",
        "total_revenue": 817653.84,
        "total_jobs": 380
      },
      {
        "species": "Bats",
        "total_revenue": 814045.92,
        "total_jobs": 193
      },
      {
        "species": "Skunks",
        "total_revenue": 124527.0,
        "total_jobs": 51
      },
      {
        "species": "Rats",
        "total_revenue": 115262.95,
        "total_jobs": 30
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 87594.5,
        "total_jobs": 36
      },
      {
        "species": "Birds",
        "total_revenue": 68623.45,
        "total_jobs": 98
      },
      {
        "species": "Prevention only",
        "total_revenue": 11532.25,
        "total_jobs": 7
      },
      {
        "species": "Chipmunks",
        "total_revenue": 9932.0,
        "total_jobs": 5
      },
      {
        "species": "Groundhogs",
        "total_revenue": 8871.0,
        "total_jobs": 4
      },
      {
        "species": "Insulation",
        "total_revenue": 3957.0,
        "total_jobs": 2
      },
      {
        "species": "Rabbits",
        "total_revenue": 3340.0,
        "total_jobs": 3
      },
      {
        "species": "Pigeons",
        "total_revenue": 3073.0,
        "total_jobs": 3
      },
      {
        "species": "Foxes",
        "total_revenue": 2884.0,
        "total_jobs": 1
      },
      {
        "species": "Clean Up",
        "total_revenue": 2100.0,
        "total_jobs": 2
      },
      {
        "species": "Unknown Species",
        "total_revenue": 1419.0,
        "total_jobs": 2
      },
      {
        "species": "Opossums",
        "total_revenue": 395.0,
        "total_jobs": 2
      },
      {
        "species": "Snakes",
        "total_revenue": 395.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Oshawa",
        "revenue": 321852.38,
        "jobs": 140
      },
      {
        "suburb": "Whitby",
        "revenue": 261046.0,
        "jobs": 101
      },
      {
        "suburb": "Peterborough",
        "revenue": 214368.35,
        "jobs": 77
      },
      {
        "suburb": "Ajax",
        "revenue": 202569.55,
        "jobs": 75
      },
      {
        "suburb": "Toronto",
        "revenue": 200249.95,
        "jobs": 118
      },
      {
        "suburb": "North York",
        "revenue": 174568.5,
        "jobs": 52
      },
      {
        "suburb": "Pickering",
        "revenue": 166775.9,
        "jobs": 61
      },
      {
        "suburb": "Markham",
        "revenue": 147126.1,
        "jobs": 48
      },
      {
        "suburb": "Barrie",
        "revenue": 146965.72,
        "jobs": 52
      },
      {
        "suburb": "Newmarket",
        "revenue": 122141.9,
        "jobs": 45
      },
      {
        "suburb": "Cobourg",
        "revenue": 106911.9,
        "jobs": 37
      },
      {
        "suburb": "Scarborough",
        "revenue": 100012.68,
        "jobs": 39
      },
      {
        "suburb": "Aurora",
        "revenue": 99686.85,
        "jobs": 34
      },
      {
        "suburb": "Etobicoke",
        "revenue": 91572.25,
        "jobs": 39
      },
      {
        "suburb": "Port Hope",
        "revenue": 89323.25,
        "jobs": 32
      },
      {
        "suburb": "Bowmanville",
        "revenue": 87278.24,
        "jobs": 31
      },
      {
        "suburb": "Courtice",
        "revenue": 75893.7,
        "jobs": 30
      },
      {
        "suburb": "Brooklin",
        "revenue": 72817.6,
        "jobs": 29
      },
      {
        "suburb": "Whitchurch-Stouffville",
        "revenue": 63680.1,
        "jobs": 22
      },
      {
        "suburb": "Port Perry",
        "revenue": 56088.1,
        "jobs": 17
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 72,
          "website_clicks": 57
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 76,
          "website_clicks": 58
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 32,
          "website_clicks": 28
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 44,
          "website_clicks": 34
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 28,
          "website_clicks": 35
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 44,
          "website_clicks": 32
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 51,
          "website_clicks": 66
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 90,
          "website_clicks": 76
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 88,
          "website_clicks": 52
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 65,
          "website_clicks": 71
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 89,
          "website_clicks": 49
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 53,
          "website_clicks": 45
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 47,
          "website_clicks": 49
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 45,
          "website_clicks": 34
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 34,
          "website_clicks": 26
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 30,
          "website_clicks": 41
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 32,
          "website_clicks": 30
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 59,
          "website_clicks": 55
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 76,
          "website_clicks": 56
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 95,
          "website_clicks": 87
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 78,
          "website_clicks": 67
        }
      ],
      "total_searches": 0,
      "total_calls": 1228,
      "total_clicks": 1048
    }
  },
  "ottawa": {
    "id": "ottawa",
    "name": "Ottawa",
    "currency": "CAD",
    "total_revenue": 2999469.45,
    "total_jobs": 1399,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 1113154.24,
        "total_jobs": 408
      },
      {
        "species": "Raccoons",
        "total_revenue": 808583.63,
        "total_jobs": 354
      },
      {
        "species": "Squirrels",
        "total_revenue": 447151.15,
        "total_jobs": 238
      },
      {
        "species": "Bats",
        "total_revenue": 332784.81,
        "total_jobs": 163
      },
      {
        "species": "Birds",
        "total_revenue": 82441.92,
        "total_jobs": 125
      },
      {
        "species": "Rats",
        "total_revenue": 67549.3,
        "total_jobs": 31
      },
      {
        "species": "Skunks",
        "total_revenue": 48707.0,
        "total_jobs": 23
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 33698.75,
        "total_jobs": 20
      },
      {
        "species": "Prevention only",
        "total_revenue": 28325.15,
        "total_jobs": 15
      },
      {
        "species": "Groundhogs",
        "total_revenue": 20085.5,
        "total_jobs": 7
      },
      {
        "species": "Rabbits",
        "total_revenue": 5612.0,
        "total_jobs": 2
      },
      {
        "species": "Unknown Species",
        "total_revenue": 5206.0,
        "total_jobs": 7
      },
      {
        "species": "Pigeons",
        "total_revenue": 3263.0,
        "total_jobs": 2
      },
      {
        "species": "Chipmunks",
        "total_revenue": 1802.0,
        "total_jobs": 2
      },
      {
        "species": "Clean Up",
        "total_revenue": 1105.0,
        "total_jobs": 2
      }
    ],
    "suburbs": [
      {
        "suburb": "Ottawa",
        "revenue": 787574.78,
        "jobs": 407
      },
      {
        "suburb": "Kanata",
        "revenue": 426390.82,
        "jobs": 187
      },
      {
        "suburb": "Stittsville",
        "revenue": 320919.4,
        "jobs": 134
      },
      {
        "suburb": "Orleans",
        "revenue": 279965.56,
        "jobs": 124
      },
      {
        "suburb": "Nepean",
        "revenue": 241108.37,
        "jobs": 114
      },
      {
        "suburb": "Barrhaven",
        "revenue": 195742.69,
        "jobs": 92
      },
      {
        "suburb": "Gloucester",
        "revenue": 139953.05,
        "jobs": 68
      },
      {
        "suburb": "Carleton Place",
        "revenue": 81294.68,
        "jobs": 37
      },
      {
        "suburb": "Manotick",
        "revenue": 52517.85,
        "jobs": 25
      },
      {
        "suburb": "North Gower",
        "revenue": 37136.1,
        "jobs": 13
      },
      {
        "suburb": "Carp",
        "revenue": 35767.95,
        "jobs": 20
      },
      {
        "suburb": "Greely",
        "revenue": 25952.25,
        "jobs": 8
      },
      {
        "suburb": "Richmond",
        "revenue": 22659.1,
        "jobs": 12
      },
      {
        "suburb": "Almonte",
        "revenue": 22088.2,
        "jobs": 13
      },
      {
        "suburb": "Orl\u00e9ans",
        "revenue": 21557.5,
        "jobs": 10
      },
      {
        "suburb": "Kemptville",
        "revenue": 20733.0,
        "jobs": 9
      },
      {
        "suburb": "Dunrobin",
        "revenue": 18936.5,
        "jobs": 8
      },
      {
        "suburb": "Embrun",
        "revenue": 18895.5,
        "jobs": 7
      },
      {
        "suburb": "Mississippi Mills",
        "revenue": 15827.75,
        "jobs": 5
      },
      {
        "suburb": "Vanier",
        "revenue": 15046.5,
        "jobs": 8
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 196,
          "website_clicks": 297
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 236,
          "website_clicks": 298
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 157,
          "website_clicks": 192
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 149,
          "website_clicks": 236
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 121,
          "website_clicks": 164
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 125,
          "website_clicks": 177
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 260,
          "website_clicks": 371
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 349,
          "website_clicks": 450
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 277,
          "website_clicks": 321
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 300,
          "website_clicks": 365
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 287,
          "website_clicks": 381
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 248,
          "website_clicks": 256
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 236,
          "website_clicks": 231
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 173,
          "website_clicks": 178
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 126,
          "website_clicks": 152
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 114,
          "website_clicks": 138
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 95,
          "website_clicks": 131
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 157,
          "website_clicks": 188
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 258,
          "website_clicks": 295
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 353,
          "website_clicks": 386
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 229,
          "website_clicks": 260
        }
      ],
      "total_searches": 0,
      "total_calls": 4446,
      "total_clicks": 5467
    }
  },
  "minneapolis": {
    "id": "minneapolis",
    "name": "Minneapolis",
    "currency": "USD",
    "total_revenue": 1946510.66,
    "total_jobs": 802,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 747969.62,
        "total_jobs": 220
      },
      {
        "species": "Squirrels",
        "total_revenue": 481856.97,
        "total_jobs": 260
      },
      {
        "species": "Bats",
        "total_revenue": 433367.52,
        "total_jobs": 154
      },
      {
        "species": "Raccoons",
        "total_revenue": 128193.25,
        "total_jobs": 66
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 54440.0,
        "total_jobs": 29
      },
      {
        "species": "Birds",
        "total_revenue": 44004.2,
        "total_jobs": 47
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 15641.0,
        "total_jobs": 4
      },
      {
        "species": "Prevention only",
        "total_revenue": 11930.0,
        "total_jobs": 6
      },
      {
        "species": "Rats",
        "total_revenue": 9495.0,
        "total_jobs": 3
      },
      {
        "species": "Opossums",
        "total_revenue": 8220.0,
        "total_jobs": 6
      },
      {
        "species": "Skunks",
        "total_revenue": 4990.0,
        "total_jobs": 3
      },
      {
        "species": "Clean Up",
        "total_revenue": 4712.1,
        "total_jobs": 2
      },
      {
        "species": "Pigeons",
        "total_revenue": 1491.0,
        "total_jobs": 1
      },
      {
        "species": "Unknown Species",
        "total_revenue": 200.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Minneapolis",
        "revenue": 639696.72,
        "jobs": 265
      },
      {
        "suburb": "Saint Paul",
        "revenue": 288502.33,
        "jobs": 130
      },
      {
        "suburb": "Eden Prairie",
        "revenue": 64111.6,
        "jobs": 21
      },
      {
        "suburb": "Eagan",
        "revenue": 45650.49,
        "jobs": 19
      },
      {
        "suburb": "Maple Grove",
        "revenue": 41442.5,
        "jobs": 19
      },
      {
        "suburb": "Plymouth",
        "revenue": 34960.23,
        "jobs": 17
      },
      {
        "suburb": "Minnetonka",
        "revenue": 33706.0,
        "jobs": 15
      },
      {
        "suburb": "Bloomington",
        "revenue": 33374.6,
        "jobs": 13
      },
      {
        "suburb": "Woodbury",
        "revenue": 33348.75,
        "jobs": 14
      },
      {
        "suburb": "Hopkins",
        "revenue": 29372.0,
        "jobs": 10
      },
      {
        "suburb": "Andover",
        "revenue": 22647.0,
        "jobs": 7
      },
      {
        "suburb": "Prior Lake",
        "revenue": 21936.25,
        "jobs": 7
      },
      {
        "suburb": "Ham Lake",
        "revenue": 21897.5,
        "jobs": 8
      },
      {
        "suburb": "North Oaks",
        "revenue": 20703.75,
        "jobs": 5
      },
      {
        "suburb": "Inver Grove Heights",
        "revenue": 19632.7,
        "jobs": 10
      },
      {
        "suburb": "Stillwater",
        "revenue": 18650.0,
        "jobs": 5
      },
      {
        "suburb": "Ramsey",
        "revenue": 17673.0,
        "jobs": 7
      },
      {
        "suburb": "Blaine",
        "revenue": 17655.0,
        "jobs": 9
      },
      {
        "suburb": "Apple Valley",
        "revenue": 15715.0,
        "jobs": 10
      },
      {
        "suburb": "Shoreview",
        "revenue": 15066.75,
        "jobs": 7
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 77
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 79
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 60
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 75
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 53
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 54
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 108
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 105
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 134
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 3,
          "website_clicks": 115
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 144
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 100
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 70
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 9,
          "website_clicks": 80
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 58
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 7,
          "website_clicks": 66
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 9,
          "website_clicks": 81
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 12,
          "website_clicks": 103
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 12,
          "website_clicks": 88
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 20,
          "website_clicks": 109
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 30,
          "website_clicks": 71
        }
      ],
      "total_searches": 0,
      "total_calls": 173,
      "total_clicks": 1830
    }
  },
  "montreal": {
    "id": "montreal",
    "name": "Montreal",
    "currency": "CAD",
    "total_revenue": 1223667.46,
    "total_jobs": 740,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 366658.93,
        "total_jobs": 143
      },
      {
        "species": "Raccoons",
        "total_revenue": 280790.81,
        "total_jobs": 176
      },
      {
        "species": "Squirrels",
        "total_revenue": 270949.49,
        "total_jobs": 232
      },
      {
        "species": "Bats",
        "total_revenue": 146129.39,
        "total_jobs": 51
      },
      {
        "species": "Birds",
        "total_revenue": 57775.1,
        "total_jobs": 85
      },
      {
        "species": "Skunks",
        "total_revenue": 48477.82,
        "total_jobs": 24
      },
      {
        "species": "Groundhogs",
        "total_revenue": 33291.92,
        "total_jobs": 19
      },
      {
        "species": "Rats",
        "total_revenue": 7232.0,
        "total_jobs": 3
      },
      {
        "species": "Foxes",
        "total_revenue": 5470.0,
        "total_jobs": 1
      },
      {
        "species": "Chipmunks",
        "total_revenue": 3912.0,
        "total_jobs": 2
      },
      {
        "species": "Clean Up",
        "total_revenue": 1285.0,
        "total_jobs": 1
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 1000.0,
        "total_jobs": 1
      },
      {
        "species": "Unknown Species",
        "total_revenue": 695.0,
        "total_jobs": 2
      }
    ],
    "suburbs": [
      {
        "suburb": "Montr\u00e9al",
        "revenue": 169066.2,
        "jobs": 136
      },
      {
        "suburb": "Beaconsfield",
        "revenue": 102383.18,
        "jobs": 46
      },
      {
        "suburb": "Dollard-des-Ormeaux",
        "revenue": 78186.36,
        "jobs": 42
      },
      {
        "suburb": "Kirkland",
        "revenue": 65352.6,
        "jobs": 42
      },
      {
        "suburb": "Pierrefonds",
        "revenue": 58876.45,
        "jobs": 42
      },
      {
        "suburb": "C\u00f4te Saint-Luc",
        "revenue": 46612.62,
        "jobs": 25
      },
      {
        "suburb": "Pointe-Claire",
        "revenue": 45728.62,
        "jobs": 30
      },
      {
        "suburb": "Saint-Lazare",
        "revenue": 42461.4,
        "jobs": 23
      },
      {
        "suburb": "Cornwall",
        "revenue": 41796.0,
        "jobs": 14
      },
      {
        "suburb": "Pincourt",
        "revenue": 37770.9,
        "jobs": 20
      },
      {
        "suburb": "Vaudreuil-Dorion",
        "revenue": 33070.0,
        "jobs": 21
      },
      {
        "suburb": "Brossard",
        "revenue": 29638.98,
        "jobs": 16
      },
      {
        "suburb": "Laval",
        "revenue": 25996.49,
        "jobs": 19
      },
      {
        "suburb": "Hampstead",
        "revenue": 24647.0,
        "jobs": 14
      },
      {
        "suburb": "Hudson",
        "revenue": 22040.0,
        "jobs": 11
      },
      {
        "suburb": "Notre-Dame-de-l'\u00cele-Perrot",
        "revenue": 21285.4,
        "jobs": 12
      },
      {
        "suburb": "Montreal",
        "revenue": 21189.44,
        "jobs": 17
      },
      {
        "suburb": "Longueuil",
        "revenue": 19832.0,
        "jobs": 12
      },
      {
        "suburb": "L'\u00cele-Perrot",
        "revenue": 16857.58,
        "jobs": 10
      },
      {
        "suburb": "Westmount",
        "revenue": 16420.1,
        "jobs": 15
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 119,
          "website_clicks": 162
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 127,
          "website_clicks": 155
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 107,
          "website_clicks": 116
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 54,
          "website_clicks": 84
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 58,
          "website_clicks": 92
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 81,
          "website_clicks": 120
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 158,
          "website_clicks": 198
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 247,
          "website_clicks": 258
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 196,
          "website_clicks": 226
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 135,
          "website_clicks": 185
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 132,
          "website_clicks": 188
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 75,
          "website_clicks": 128
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 63,
          "website_clicks": 73
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 85,
          "website_clicks": 98
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 75,
          "website_clicks": 81
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 62,
          "website_clicks": 71
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 51,
          "website_clicks": 77
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 60,
          "website_clicks": 131
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 150,
          "website_clicks": 206
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 171,
          "website_clicks": 221
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 146,
          "website_clicks": 156
        }
      ],
      "total_searches": 0,
      "total_calls": 2352,
      "total_clicks": 3026
    }
  },
  "london": {
    "id": "london",
    "name": "London",
    "currency": "CAD",
    "total_revenue": 1053476.8,
    "total_jobs": 380,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 345291.55,
        "total_jobs": 89
      },
      {
        "species": "Raccoons",
        "total_revenue": 325811.55,
        "total_jobs": 135
      },
      {
        "species": "Squirrels",
        "total_revenue": 129922.1,
        "total_jobs": 57
      },
      {
        "species": "Bats",
        "total_revenue": 108916.5,
        "total_jobs": 34
      },
      {
        "species": "Skunks",
        "total_revenue": 65962.75,
        "total_jobs": 28
      },
      {
        "species": "Rats",
        "total_revenue": 53648.55,
        "total_jobs": 17
      },
      {
        "species": "Birds",
        "total_revenue": 10750.0,
        "total_jobs": 14
      },
      {
        "species": "Groundhogs",
        "total_revenue": 10572.05,
        "total_jobs": 4
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 2226.75,
        "total_jobs": 1
      },
      {
        "species": "Prevention only",
        "total_revenue": 375.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "London",
        "revenue": 864809.05,
        "jobs": 317
      },
      {
        "suburb": "Strathroy",
        "revenue": 25284.45,
        "jobs": 12
      },
      {
        "suburb": "St. Thomas",
        "revenue": 24519.85,
        "jobs": 12
      },
      {
        "suburb": "Ilderton",
        "revenue": 22838.6,
        "jobs": 5
      },
      {
        "suburb": "Komoka",
        "revenue": 20738.6,
        "jobs": 6
      },
      {
        "suburb": "Saint Marys",
        "revenue": 13647.1,
        "jobs": 5
      },
      {
        "suburb": "Arva",
        "revenue": 11858.2,
        "jobs": 2
      },
      {
        "suburb": "Ailsa Craig",
        "revenue": 8354.5,
        "jobs": 3
      },
      {
        "suburb": "Dorchester",
        "revenue": 7317.5,
        "jobs": 2
      },
      {
        "suburb": "Eden",
        "revenue": 6800.75,
        "jobs": 2
      },
      {
        "suburb": "Granton",
        "revenue": 6721.4,
        "jobs": 1
      },
      {
        "suburb": "Ingersoll",
        "revenue": 5836.75,
        "jobs": 2
      },
      {
        "suburb": "Mount Brydges",
        "revenue": 5280.0,
        "jobs": 2
      },
      {
        "suburb": "Melbourne",
        "revenue": 5013.0,
        "jobs": 1
      },
      {
        "suburb": "Thamesford",
        "revenue": 4637.6,
        "jobs": 1
      },
      {
        "suburb": "Springfield",
        "revenue": 4146.85,
        "jobs": 1
      },
      {
        "suburb": "Wallacetown",
        "revenue": 3786.45,
        "jobs": 1
      },
      {
        "suburb": "Aylmer",
        "revenue": 3266.75,
        "jobs": 1
      },
      {
        "suburb": "Tillsonburg",
        "revenue": 2831.4,
        "jobs": 1
      },
      {
        "suburb": "Thorndale",
        "revenue": 2500.0,
        "jobs": 1
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 51,
          "website_clicks": 66
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 59,
          "website_clicks": 63
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 35,
          "website_clicks": 35
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 40,
          "website_clicks": 56
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 31,
          "website_clicks": 48
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 48,
          "website_clicks": 51
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 88,
          "website_clicks": 120
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 107,
          "website_clicks": 94
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 78,
          "website_clicks": 75
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 75,
          "website_clicks": 84
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 71,
          "website_clicks": 77
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 48,
          "website_clicks": 59
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 42,
          "website_clicks": 27
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 36,
          "website_clicks": 38
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 39,
          "website_clicks": 31
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 25,
          "website_clicks": 36
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 24,
          "website_clicks": 46
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 48,
          "website_clicks": 55
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 58,
          "website_clicks": 63
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 82,
          "website_clicks": 100
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 61,
          "website_clicks": 61
        }
      ],
      "total_searches": 0,
      "total_calls": 1146,
      "total_clicks": 1285
    }
  },
  "madison": {
    "id": "madison",
    "name": "Madison",
    "currency": "USD",
    "total_revenue": 975778.15,
    "total_jobs": 333,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 468845.8,
        "total_jobs": 107
      },
      {
        "species": "Bats",
        "total_revenue": 193972.05,
        "total_jobs": 62
      },
      {
        "species": "Squirrels",
        "total_revenue": 121710.5,
        "total_jobs": 50
      },
      {
        "species": "Raccoons",
        "total_revenue": 104972.6,
        "total_jobs": 46
      },
      {
        "species": "Birds",
        "total_revenue": 43040.0,
        "total_jobs": 49
      },
      {
        "species": "Chipmunks",
        "total_revenue": 15019.5,
        "total_jobs": 5
      },
      {
        "species": "Rats",
        "total_revenue": 7523.5,
        "total_jobs": 2
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 6322.25,
        "total_jobs": 3
      },
      {
        "species": "Clean Up",
        "total_revenue": 4565.0,
        "total_jobs": 2
      },
      {
        "species": "Prevention only",
        "total_revenue": 4386.0,
        "total_jobs": 4
      },
      {
        "species": "Skunks",
        "total_revenue": 2050.0,
        "total_jobs": 1
      },
      {
        "species": "Opossums",
        "total_revenue": 1850.0,
        "total_jobs": 1
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 1520.95,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Madison",
        "revenue": 529680.6,
        "jobs": 175
      },
      {
        "suburb": "Middleton",
        "revenue": 85483.05,
        "jobs": 27
      },
      {
        "suburb": "Verona",
        "revenue": 58137.05,
        "jobs": 24
      },
      {
        "suburb": "Fitchburg",
        "revenue": 44608.0,
        "jobs": 17
      },
      {
        "suburb": "Waunakee",
        "revenue": 35568.25,
        "jobs": 12
      },
      {
        "suburb": "Oregon",
        "revenue": 30981.0,
        "jobs": 12
      },
      {
        "suburb": "Mount Horeb",
        "revenue": 27613.75,
        "jobs": 5
      },
      {
        "suburb": "Sun Prairie",
        "revenue": 24137.0,
        "jobs": 10
      },
      {
        "suburb": "Mazomanie",
        "revenue": 19989.25,
        "jobs": 4
      },
      {
        "suburb": "Monona",
        "revenue": 18817.0,
        "jobs": 7
      },
      {
        "suburb": "Stoughton",
        "revenue": 17054.0,
        "jobs": 7
      },
      {
        "suburb": "McFarland",
        "revenue": 16761.0,
        "jobs": 6
      },
      {
        "suburb": "Columbus",
        "revenue": 10985.0,
        "jobs": 3
      },
      {
        "suburb": "Belleville",
        "revenue": 9791.0,
        "jobs": 2
      },
      {
        "suburb": "DeForest",
        "revenue": 8366.0,
        "jobs": 8
      },
      {
        "suburb": "New Glarus",
        "revenue": 5444.75,
        "jobs": 2
      },
      {
        "suburb": "Cottage Grove",
        "revenue": 5401.7,
        "jobs": 1
      },
      {
        "suburb": "Cross Plains",
        "revenue": 4670.95,
        "jobs": 2
      },
      {
        "suburb": "Fall River",
        "revenue": 3831.55,
        "jobs": 1
      },
      {
        "suburb": "Evansville",
        "revenue": 3564.0,
        "jobs": 2
      }
    ],
    "gsc": {
      "monthly": [
        {
          "month": "2026-01",
          "clicks": 1960,
          "impressions": 845103,
          "avg_position": 4.0
        },
        {
          "month": "2026-02",
          "clicks": 1589,
          "impressions": 780518,
          "avg_position": 3.4
        },
        {
          "month": "2026-03",
          "clicks": 1696,
          "impressions": 788920,
          "avg_position": 3.9
        },
        {
          "month": "2026-04",
          "clicks": 1678,
          "impressions": 560439,
          "avg_position": 6.6
        },
        {
          "month": "2026-05",
          "clicks": 1977,
          "impressions": 354602,
          "avg_position": 9.7
        },
        {
          "month": "2026-06",
          "clicks": 1510,
          "impressions": 312661,
          "avg_position": 9.3
        },
        {
          "month": "2026-07",
          "clicks": 179,
          "impressions": 44074,
          "avg_position": 10.5
        }
      ],
      "total_clicks": 10589,
      "total_impressions": 3686317,
      "recent_clicks": 3666
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 92,
          "calls": 35,
          "website_clicks": 129
        },
        {
          "month": "Nov 2024",
          "searches": 57,
          "calls": 15,
          "website_clicks": 92
        },
        {
          "month": "Dec 2024",
          "searches": 69,
          "calls": 27,
          "website_clicks": 90
        },
        {
          "month": "Jan 2025",
          "searches": 73,
          "calls": 30,
          "website_clicks": 71
        },
        {
          "month": "Feb 2025",
          "searches": 59,
          "calls": 12,
          "website_clicks": 81
        },
        {
          "month": "Mar 2025",
          "searches": 69,
          "calls": 19,
          "website_clicks": 92
        },
        {
          "month": "Apr 2025",
          "searches": 110,
          "calls": 24,
          "website_clicks": 167
        },
        {
          "month": "May 2025",
          "searches": 162,
          "calls": 49,
          "website_clicks": 214
        },
        {
          "month": "Jun 2025",
          "searches": 157,
          "calls": 54,
          "website_clicks": 195
        },
        {
          "month": "Jul 2025",
          "searches": 178,
          "calls": 51,
          "website_clicks": 152
        },
        {
          "month": "Aug 2025",
          "searches": 129,
          "calls": 41,
          "website_clicks": 148
        },
        {
          "month": "Sep 2025",
          "searches": 110,
          "calls": 43,
          "website_clicks": 101
        },
        {
          "month": "Oct 2025",
          "searches": 71,
          "calls": 32,
          "website_clicks": 67
        },
        {
          "month": "Nov 2025",
          "searches": 53,
          "calls": 31,
          "website_clicks": 69
        },
        {
          "month": "Dec 2025",
          "searches": 51,
          "calls": 15,
          "website_clicks": 78
        },
        {
          "month": "Jan 2026",
          "searches": 63,
          "calls": 27,
          "website_clicks": 75
        },
        {
          "month": "Feb 2026",
          "searches": 46,
          "calls": 21,
          "website_clicks": 80
        },
        {
          "month": "Mar 2026",
          "searches": 96,
          "calls": 38,
          "website_clicks": 98
        },
        {
          "month": "Apr 2026",
          "searches": 110,
          "calls": 46,
          "website_clicks": 184
        },
        {
          "month": "May 2026",
          "searches": 172,
          "calls": 59,
          "website_clicks": 295
        },
        {
          "month": "Jun 2026",
          "searches": 105,
          "calls": 42,
          "website_clicks": 206
        }
      ],
      "total_searches": 2032,
      "total_calls": 711,
      "total_clicks": 2684
    }
  },
  "milwaukee": {
    "id": "milwaukee",
    "name": "Milwaukee",
    "currency": "USD",
    "total_revenue": 972941.35,
    "total_jobs": 413,
    "species": [
      {
        "species": "Squirrels",
        "total_revenue": 291196.36,
        "total_jobs": 143
      },
      {
        "species": "Mice",
        "total_revenue": 257574.8,
        "total_jobs": 72
      },
      {
        "species": "Bats",
        "total_revenue": 181799.45,
        "total_jobs": 69
      },
      {
        "species": "Raccoons",
        "total_revenue": 159577.39,
        "total_jobs": 65
      },
      {
        "species": "Birds",
        "total_revenue": 35532.75,
        "total_jobs": 37
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 15425.0,
        "total_jobs": 6
      },
      {
        "species": "Opossums",
        "total_revenue": 5800.0,
        "total_jobs": 7
      },
      {
        "species": "Rats",
        "total_revenue": 5630.85,
        "total_jobs": 2
      },
      {
        "species": "Skunks",
        "total_revenue": 5220.0,
        "total_jobs": 3
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 4090.75,
        "total_jobs": 3
      },
      {
        "species": "Unknown Species",
        "total_revenue": 4050.0,
        "total_jobs": 1
      },
      {
        "species": "Prevention only",
        "total_revenue": 3970.0,
        "total_jobs": 2
      },
      {
        "species": "Chipmunks",
        "total_revenue": 3074.0,
        "total_jobs": 3
      }
    ],
    "suburbs": [
      {
        "suburb": "Milwaukee",
        "revenue": 314409.96,
        "jobs": 139
      },
      {
        "suburb": "Waukesha",
        "revenue": 53107.95,
        "jobs": 23
      },
      {
        "suburb": "Brookfield",
        "revenue": 49959.4,
        "jobs": 19
      },
      {
        "suburb": "New Berlin",
        "revenue": 47395.9,
        "jobs": 22
      },
      {
        "suburb": "Hartland",
        "revenue": 40863.5,
        "jobs": 12
      },
      {
        "suburb": "Wauwatosa",
        "revenue": 36111.5,
        "jobs": 17
      },
      {
        "suburb": "Greenfield",
        "revenue": 29610.5,
        "jobs": 10
      },
      {
        "suburb": "Pewaukee",
        "revenue": 27876.5,
        "jobs": 10
      },
      {
        "suburb": "West Allis",
        "revenue": 27398.35,
        "jobs": 18
      },
      {
        "suburb": "Franklin",
        "revenue": 22436.39,
        "jobs": 7
      },
      {
        "suburb": "Delafield",
        "revenue": 21464.75,
        "jobs": 5
      },
      {
        "suburb": "Glendale",
        "revenue": 18464.5,
        "jobs": 10
      },
      {
        "suburb": "Oconomowoc",
        "revenue": 18253.0,
        "jobs": 9
      },
      {
        "suburb": "Mequon",
        "revenue": 16895.25,
        "jobs": 9
      },
      {
        "suburb": "Shorewood",
        "revenue": 15708.5,
        "jobs": 5
      },
      {
        "suburb": "Fox Point",
        "revenue": 15317.15,
        "jobs": 8
      },
      {
        "suburb": "Cudahy",
        "revenue": 13757.25,
        "jobs": 8
      },
      {
        "suburb": "Dousman",
        "revenue": 12012.0,
        "jobs": 3
      },
      {
        "suburb": "Elm Grove",
        "revenue": 11704.0,
        "jobs": 4
      },
      {
        "suburb": "Muskego",
        "revenue": 10730.0,
        "jobs": 4
      }
    ],
    "gsc": {
      "monthly": [
        {
          "month": "2026-01",
          "clicks": 2642,
          "impressions": 605231,
          "avg_position": 7.7
        },
        {
          "month": "2026-02",
          "clicks": 2308,
          "impressions": 486122,
          "avg_position": 7.0
        },
        {
          "month": "2026-03",
          "clicks": 2347,
          "impressions": 523235,
          "avg_position": 7.4
        },
        {
          "month": "2026-04",
          "clicks": 2340,
          "impressions": 464871,
          "avg_position": 8.4
        },
        {
          "month": "2026-05",
          "clicks": 3228,
          "impressions": 505567,
          "avg_position": 9.1
        },
        {
          "month": "2026-06",
          "clicks": 2620,
          "impressions": 444108,
          "avg_position": 8.4
        },
        {
          "month": "2026-07",
          "clicks": 354,
          "impressions": 60384,
          "avg_position": 7.9
        }
      ],
      "total_clicks": 15839,
      "total_impressions": 3089518,
      "recent_clicks": 6202
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 237,
          "calls": 108,
          "website_clicks": 0
        },
        {
          "month": "Nov 2024",
          "searches": 182,
          "calls": 90,
          "website_clicks": 2
        },
        {
          "month": "Dec 2024",
          "searches": 156,
          "calls": 66,
          "website_clicks": 4
        },
        {
          "month": "Jan 2025",
          "searches": 138,
          "calls": 67,
          "website_clicks": 3
        },
        {
          "month": "Feb 2025",
          "searches": 142,
          "calls": 61,
          "website_clicks": 14
        },
        {
          "month": "Mar 2025",
          "searches": 152,
          "calls": 60,
          "website_clicks": 23
        },
        {
          "month": "Apr 2025",
          "searches": 288,
          "calls": 121,
          "website_clicks": 26
        },
        {
          "month": "May 2025",
          "searches": 380,
          "calls": 166,
          "website_clicks": 30
        },
        {
          "month": "Jun 2025",
          "searches": 379,
          "calls": 184,
          "website_clicks": 45
        },
        {
          "month": "Jul 2025",
          "searches": 279,
          "calls": 127,
          "website_clicks": 39
        },
        {
          "month": "Aug 2025",
          "searches": 253,
          "calls": 105,
          "website_clicks": 22
        },
        {
          "month": "Sep 2025",
          "searches": 177,
          "calls": 76,
          "website_clicks": 22
        },
        {
          "month": "Oct 2025",
          "searches": 157,
          "calls": 90,
          "website_clicks": 14
        },
        {
          "month": "Nov 2025",
          "searches": 133,
          "calls": 64,
          "website_clicks": 8
        },
        {
          "month": "Dec 2025",
          "searches": 126,
          "calls": 48,
          "website_clicks": 24
        },
        {
          "month": "Jan 2026",
          "searches": 116,
          "calls": 41,
          "website_clicks": 21
        },
        {
          "month": "Feb 2026",
          "searches": 139,
          "calls": 59,
          "website_clicks": 23
        },
        {
          "month": "Mar 2026",
          "searches": 160,
          "calls": 62,
          "website_clicks": 24
        },
        {
          "month": "Apr 2026",
          "searches": 326,
          "calls": 142,
          "website_clicks": 30
        },
        {
          "month": "May 2026",
          "searches": 497,
          "calls": 202,
          "website_clicks": 37
        },
        {
          "month": "Jun 2026",
          "searches": 372,
          "calls": 166,
          "website_clicks": 38
        }
      ],
      "total_searches": 4789,
      "total_calls": 2105,
      "total_clicks": 449
    }
  },
  "maryland-central": {
    "id": "maryland-central",
    "name": "Maryland Central",
    "currency": "USD",
    "total_revenue": 849720.45,
    "total_jobs": 395,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 361111.0,
        "total_jobs": 114
      },
      {
        "species": "Squirrels",
        "total_revenue": 177399.0,
        "total_jobs": 96
      },
      {
        "species": "Bats",
        "total_revenue": 136580.45,
        "total_jobs": 55
      },
      {
        "species": "Raccoons",
        "total_revenue": 109976.0,
        "total_jobs": 58
      },
      {
        "species": "Birds",
        "total_revenue": 46014.0,
        "total_jobs": 63
      },
      {
        "species": "Rats",
        "total_revenue": 10260.0,
        "total_jobs": 4
      },
      {
        "species": "Prevention only",
        "total_revenue": 3270.0,
        "total_jobs": 1
      },
      {
        "species": "Snakes",
        "total_revenue": 2765.0,
        "total_jobs": 2
      },
      {
        "species": "Chipmunks",
        "total_revenue": 1290.0,
        "total_jobs": 1
      },
      {
        "species": "Groundhogs",
        "total_revenue": 1055.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Columbia",
        "revenue": 76151.0,
        "jobs": 35
      },
      {
        "suburb": "Silver Spring",
        "revenue": 69105.0,
        "jobs": 29
      },
      {
        "suburb": "Rockville",
        "revenue": 55160.0,
        "jobs": 25
      },
      {
        "suburb": "Annapolis",
        "revenue": 51470.0,
        "jobs": 20
      },
      {
        "suburb": "Ellicott City",
        "revenue": 45043.0,
        "jobs": 19
      },
      {
        "suburb": "Gaithersburg",
        "revenue": 35763.0,
        "jobs": 20
      },
      {
        "suburb": "Laurel",
        "revenue": 30860.0,
        "jobs": 15
      },
      {
        "suburb": "Bowie",
        "revenue": 29941.0,
        "jobs": 13
      },
      {
        "suburb": "Crofton",
        "revenue": 29778.0,
        "jobs": 14
      },
      {
        "suburb": "Bethesda",
        "revenue": 28262.0,
        "jobs": 15
      },
      {
        "suburb": "Upper Marlboro",
        "revenue": 23295.0,
        "jobs": 11
      },
      {
        "suburb": "Potomac",
        "revenue": 19401.0,
        "jobs": 7
      },
      {
        "suburb": "Takoma Park",
        "revenue": 17700.0,
        "jobs": 7
      },
      {
        "suburb": "Edgewater",
        "revenue": 16815.0,
        "jobs": 9
      },
      {
        "suburb": "Clinton",
        "revenue": 16540.0,
        "jobs": 7
      },
      {
        "suburb": "Owings",
        "revenue": 13415.0,
        "jobs": 4
      },
      {
        "suburb": "Chevy Chase",
        "revenue": 12125.0,
        "jobs": 4
      },
      {
        "suburb": "Glen Burnie",
        "revenue": 12065.0,
        "jobs": 5
      },
      {
        "suburb": "Odenton",
        "revenue": 11684.0,
        "jobs": 7
      },
      {
        "suburb": "Lanham",
        "revenue": 11110.0,
        "jobs": 4
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 11,
          "website_clicks": 11
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 4,
          "website_clicks": 4
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 10,
          "website_clicks": 7
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 13
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 13,
          "website_clicks": 14
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 20,
          "website_clicks": 11
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 16,
          "website_clicks": 11
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 16,
          "website_clicks": 13
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 14,
          "website_clicks": 11
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 10
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 14
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 13,
          "website_clicks": 5
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 8,
          "website_clicks": 10
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 12,
          "website_clicks": 6
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 19
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 7,
          "website_clicks": 7
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 3,
          "website_clicks": 9
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 18,
          "website_clicks": 14
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 13,
          "website_clicks": 19
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 25,
          "website_clicks": 28
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 20,
          "website_clicks": 33
        }
      ],
      "total_searches": 0,
      "total_calls": 253,
      "total_clicks": 269
    }
  },
  "co-denver": {
    "id": "co-denver",
    "name": "Denver",
    "currency": "USD",
    "total_revenue": 785517.35,
    "total_jobs": 505,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 207191.0,
        "total_jobs": 112
      },
      {
        "species": "Squirrels",
        "total_revenue": 191611.5,
        "total_jobs": 137
      },
      {
        "species": "Raccoons",
        "total_revenue": 146457.0,
        "total_jobs": 94
      },
      {
        "species": "Bats",
        "total_revenue": 74186.0,
        "total_jobs": 44
      },
      {
        "species": "Birds",
        "total_revenue": 62401.5,
        "total_jobs": 65
      },
      {
        "species": "Pigeons",
        "total_revenue": 41913.0,
        "total_jobs": 19
      },
      {
        "species": "Skunks",
        "total_revenue": 39310.0,
        "total_jobs": 17
      },
      {
        "species": "Rabbits",
        "total_revenue": 9379.0,
        "total_jobs": 7
      },
      {
        "species": "Rats",
        "total_revenue": 8498.35,
        "total_jobs": 7
      },
      {
        "species": "Foxes",
        "total_revenue": 4175.0,
        "total_jobs": 2
      },
      {
        "species": "Snakes",
        "total_revenue": 395.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Denver",
        "revenue": 159809.3,
        "jobs": 109
      },
      {
        "suburb": "Littleton",
        "revenue": 78268.0,
        "jobs": 49
      },
      {
        "suburb": "Aurora",
        "revenue": 69459.0,
        "jobs": 45
      },
      {
        "suburb": "Boulder",
        "revenue": 57413.5,
        "jobs": 35
      },
      {
        "suburb": "Longmont",
        "revenue": 48150.5,
        "jobs": 24
      },
      {
        "suburb": "Golden",
        "revenue": 30181.0,
        "jobs": 14
      },
      {
        "suburb": "Westminster",
        "revenue": 29412.5,
        "jobs": 18
      },
      {
        "suburb": "Arvada",
        "revenue": 28047.5,
        "jobs": 19
      },
      {
        "suburb": "Evergreen",
        "revenue": 24983.0,
        "jobs": 17
      },
      {
        "suburb": "Parker",
        "revenue": 22084.0,
        "jobs": 15
      },
      {
        "suburb": "Lakewood",
        "revenue": 22017.0,
        "jobs": 15
      },
      {
        "suburb": "Centennial",
        "revenue": 21455.0,
        "jobs": 13
      },
      {
        "suburb": "Englewood",
        "revenue": 19278.2,
        "jobs": 13
      },
      {
        "suburb": "Brighton",
        "revenue": 16403.0,
        "jobs": 7
      },
      {
        "suburb": "Broomfield",
        "revenue": 14571.0,
        "jobs": 11
      },
      {
        "suburb": "Castle Rock",
        "revenue": 13862.0,
        "jobs": 12
      },
      {
        "suburb": "Morrison",
        "revenue": 11989.35,
        "jobs": 9
      },
      {
        "suburb": "Thornton",
        "revenue": 11313.0,
        "jobs": 10
      },
      {
        "suburb": "Louisville",
        "revenue": 9886.0,
        "jobs": 6
      },
      {
        "suburb": "Frederick",
        "revenue": 9641.0,
        "jobs": 4
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 1
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 3
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 4
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 15
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 14
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 23
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 35
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 62
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 61
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 52
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 49
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 37
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 28,
          "website_clicks": 41
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 50
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 33,
          "website_clicks": 40
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 17,
          "website_clicks": 37
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 27,
          "website_clicks": 62
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 39,
          "website_clicks": 70
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 33,
          "website_clicks": 78
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 72,
          "website_clicks": 78
        }
      ],
      "total_searches": 0,
      "total_calls": 414,
      "total_clicks": 812
    }
  },
  "oh-columbus": {
    "id": "oh-columbus",
    "name": "Columbus",
    "currency": "USD",
    "total_revenue": 619959.55,
    "total_jobs": 353,
    "species": [
      {
        "species": "Raccoons",
        "total_revenue": 169060.5,
        "total_jobs": 94
      },
      {
        "species": "Squirrels",
        "total_revenue": 150248.0,
        "total_jobs": 99
      },
      {
        "species": "Mice",
        "total_revenue": 127591.45,
        "total_jobs": 49
      },
      {
        "species": "Bats",
        "total_revenue": 87432.0,
        "total_jobs": 32
      },
      {
        "species": "Birds",
        "total_revenue": 44875.0,
        "total_jobs": 58
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 11576.0,
        "total_jobs": 2
      },
      {
        "species": "Groundhogs",
        "total_revenue": 9020.0,
        "total_jobs": 4
      },
      {
        "species": "Skunks",
        "total_revenue": 8166.6,
        "total_jobs": 7
      },
      {
        "species": "Rats",
        "total_revenue": 6805.0,
        "total_jobs": 4
      },
      {
        "species": "Clean Up",
        "total_revenue": 4195.0,
        "total_jobs": 2
      },
      {
        "species": "Foxes",
        "total_revenue": 990.0,
        "total_jobs": 2
      }
    ],
    "suburbs": [
      {
        "suburb": "Columbus",
        "revenue": 229608.2,
        "jobs": 143
      },
      {
        "suburb": "Westerville",
        "revenue": 67853.35,
        "jobs": 31
      },
      {
        "suburb": "Dublin",
        "revenue": 46975.0,
        "jobs": 23
      },
      {
        "suburb": "Powell",
        "revenue": 30648.0,
        "jobs": 20
      },
      {
        "suburb": "Pickerington",
        "revenue": 26333.0,
        "jobs": 16
      },
      {
        "suburb": "Hilliard",
        "revenue": 25525.0,
        "jobs": 14
      },
      {
        "suburb": "Grove City",
        "revenue": 23330.0,
        "jobs": 11
      },
      {
        "suburb": "Lewis Center",
        "revenue": 20950.0,
        "jobs": 11
      },
      {
        "suburb": "New Albany",
        "revenue": 16259.0,
        "jobs": 9
      },
      {
        "suburb": "Reynoldsburg",
        "revenue": 13895.0,
        "jobs": 9
      },
      {
        "suburb": "Galena",
        "revenue": 13149.0,
        "jobs": 6
      },
      {
        "suburb": "Galloway",
        "revenue": 11575.0,
        "jobs": 9
      },
      {
        "suburb": "Canal Winchester",
        "revenue": 11404.0,
        "jobs": 9
      },
      {
        "suburb": "Delaware",
        "revenue": 10583.0,
        "jobs": 7
      },
      {
        "suburb": "Pataskala",
        "revenue": 8581.0,
        "jobs": 4
      },
      {
        "suburb": "Orient",
        "revenue": 7135.0,
        "jobs": 2
      },
      {
        "suburb": "Williamsport",
        "revenue": 7097.0,
        "jobs": 1
      },
      {
        "suburb": "Marysville",
        "revenue": 6760.0,
        "jobs": 4
      },
      {
        "suburb": "Worthington",
        "revenue": 6284.0,
        "jobs": 2
      },
      {
        "suburb": "Blacklick",
        "revenue": 5986.0,
        "jobs": 2
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 2
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 4,
          "website_clicks": 4
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 3
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 7,
          "website_clicks": 14
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 4,
          "website_clicks": 23
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 8,
          "website_clicks": 26
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 30
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 12,
          "website_clicks": 45
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 39
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 12,
          "website_clicks": 22
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 22
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 14
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 3,
          "website_clicks": 8
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 24
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 9,
          "website_clicks": 21
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 12,
          "website_clicks": 23
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 8,
          "website_clicks": 24
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 20,
          "website_clicks": 30
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 26,
          "website_clicks": 37
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 23,
          "website_clicks": 38
        }
      ],
      "total_searches": 0,
      "total_calls": 217,
      "total_clicks": 449
    }
  },
  "md-baltimore": {
    "id": "md-baltimore",
    "name": "Baltimore",
    "currency": "USD",
    "total_revenue": 598711.0,
    "total_jobs": 326,
    "species": [
      {
        "species": "Squirrels",
        "total_revenue": 182946.0,
        "total_jobs": 104
      },
      {
        "species": "Mice",
        "total_revenue": 166917.0,
        "total_jobs": 69
      },
      {
        "species": "Bats",
        "total_revenue": 78712.0,
        "total_jobs": 47
      },
      {
        "species": "Raccoons",
        "total_revenue": 77298.0,
        "total_jobs": 39
      },
      {
        "species": "Birds",
        "total_revenue": 68677.0,
        "total_jobs": 54
      },
      {
        "species": "Rats",
        "total_revenue": 11926.0,
        "total_jobs": 7
      },
      {
        "species": "Groundhogs",
        "total_revenue": 8195.0,
        "total_jobs": 3
      },
      {
        "species": "Pigeons",
        "total_revenue": 2305.0,
        "total_jobs": 1
      },
      {
        "species": "Clean Up",
        "total_revenue": 940.0,
        "total_jobs": 1
      },
      {
        "species": "Snakes",
        "total_revenue": 795.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Baltimore",
        "revenue": 302754.0,
        "jobs": 170
      },
      {
        "suburb": "Timonium",
        "revenue": 56524.0,
        "jobs": 21
      },
      {
        "suburb": "Bel Air",
        "revenue": 24756.0,
        "jobs": 9
      },
      {
        "suburb": "Rosedale",
        "revenue": 20613.0,
        "jobs": 12
      },
      {
        "suburb": "Owings Mills",
        "revenue": 20361.0,
        "jobs": 12
      },
      {
        "suburb": "Parkville",
        "revenue": 17547.0,
        "jobs": 10
      },
      {
        "suburb": "Cockeysville",
        "revenue": 16911.0,
        "jobs": 9
      },
      {
        "suburb": "Towson",
        "revenue": 14036.0,
        "jobs": 8
      },
      {
        "suburb": "Reisterstown",
        "revenue": 12769.0,
        "jobs": 8
      },
      {
        "suburb": "Lutherville",
        "revenue": 11037.0,
        "jobs": 5
      },
      {
        "suburb": "Pikesville",
        "revenue": 8319.0,
        "jobs": 4
      },
      {
        "suburb": "Dundalk",
        "revenue": 7959.0,
        "jobs": 7
      },
      {
        "suburb": "Randallstown",
        "revenue": 7778.0,
        "jobs": 5
      },
      {
        "suburb": "Jarrettsville",
        "revenue": 6885.0,
        "jobs": 4
      },
      {
        "suburb": "Baldwin",
        "revenue": 6221.0,
        "jobs": 4
      },
      {
        "suburb": "Abingdon",
        "revenue": 5537.0,
        "jobs": 2
      },
      {
        "suburb": "Nottingham",
        "revenue": 5370.0,
        "jobs": 3
      },
      {
        "suburb": "Essex",
        "revenue": 5337.0,
        "jobs": 5
      },
      {
        "suburb": "Perry Hall",
        "revenue": 4805.0,
        "jobs": 3
      },
      {
        "suburb": "Middle River",
        "revenue": 4694.0,
        "jobs": 4
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 5,
          "website_clicks": 11
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 4,
          "website_clicks": 6
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 10,
          "website_clicks": 9
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 11
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 7
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 8,
          "website_clicks": 17
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 14,
          "website_clicks": 36
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 29
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 14,
          "website_clicks": 32
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 15,
          "website_clicks": 25
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 29,
          "website_clicks": 36
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 25
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 21
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 22
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 16,
          "website_clicks": 32
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 14,
          "website_clicks": 38
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 16,
          "website_clicks": 29
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 22,
          "website_clicks": 41
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 25,
          "website_clicks": 49
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 55,
          "website_clicks": 79
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 40,
          "website_clicks": 72
        }
      ],
      "total_searches": 0,
      "total_calls": 372,
      "total_clicks": 627
    }
  },
  "pa-pittsburgh": {
    "id": "pa-pittsburgh",
    "name": "Pittsburgh",
    "currency": "USD",
    "total_revenue": 422471.75,
    "total_jobs": 166,
    "species": [
      {
        "species": "Bats",
        "total_revenue": 111806.0,
        "total_jobs": 33
      },
      {
        "species": "Mice",
        "total_revenue": 95415.0,
        "total_jobs": 26
      },
      {
        "species": "Squirrels",
        "total_revenue": 92103.0,
        "total_jobs": 44
      },
      {
        "species": "Raccoons",
        "total_revenue": 84851.0,
        "total_jobs": 32
      },
      {
        "species": "Birds",
        "total_revenue": 28264.75,
        "total_jobs": 27
      },
      {
        "species": "Groundhogs",
        "total_revenue": 6535.0,
        "total_jobs": 2
      },
      {
        "species": "Chipmunks",
        "total_revenue": 2802.0,
        "total_jobs": 1
      },
      {
        "species": "Prevention only",
        "total_revenue": 695.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Pittsburgh",
        "revenue": 217305.0,
        "jobs": 86
      },
      {
        "suburb": "Sewickley",
        "revenue": 29517.0,
        "jobs": 4
      },
      {
        "suburb": "Coraopolis",
        "revenue": 24313.0,
        "jobs": 9
      },
      {
        "suburb": "Bridgeville",
        "revenue": 11080.0,
        "jobs": 5
      },
      {
        "suburb": "McDonald",
        "revenue": 10753.0,
        "jobs": 4
      },
      {
        "suburb": "Bethel Park",
        "revenue": 10064.0,
        "jobs": 4
      },
      {
        "suburb": "Venetia",
        "revenue": 9526.0,
        "jobs": 4
      },
      {
        "suburb": "McKees Rocks",
        "revenue": 9320.0,
        "jobs": 6
      },
      {
        "suburb": "Crafton",
        "revenue": 8190.0,
        "jobs": 1
      },
      {
        "suburb": "Oakdale",
        "revenue": 7528.0,
        "jobs": 1
      },
      {
        "suburb": "South Park",
        "revenue": 7182.0,
        "jobs": 4
      },
      {
        "suburb": "Cheswick",
        "revenue": 6402.0,
        "jobs": 3
      },
      {
        "suburb": "Cecil-Bishop",
        "revenue": 5954.0,
        "jobs": 2
      },
      {
        "suburb": "Elizabeth",
        "revenue": 5809.0,
        "jobs": 1
      },
      {
        "suburb": "South Park Township",
        "revenue": 5795.75,
        "jobs": 4
      },
      {
        "suburb": "Wexford",
        "revenue": 4955.0,
        "jobs": 2
      },
      {
        "suburb": "Turtle Creek",
        "revenue": 4840.0,
        "jobs": 1
      },
      {
        "suburb": "Canonsburg",
        "revenue": 4180.0,
        "jobs": 4
      },
      {
        "suburb": "Murrysville",
        "revenue": 3981.0,
        "jobs": 1
      },
      {
        "suburb": "Ambridge",
        "revenue": 3820.0,
        "jobs": 1
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 23
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 3,
          "website_clicks": 43
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 39
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 63
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 30
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 9,
          "website_clicks": 12
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 27
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 7,
          "website_clicks": 8
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 9,
          "website_clicks": 10
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 12,
          "website_clicks": 37
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 12,
          "website_clicks": 40
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 20,
          "website_clicks": 66
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 30,
          "website_clicks": 64
        }
      ],
      "total_searches": 0,
      "total_calls": 173,
      "total_clicks": 462
    }
  },
  "orangeville": {
    "id": "orangeville",
    "name": "Orangeville",
    "currency": "CAD",
    "total_revenue": 371548.17,
    "total_jobs": 210,
    "species": [
      {
        "species": "Bats",
        "total_revenue": 106546.5,
        "total_jobs": 43
      },
      {
        "species": "Raccoons",
        "total_revenue": 90180.43,
        "total_jobs": 48
      },
      {
        "species": "Squirrels",
        "total_revenue": 75643.92,
        "total_jobs": 59
      },
      {
        "species": "Mice",
        "total_revenue": 44229.25,
        "total_jobs": 17
      },
      {
        "species": "Birds",
        "total_revenue": 16785.0,
        "total_jobs": 18
      },
      {
        "species": "Red Squirrels",
        "total_revenue": 15908.0,
        "total_jobs": 13
      },
      {
        "species": "Skunks",
        "total_revenue": 8613.32,
        "total_jobs": 5
      },
      {
        "species": "Chipmunks",
        "total_revenue": 6513.0,
        "total_jobs": 3
      },
      {
        "species": "Groundhogs",
        "total_revenue": 5175.0,
        "total_jobs": 2
      },
      {
        "species": "Prevention only",
        "total_revenue": 1953.75,
        "total_jobs": 2
      }
    ],
    "suburbs": [
      {
        "suburb": "Orangeville",
        "revenue": 51033.71,
        "jobs": 31
      },
      {
        "suburb": "Collingwood",
        "revenue": 47790.5,
        "jobs": 29
      },
      {
        "suburb": "The Blue Mountains",
        "revenue": 33801.25,
        "jobs": 10
      },
      {
        "suburb": "Caledon",
        "revenue": 28493.14,
        "jobs": 17
      },
      {
        "suburb": "Caledon East",
        "revenue": 17160.25,
        "jobs": 5
      },
      {
        "suburb": "Fergus",
        "revenue": 16179.71,
        "jobs": 11
      },
      {
        "suburb": "Clarksburg",
        "revenue": 12977.5,
        "jobs": 7
      },
      {
        "suburb": "Elora",
        "revenue": 12880.0,
        "jobs": 7
      },
      {
        "suburb": "East Garafraxa",
        "revenue": 11438.0,
        "jobs": 6
      },
      {
        "suburb": "Thornbury",
        "revenue": 11275.0,
        "jobs": 7
      },
      {
        "suburb": "Mono",
        "revenue": 11181.75,
        "jobs": 8
      },
      {
        "suburb": "Bolton",
        "revenue": 9691.32,
        "jobs": 9
      },
      {
        "suburb": "Hillsburgh",
        "revenue": 8772.5,
        "jobs": 3
      },
      {
        "suburb": "Belwood",
        "revenue": 8337.5,
        "jobs": 5
      },
      {
        "suburb": "Meaford",
        "revenue": 7695.5,
        "jobs": 4
      },
      {
        "suburb": "Caledon Village",
        "revenue": 7452.5,
        "jobs": 3
      },
      {
        "suburb": "Stayner",
        "revenue": 6130.0,
        "jobs": 3
      },
      {
        "suburb": "Mount Forest",
        "revenue": 6105.8,
        "jobs": 4
      },
      {
        "suburb": "Terra Cotta",
        "revenue": 6005.75,
        "jobs": 2
      },
      {
        "suburb": "Blue Mountains",
        "revenue": 5540.0,
        "jobs": 4
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 2,
          "website_clicks": 17
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 5,
          "website_clicks": 9
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 6,
          "website_clicks": 8
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 11
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 7
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 8
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 16
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 18
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 34,
          "website_clicks": 34
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 23
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 29,
          "website_clicks": 21
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 24,
          "website_clicks": 28
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 58,
          "website_clicks": 19
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 10
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 16,
          "website_clicks": 10
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 2,
          "website_clicks": 8
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 10,
          "website_clicks": 6
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 16,
          "website_clicks": 25
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 14,
          "website_clicks": 12
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 26,
          "website_clicks": 35
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 27,
          "website_clicks": 24
        }
      ],
      "total_searches": 0,
      "total_calls": 362,
      "total_clicks": 349
    }
  },
  "atlanta-north": {
    "id": "atlanta-north",
    "name": "Atlanta North",
    "currency": "USD",
    "total_revenue": 366117.75,
    "total_jobs": 258,
    "species": [
      {
        "species": "Squirrels",
        "total_revenue": 183894.75,
        "total_jobs": 134
      },
      {
        "species": "Rats",
        "total_revenue": 57515.0,
        "total_jobs": 34
      },
      {
        "species": "Mice",
        "total_revenue": 38623.0,
        "total_jobs": 20
      },
      {
        "species": "Raccoons",
        "total_revenue": 34400.0,
        "total_jobs": 19
      },
      {
        "species": "Bats",
        "total_revenue": 31343.0,
        "total_jobs": 25
      },
      {
        "species": "Birds",
        "total_revenue": 8815.0,
        "total_jobs": 17
      },
      {
        "species": "Flying Squirrels",
        "total_revenue": 5477.0,
        "total_jobs": 3
      },
      {
        "species": "Foxes",
        "total_revenue": 2905.0,
        "total_jobs": 1
      },
      {
        "species": "Snakes",
        "total_revenue": 1690.0,
        "total_jobs": 2
      },
      {
        "species": "Groundhogs",
        "total_revenue": 1105.0,
        "total_jobs": 1
      },
      {
        "species": "Prevention only",
        "total_revenue": 200.0,
        "total_jobs": 1
      },
      {
        "species": "Chipmunks",
        "total_revenue": 150.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Atlanta",
        "revenue": 92116.25,
        "jobs": 64
      },
      {
        "suburb": "Marietta",
        "revenue": 40090.0,
        "jobs": 32
      },
      {
        "suburb": "Alpharetta",
        "revenue": 29830.5,
        "jobs": 21
      },
      {
        "suburb": "Smyrna",
        "revenue": 28070.0,
        "jobs": 22
      },
      {
        "suburb": "Roswell",
        "revenue": 21113.0,
        "jobs": 18
      },
      {
        "suburb": "Mableton",
        "revenue": 20989.0,
        "jobs": 10
      },
      {
        "suburb": "Woodstock",
        "revenue": 19403.0,
        "jobs": 11
      },
      {
        "suburb": "Decatur",
        "revenue": 16363.0,
        "jobs": 13
      },
      {
        "suburb": "Suwanee",
        "revenue": 13018.0,
        "jobs": 7
      },
      {
        "suburb": "Norcross",
        "revenue": 6980.0,
        "jobs": 7
      },
      {
        "suburb": "College Park",
        "revenue": 6730.0,
        "jobs": 2
      },
      {
        "suburb": "Duluth",
        "revenue": 5966.0,
        "jobs": 5
      },
      {
        "suburb": "Dunwoody",
        "revenue": 5783.0,
        "jobs": 3
      },
      {
        "suburb": "Hiram",
        "revenue": 5539.0,
        "jobs": 5
      },
      {
        "suburb": "Douglasville",
        "revenue": 5268.0,
        "jobs": 2
      },
      {
        "suburb": "Austell",
        "revenue": 4640.0,
        "jobs": 4
      },
      {
        "suburb": "Chamblee",
        "revenue": 4345.0,
        "jobs": 2
      },
      {
        "suburb": "Snellville",
        "revenue": 3865.0,
        "jobs": 3
      },
      {
        "suburb": "Tucker",
        "revenue": 3253.0,
        "jobs": 3
      },
      {
        "suburb": "Stone Mountain",
        "revenue": 3244.0,
        "jobs": 2
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 12,
          "website_clicks": 19
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 17,
          "website_clicks": 20
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 9,
          "website_clicks": 12
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 27
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 26
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 18
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 19
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 36,
          "website_clicks": 32
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 49,
          "website_clicks": 28
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 29,
          "website_clicks": 30
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 24,
          "website_clicks": 27
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 16,
          "website_clicks": 28
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 29
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 12,
          "website_clicks": 15
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 26
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 7,
          "website_clicks": 29
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 9,
          "website_clicks": 26
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 18,
          "website_clicks": 51
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 27,
          "website_clicks": 37
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 46,
          "website_clicks": 30
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 46,
          "website_clicks": 19
        }
      ],
      "total_searches": 0,
      "total_calls": 423,
      "total_clicks": 548
    }
  },
  "okanagan": {
    "id": "okanagan",
    "name": "Okanagan",
    "currency": "CAD",
    "total_revenue": 340178.55,
    "total_jobs": 205,
    "species": [
      {
        "species": "Rats",
        "total_revenue": 67020.75,
        "total_jobs": 32
      },
      {
        "species": "Squirrels",
        "total_revenue": 66307.0,
        "total_jobs": 39
      },
      {
        "species": "Bats",
        "total_revenue": 65855.75,
        "total_jobs": 48
      },
      {
        "species": "Mice",
        "total_revenue": 52206.0,
        "total_jobs": 26
      },
      {
        "species": "Raccoons",
        "total_revenue": 47239.05,
        "total_jobs": 31
      },
      {
        "species": "Birds",
        "total_revenue": 29145.0,
        "total_jobs": 22
      },
      {
        "species": "Skunks",
        "total_revenue": 5380.0,
        "total_jobs": 1
      },
      {
        "species": "Groundhogs",
        "total_revenue": 4470.0,
        "total_jobs": 1
      },
      {
        "species": "Clean Up",
        "total_revenue": 1220.0,
        "total_jobs": 3
      },
      {
        "species": "Pigeons",
        "total_revenue": 840.0,
        "total_jobs": 1
      },
      {
        "species": "Foxes",
        "total_revenue": 495.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Kelowna",
        "revenue": 169095.8,
        "jobs": 99
      },
      {
        "suburb": "West Kelowna",
        "revenue": 37529.0,
        "jobs": 24
      },
      {
        "suburb": "Lake Country",
        "revenue": 31679.0,
        "jobs": 16
      },
      {
        "suburb": "Vernon",
        "revenue": 28976.0,
        "jobs": 17
      },
      {
        "suburb": "Kaleden",
        "revenue": 18741.75,
        "jobs": 18
      },
      {
        "suburb": "Summerland",
        "revenue": 13476.0,
        "jobs": 7
      },
      {
        "suburb": "Penticton",
        "revenue": 10785.0,
        "jobs": 8
      },
      {
        "suburb": "Coldstream",
        "revenue": 9299.0,
        "jobs": 4
      },
      {
        "suburb": "Keremeos",
        "revenue": 4635.0,
        "jobs": 2
      },
      {
        "suburb": "Westbank",
        "revenue": 3650.0,
        "jobs": 3
      },
      {
        "suburb": "Lumby",
        "revenue": 3625.0,
        "jobs": 2
      },
      {
        "suburb": "Princeton",
        "revenue": 2763.0,
        "jobs": 1
      },
      {
        "suburb": "Kootenay Boundary",
        "revenue": 2080.0,
        "jobs": 1
      },
      {
        "suburb": "Merritt",
        "revenue": 1960.0,
        "jobs": 1
      },
      {
        "suburb": "Okanagan Falls",
        "revenue": 1085.0,
        "jobs": 1
      },
      {
        "suburb": "Oliver",
        "revenue": 799.0,
        "jobs": 1
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 71,
          "calls": 18,
          "website_clicks": 28
        },
        {
          "month": "Nov 2024",
          "searches": 40,
          "calls": 24,
          "website_clicks": 23
        },
        {
          "month": "Dec 2024",
          "searches": 44,
          "calls": 17,
          "website_clicks": 20
        },
        {
          "month": "Jan 2025",
          "searches": 21,
          "calls": 13,
          "website_clicks": 22
        },
        {
          "month": "Feb 2025",
          "searches": 17,
          "calls": 14,
          "website_clicks": 16
        },
        {
          "month": "Mar 2025",
          "searches": 39,
          "calls": 25,
          "website_clicks": 19
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 35,
          "website_clicks": 46
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 49,
          "website_clicks": 48
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 49,
          "website_clicks": 46
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 24,
          "website_clicks": 43
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 28,
          "website_clicks": 46
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 31
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 28,
          "website_clicks": 24
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 30,
          "website_clicks": 26
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 11,
          "website_clicks": 20
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 29,
          "website_clicks": 20
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 20,
          "website_clicks": 16
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 16,
          "website_clicks": 29
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 43,
          "website_clicks": 32
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 38,
          "website_clicks": 48
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 46,
          "website_clicks": 40
        }
      ],
      "total_searches": 232,
      "total_calls": 584,
      "total_clicks": 643
    }
  },
  "coquitlam": {
    "id": "coquitlam",
    "name": "Coquitlam",
    "currency": "CAD",
    "total_revenue": 292248.16,
    "total_jobs": 80,
    "species": [
      {
        "species": "Mice",
        "total_revenue": 95117.96,
        "total_jobs": 21
      },
      {
        "species": "Squirrels",
        "total_revenue": 50410.75,
        "total_jobs": 18
      },
      {
        "species": "Bats",
        "total_revenue": 46943.05,
        "total_jobs": 7
      },
      {
        "species": "Birds",
        "total_revenue": 45845.25,
        "total_jobs": 11
      },
      {
        "species": "Raccoons",
        "total_revenue": 43513.85,
        "total_jobs": 19
      },
      {
        "species": "Rats",
        "total_revenue": 5927.2,
        "total_jobs": 1
      },
      {
        "species": "Skunks",
        "total_revenue": 2974.6,
        "total_jobs": 2
      },
      {
        "species": "Unknown Species",
        "total_revenue": 1515.5,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Surrey",
        "revenue": 74347.35,
        "jobs": 14
      },
      {
        "suburb": "Coquitlam",
        "revenue": 53913.1,
        "jobs": 13
      },
      {
        "suburb": "Vancouver",
        "revenue": 38443.85,
        "jobs": 5
      },
      {
        "suburb": "Burnaby",
        "revenue": 22751.55,
        "jobs": 9
      },
      {
        "suburb": "Maple Ridge",
        "revenue": 21211.25,
        "jobs": 9
      },
      {
        "suburb": "New Westminster",
        "revenue": 13642.5,
        "jobs": 6
      },
      {
        "suburb": "Port Moody",
        "revenue": 13479.85,
        "jobs": 3
      },
      {
        "suburb": "Pitt Meadows",
        "revenue": 11025.55,
        "jobs": 4
      },
      {
        "suburb": "Port Coquitlam",
        "revenue": 9621.21,
        "jobs": 5
      },
      {
        "suburb": "Lions Bay",
        "revenue": 8410.8,
        "jobs": 1
      },
      {
        "suburb": "North Vancouver",
        "revenue": 7239.55,
        "jobs": 3
      },
      {
        "suburb": "Harrison Mills",
        "revenue": 6178.6,
        "jobs": 1
      },
      {
        "suburb": "Richmond",
        "revenue": 5917.5,
        "jobs": 3
      },
      {
        "suburb": "Mission",
        "revenue": 2026.0,
        "jobs": 1
      },
      {
        "suburb": "Langley",
        "revenue": 1780.5,
        "jobs": 1
      },
      {
        "suburb": "Delta",
        "revenue": 1259.0,
        "jobs": 1
      },
      {
        "suburb": "Mission 1",
        "revenue": 1000.0,
        "jobs": 1
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 12
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 17
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 9
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 16
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 19
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 2,
          "website_clicks": 22
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 6,
          "website_clicks": 18
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 25
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 27
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 27,
          "website_clicks": 24
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 11
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 11
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 11
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 28,
          "website_clicks": 13
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 21,
          "website_clicks": 13
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 33,
          "website_clicks": 22
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 17,
          "website_clicks": 14
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 27,
          "website_clicks": 13
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 39,
          "website_clicks": 34
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 33,
          "website_clicks": 27
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 72,
          "website_clicks": 25
        }
      ],
      "total_searches": 0,
      "total_calls": 414,
      "total_clicks": 383
    }
  },
  "l-windsor": {
    "id": "l-windsor",
    "name": "Windsor",
    "currency": "CAD",
    "total_revenue": 89868.6,
    "total_jobs": 47,
    "species": [
      {
        "species": "Raccoons",
        "total_revenue": 38986.0,
        "total_jobs": 20
      },
      {
        "species": "Squirrels",
        "total_revenue": 18550.0,
        "total_jobs": 9
      },
      {
        "species": "Bats",
        "total_revenue": 14598.3,
        "total_jobs": 5
      },
      {
        "species": "Mice",
        "total_revenue": 9019.9,
        "total_jobs": 4
      },
      {
        "species": "Birds",
        "total_revenue": 3200.0,
        "total_jobs": 6
      },
      {
        "species": "Rats",
        "total_revenue": 3149.4,
        "total_jobs": 1
      },
      {
        "species": "Skunks",
        "total_revenue": 1970.0,
        "total_jobs": 1
      },
      {
        "species": "Snakes",
        "total_revenue": 395.0,
        "total_jobs": 1
      }
    ],
    "suburbs": [
      {
        "suburb": "Windsor",
        "revenue": 58714.4,
        "jobs": 31
      },
      {
        "suburb": "Kingsville",
        "revenue": 8797.0,
        "jobs": 4
      },
      {
        "suburb": "Essex",
        "revenue": 5789.9,
        "jobs": 2
      },
      {
        "suburb": "Belle River",
        "revenue": 3912.5,
        "jobs": 3
      },
      {
        "suburb": "Lake Shore",
        "revenue": 3155.3,
        "jobs": 1
      },
      {
        "suburb": "Lasalle",
        "revenue": 2695.0,
        "jobs": 1
      },
      {
        "suburb": "Leamington",
        "revenue": 2654.5,
        "jobs": 1
      },
      {
        "suburb": "LaSalle",
        "revenue": 1790.0,
        "jobs": 1
      },
      {
        "suburb": "Saint Joachim",
        "revenue": 1650.0,
        "jobs": 1
      },
      {
        "suburb": "Tecumseh",
        "revenue": 515.0,
        "jobs": 1
      },
      {
        "suburb": "Amherstburg",
        "revenue": 195.0,
        "jobs": 1
      }
    ],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 0,
          "website_clicks": 0
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 1,
          "website_clicks": 1
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 6,
          "website_clicks": 15
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 8,
          "website_clicks": 23
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 4,
          "website_clicks": 13
        }
      ],
      "total_searches": 0,
      "total_calls": 19,
      "total_clicks": 52
    }
  },
  "barrie-north": {
    "id": "barrie-north",
    "name": "Barrie North",
    "currency": "CAD",
    "total_revenue": 0,
    "total_jobs": 0,
    "species": [],
    "suburbs": [],
    "gsc": {
      "monthly": [],
      "total_clicks": 0,
      "total_impressions": 0,
      "recent_clicks": 0
    },
    "gbp": {
      "monthly": [
        {
          "month": "Oct 2024",
          "searches": 0,
          "calls": 13,
          "website_clicks": 25
        },
        {
          "month": "Nov 2024",
          "searches": 0,
          "calls": 11,
          "website_clicks": 16
        },
        {
          "month": "Dec 2024",
          "searches": 0,
          "calls": 11,
          "website_clicks": 16
        },
        {
          "month": "Jan 2025",
          "searches": 0,
          "calls": 13,
          "website_clicks": 13
        },
        {
          "month": "Feb 2025",
          "searches": 0,
          "calls": 8,
          "website_clicks": 9
        },
        {
          "month": "Mar 2025",
          "searches": 0,
          "calls": 18,
          "website_clicks": 17
        },
        {
          "month": "Apr 2025",
          "searches": 0,
          "calls": 25,
          "website_clicks": 27
        },
        {
          "month": "May 2025",
          "searches": 0,
          "calls": 26,
          "website_clicks": 37
        },
        {
          "month": "Jun 2025",
          "searches": 0,
          "calls": 23,
          "website_clicks": 39
        },
        {
          "month": "Jul 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 29
        },
        {
          "month": "Aug 2025",
          "searches": 0,
          "calls": 30,
          "website_clicks": 24
        },
        {
          "month": "Sep 2025",
          "searches": 0,
          "calls": 19,
          "website_clicks": 19
        },
        {
          "month": "Oct 2025",
          "searches": 0,
          "calls": 22,
          "website_clicks": 14
        },
        {
          "month": "Nov 2025",
          "searches": 0,
          "calls": 10,
          "website_clicks": 15
        },
        {
          "month": "Dec 2025",
          "searches": 0,
          "calls": 5,
          "website_clicks": 4
        },
        {
          "month": "Jan 2026",
          "searches": 0,
          "calls": 6,
          "website_clicks": 15
        },
        {
          "month": "Feb 2026",
          "searches": 0,
          "calls": 6,
          "website_clicks": 5
        },
        {
          "month": "Mar 2026",
          "searches": 0,
          "calls": 16,
          "website_clicks": 24
        },
        {
          "month": "Apr 2026",
          "searches": 0,
          "calls": 19,
          "website_clicks": 23
        },
        {
          "month": "May 2026",
          "searches": 0,
          "calls": 53,
          "website_clicks": 36
        },
        {
          "month": "Jun 2026",
          "searches": 0,
          "calls": 33,
          "website_clicks": 28
        }
      ],
      "total_searches": 0,
      "total_calls": 386,
      "total_clicks": 435
    }
  }
};
