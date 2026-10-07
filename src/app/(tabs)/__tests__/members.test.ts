/**
 * Test for shouldShowRecordButton helper function
 * Verifies that the Record button display logic is correct for each payment status
 */
import { describe, it, expect } from '@jest/globals';
import { shouldShowRecordButton } from '../members';

describe('shouldShowRecordButton', () => {
  it('should return false (show arrow) when payment status is paid', () => {
    expect(shouldShowRecordButton('paid')).toBe(false);
  });

  it('should return true (show record button) when payment status is partially-paid', () => {
    expect(shouldShowRecordButton('partially-paid')).toBe(true);
  });

  it('should return true (show record button) when payment status is pending', () => {
    expect(shouldShowRecordButton('pending')).toBe(true);
  });
});
