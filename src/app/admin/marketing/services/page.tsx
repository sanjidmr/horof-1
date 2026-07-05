'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, Save, Trash2, Edit2, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';

interface ServiceItem {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  description: string;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [id, setId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_images')
        .select('*')
        .eq('section', 'services')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServices(
        (data || []).map((item) => ({
          id: item.id,
          image_url: item.image_url,
          title: item.title || '',
          subtitle: item.subtitle || '',
          description: item.description || '',
        }))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `service-${Math.random()}.${fileExt}`;
      const filePath = `site-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }
    if (!title || !subtitle || !description) {
      toast.error('Please fill in all text fields');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        section: 'services',
        image_url: imageUrl,
        title,
        subtitle,
        description,
        button_text: 'View Details',
      };

      let error;
      if (isEditing && id) {
        ({ error } = await supabase
          .from('site_images')
          .update(payload)
          .eq('id', id));
      } else {
        ({ error } = await supabase
          .from('site_images')
          .insert(payload));
      }

      if (error) throw error;

      toast.success(isEditing ? 'Service updated successfully!' : 'Service created successfully!');
      resetForm();
      fetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ServiceItem) => {
    setId(item.id);
    setImageUrl(item.image_url);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setDescription(item.description);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await supabase
        .from('site_images')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      toast.success('Service deleted successfully');
      fetchServices();
      if (id === serviceId) {
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service');
    }
  };

  const resetForm = () => {
    setId(null);
    setImageUrl('');
    setTitle('');
    setSubtitle('');
    setDescription('');
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1A3320]">Manage Our Services</h1>
          <p className="text-sm text-slate-500 mt-1">
            Add and edit services displayed on the home page slider.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form */}
        <Card className="lg:col-span-1 border border-slate-100 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              {isEditing ? 'Edit Service' : 'Add New Service'}
            </CardTitle>
            <CardDescription>
              Provide service details and upload an attractive image.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4">
              {/* Image Preview & Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Service Image</label>
                <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative min-h-[160px] overflow-hidden group">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white bg-black/60 px-3 py-1.5 rounded-full font-semibold">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-2 pointer-events-none">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                      <span className="text-xs text-slate-500 font-medium block">
                        {uploadingImage ? 'Uploading...' : 'Upload JPG, PNG or WebP'}
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tagline (Title)</label>
                <Input
                  type="text"
                  placeholder="e.g. Master Woodwork"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>

              {/* Semi-Tagline */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Semi-Tagline (Subtitle)</label>
                <Input
                  type="text"
                  placeholder="e.g. Handcrafted Perfection"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 bg-slate-50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Description</label>
                <Textarea
                  placeholder="Describe your woodworking service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="rounded-xl border-slate-200 bg-slate-50 resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button type="submit" disabled={saving || uploadingImage} className="bg-[#1A3320] hover:bg-[#2D6A4F] text-white flex-1 rounded-xl cursor-pointer">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Service'}
              </Button>
              {isEditing && (
                <Button type="button" onClick={resetForm} variant="outline" className="rounded-xl cursor-pointer">
                  Cancel
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>

        {/* Services List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-[#1A3320]">Current Services ({services.length})</h2>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="border-2 border-dashed border-slate-100 rounded-3xl p-12 text-center text-slate-400 bg-white">
              No services added yet. Create your first service on the left form!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((item) => (
                <Card key={item.id} className="overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-50">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader className="pb-2">
                      <span className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">
                        {item.subtitle}
                      </span>
                      <CardTitle className="text-xl font-bold text-[#1A3320] mt-1">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </div>
                  <CardFooter className="border-t border-slate-50 pt-4 flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)} className="rounded-xl cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} className="rounded-xl cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
