/*
# Seed Announcements

Adds realistic company announcements with various types.
*/

INSERT INTO announcements (id, org_id, author_id, title, content, type, target_roles, is_pinned, published_at, created_at)
SELECT
  a.id::uuid,
  o.id,
  a.author_id::uuid,
  a.title,
  a.content,
  a.type,
  ARRAY[]::text[],
  a.is_pinned,
  NOW() - (a.days_ago || ' days')::interval,
  NOW() - (a.days_ago || ' days')::interval
FROM organizations o
CROSS JOIN (
  VALUES
    ('b2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Q3 Company All-Hands', 'Join us on July 15th at 2 PM PST for our quarterly all-hands meeting. We''ll cover Q2 performance, product roadmap updates, and Q3 strategic priorities. All employees are required to attend.', 'event', true, 2),
    ('b2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Updated Remote Work Policy', 'Effective July 1st, our hybrid work policy has been updated. Employees are now required to be in office 3 days per week (Tue-Thu). Please review the full policy document on the intranet. Questions? Reach out to HR.', 'policy', false, 5),
    ('b2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', 'IT System Maintenance', 'Scheduled maintenance will occur this Saturday from 2 AM to 6 AM PST. Email and internal tools may be temporarily unavailable. Plan accordingly and save critical work before Friday evening.', 'urgent', false, 1),
    ('b2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'New Employee Benefits Portal', 'We''ve launched a new self-service benefits portal! You can now view and update your health insurance, 401(k) contributions, and other benefits at benefits.nexustech.com. Login with your company credentials.', 'general', false, 7),
    ('b2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Summer Company Retreat', 'Mark your calendars! Our annual summer retreat is scheduled for August 12-14 at Lake Tahoe. Activities include team building, workshops, and outdoor adventures. RSVP by July 20th.', 'event', false, 3),
    ('b2000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000004', 'Engineering Team Expansion', 'Exciting news! We''re hiring 5 new engineers this quarter to support our growing product roadmap. If you have referrals, please submit them through the employee referral portal.', 'general', false, 4)
) AS a(id, author_id, title, content, type, is_pinned, days_ago)
WHERE o.slug = 'nexus-tech'
ON CONFLICT (id) DO NOTHING;
