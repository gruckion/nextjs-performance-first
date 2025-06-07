// This file contains a massive static data export to test bundle size
export const MASSIVE_STATIC_DATA = {
  description: "This is a massive JSON payload embedded directly in the bundle",
  generatedAt: "2025-01-07T21:30:00Z",
  // Create a very large string by repeating data
  largeString: "x".repeat(1000000), // 1MB of 'x' characters
  users: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    description: `This is a very long description for user ${i} that contains lots of text to increase the bundle size. `.repeat(10),
  })),
  products: Array.from({ length: 500 }, (_, i) => ({
    id: i,
    name: `Product ${i}`,
    description: `Product description ${i} `.repeat(50),
    metadata: {
      tags: Array.from({ length: 20 }, (_, j) => `tag-${i}-${j}`),
      attributes: Object.fromEntries(
        Array.from({ length: 30 }, (_, j) => [`attr-${j}`, `value-${i}-${j}`])
      ),
    },
  })),
};

export const MASSIVE_STRING = JSON.stringify(MASSIVE_STATIC_DATA);