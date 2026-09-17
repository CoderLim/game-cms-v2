import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  CreditCard,
  FolderOpen,
  Gamepad2,
  Globe2,
  Home,
  LayoutDashboard,
  Library,
  Settings,
  Shield,
} from 'lucide-react';

import { AppLayout } from '@/components/app-layout';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const group = m['common.systems.admin']();
  const navItems = [
    {
      href: '/admin',
      label: m['admin.nav.overview'](),
      icon: LayoutDashboard,
      group,
    },
    {
      href: '/admin/game-sites',
      label: 'Game Engine',
      icon: Gamepad2,
      group,
      items: [
        { href: '/admin/game-sites', label: 'Sites', icon: Globe2 },
        { href: '/admin/game-catalog', label: 'Game Catalog', icon: Library },
        { href: '/admin/site-games', label: 'Site Games', icon: Gamepad2 },
        { href: '/admin/game-categories', label: 'Game Categories', icon: FolderOpen },
      ],
    },
    {
      href: '/admin/users',
      label: m['admin.nav.rbac'](),
      icon: Shield,
      group,
      items: [
        { href: '/admin/users', label: m['admin.nav.users']() },
        { href: '/admin/invite-codes', label: m['admin.nav.invite_codes']() },
        { href: '/admin/roles', label: m['admin.nav.roles']() },
        { href: '/admin/permissions', label: m['admin.nav.permissions']() },
      ],
    },
    {
      href: '/admin/payments',
      label: m['admin.nav.billing'](),
      icon: CreditCard,
      group,
      items: [
        { href: '/admin/payments', label: m['admin.nav.payments']() },
        { href: '/admin/subscriptions', label: m['admin.nav.subscriptions']() },
        { href: '/admin/credits', label: m['admin.nav.credits']() },
      ],
    },
    {
      href: '/admin/categories',
      label: m['admin.nav.content'](),
      icon: FolderOpen,
      group,
      items: [
        { href: '/admin/categories', label: m['admin.nav.categories']() },
        { href: '/admin/posts', label: m['admin.nav.posts']() },
        { href: '/admin/tickets', label: m['admin.nav.tickets']() },
      ],
    },
  ];

  const footerNavItems = [
    {
      href: '/admin/settings',
      label: m['admin.nav.settings'](),
      icon: Settings,
    },
    { href: '/', label: m['common.systems.home'](), icon: Home, newTab: true },
  ];

  return (
    <AppLayout
      navItems={navItems}
      footerNavItems={footerNavItems}
      brand={envConfigs.app_name}
      brandHref="/admin"
      profileHref="/settings/profile"
      requirePermission="admin.*"
    >
      <Outlet />
    </AppLayout>
  );
}
