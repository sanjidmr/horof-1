'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export function ShippingManager({ initialZones }: { initialZones: any[] }) {
  const [zones, setZones] = useState(initialZones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', charge: 0, estimated_days: '' });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleEdit = (zone: any) => {
    setEditingId(zone.id);
    setFormData({ name: zone.name, charge: zone.charge, estimated_days: zone.estimated_days || '' });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', charge: 0, estimated_days: '' });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Zone name is required');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('shipping_zones')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Zone updated');
      } else {
        const { error } = await supabase
          .from('shipping_zones')
          .insert([formData]);
        if (error) throw error;
        toast.success('Zone added');
      }

      const { data } = await supabase.from('shipping_zones').select('*').order('name');
      setZones(data || []);
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save zone');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    try {
      const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
      if (error) throw error;
      setZones(zones.filter(z => z.id !== id));
      toast.success('Zone deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete zone');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Shipping Zones</CardTitle>
            <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
              <Plus size={16} className="mr-2" /> Add Zone
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{zone.name}</div>
                      <div className="text-xs text-slate-500">{zone.estimated_days ? `${zone.estimated_days} delivery` : 'Estimated time not set'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold text-accent-primary">{formatPrice(zone.charge)}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Charge</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(zone)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(zone.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {zones.length === 0 && !isAdding && (
                <div className="p-10 text-center text-slate-400">No shipping zones found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {(isAdding || editingId) ? (
          <Card className="border-none shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-bold">{editingId ? 'Edit Zone' : 'New Zone'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Zone Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Inside Dhaka" />
              </div>
              <div className="space-y-2">
                <Label>Shipping Charge (BDT)</Label>
                <Input type="number" value={formData.charge} onChange={e => setFormData({ ...formData, charge: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Estimated Delivery (e.g. 2-3 days)</Label>
                <Input value={formData.estimated_days} onChange={e => setFormData({ ...formData, estimated_days: e.target.value })} placeholder="2-3 days" />
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                  <Save size={16} className="mr-2" />
                  {isLoading ? 'Saving...' : 'Save Zone'}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-slate-50 border border-dashed rounded-3xl p-10 text-center space-y-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Plus size={24} />
            </div>
            <p className="text-sm text-slate-500">Select a shipping zone to edit or click "Add Zone" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
