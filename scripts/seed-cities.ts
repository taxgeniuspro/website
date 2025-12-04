/**
 * Seed 200 US Cities for SEO Landing Pages
 *
 * Populates the City table with the top 200 US cities by population
 * for generating location-based lead generation landing pages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Top 200 US cities by population (2024 estimates)
const TOP_200_US_CITIES = [
  // Top 10
  { name: 'New York', state: 'New York', stateCode: 'NY', population: 8336817, rank: 1 },
  { name: 'Los Angeles', state: 'California', stateCode: 'CA', population: 3979576, rank: 2 },
  { name: 'Chicago', state: 'Illinois', stateCode: 'IL', population: 2693976, rank: 3 },
  { name: 'Houston', state: 'Texas', stateCode: 'TX', population: 2320268, rank: 4 },
  { name: 'Phoenix', state: 'Arizona', stateCode: 'AZ', population: 1680992, rank: 5 },
  { name: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA', population: 1584064, rank: 6 },
  { name: 'San Antonio', state: 'Texas', stateCode: 'TX', population: 1547253, rank: 7 },
  { name: 'San Diego', state: 'California', stateCode: 'CA', population: 1423851, rank: 8 },
  { name: 'Dallas', state: 'Texas', stateCode: 'TX', population: 1343573, rank: 9 },
  { name: 'San Jose', state: 'California', stateCode: 'CA', population: 1021795, rank: 10 },

  // 11-20
  { name: 'Austin', state: 'Texas', stateCode: 'TX', population: 978908, rank: 11 },
  { name: 'Jacksonville', state: 'Florida', stateCode: 'FL', population: 949611, rank: 12 },
  { name: 'Fort Worth', state: 'Texas', stateCode: 'TX', population: 918915, rank: 13 },
  { name: 'Columbus', state: 'Ohio', stateCode: 'OH', population: 905748, rank: 14 },
  { name: 'Charlotte', state: 'North Carolina', stateCode: 'NC', population: 897720, rank: 15 },
  { name: 'San Francisco', state: 'California', stateCode: 'CA', population: 873965, rank: 16 },
  { name: 'Indianapolis', state: 'Indiana', stateCode: 'IN', population: 867125, rank: 17 },
  { name: 'Seattle', state: 'Washington', stateCode: 'WA', population: 749256, rank: 18 },
  { name: 'Denver', state: 'Colorado', stateCode: 'CO', population: 715522, rank: 19 },
  { name: 'Washington', state: 'District of Columbia', stateCode: 'DC', population: 705749, rank: 20 },

  // 21-50
  { name: 'Boston', state: 'Massachusetts', stateCode: 'MA', population: 692600, rank: 21 },
  { name: 'El Paso', state: 'Texas', stateCode: 'TX', population: 678815, rank: 22 },
  { name: 'Nashville', state: 'Tennessee', stateCode: 'TN', population: 678448, rank: 23 },
  { name: 'Detroit', state: 'Michigan', stateCode: 'MI', population: 639111, rank: 24 },
  { name: 'Oklahoma City', state: 'Oklahoma', stateCode: 'OK', population: 638367, rank: 25 },
  { name: 'Portland', state: 'Oregon', stateCode: 'OR', population: 635067, rank: 26 },
  { name: 'Las Vegas', state: 'Nevada', stateCode: 'NV', population: 634773, rank: 27 },
  { name: 'Memphis', state: 'Tennessee', stateCode: 'TN', population: 633104, rank: 28 },
  { name: 'Louisville', state: 'Kentucky', stateCode: 'KY', population: 617638, rank: 29 },
  { name: 'Baltimore', state: 'Maryland', stateCode: 'MD', population: 585708, rank: 30 },
  { name: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI', population: 577222, rank: 31 },
  { name: 'Albuquerque', state: 'New Mexico', stateCode: 'NM', population: 564559, rank: 32 },
  { name: 'Tucson', state: 'Arizona', stateCode: 'AZ', population: 548073, rank: 33 },
  { name: 'Fresno', state: 'California', stateCode: 'CA', population: 542107, rank: 34 },
  { name: 'Mesa', state: 'Arizona', stateCode: 'AZ', population: 528159, rank: 35 },
  { name: 'Sacramento', state: 'California', stateCode: 'CA', population: 524943, rank: 36 },
  { name: 'Atlanta', state: 'Georgia', stateCode: 'GA', population: 510823, rank: 37 },
  { name: 'Kansas City', state: 'Missouri', stateCode: 'MO', population: 508090, rank: 38 },
  { name: 'Colorado Springs', state: 'Colorado', stateCode: 'CO', population: 486388, rank: 39 },
  { name: 'Omaha', state: 'Nebraska', stateCode: 'NE', population: 486051, rank: 40 },
  { name: 'Raleigh', state: 'North Carolina', stateCode: 'NC', population: 474069, rank: 41 },
  { name: 'Miami', state: 'Florida', stateCode: 'FL', population: 467963, rank: 42 },
  { name: 'Long Beach', state: 'California', stateCode: 'CA', population: 466742, rank: 43 },
  { name: 'Virginia Beach', state: 'Virginia', stateCode: 'VA', population: 459470, rank: 44 },
  { name: 'Oakland', state: 'California', stateCode: 'CA', population: 440646, rank: 45 },
  { name: 'Minneapolis', state: 'Minnesota', stateCode: 'MN', population: 425336, rank: 46 },
  { name: 'Tulsa', state: 'Oklahoma', stateCode: 'OK', population: 413066, rank: 47 },
  { name: 'Tampa', state: 'Florida', stateCode: 'FL', population: 407599, rank: 48 },
  { name: 'Arlington', state: 'Texas', stateCode: 'TX', population: 398121, rank: 49 },
  { name: 'New Orleans', state: 'Louisiana', stateCode: 'LA', population: 390144, rank: 50 },

  // 51-100
  { name: 'Wichita', state: 'Kansas', stateCode: 'KS', population: 389255, rank: 51 },
  { name: 'Cleveland', state: 'Ohio', stateCode: 'OH', population: 383331, rank: 52 },
  { name: 'Bakersfield', state: 'California', stateCode: 'CA', population: 380874, rank: 53 },
  { name: 'Aurora', state: 'Colorado', stateCode: 'CO', population: 379289, rank: 54 },
  { name: 'Anaheim', state: 'California', stateCode: 'CA', population: 353676, rank: 55 },
  { name: 'Honolulu', state: 'Hawaii', stateCode: 'HI', population: 350964, rank: 56 },
  { name: 'Santa Ana', state: 'California', stateCode: 'CA', population: 332318, rank: 57 },
  { name: 'Riverside', state: 'California', stateCode: 'CA', population: 327728, rank: 58 },
  { name: 'Corpus Christi', state: 'Texas', stateCode: 'TX', population: 326586, rank: 59 },
  { name: 'Lexington', state: 'Kentucky', stateCode: 'KY', population: 322200, rank: 60 },
  { name: 'Henderson', state: 'Nevada', stateCode: 'NV', population: 320189, rank: 61 },
  { name: 'Stockton', state: 'California', stateCode: 'CA', population: 317428, rank: 62 },
  { name: 'Saint Paul', state: 'Minnesota', stateCode: 'MN', population: 311527, rank: 63 },
  { name: 'Cincinnati', state: 'Ohio', stateCode: 'OH', population: 309317, rank: 64 },
  { name: 'St. Louis', state: 'Missouri', stateCode: 'MO', population: 300576, rank: 65 },
  { name: 'Pittsburgh', state: 'Pennsylvania', stateCode: 'PA', population: 302971, rank: 66 },
  { name: 'Greensboro', state: 'North Carolina', stateCode: 'NC', population: 298263, rank: 67 },
  { name: 'Anchorage', state: 'Alaska', stateCode: 'AK', population: 291247, rank: 68 },
  { name: 'Plano', state: 'Texas', stateCode: 'TX', population: 288061, rank: 69 },
  { name: 'Lincoln', state: 'Nebraska', stateCode: 'NE', population: 287401, rank: 70 },
  { name: 'Orlando', state: 'Florida', stateCode: 'FL', population: 287442, rank: 71 },
  { name: 'Irvine', state: 'California', stateCode: 'CA', population: 287401, rank: 72 },
  { name: 'Newark', state: 'New Jersey', stateCode: 'NJ', population: 282011, rank: 73 },
  { name: 'Durham', state: 'North Carolina', stateCode: 'NC', population: 282061, rank: 74 },
  { name: 'Chula Vista', state: 'California', stateCode: 'CA', population: 275487, rank: 75 },
  { name: 'Toledo', state: 'Ohio', stateCode: 'OH', population: 274975, rank: 76 },
  { name: 'Fort Wayne', state: 'Indiana', stateCode: 'IN', population: 270402, rank: 77 },
  { name: 'St. Petersburg', state: 'Florida', stateCode: 'FL', population: 265351, rank: 78 },
  { name: 'Laredo', state: 'Texas', stateCode: 'TX', population: 262527, rank: 79 },
  { name: 'Jersey City', state: 'New Jersey', stateCode: 'NJ', population: 262075, rank: 80 },
  { name: 'Chandler', state: 'Arizona', stateCode: 'AZ', population: 261165, rank: 81 },
  { name: 'Madison', state: 'Wisconsin', stateCode: 'WI', population: 259680, rank: 82 },
  { name: 'Lubbock', state: 'Texas', stateCode: 'TX', population: 258862, rank: 83 },
  { name: 'Scottsdale', state: 'Arizona', stateCode: 'AZ', population: 258069, rank: 84 },
  { name: 'Reno', state: 'Nevada', stateCode: 'NV', population: 255601, rank: 85 },
  { name: 'Buffalo', state: 'New York', stateCode: 'NY', population: 255284, rank: 86 },
  { name: 'Gilbert', state: 'Arizona', stateCode: 'AZ', population: 254114, rank: 87 },
  { name: 'Glendale', state: 'Arizona', stateCode: 'AZ', population: 252381, rank: 88 },
  { name: 'North Las Vegas', state: 'Nevada', stateCode: 'NV', population: 251974, rank: 89 },
  { name: 'Winston-Salem', state: 'North Carolina', stateCode: 'NC', population: 249545, rank: 90 },
  { name: 'Chesapeake', state: 'Virginia', stateCode: 'VA', population: 249422, rank: 91 },
  { name: 'Norfolk', state: 'Virginia', stateCode: 'VA', population: 238005, rank: 92 },
  { name: 'Fremont', state: 'California', stateCode: 'CA', population: 237807, rank: 93 },
  { name: 'Garland', state: 'Texas', stateCode: 'TX', population: 237878, rank: 94 },
  { name: 'Irving', state: 'Texas', stateCode: 'TX', population: 236607, rank: 95 },
  { name: 'Hialeah', state: 'Florida', stateCode: 'FL', population: 235626, rank: 96 },
  { name: 'Richmond', state: 'Virginia', stateCode: 'VA', population: 233556, rank: 97 },
  { name: 'Boise', state: 'Idaho', stateCode: 'ID', population: 232239, rank: 98 },
  { name: 'Spokane', state: 'Washington', stateCode: 'WA', population: 230223, rank: 99 },
  { name: 'Baton Rouge', state: 'Louisiana', stateCode: 'LA', population: 227470, rank: 100 },

  // 101-150
  { name: 'Tacoma', state: 'Washington', stateCode: 'WA', population: 221259, rank: 101 },
  { name: 'San Bernardino', state: 'California', stateCode: 'CA', population: 222101, rank: 102 },
  { name: 'Modesto', state: 'California', stateCode: 'CA', population: 218464, rank: 103 },
  { name: 'Fontana', state: 'California', stateCode: 'CA', population: 214547, rank: 104 },
  { name: 'Des Moines', state: 'Iowa', stateCode: 'IA', population: 214133, rank: 105 },
  { name: 'Moreno Valley', state: 'California', stateCode: 'CA', population: 213055, rank: 106 },
  { name: 'Santa Clarita', state: 'California', stateCode: 'CA', population: 210888, rank: 107 },
  { name: 'Fayetteville', state: 'North Carolina', stateCode: 'NC', population: 210324, rank: 108 },
  { name: 'Birmingham', state: 'Alabama', stateCode: 'AL', population: 200733, rank: 109 },
  { name: 'Oxnard', state: 'California', stateCode: 'CA', population: 206732, rank: 110 },
  { name: 'Rochester', state: 'New York', stateCode: 'NY', population: 206284, rank: 111 },
  { name: 'Port St. Lucie', state: 'Florida', stateCode: 'FL', population: 204851, rank: 112 },
  { name: 'Grand Rapids', state: 'Michigan', stateCode: 'MI', population: 200217, rank: 113 },
  { name: 'Huntsville', state: 'Alabama', stateCode: 'AL', population: 199845, rank: 114 },
  { name: 'Salt Lake City', state: 'Utah', stateCode: 'UT', population: 200133, rank: 115 },
  { name: 'Frisco', state: 'Texas', stateCode: 'TX', population: 200490, rank: 116 },
  { name: 'Yonkers', state: 'New York', stateCode: 'NY', population: 200040, rank: 117 },
  { name: 'Amarillo', state: 'Texas', stateCode: 'TX', population: 199924, rank: 118 },
  { name: 'Glendale', state: 'California', stateCode: 'CA', population: 196543, rank: 119 },
  { name: 'Huntington Beach', state: 'California', stateCode: 'CA', population: 198711, rank: 120 },
  { name: 'McKinney', state: 'Texas', stateCode: 'TX', population: 195308, rank: 121 },
  { name: 'Montgomery', state: 'Alabama', stateCode: 'AL', population: 200022, rank: 122 },
  { name: 'Augusta', state: 'Georgia', stateCode: 'GA', population: 197888, rank: 123 },
  { name: 'Aurora', state: 'Illinois', stateCode: 'IL', population: 197757, rank: 124 },
  { name: 'Akron', state: 'Ohio', stateCode: 'OH', population: 197597, rank: 125 },
  { name: 'Little Rock', state: 'Arkansas', stateCode: 'AR', population: 197992, rank: 126 },
  { name: 'Tempe', state: 'Arizona', stateCode: 'AZ', population: 195805, rank: 127 },
  { name: 'Columbus', state: 'Georgia', stateCode: 'GA', population: 194058, rank: 128 },
  { name: 'Overland Park', state: 'Kansas', stateCode: 'KS', population: 195494, rank: 129 },
  { name: 'Grand Prairie', state: 'Texas', stateCode: 'TX', population: 194543, rank: 130 },
  { name: 'Tallahassee', state: 'Florida', stateCode: 'FL', population: 194500, rank: 131 },
  { name: 'Cape Coral', state: 'Florida', stateCode: 'FL', population: 194016, rank: 132 },
  { name: 'Mobile', state: 'Alabama', stateCode: 'AL', population: 193079, rank: 133 },
  { name: 'Knoxville', state: 'Tennessee', stateCode: 'TN', population: 190740, rank: 134 },
  { name: 'Shreveport', state: 'Louisiana', stateCode: 'LA', population: 189374, rank: 135 },
  { name: 'Worcester', state: 'Massachusetts', stateCode: 'MA', population: 185428, rank: 136 },
  { name: 'Ontario', state: 'California', stateCode: 'CA', population: 185278, rank: 137 },
  { name: 'Vancouver', state: 'Washington', stateCode: 'WA', population: 185671, rank: 138 },
  { name: 'Sioux Falls', state: 'South Dakota', stateCode: 'SD', population: 183793, rank: 139 },
  { name: 'Chattanooga', state: 'Tennessee', stateCode: 'TN', population: 181370, rank: 140 },
  { name: 'Brownsville', state: 'Texas', stateCode: 'TX', population: 186738, rank: 141 },
  { name: 'Fort Lauderdale', state: 'Florida', stateCode: 'FL', population: 182760, rank: 142 },
  { name: 'Providence', state: 'Rhode Island', stateCode: 'RI', population: 179883, rank: 143 },
  { name: 'Newport News', state: 'Virginia', stateCode: 'VA', population: 179225, rank: 144 },
  { name: 'Rancho Cucamonga', state: 'California', stateCode: 'CA', population: 178060, rank: 145 },
  { name: 'Santa Rosa', state: 'California', stateCode: 'CA', population: 176753, rank: 146 },
  { name: 'Peoria', state: 'Arizona', stateCode: 'AZ', population: 179872, rank: 147 },
  { name: 'Oceanside', state: 'California', stateCode: 'CA', population: 174068, rank: 148 },
  { name: 'Elk Grove', state: 'California', stateCode: 'CA', population: 173702, rank: 149 },
  { name: 'Salem', state: 'Oregon', stateCode: 'OR', population: 174365, rank: 150 },

  // 151-200
  { name: 'Pembroke Pines', state: 'Florida', stateCode: 'FL', population: 171979, rank: 151 },
  { name: 'Eugene', state: 'Oregon', stateCode: 'OR', population: 172622, rank: 152 },
  { name: 'Garden Grove', state: 'California', stateCode: 'CA', population: 171949, rank: 153 },
  { name: 'Cary', state: 'North Carolina', stateCode: 'NC', population: 171603, rank: 154 },
  { name: 'Fort Collins', state: 'Colorado', stateCode: 'CO', population: 170243, rank: 155 },
  { name: 'Corona', state: 'California', stateCode: 'CA', population: 169868, rank: 156 },
  { name: 'Springfield', state: 'Missouri', stateCode: 'MO', population: 169176, rank: 157 },
  { name: 'Jackson', state: 'Mississippi', stateCode: 'MS', population: 166965, rank: 158 },
  { name: 'Alexandria', state: 'Virginia', stateCode: 'VA', population: 159467, rank: 159 },
  { name: 'Hayward', state: 'California', stateCode: 'CA', population: 162954, rank: 160 },
  { name: 'Clarksville', state: 'Tennessee', stateCode: 'TN', population: 166722, rank: 161 },
  { name: 'Lakewood', state: 'Colorado', stateCode: 'CO', population: 155984, rank: 162 },
  { name: 'Lancaster', state: 'California', stateCode: 'CA', population: 173516, rank: 163 },
  { name: 'Salinas', state: 'California', stateCode: 'CA', population: 156570, rank: 164 },
  { name: 'Palmdale', state: 'California', stateCode: 'CA', population: 168522, rank: 165 },
  { name: 'Hollywood', state: 'Florida', stateCode: 'FL', population: 153067, rank: 166 },
  { name: 'Springfield', state: 'Massachusetts', stateCode: 'MA', population: 155929, rank: 167 },
  { name: 'Macon', state: 'Georgia', stateCode: 'GA', population: 157346, rank: 168 },
  { name: 'Kansas City', state: 'Kansas', stateCode: 'KS', population: 156607, rank: 169 },
  { name: 'Sunnyvale', state: 'California', stateCode: 'CA', population: 155805, rank: 170 },
  { name: 'Pomona', state: 'California', stateCode: 'CA', population: 151713, rank: 171 },
  { name: 'Killeen', state: 'Texas', stateCode: 'TX', population: 157447, rank: 172 },
  { name: 'Escondido', state: 'California', stateCode: 'CA', population: 151625, rank: 173 },
  { name: 'Pasadena', state: 'Texas', stateCode: 'TX', population: 151950, rank: 174 },
  { name: 'Naperville', state: 'Illinois', stateCode: 'IL', population: 149013, rank: 175 },
  { name: 'Bellevue', state: 'Washington', stateCode: 'WA', population: 150731, rank: 176 },
  { name: 'Joliet', state: 'Illinois', stateCode: 'IL', population: 150362, rank: 177 },
  { name: 'Murfreesboro', state: 'Tennessee', stateCode: 'TN', population: 152769, rank: 178 },
  { name: 'Midland', state: 'Texas', stateCode: 'TX', population: 146038, rank: 179 },
  { name: 'Rockford', state: 'Illinois', stateCode: 'IL', population: 148655, rank: 180 },
  { name: 'Paterson', state: 'New Jersey', stateCode: 'NJ', population: 159732, rank: 181 },
  { name: 'Savannah', state: 'Georgia', stateCode: 'GA', population: 147780, rank: 182 },
  { name: 'Bridgeport', state: 'Connecticut', stateCode: 'CT', population: 148654, rank: 183 },
  { name: 'Torrance', state: 'California', stateCode: 'CA', population: 147067, rank: 184 },
  { name: 'McAllen', state: 'Texas', stateCode: 'TX', population: 143268, rank: 185 },
  { name: 'Syracuse', state: 'New York', stateCode: 'NY', population: 146396, rank: 186 },
  { name: 'Surprise', state: 'Arizona', stateCode: 'AZ', population: 147965, rank: 187 },
  { name: 'Denton', state: 'Texas', stateCode: 'TX', population: 148143, rank: 188 },
  { name: 'Roseville', state: 'California', stateCode: 'CA', population: 147773, rank: 189 },
  { name: 'Thornton', state: 'Colorado', stateCode: 'CO', population: 146868, rank: 190 },
  { name: 'Miramar', state: 'Florida', stateCode: 'FL', population: 146823, rank: 191 },
  { name: 'Pasadena', state: 'California', stateCode: 'CA', population: 138699, rank: 192 },
  { name: 'Mesquite', state: 'Texas', stateCode: 'TX', population: 145600, rank: 193 },
  { name: 'Olathe', state: 'Kansas', stateCode: 'KS', population: 144264, rank: 194 },
  { name: 'Dayton', state: 'Ohio', stateCode: 'OH', population: 140444, rank: 195 },
  { name: 'Carrollton', state: 'Texas', stateCode: 'TX', population: 139248, rank: 196 },
  { name: 'Waco', state: 'Texas', stateCode: 'TX', population: 139236, rank: 197 },
  { name: 'Orange', state: 'California', stateCode: 'CA', population: 139911, rank: 198 },
  { name: 'Fullerton', state: 'California', stateCode: 'CA', population: 139921, rank: 199 },
  { name: 'Charleston', state: 'South Carolina', stateCode: 'SC', population: 150227, rank: 200 },
];

async function seedCities() {
  console.log('🌆 Seeding 200 US Cities...\n');

  let created = 0;
  let skipped = 0;

  for (const cityData of TOP_200_US_CITIES) {
    const slug = `${cityData.name.toLowerCase().replace(/\s+/g, '-')}-${cityData.stateCode.toLowerCase()}`;

    try {
      // Check if city already exists
      const existing = await prisma.city.findUnique({
        where: { slug },
      });

      if (existing) {
        console.log(`  ⏭️  Skipping: ${cityData.name}, ${cityData.stateCode} (already exists)`);
        skipped++;
        continue;
      }

      // Create city
      await prisma.city.create({
        data: {
          name: cityData.name,
          state: cityData.state,
          stateCode: cityData.stateCode,
          population: cityData.population,
          rank: cityData.rank,
          slug,
          isActive: true,
          priority: 200 - cityData.rank, // Higher rank = higher priority
        },
      });

      console.log(`  ✅ Created: ${cityData.name}, ${cityData.stateCode} (rank #${cityData.rank}, pop: ${cityData.population.toLocaleString()})`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error creating ${cityData.name}, ${cityData.stateCode}:`, error);
    }
  }

  console.log('\n✨ City seeding complete!');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${created + skipped}\n`);
}

// Run seeder
seedCities()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
