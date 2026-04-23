-- Add 'paused' to escrow_transactions status constraint
ALTER TABLE public.escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE public.escrow_transactions
  ADD CONSTRAINT escrow_transactions_status_check
  CHECK (status IN (
    'pending_deposit',
    'funded',
    'sender_confirmed',
    'receiver_confirmed',
    'released',
    'disputed',
    'cancelled',
    'paused'
  ));
