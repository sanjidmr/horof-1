import { WarehouseStaffSettings } from '@/components/admin/warehouse/WarehouseStaffSettings';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Settings — Warehouse',
};

export default function WarehouseSettingsPage() {
  return <WarehouseStaffSettings />;
}
