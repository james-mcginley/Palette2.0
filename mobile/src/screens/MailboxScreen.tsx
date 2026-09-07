import React from 'react';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export function MailboxScreen() {
  return (
    <ScreenPlaceholder
      title="Mailbox"
      note="Reads public.notifications — ask replies, new followers, badges, unlocked path nodes. Deliberately not a like/count feed; see 0004_asks_and_mailbox.sql."
    />
  );
}
