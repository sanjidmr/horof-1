'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { revalidatePath } from 'next/cache';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BulkProductRow = {
  rowNumber: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  product_details: string;
  category: string;
  subcategory: string;
  brand: string;
  price: string;
  discount_price: string;
  stock: string;
  min_stock_level: string;
  status: string;
  perfect_for: string;
  specification: string;
  customer_notes: string;
  design_charge: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  cost_price: string;
  stock_status: string;
  barcode: string;
  image_urls: string;
};

export type ValidationError = {
  row: number;
  productName: string;
  errors: string[];
};

export type PreviewRow = {
  rowNumber: number;
  name: string;
  sku: string;
  price: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  categoryMatch: string | null;
  subcategoryMatch: string | null;
  brandMatch: string | null;
  isDuplicate: boolean;
};

export type ImportResult = {
  totalRows: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: ValidationError[];
  durationMs: number;
  logId: string;
};

const REQUIRED_FIELDS: (keyof BulkProductRow)[] = ['name', 'price'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'product-' + Date.now();
}

function parseNum(val: string | undefined | null): number | null {
  if (!val || val.trim() === '') return null;
  const n = Number(val.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1' || v === 'active';
}

function parseImageUrls(val: string | undefined | null): string[] {
  if (!val) return [];
  return val
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ─── Parse file ──────────────────────────────────────────────────────────────

export async function parseUploadFile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Forbidden');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file uploaded');

  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) throw new Error('File exceeds 20MB limit');

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
    throw new Error('Only CSV, XLSX, XLS files are supported');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: BulkProductRow[] = [];

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    rows = parsed.data.map((raw, i) => normalizeRow(raw, i + 2));
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    rows = json.map((raw, i) => normalizeRow(raw, i + 2));
  }

  if (rows.length === 0) throw new Error('No data rows found in the file');
  if (rows.length > 5000) throw new Error('Maximum 5000 rows allowed per upload');

  const duplicateHandling = formData.get('duplicateHandling') as string || 'skip';

  // Validate and build preview
  const preview = await validateRows(rows, supabase, duplicateHandling);

  return { preview, totalRows: rows.length, duplicateHandling };
}

function normalizeRow(raw: Record<string, string>, rowNum: number): BulkProductRow {
  const g = (keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(raw).find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
      if (found) return (raw[found] || '').trim();
    }
    return '';
  };

  return {
    rowNumber: rowNum,
    name: g(['Product Name', 'product_name', 'name', 'ProductName']),
    slug: g(['Slug', 'slug']),
    sku: g(['SKU', 'sku']),
    description: g(['Description', 'description']),
    product_details: g(['Product Details', 'product_details', 'ProductDetails']),
    category: g(['Category', 'category']),
    subcategory: g(['Subcategory', 'subcategory', 'Sub Category', 'sub_category']),
    brand: g(['Brand', 'brand']),
    price: g(['Price', 'price']),
    discount_price: g(['Discount Price', 'discount_price', 'offer_price', 'Offer Price', 'Compare Price', 'compare_price']),
    stock: g(['Stock Quantity', 'stock_quantity', 'Stock', 'stock']),
    min_stock_level: g(['Minimum Stock Level', 'min_stock_level', 'Min Stock', 'min_stock']),
    status: g(['Status', 'status', 'is_active', 'Is Active']),
    perfect_for: g(['Perfect For', 'perfect_for', 'PerfectFor']),
    specification: g(['Specifications', 'specification', 'Specification']),
    customer_notes: g(['Customer Notes', 'customer_notes', 'CustomerNotes']),
    design_charge: g(['Design Charge', 'design_charge', 'DesignCharge']),
    meta_title: g(['Meta Title', 'meta_title', 'MetaTitle']),
    meta_description: g(['Meta Description', 'meta_description', 'MetaDescription']),
    keywords: g(['Keywords', 'keywords']),
    cost_price: g(['Cost Price', 'cost_price', 'CostPrice']),
    stock_status: g(['Stock Status', 'stock_status', 'StockStatus']),
    barcode: g(['Barcode', 'barcode']),
    image_urls: g(['Image URLs', 'image_urls', 'ImageUrl', 'image_url', 'images', 'Images']),
  };
}

async function validateRows(
  rows: BulkProductRow[],
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  duplicateHandling: string
): Promise<PreviewRow[]> {
  // Fetch reference data
  const [catRes, subcatRes, brandRes, existingSkus] = await Promise.all([
    supabase.from('categories').select('id, name'),
    supabase.from('subcategories').select('id, name, category_id'),
    supabase.from('brands').select('id, name'),
    supabase.from('products').select('sku, slug'),
  ]);

  const categories = catRes.data || [];
  const subcategories = subcatRes.data || [];
  const brands = brandRes.data || [];
  const existing = existingSkus.data || [];

  const existingSkuSet = new Set(existing.map(p => p.sku?.toLowerCase()));
  const existingSlugSet = new Set(existing.map(p => p.slug?.toLowerCase()));

  const preview: PreviewRow[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.name) errors.push('Product name is required');
    if (!row.price || parseNum(row.price) === null) {
      errors.push('Valid price is required');
    } else if (parseNum(row.price)! < 0) {
      errors.push('Price cannot be negative');
    }

    // SKU duplicate check
    const sku = row.sku || slugify(row.name) + '-' + row.rowNumber;
    const isSkuDup = existingSkuSet.has(sku.toLowerCase());
    if (isSkuDup && duplicateHandling === 'skip') {
      warnings.push(`SKU "${sku}" already exists — will be skipped`);
    } else if (isSkuDup && duplicateHandling === 'update') {
      warnings.push(`SKU "${sku}" already exists — will be updated`);
    }

    // Category match
    let categoryMatch: string | null = null;
    if (row.category) {
      const cat = categories.find(c => c.name.toLowerCase() === row.category.toLowerCase());
      if (cat) {
        categoryMatch = cat.id;
      } else {
        errors.push(`Category "${row.category}" not found`);
      }
    }

    // Subcategory match
    let subcategoryMatch: string | null = null;
    if (row.subcategory) {
      const sub = subcategories.find(s => s.name.toLowerCase() === row.subcategory.toLowerCase());
      if (sub) {
        subcategoryMatch = sub.id;
      } else {
        errors.push(`Subcategory "${row.subcategory}" not found`);
      }
    }

    // Brand match
    let brandMatch: string | null = null;
    if (row.brand) {
      const br = brands.find(b => b.name.toLowerCase() === row.brand.toLowerCase());
      if (br) {
        brandMatch = br.id;
      } else {
        warnings.push(`Brand "${row.brand}" not found — will be ignored`);
      }
    }

    // Numeric validations
    if (row.discount_price && parseNum(row.discount_price) === null) {
      warnings.push('Invalid discount price format — will be ignored');
    }
    if (row.stock && parseNum(row.stock) === null) {
      errors.push('Invalid stock quantity');
    }
    if (row.min_stock_level && parseNum(row.min_stock_level) === null) {
      warnings.push('Invalid minimum stock level — will use default 0');
    }
    if (row.design_charge && parseNum(row.design_charge) === null) {
      warnings.push('Invalid design charge — will be ignored');
    }
    if (row.cost_price && parseNum(row.cost_price) === null) {
      warnings.push('Invalid cost price — will be ignored');
    }

    // Slug duplicate
    const slug = row.slug || slugify(row.name);
    const isSlugDup = existingSlugSet.has(slug.toLowerCase());
    if (isSlugDup) {
      warnings.push(`Slug "${slug}" already exists — a unique suffix will be appended`);
    }

    // Image URLs
    if (row.image_urls) {
      const urls = parseImageUrls(row.image_urls);
      const invalid = urls.filter(u => !u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('/'));
      if (invalid.length > 0) {
        warnings.push(`${invalid.length} invalid image URL(s) — will be skipped`);
      }
    }

    const price = parseNum(row.price) || 0;
    const isDuplicate = isSkuDup;

    preview.push({
      rowNumber: row.rowNumber,
      name: row.name || '(unnamed)',
      sku: sku,
      price,
      valid: errors.length === 0,
      errors,
      warnings,
      categoryMatch,
      subcategoryMatch,
      brandMatch,
      isDuplicate,
    });
  }

  return preview;
}

// ─── Import products ─────────────────────────────────────────────────────────

export async function importProducts(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') throw new Error('Forbidden');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file');

  const duplicateHandling = (formData.get('duplicateHandling') as string) || 'skip';
  const onlyValid = formData.get('onlyValid') !== 'false';

  const ext = file.name.split('.').pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: BulkProductRow[] = [];

  if (ext === 'csv') {
    const text = buffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    rows = parsed.data.map((raw, i) => normalizeRow(raw, i + 2));
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    rows = json.map((raw, i) => normalizeRow(raw, i + 2));
  }

  const startTime = Date.now();
  const validationErrors: ValidationError[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Fetch reference data
  const [catRes, subcatRes, brandRes] = await Promise.all([
    supabase.from('categories').select('id, name'),
    supabase.from('subcategories').select('id, name, category_id'),
    supabase.from('brands').select('id, name'),
  ]);
  const categories = catRes.data || [];
  const subcategories = subcatRes.data || [];
  const brands = brandRes.data || [];

  // Fetch existing SKUs
  const { data: existingProducts } = await supabase.from('products').select('id, sku, slug');
  const existingBySku = new Map((existingProducts || []).map(p => [p.sku?.toLowerCase(), p]));
  const existingBySlug = new Map((existingProducts || []).map(p => [p.slug?.toLowerCase(), p]));

  // Process in batches of 50
  const BATCH_SIZE = 50;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const productInserts: any[] = [];
    const imageInserts: { productId: string; urls: string[] }[] = [];
    const rowErrors: { row: number; name: string; errs: string[] }[] = [];

    for (const row of batch) {
      const errs: string[] = [];

      if (!row.name) errs.push('Product name is required');
      const price = parseNum(row.price);
      if (price === null || price < 0) errs.push('Valid price is required');

      const sku = row.sku || slugify(row.name) + '-' + row.rowNumber;
      const existing = existingBySku.get(sku.toLowerCase());

      if (existing) {
        if (duplicateHandling === 'skip') {
          skipped++;
          continue;
        }
        // update mode — handled below
      }

      if (errs.length > 0) {
        failed++;
        rowErrors.push({ row: row.rowNumber, name: row.name || '(unnamed)', errs });
        continue;
      }

      const slug = row.slug || slugify(row.name);
      let finalSlug = slug;
      if (existingBySlug.has(slug.toLowerCase()) && !existing) {
        finalSlug = slug + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      }

      const categoryId = row.category
        ? categories.find(c => c.name.toLowerCase() === row.category.toLowerCase())?.id || null
        : null;
      const subcategoryId = row.subcategory
        ? subcategories.find(s => s.name.toLowerCase() === row.subcategory.toLowerCase())?.id || null
        : null;
      const brandId = row.brand
        ? brands.find(b => b.name.toLowerCase() === row.brand.toLowerCase())?.id || null
        : null;

      const discountPrice = parseNum(row.discount_price);
      const stock = parseNum(row.stock) || 0;
      const minStock = parseNum(row.min_stock_level) || 0;
      const designCharge = parseNum(row.design_charge);
      const costPrice = parseNum(row.cost_price);
      const imageUrls = parseImageUrls(row.image_urls);
      const isActive = row.status ? parseBool(row.status) : true;

      const specObj: Record<string, string> = {};
      if (row.specification) {
        row.specification.split(/[,;\n]/).forEach(part => {
          const [k, ...v] = part.split(':');
          if (k && v.length > 0) specObj[k.trim()] = v.join(':').trim();
        });
      }

      const detailsObj: Record<string, string> = {};
      if (row.product_details) {
        row.product_details.split(/[,;\n]/).forEach(part => {
          const [k, ...v] = part.split(':');
          if (k && v.length > 0) detailsObj[k.trim()] = v.join(':').trim();
        });
      }

      const perfectFor = row.perfect_for
        ? row.perfect_for.split(/[,;]/).map(s => s.trim()).filter(Boolean)
        : [];

      const payload: any = {
        name: row.name,
        slug: finalSlug,
        sku,
        description: row.description || '',
        price: Math.round(price!),
        compare_price: discountPrice !== null ? Math.round(discountPrice) : null,
        stock,
        min_stock_level: minStock,
        is_active: isActive,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        brand_id: brandId,
        specification: specObj,
        product_details: detailsObj,
        perfect_for: perfectFor,
        image: imageUrls[0] || '',
        images: imageUrls,
        meta_title: row.meta_title || '',
        meta_description: row.meta_description || '',
        cost_price: costPrice !== null ? Math.round(costPrice) : null,
        barcode: row.barcode || null,
        stock_status: row.stock_status?.toLowerCase() || (stock > 0 ? 'in_stock' : 'out_of_stock'),
        order_config: {
          quantity_discounts: [],
          specification_steps: [],
          design_charge: {
            enabled: designCharge !== null && designCharge > 0,
            amount: designCharge || 0,
            description: row.customer_notes ? `Design service: ${row.customer_notes}` : '',
          },
          customer_notes_settings: {
            enabled: !!row.customer_notes,
            title: 'Specification Need Details',
            placeholder: row.customer_notes || '',
          },
          pricing_config: { min_order_qty: 1, max_order_qty: null },
          order_request_settings: {
            enable_order_requests: true,
            enable_add_to_cart: true,
            enable_direct_order: false,
            auto_approval: false,
          },
          display_controls: {
            show_discount_table: true,
            show_specifications: true,
            show_customer_notes: true,
            show_quantity_selector: true,
            show_design_charge: designCharge !== null && designCharge > 0,
            show_total_price: true,
            show_send_request: true,
            show_add_to_cart: true,
          },
        },
      };

      if (existing && duplicateHandling === 'update') {
        // Update existing product
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', existing.id);

        if (updateErr) {
          failed++;
          rowErrors.push({ row: row.rowNumber, name: row.name, errs: [updateErr.message] });
        } else {
          successful++;
          // Update images: delete old, insert new
          if (imageUrls.length > 0) {
            await supabase.from('product_images').delete().eq('product_id', existing.id);
            await supabase.from('product_images').insert(
              imageUrls.map((url, idx) => ({
                product_id: existing.id,
                image_url: url,
                sort_order: idx,
              }))
            );
          }
        }
      } else {
        productInserts.push(payload);
        imageInserts.push({ productId: '', urls: imageUrls });
      }
    }

    // Batch insert products
    if (productInserts.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert(productInserts)
        .select('id, name');

      if (insertErr) {
        // All products in batch failed
        failed += productInserts.length;
        productInserts.forEach((p, idx) => {
          rowErrors.push({
            row: batch[idx]?.rowNumber || 0,
            name: p.name,
            errs: [insertErr.message],
          });
        });
      } else if (inserted) {
        successful += inserted.length;
        // Insert images for successfully created products
        for (let j = 0; j < inserted.length; j++) {
          const prod = inserted[j];
          const imgs = imageInserts[j]?.urls || [];
          if (imgs.length > 0) {
            const { error: imgErr } = await supabase.from('product_images').insert(
              imgs.map((url, idx) => ({
                product_id: prod.id,
                image_url: url,
                sort_order: idx,
              }))
            );
            if (imgErr) {
              console.warn(`[BulkUpload] Failed to insert images for ${prod.name}:`, imgErr.message);
            }
          }
        }
      }
    }

    validationErrors.push(...rowErrors.map(r => ({ row: r.row, productName: r.name, errors: r.errs })));
  }

  const durationMs = Date.now() - startTime;
  const totalRows = rows.length;
  const status: 'completed' | 'partial' | 'failed' = failed === 0 ? 'completed' : successful > 0 ? 'partial' : 'failed';

  // Log the import
  const { data: log } = await supabase
    .from('import_logs')
    .insert({
      file_name: file.name,
      total_rows: totalRows,
      successful_rows: successful,
      failed_rows: failed,
      skipped_rows: skipped,
      errors: validationErrors,
      duplicate_handling: duplicateHandling,
      status,
      duration_ms: durationMs,
      imported_by: user.id,
    })
    .select('id')
    .single();

  revalidatePath('/admin/products');
  revalidatePath('/admin/products/bulk-upload');

  return {
    totalRows,
    successful,
    failed,
    skipped,
    errors: validationErrors,
    durationMs,
    logId: log?.id || '',
  } satisfies ImportResult;
}

// ─── Download sample template CSV ────────────────────────────────────────────

export async function downloadSampleTemplate() {
  const headers = [
    'Product Name',
    'Slug',
    'SKU',
    'Description',
    'Product Details',
    'Category',
    'Subcategory',
    'Brand',
    'Price',
    'Discount Price',
    'Stock Quantity',
    'Minimum Stock Level',
    'Status',
    'Perfect For',
    'Specifications',
    'Customer Notes',
    'Design Charge',
    'Meta Title',
    'Meta Description',
    'Keywords',
    'Cost Price',
    'Stock Status',
    'Barcode',
    'Image URLs',
  ];

  const sampleRow = [
    'Handcrafted Wooden Vase',
    'handcrafted-wooden-vase',
    'HWV-001',
    'A beautiful handcrafted wooden vase made from premium mango wood.',
    'Material:Mango Wood|Finish:Matte|Height:12 inches',
    'Home Decor',
    'Vases',
    'Horof Crafts',
    '2500',
    '2200',
    '50',
    '5',
    'active',
    'Gifts,Home Decor,Housewarming',
    'Material:Mango Wood|Color:Natural Wood|Care:Wipe with dry cloth',
    'Please specify preferred wood finish in order notes.',
    '300',
    'Handcrafted Wooden Vase - Horof',
    'Premium handcrafted wooden vase from Horof. Perfect for home decor.',
    'wooden vase, handcrafted, home decor, Bangladesh',
    '1200',
    'in_stock',
    'HWV001BAR',
    'https://example.com/images/vase1.jpg,https://example.com/images/vase2.jpg',
  ];

  const csv = Papa.unparse({ fields: headers, data: [sampleRow] });
  return csv;
}

// ─── Get upload history ─────────────────────────────────────────────────────

export async function getUploadHistory() {
  const supabase = await createSupabaseServerClient();

  const { data: logs, error } = await supabase
    .from('import_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return logs || [];
}
