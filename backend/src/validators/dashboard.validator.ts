import { z } from 'zod';

export const DashboardPeriodEnum = z.enum([
  'today',
  'this_week',
  'this_month',
  'last_month',
  'this_year',
  'custom',
]);

export type DashboardPeriod = z.infer<typeof DashboardPeriodEnum>;

export const dashboardQuerySchema = z
  .object({
    period: DashboardPeriodEnum.default('this_month'),
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

export type DashboardQueryInput = z.input<typeof dashboardQuerySchema>;
export type DashboardQueryOutput = z.output<typeof dashboardQuerySchema>;
