import { z } from 'zod';

export const AnalyticsPeriodEnum = z.enum([
  'today',
  '7d',
  '30d',
  '90d',
  'this_month',
  'last_month',
  'this_year',
  'all_time',
  'custom',
]);

export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodEnum>;

export const analyticsQuerySchema = z
  .object({
    period: AnalyticsPeriodEnum.default('30d'),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return Boolean(data.startDate && data.endDate);
      }
      return true;
    },
    {
      message: 'Both startDate and endDate are required when period is custom',
      path: ['startDate'],
    }
  );

export type AnalyticsQueryInput = z.input<typeof analyticsQuerySchema>;
export type AnalyticsQueryOutput = z.output<typeof analyticsQuerySchema>;
