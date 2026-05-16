'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import { MapPin, Plus, Trash2, Home, Briefcase, Globe } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('addresses')
      .eq('id', user.id)
      .single();

    setAddresses(data?.addresses || []);
    setLoading(false);
  };

  const deleteAddress = async (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ addresses: newAddresses })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to delete address');
    } else {
      setAddresses(newAddresses);
      toast.success('Address deleted');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading addresses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Addresses</h1>
          <p className="text-sm text-slate-500">Manage your shipping destinations.</p>
        </div>
        <Button className="gap-2 rounded-full">
          <Plus size={16} />
          Add New
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent-primary group-hover:text-white transition-colors">
                    {addr.type === 'home' ? <Home size={18} /> : addr.type === 'work' ? <Briefcase size={18} /> : <MapPin size={18} />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 capitalize">{addr.type || 'Other'}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address Label</div>
                  </div>
                </div>
                <button onClick={() => deleteAddress(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="mt-6 space-y-1">
                <div className="text-sm font-bold text-slate-900">{addr.full_name}</div>
                <div className="text-sm text-slate-500 leading-relaxed">
                  {addr.address}<br />
                  {addr.area && `${addr.area}, `}{addr.city}
                </div>
                <div className="text-sm text-slate-500 pt-2">{addr.phone}</div>
              </div>

              {addr.is_default && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-[10px] font-bold text-accent-primary uppercase tracking-widest">
                  <Globe size={12} />
                  Default Shipping Address
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {addresses.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <MapPin size={24} />
            </div>
            <p className="text-slate-500">No saved addresses yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
