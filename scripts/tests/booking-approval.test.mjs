import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canConfirmBookingTransaction,
  createFollowUpBookingDraft
} from '../../src/lib/bookingQueue.ts';

test('only an unconfirmed booking waiting for deposit approval can be confirmed', () => {
  assert.equal(canConfirmBookingTransaction('CHO_DUYET_COC', null), true);
  assert.equal(canConfirmBookingTransaction('CHO_KHOP', null), false);
  assert.equal(canConfirmBookingTransaction('CHO_DUYET_COC', new Date()), false);
});

test('approval creates the next waiting booking at the previous turn end', () => {
  const draft = createFollowUpBookingDraft({
    projectId: 'project-1',
    salesEmployeeId: 'employee-1',
    projectCode: 'LUMIERE',
    nextStt: 10,
    previousEnd: new Date('2026-09-10T17:10:00Z'),
    projectLaunchTime: new Date('2026-09-10T17:00:00Z')
  });

  assert.equal(draft.sttBooking, 10);
  assert.equal(draft.tgBatdaukhop.toISOString(), '2026-09-10T17:10:00.000Z');
  assert.equal(draft.tgKetthuckhopcan.toISOString(), '2026-09-10T17:20:00.000Z');
  assert.equal(draft.trangthaikhopcan, 'CHO_KHOP');
  assert.equal(draft.productId, undefined);
});
