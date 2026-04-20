-- Allow authenticated users to backfill / sync their own email_verifications rows from middleware (session client).
CREATE POLICY "Users can insert own email_verifications"
ON public.email_verifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email_verifications"
ON public.email_verifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
