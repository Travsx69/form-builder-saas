'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function BillingContent() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Billing</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage your subscription and billing information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg dark:border-zinc-800">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Free Plan</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Currently on the free tier</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Active
            </span>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Forms</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">3 / 3</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Responses/month</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">100 / 100</p>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Subscription management will be available after Stripe integration (Phase 2).
          </p>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>• View billing history</li>
            <li>• Update payment method</li>
            <li>• Download invoices</li>
            <li>• Cancel subscription</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Usage analytics and detailed metrics will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}