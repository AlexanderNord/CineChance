import '@testing-library/jest-dom';

// Provide fetch polyfill for tests
import 'whatwg-fetch';

// Silence console.error in tests where we expect network errors
const originalError = console.error;
beforeAll(() => {
  // keep default
});
afterAll(() => {
  console.error = originalError;
});
