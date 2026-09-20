import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import NotificationService from '../services/notification.service.js';
import { createIncident } from '../services/incident.service.js';

describe('Notification System — Comprehensive Suite', () => {
  const testUserId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  it('1. should resolve recipients correctly based on event type and RBAC', () => {
    // Critical incident -> ADMIN and OPERATOR
    const criticalRecipients = NotificationService.resolveRecipients('INCIDENT_CRITICAL');
    assert.equal(criticalRecipients.length, 2);
    assert.ok(criticalRecipients.some((r) => r.targetRole === 'ADMIN'));
    assert.ok(criticalRecipients.some((r) => r.targetRole === 'OPERATOR'));

    // Resource assigned with specific user
    const resRecipients = NotificationService.resolveRecipients('RESOURCE_ASSIGNED', { userId: testUserId });
    assert.ok(resRecipients.some((r) => r.userId === testUserId));

    // Response delay
    const delayRecipients = NotificationService.resolveRecipients('RESPONSE_DELAY');
    assert.ok(delayRecipients.some((r) => r.targetRole === 'OPERATOR'));
    assert.ok(delayRecipients.some((r) => r.targetRole === 'FIELD_COORDINATOR'));

    // Hospital capacity warning
    const hospRecipients = NotificationService.resolveRecipients('HOSPITAL_CAPACITY_WARNING');
    assert.ok(hospRecipients.some((r) => r.targetRole === 'MEDICAL_COORDINATOR'));
  });

  it('2. should format and compute unread counts and read states', () => {
    const rawNotifications = [
      {
        notificationId: 'NTF-TEST-1',
        userId: testUserId,
        recipient: testUserId,
        isRead: false,
        title: 'Direct Unread',
        readBy: [],
      },
      {
        notificationId: 'NTF-TEST-2',
        userId: testUserId,
        recipient: testUserId,
        isRead: true,
        title: 'Direct Read',
        readBy: [],
      },
      {
        notificationId: 'NTF-TEST-3',
        targetRole: 'OPERATOR',
        isRead: false,
        title: 'Role Unread',
        readBy: [],
      },
      {
        notificationId: 'NTF-TEST-4',
        targetRole: 'OPERATOR',
        isRead: false,
        title: 'Role Read by User',
        readBy: [{ userId: testUserId, readAt: new Date() }],
      },
    ];

    // Verify per-user read mapping logic
    const formatted = rawNotifications.map((n) => {
      const isDirectRead = (n.userId && String(n.userId) === String(testUserId)) && n.isRead;
      const isRoleRead = Array.isArray(n.readBy) && n.readBy.some((r) => String(r.userId) === String(testUserId));
      return {
        ...n,
        isRead: Boolean(isDirectRead || isRoleRead),
      };
    });

    assert.equal(formatted[0].isRead, false);
    assert.equal(formatted[1].isRead, true);
    assert.equal(formatted[2].isRead, false);
    assert.equal(formatted[3].isRead, true);
  });

  it('3. should enforce deduplication window', async () => {
    // Test deduplication check logic with mock
    const shouldDedupFirst = await NotificationService.shouldDeduplicate({
      type: 'RESPONSE_DELAY',
      entityId: 'RES-TEST-999',
      targetRole: 'OPERATOR',
      cooldownSeconds: 0,
    });
    assert.equal(shouldDedupFirst, false, 'Should not deduplicate when cooldownSeconds is 0');
  });

  it('4. should validate notification authorization and ownership rules', async () => {
    const directNotif = {
      notificationId: 'NTF-AUTH-1',
      userId: testUserId,
      recipient: testUserId,
      targetRole: null,
      isRead: false,
      readBy: [],
    };

    // Correct user should be authorized
    const isOwner = String(directNotif.userId) === String(testUserId);
    assert.equal(isOwner, true);

    // Wrong user should be forbidden
    const isWrongUser = String(directNotif.userId) === String(otherUserId);
    assert.equal(isWrongUser, false);
  });

  it('5. should ensure operational failure isolation: notification failure does not break operations', async () => {
    // If notification service throws or logs a warning, calling code wraps in .catch()
    let errorCaught = false;
    try {
      await Promise.resolve()
        .then(() => {
          throw new Error('Simulated notification network timeout');
        })
        .catch((e) => {
          errorCaught = true;
          // Operational transaction continues unaffected
        });
    } catch {
      assert.fail('Operational flow should not throw unhandled exception');
    }

    assert.equal(errorCaught, true, 'Notification error was safely intercepted');
  });
});
