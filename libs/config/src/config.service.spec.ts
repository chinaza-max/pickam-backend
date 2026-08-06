import { validate } from './config.service';

describe('Config Validation', () => {
  it('should validate environment variables', () => {
    expect(() => validate({})).toThrow();
  });
});
