'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';

interface SettingsContentProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function SettingsContent({ user }: SettingsContentProps) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar
              src={user?.image || null}
              fallback={user?.name || user?.email || 'U'}
              size="xl"
              alt={user?.name || 'Avatar'}
            />
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{user?.name || 'Unnamed'}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={user?.name || ''} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email || ''} placeholder="you@example.com" disabled />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Email cannot be changed</p>
            </div>
          </div>

          <Button>Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Account management features like password change, email verification, and connected accounts will be available here.
          </p>
          <Button variant="outline">Change password</Button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/30">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="destructive">Delete account</Button>
        </CardContent>
      </Card>
    </div>
  );
}