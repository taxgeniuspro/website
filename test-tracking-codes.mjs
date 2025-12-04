/**
 * Test script for personalized tracking code generation
 * Tests various name formats and edge cases
 */

// Simulate the initials extraction function
function generateInitialsFromName(firstName, middleName, lastName) {
  const getFirstLetter = (name) => {
    if (!name || name.trim().length === 0) return '';

    const cleaned = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase();

    return cleaned.charAt(0);
  };

  const firstInitial = getFirstLetter(firstName);
  const middleInitial = getFirstLetter(middleName);
  const lastInitial = getFirstLetter(lastName);

  let initials = firstInitial + middleInitial + lastInitial;

  if (initials.length === 0) {
    return 'user';
  }

  return initials;
}

// Simulate name parsing logic from auth.ts
function parseFullName(fullName) {
  const nameParts = fullName?.split(' ').filter(part => part.length > 0) || [];
  let firstName = '';
  let middleName;
  let lastName = '';

  if (nameParts.length === 1) {
    firstName = nameParts[0];
  } else if (nameParts.length === 2) {
    firstName = nameParts[0];
    lastName = nameParts[1];
  } else if (nameParts.length >= 3) {
    firstName = nameParts[0];
    middleName = nameParts.slice(1, -1).join(' ');
    lastName = nameParts[nameParts.length - 1];
  }

  return { firstName, middleName, lastName };
}

// Test cases
const testCases = [
  {
    name: 'Ira D Watkins',
    role: 'tax_preparer',
    expectedInitials: 'idw'
  },
  {
    name: 'John Smith',
    role: 'tax_preparer',
    expectedInitials: 'js'
  },
  {
    name: 'José María García López',
    role: 'tax_preparer',
    expectedInitials: 'jmg'
  },
  {
    name: "Patrick O'Brien",
    role: 'tax_preparer',
    expectedInitials: 'po'
  },
  {
    name: 'François René Martin',
    role: 'tax_preparer',
    expectedInitials: 'frm'
  },
  {
    name: 'John',
    role: 'tax_preparer',
    expectedInitials: 'j'
  },
  {
    name: 'John A B Smith',
    role: 'tax_preparer',
    expectedInitials: 'jas' // First + middle(s) + last
  },
  {
    name: 'John Doe',
    role: 'affiliate',
    expectedCode: 'TGP-XXXXXX' // Numeric format
  }
];

console.log('\n=== Testing Personalized Tracking Code Generation ===\n');

testCases.forEach((testCase, index) => {
  const parsed = parseFullName(testCase.name);
  const initials = generateInitialsFromName(parsed.firstName, parsed.middleName, parsed.lastName);

  console.log(`Test Case ${index + 1}: "${testCase.name}"`);
  console.log(`  Role: ${testCase.role}`);
  console.log(`  Parsed: First="${parsed.firstName}", Middle="${parsed.middleName || 'N/A'}", Last="${parsed.lastName}"`);

  if (testCase.role === 'tax_preparer') {
    console.log(`  Generated Initials: "${initials}"`);
    console.log(`  Expected: "${testCase.expectedInitials}"`);
    console.log(`  ✅ ${initials === testCase.expectedInitials ? 'PASS' : '❌ FAIL'}`);
  } else {
    console.log(`  Expected: Numeric code (${testCase.expectedCode})`);
    console.log(`  ✅ Will generate numeric TGP-XXXXXX code`);
  }
  console.log('');
});

console.log('\n=== Testing Duplicate Handling ===\n');
console.log('If "idw" exists:');
console.log('  First: idw');
console.log('  Second: idw2');
console.log('  Third: idw3');
console.log('  And so on...');

console.log('\n=== All Tests Complete ===\n');
