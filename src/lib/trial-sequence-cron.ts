/**
 * Trial lifecycle emails are retired for the one-plan model.
 *
 * The return shape is kept so the existing daily drip endpoint remains
 * backwards-compatible while legacy trial records are allowed to drain.
 */
export async function runTrialSequenceEmailCron(): Promise<{
  attempted: number;
  sent: Record<string, number>;
  errors: string[];
}> {
  return {
    attempted: 0,
    sent: {},
    errors: [],
  };
}
